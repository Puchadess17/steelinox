<?php
// app/Controllers/UserController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Models/Client.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php'; 

class UserController {

    // Listar usuarios clientes (GET /api/users)
    public function index() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if ($actorRole === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'errors' => ['role' => 'Privilegios insuficientes']]);
            return;
        }

        try {
            $userModel = new User();
            $users = $userModel->getClientUsersList($actorUserId, $actorRole);

            // Calcular KPIs para las tarjetas superiores
            $kpis = [
                'total'     => count($users),
                'activos'   => count(array_filter($users, fn($u) => $u['is_active'] == 1)),
                'inactivos' => count(array_filter($users, fn($u) => $u['is_active'] == 0))
            ];

            echo json_encode([
                'success' => true, 
                'data' => [
                    'list' => $users,
                    'kpis' => $kpis
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Ver detalles de un usuario cliente (GET /api/users/{id})
    public function show($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if ($actorRole === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
            return;
        }

        try {
            $userModel = new User();
            $user = $userModel->findByIdWithInactive($id);

            if (!$user || $user['role'] !== 'cliente') {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
                return;
            }

            // ESCUDO DE PERMISOS
            $clientModel = new Client();
            if (!$clientModel->getDetailsById($user['client_id'], $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre la empresa de este usuario']);
                return;
            }

            unset($user['password_hash']); // Nunca enviamos el hash al front

            echo json_encode(['success' => true, 'data' => $user]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno']);
        }
    }

    // Crear un nuevo usuario (POST /api/users)
    public function store() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if ($actorRole === 'cliente') {
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
        if (empty($input['email'])) {
            $errors['email'] = 'El email es obligatorio.';
        } elseif (!preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $input['email'])) {
            $errors['email'] = 'El formato del email no es válido.';
        }
        if (empty($input['password'])) $errors['password'] = 'La contraseña es obligatoria.';
        if (empty($input['client_id'])) $errors['client_id'] = 'ID de cliente obligatorio.';

        if (!empty($errors)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $errors]);
            return;
        }

        try {
            // ESCUDO DE PERMISOS: Validar que el comercial tiene acceso a la empresa
            $clientModel = new Client();
            if (!$clientModel->getDetailsById($input['client_id'], $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre esta empresa']);
                return;
            }

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
                'role'          => 'cliente', // Forzado por seguridad
                'name'          => trim($input['name']),
                'email'         => trim($input['email']),
                'password_hash' => $hashedPassword,
                'is_active'     => isset($input['is_active']) ? (int)$input['is_active'] : 1
            ]);

            // AUDITORÍA
            AuditLogger::log('usuario_creado', 'user', $newUserId, null, [
                'role'      => 'cliente',
                'client_id' => $input['client_id'],
                'nombre'      => trim($input['name']),
                'email'     => trim($input['email'])
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
            echo json_encode(['success' => false, 'message' => 'Error al crear el usuario.', 'data' => null, 'errors' => null]);
        }
    }

    // Actualizar un usuario existente (PUT /api/users/(\d+))
    public function update($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if ($actorRole === 'cliente') {
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

            // ESCUDO DE PERMISOS
            $clientModel = new Client();
            if (!$clientModel->getDetailsById($user['client_id'], $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre la empresa de este usuario']);
                return;
            }

            // Validar email si se está cambiando
            if (!empty($input['email']) && trim($input['email']) !== $user['email']) {
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
            $changes = [];

            if (isset($input['name'])) {
                $newName = trim($input['name']);
                $updateData['name'] = $newName;
                if ($newName !== $user['name']) {
                    $changes['name'] = ['antes' => $user['name'], 'despues' => $newName];
                }
            }

            if (isset($input['email'])) {
                $newEmail = trim($input['email']);
                $updateData['email'] = $newEmail;
                if ($newEmail !== $user['email']) {
                    $changes['email'] = ['antes' => $user['email'], 'despues' => $newEmail];
                }
            }

            if (isset($input['client_id']) && !empty($input['client_id'])) {
                $newClientId = (int)$input['client_id'];
                if ($newClientId !== (int)$user['client_id']) {
                    // Validar permisos sobre la NUEVA empresa
                    if (!$clientModel->getDetailsById($newClientId, $actorUserId, $actorRole)) {
                        http_response_code(403);
                        echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre la nueva empresa seleccionada']);
                        return;
                    }
                    $updateData['client_id'] = $newClientId;
                    $changes['client_id'] = ['antes' => (int)$user['client_id'], 'despues' => $newClientId];
                }
            }

            if (isset($input['is_active'])) {
                $newStatus = (int)$input['is_active'];
                $updateData['is_active'] = $newStatus;
                if ($newStatus !== (int)$user['is_active']) {
                    $changes['is_active'] = ['antes' => (int)$user['is_active'], 'despues' => $newStatus];
                }
            }

            if (!empty($input['password'])) {
                $updateData['password_hash'] = password_hash($input['password'], PASSWORD_DEFAULT);
                $changes['password'] = 'cambiada';
            }

            $updated = $userModel->update($id, $updateData);

            if ($updated) {
                // AUDITORÍA
                if (!empty($changes)) {
                    $actionKey = 'usuario_actualizado';
                    if (isset($changes['is_active'])) {
                        $actionKey = ($updateData['is_active'] === 0) ? 'usuario_desactivado' : 'usuario_reactivado';
                    }
                    AuditLogger::log($actionKey, 'user', $id, null, ['changes' => $changes]);
                }

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
            echo json_encode(['success' => false, 'message' => 'Error al actualizar el usuario.', 'data' => null, 'errors' => null]);
        }
    }

    // Eliminar lógicamente un usuario (DELETE /api/users/(\d+))
    public function destroy($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if ($actorRole === 'cliente') {
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
            $user = $userModel->findByIdWithInactive($id);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado o ya eliminado', 'data' => null, 'errors' => null]);
                return;
            }

            // ESCUDO DE PERMISOS
            $clientModel = new Client();
            if (!$clientModel->getDetailsById($user['client_id'], $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre este usuario']);
                return;
            }

            $deleted = $userModel->delete($id);

            if ($deleted) {
                // AUDITORÍA
                AuditLogger::log('usuario_eliminado', 'user', $id);

                echo json_encode([
                    'success' => true,
                    'message' => 'Usuario eliminado correctamente',
                    'data'    => ['id' => $id],
                    'errors'  => null
                ]);
            } else {
                throw new Exception("Error interno en base de datos al borrar");
            }

        } catch (Exception $e) {
            error_log('UserController::destroy - ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar usuario.', 'data' => null, 'errors' => null]);
        }
    }
}