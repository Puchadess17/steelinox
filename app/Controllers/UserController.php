<?php
// app/Controllers/UserController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';

class UserController {

    // Crear un nuevo usuario (POST /api/users)
    public function store() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización: Solo Admin o Comercial pueden crear
        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Permisos insuficientes']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba POST']]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $errors = [];

        if (empty($input['name'])) $errors['name'] = 'El nombre es obligatorio.';
        if (empty($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Email no válido.';
        if (empty($input['password'])) $errors['password'] = 'La contraseña es obligatoria.';
        if (empty($input['client_id'])) $errors['client_id'] = 'ID de cliente obligatorio.';

        if (!empty($errors)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $errors]);
            return;
        }

        try {
            $userModel = new User();

            // Verificar si el email ya existe
            if ($userModel->emailExists($input['email'])) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => ['email' => 'El email ya está en uso.']]);
                return;
            }

            $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);

            $newUserId = $userModel->create([
                'client_id'     => $input['client_id'],
                'role'          => 'cliente',
                'name'          => trim($input['name']),
                'email'         => trim($input['email']),
                'password_hash' => $hashedPassword,
                'is_active'     => isset($input['is_active']) ? (int)$input['is_active'] : 1
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Usuario creado correctamente',
                'data'    => ['id' => $newUserId],
                'errors'  => null
            ]);

        } catch (Exception $e) {
            error_log('UserController::store - ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al crear el usuario. Por favor, inténtelo de nuevo más tarde.', 'data' => null, 'errors' => null]);
        }
    }

    // Actualizar un usuario existente (PUT /api/users/(\d+))
    public function update($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Permisos insuficientes']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba PUT']]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        try {
            $userModel = new User();
            $user = $userModel->findByIdWithInactive($id);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado', 'data' => null, 'errors' => ['user' => 'Recurso inaccesible']]);
                return;
            }

            // Validar email si se está cambiando
            if (!empty($input['email']) && $input['email'] !== $user['email']) {
                if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Email no válido', 'data' => null, 'errors' => ['email' => 'Email no válido.']]);
                    return;
                }
                if ($userModel->emailExists($input['email'], $id)) {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Email en uso', 'data' => null, 'errors' => ['email' => 'El email ya está en uso.']]);
                    return;
                }
            }

            $updateData = [];
            if (isset($input['name'])) $updateData['name'] = trim($input['name']);
            if (isset($input['email'])) $updateData['email'] = trim($input['email']);
            if (isset($input['is_active'])) $updateData['is_active'] = (int)$input['is_active'];
            if (!empty($input['password'])) {
                $updateData['password_hash'] = password_hash($input['password'], PASSWORD_DEFAULT);
            }

            $updated = $userModel->update($id, $updateData);

            if ($updated) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Usuario actualizado correctamente',
                    'data'    => ['id' => $id],
                    'errors'  => null
                ]);
            } else {
                throw new Exception("No se pudo actualizar el usuario.");
            }

        } catch (Exception $e) {
            error_log('UserController::update - ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar el usuario. Por favor, inténtelo de nuevo más tarde.', 'data' => null, 'errors' => null]);
        }
    }

    // Eliminar lógicamente un usuario (DELETE /api/users/(\d+))
    public function destroy($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Permisos insuficientes']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba DELETE']]);
            return;
        }

        try {
            $userModel = new User();
            $deleted = $userModel->delete($id);

            if ($deleted) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Usuario eliminado correctamente',
                    'data'    => ['id' => $id],
                    'errors'  => null
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado o ya eliminado', 'data' => null, 'errors' => null]);
            }

        } catch (Exception $e) {
            error_log('UserController::destroy - ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar usuario. Por favor, inténtelo de nuevo más tarde.', 'data' => null, 'errors' => null]);
        }
    }

}
