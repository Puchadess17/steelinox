<?php
// app/Controllers/CommercialController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Policies/UserPolicy.php';
require_once APP_PATH . '/Services/AuditLogger.php';
require_once APP_PATH . '/Helpers/PaginationHelper.php';
require_once APP_PATH . '/Services/ErrorLogger.php';
require_once APP_PATH . '/Requests/CommercialRequest.php';

class CommercialController {

    public function index() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!UserPolicy::canManageCommercials($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Solo administradores']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        try {
            [$page, $limit, $offset] = PaginationHelper::getParams();

            $filters = [
                'search' => isset($_GET['search']) ? htmlspecialchars(trim($_GET['search']), ENT_QUOTES, 'UTF-8') : null,
                'status' => isset($_GET['status']) ? htmlspecialchars(trim($_GET['status']), ENT_QUOTES, 'UTF-8') : 'all'
            ];
            
            $userModel = new User();
            $result = $userModel->getCommercialsWithStats($limit, $offset, $filters);

            echo json_encode([
                'success' => true,
                'message' => 'Lista de comerciales recuperada',
                'data'    => [
                    'kpis' => $result['kpis'],
                    'list' => $result['data']
                ],
                'pagination' => PaginationHelper::format($result['total'], $limit, $page),
                'errors'  => null
            ]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'CommercialController::index');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    public function store() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!UserPolicy::canManageCommercials($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Solo administradores']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba POST', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
        $request = new CommercialRequest();
        
        if (!$request->validateStore()) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
            return;
        }

        try {
            $cleanName = $request->sanitizeName($request->input('name'));
            $cleanEmail = strtolower(trim($request->input('email')));


            $userModel = new User();
            if ($userModel->emailExists($cleanEmail)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => ['email' => 'Este correo electrónico ya está registrado en el sistema.']]);
                return;
            }

            $randomPassword = bin2hex(random_bytes(8));
            $hashedPassword = password_hash($randomPassword, PASSWORD_DEFAULT);
            $isActive = $request->input('is_active') !== null ? (int)$request->input('is_active') : 1;

            $newUserId = $userModel->createInternalUser([
                'role'          => 'comercial',
                'name'          => $cleanName,
                'email'         => $cleanEmail,
                'password_hash' => $hashedPassword,
                'is_active'     => $isActive
            ]);

            AuditLogger::log('usuario_creado', 'user', $newUserId, null, [
                'role'      => 'comercial',
                'nombre'    => $cleanName,
                'email'     => $cleanEmail,
                'es_activo' => $isActive
            ]);

            // Generar token para reset password inicial
            $token = bin2hex(random_bytes(32));
            $userModel->setResetToken($cleanEmail, $token, '24 HOUR');
            $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? ((isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]/steelinox"), '/');
            $resetUrl = $baseUrl . "/password/reset?token=" . $token;

            require_once APP_PATH . '/Services/NotificationService.php';
            NotificationService::queueUserEvent($newUserId, 'alta_usuario', $cleanEmail, [
                'nombre'    => $cleanName,
                'email'     => $cleanEmail,
                'reset_url' => $resetUrl
            ]);

            http_response_code(201);
            echo json_encode(['success' => true, 'message' => 'Comercial creado', 'data' => ['id' => $newUserId], 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'CommercialController::store');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    public function update($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!UserPolicy::canManageCommercials($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Solo administradores']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba PUT', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $userModel = new User();
            $oldData = $userModel->getCommercialDetails($id);
            
            if (!$oldData) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Comercial no encontrado', 'data' => null, 'errors' => ['id' => 'Usuario inválido']]);
                return;
            }

            // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
            $request = new CommercialRequest();
            if (!$request->validateUpdate($oldData['email'])) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            $newName = $request->input('name') !== null ? $request->sanitizeName($request->input('name')) : $oldData['name'];
            $newEmail = $request->input('email') !== null ? strtolower(trim($request->input('email'))) : $oldData['email'];
            
            if ($newEmail !== $oldData['email'] && $userModel->emailExists($newEmail, $id)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => ['email' => 'Este correo electrónico ya pertenece a otra cuenta.']]);
                return;
            }

            $hashedPassword = null;
            $passwordChanged = false;
            if (!empty($request->input('password'))) {
                $hashedPassword = password_hash($request->input('password'), PASSWORD_DEFAULT);
                $passwordChanged = true;
            }

            $newIsActive = $request->input('is_active') !== null ? (int)$request->input('is_active') : (int)$oldData['is_active'];

            $changes = [];
            if ($oldData['name'] !== $newName) $changes['name'] = ['antes' => $oldData['name'], 'despues' => $newName];
            if ($oldData['email'] !== $newEmail) $changes['email'] = ['antes' => $oldData['email'], 'despues' => $newEmail];
            if ((int)$oldData['is_active'] !== $newIsActive) $changes['is_active'] = ['antes' => (int)$oldData['is_active'], 'despues' => $newIsActive];
            if ($passwordChanged) $changes['password'] = 'cambiada';

            $updated = $userModel->updateInternalUser($id, [
                'name'          => $newName,
                'email'         => $newEmail,
                'password_hash' => $hashedPassword,
                'is_active'     => $newIsActive
            ]);

            if ($updated) {
                if (!empty($changes)) {
                    $actionKey = 'usuario_actualizado';
                    if (isset($changes['is_active'])) {
                        $actionKey = ($newIsActive === 0) ? 'usuario_desactivado' : 'usuario_reactivado';
                    }
                    AuditLogger::log($actionKey, 'user', $id, null, ['cambios' => $changes]);
                }
                echo json_encode(['success' => true, 'message' => 'Comercial actualizado correctamente', 'data' => ['id' => $id], 'errors' => null]);
            } else {
                throw new Exception("No se encontró al comercial o no hubo cambios");
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'CommercialController::update');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    public function destroy($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!UserPolicy::canManageCommercials($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Solo administradores']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba DELETE', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            if ((int)$id === (int)$_SESSION['user_id']) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No puedes eliminar tu propia cuenta', 'data' => null, 'errors' => ['user' => 'Auto-borrado bloqueado']]);
                return;
            }

            $userModel = new User();
            $deleted = $userModel->softDelete($id);

            if ($deleted) {
                AuditLogger::log('usuario_borrado', 'user', $id);
                echo json_encode(['success' => true, 'message' => 'Comercial eliminado correctamente', 'data' => null, 'errors' => null]);
            } else {
                throw new Exception("No se pudo eliminar el registro");
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'CommercialController::destroy');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    public function show($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!UserPolicy::canManageCommercials($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Solo administradores']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba GET', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $userModel = new User();
            $commercialInfo = $userModel->getCommercialDetails($id);
            
            if (!$commercialInfo) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Comercial no encontrado', 'data' => null, 'errors' => ['id' => 'Usuario no válido']]);
                return;
            }

            $projectsList = $userModel->getCommercialProjects($id);

            echo json_encode([
                'success' => true,
                'message' => 'Detalles recuperados',
                'data'    => ['info' => $commercialInfo, 'projects' => $projectsList],
                'errors'  => null
            ]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'CommercialController::show');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }
}