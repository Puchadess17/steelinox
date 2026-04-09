<?php
// app/Controllers/CommercialController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php'; // <-- INYECTAMOS EL SERVICIO DE AUDITORÍA

class CommercialController {

    // Obtener la lista completa de comerciales para el Panel Admin (GET /api/commercials)
    public function index() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización Máxima: SOLO ADMINISTRADORES
        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'message' => 'Acceso denegado', 
                'data'    => null, 
                'errors'  => ['role' => 'Se requiere rol admin para ver la gestión de equipo']
            ]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            return;
        }

        try {
            $userModel = new User();
            $commercialsList = $userModel->getCommercialsWithStats();

            // Calcular KPIs globales
            $total = count($commercialsList);
            $activos = 0;
            
            foreach ($commercialsList as $comercial) {
                if ($comercial['is_active']) {
                    $activos++;
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'Lista de comerciales recuperada correctamente',
                'data'    => [
                    'kpis' => [
                        'total'    => $total,
                        'activos'  => $activos,
                        'inactivos'=> $total - $activos
                    ],
                    'list' => $commercialsList
                ],
                'errors'  => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al recuperar los comerciales',
                'data'    => null,
                'errors'  => ['server' => $e->getMessage()]
            ]);
        }
    }

    // Dar de alta a un nuevo comercial (POST /api/commercials)
    public function store() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // SOLO ADMINISTRADORES
        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Solo un administrador puede dar de alta a un comercial']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba POST']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $errors = [];

            // 1. Validaciones obligatorias
            if (empty($input['name'])) $errors['name'] = 'El nombre es obligatorio.';
            if (empty($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'El email es obligatorio y debe tener un formato válido.';
            }
            if (empty($input['password']) || strlen($input['password']) < 6) {
                $errors['password'] = 'La contraseña es obligatoria y debe tener al menos 6 caracteres.';
            }

            $userModel = new User();
            
            if (!isset($errors['email']) && $userModel->emailExists($input['email'])) {
                $errors['email'] = 'Este correo electrónico ya está registrado en el sistema.';
            }

            // Error-> abortamos antes de tocar la base de datos
            if (!empty($errors)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $errors]);
                return;
            }

            $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
            $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;

            // Forzando el rol 'comercial'
            $newUserId = $userModel->createInternalUser([
                'role'          => 'comercial',
                'name'          => trim($input['name']),
                'email'         => strtolower(trim($input['email'])),
                'password_hash' => $hashedPassword,
                'is_active'     => $isActive
            ]);

            // AUDITORÍA: Alta de comercial
            AuditLogger::log('usuario_creado', 'user', $newUserId, null, [
                'role'      => 'comercial',
                'nombre'      => trim($input['name']),
                'email'     => strtolower(trim($input['email'])),
                'es_activo' => $isActive
            ]);

            http_response_code(201); // 201 Created
            echo json_encode([
                'success' => true,
                'message' => 'Comercial creado y dado de alta correctamente',
                'data'    => ['id' => $newUserId],
                'errors'  => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Actualizar datos de un comercial (PUT /api/commercials/{id})
    public function update($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'errors' => ['role' => 'Solo administradores']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba PUT']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $errors = [];

            if (empty($input['name'])) $errors['name'] = 'El nombre es obligatorio.';
            if (empty($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'El email es obligatorio y válido.';
            }

            $userModel = new User();

            // Obtenemos los datos ANTES de actualizar para la auditoría
            $oldData = $userModel->getCommercialDetails($id);
            if (!$oldData) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Comercial no encontrado', 'errors' => ['id' => 'Usuario inválido']]);
                return;
            }

            // Comprobar que el email no lo esté usando OTRO usuario
            if (!isset($errors['email']) && $userModel->emailExists($input['email'], $id)) {
                $errors['email'] = 'Este correo electrónico ya pertenece a otra cuenta.';
            }

            if (!empty($errors)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'errors' => $errors]);
                return;
            }

            // Procesar contraseña opcional
            $hashedPassword = null;
            $passwordChanged = false;
            if (!empty($input['password'])) {
                if (strlen($input['password']) < 6) {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Error de validación', 'errors' => ['password' => 'Mínimo 6 caracteres']]);
                    return;
                }
                $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
                $passwordChanged = true;
            }

            $newName = trim($input['name']);
            $newEmail = strtolower(trim($input['email']));
            $newIsActive = isset($input['is_active']) ? (int)$input['is_active'] : (int)$oldData['is_active'];

            // Preparar el array de cambios para la auditoría
            $changes = [];
            if ($oldData['name'] !== $newName) {
                $changes['name'] = ['before' => $oldData['name'], 'after' => $newName];
            }
            if ($oldData['email'] !== $newEmail) {
                $changes['email'] = ['before' => $oldData['email'], 'after' => $newEmail];
            }
            if ((int)$oldData['is_active'] !== $newIsActive) {
                $changes['is_active'] = ['before' => (int)$oldData['is_active'], 'after' => $newIsActive];
            }
            if ($passwordChanged) {
                $changes['password'] = 'changed'; // Dejamos constancia sin revelar la contraseña
            }

            // Actualizar en base de datos
            $updated = $userModel->updateInternalUser($id, [
                'name'          => $newName,
                'email'         => $newEmail,
                'password_hash' => $hashedPassword,
                'is_active'     => $newIsActive
            ]);

            if ($updated) {
                
                // AUDITORÍA: Edición o Desactivación
                if (!empty($changes)) {
                    $actionKey = 'usuario_actualizado';
                    if (isset($changes['is_active'])) {
                        $actionKey = ($newIsActive === 0) ? 'usuario_desactivado' : 'usuario_reactivado';
                    }
                    AuditLogger::log($actionKey, 'user', $id, null, ['cambios' => $changes]);
                }

                echo json_encode(['success' => true, 'message' => 'Comercial actualizado correctamente', 'data' => ['id' => $id]]);
            } else {
                throw new Exception("No se encontró al comercial o no hubo cambios");
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Borrado lógico de un comercial (DELETE /api/commercials/{id})
    public function destroy($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'errors' => ['role' => 'Solo administradores']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba DELETE']);
            return;
        }

        try {
            // Protección contra auto-borrado
            if ((int)$id === (int)$_SESSION['user_id']) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No puedes eliminar tu propia cuenta', 'errors' => null]);
                return;
            }

            $userModel = new User();
            $deleted = $userModel->softDelete($id);

            if ($deleted) {
                
                // AUDITORÍA: Borrado lógico
                AuditLogger::log('usuario_borrado', 'user', $id);

                echo json_encode(['success' => true, 'message' => 'Comercial eliminado correctamente', 'data' => null]);
            } else {
                throw new Exception("No se pudo eliminar el registro");
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Obtener los detalles y proyectos de un comercial (GET /api/commercials/{id})
    public function show($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'errors' => ['role' => 'Solo administradores']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba GET']);
            return;
        }

        try {
            $userModel = new User();
            
            // Obtener datos del comercial
            $commercialInfo = $userModel->getCommercialDetails($id);
            
            if (!$commercialInfo) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Comercial no encontrado o inactivo', 'errors' => ['id' => 'Usuario no válido']]);
                return;
            }

            // Obtener su cartera de proyectos
            $projectsList = $userModel->getCommercialProjects($id);

            echo json_encode([
                'success' => true,
                'message' => 'Detalles del comercial recuperados correctamente',
                'data'    => [
                    'info'     => $commercialInfo,
                    'projects' => $projectsList
                ],
                'errors'  => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }
}