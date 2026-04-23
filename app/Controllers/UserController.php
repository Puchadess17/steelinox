<?php
// app/Controllers/UserController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Models/Client.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Policies/UserPolicy.php';
require_once APP_PATH . '/Services/AuditLogger.php'; 
require_once APP_PATH . '/Helpers/PaginationHelper.php';
require_once APP_PATH . '/Services/ErrorLogger.php';
require_once APP_PATH . '/Requests/UserRequest.php';

class UserController {

    public function index() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if (!UserPolicy::canManageClientUsers($actorRole)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Privilegios insuficientes']]);
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
                'search'   => isset($_GET['search']) ? htmlspecialchars(trim($_GET['search']), ENT_QUOTES, 'UTF-8') : null,
                'status'   => isset($_GET['status']) ? htmlspecialchars(trim($_GET['status']), ENT_QUOTES, 'UTF-8') : 'all',
                'sort_by'  => isset($_GET['sort_by']) ? htmlspecialchars(trim($_GET['sort_by']), ENT_QUOTES, 'UTF-8') : 'created_at',
                'sort_dir' => isset($_GET['sort_dir']) ? htmlspecialchars(trim($_GET['sort_dir']), ENT_QUOTES, 'UTF-8') : 'desc'
            ];
            
            $userModel = new User();
            $result = $userModel->getClientUsersList($actorUserId, $actorRole, $limit, $offset, $filters);

            echo json_encode([
                'success' => true, 
                'message' => 'Usuarios recuperados correctamente',
                'data' => [
                    'list' => $result['data'],
                    'kpis' => $result['kpis']
                ],
                'pagination' => PaginationHelper::format($result['total'], $limit, $page),
                'errors' => null
            ]);
        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'UserController::index');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al cargar la lista de usuarios']]);
        }
    }

    public function show($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if (!UserPolicy::canManageClientUsers($actorRole)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Privilegios insuficientes']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        try {
            $userModel = new User();
            $user = $userModel->findByIdWithInactive($id);

            if (!$user || $user['role'] !== 'cliente') {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado', 'data' => null, 'errors' => ['user' => 'Inaccesible']]);
                return;
            }

            $clientModel = new Client();
            if (!$clientModel->getDetailsById($user['client_id'], $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre la empresa de este usuario', 'data' => null, 'errors' => ['permissions' => 'Denegado']]);
                return;
            }

            unset($user['password_hash']);

            echo json_encode(['success' => true, 'message' => 'Detalle recuperado', 'data' => $user, 'errors' => null]);
        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'UserController::show');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al cargar el detalle del usuario']]);
        }
    }

    public function store() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if (!UserPolicy::canManageClientUsers($actorRole)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Permisos insuficientes']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba POST']]);
            return;
        }

        // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
        $request = new UserRequest();
        
        if (!$request->validateStore()) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
            return;
        }

        try {
            $cleanName = $request->sanitizeName($request->input('name'));
            $cleanEmail = strtolower(trim($request->input('email')));
            $clientId = (int)$request->input('client_id');
            $clientId = (int)$request->input('client_id');

            $clientModel = new Client();
            if (!$clientModel->getDetailsById($clientId, $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre esta empresa', 'data' => null, 'errors' => ['client_id' => 'Denegado']]);
                return;
            }

            $userModel = new User();

            if ($userModel->emailExists($cleanEmail)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => ['email' => 'El email ya está en uso.']]);
                return;
            }

            $randomPassword = bin2hex(random_bytes(8));
            $hashedPassword = password_hash($randomPassword, PASSWORD_DEFAULT);

            $newUserId = $userModel->create([
                'client_id'     => $clientId,
                'role'          => 'cliente',
                'name'          => $cleanName,
                'email'         => $cleanEmail,
                'password_hash' => $hashedPassword,
                'is_active'     => $request->input('is_active') !== null ? (int)$request->input('is_active') : 1
            ]);

            AuditLogger::log('usuario_creado', 'user', $newUserId, null, [
                'role'      => 'cliente',
                'client_id' => $clientId,
                'nombre'    => $cleanName,
                'email'     => $cleanEmail
            ]);

            // Generar token para reset password inicial
            $token = bin2hex(random_bytes(32));
            $userModel->setResetToken($cleanEmail, $token, '24 HOUR');
            $resetUrl = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]/steelinox/password/reset?token=" . $token;

            require_once APP_PATH . '/Services/NotificationService.php';
            NotificationService::queueUserEvent($newUserId, 'alta_usuario', $cleanEmail, [
                'nombre'    => $cleanName,
                'email'     => $cleanEmail,
                'reset_url' => $resetUrl
            ]);

            echo json_encode(['success' => true, 'message' => 'Usuario creado correctamente y credenciales enviadas.', 'data' => ['id' => $newUserId], 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'UserController::store');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al guardar']]);
        }
    }

    public function update($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if (!UserPolicy::canManageClientUsers($actorRole)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Permisos insuficientes']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba PUT']]);
            return;
        }

        try {
            $userModel = new User();
            $user = $userModel->findByIdWithInactive($id);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado', 'data' => null, 'errors' => ['user' => 'Recurso inaccesible']]);
                return;
            }

            $clientModel = new Client();
            if (!$clientModel->getDetailsById($user['client_id'], $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre la empresa de este usuario', 'data' => null, 'errors' => ['permissions' => 'Denegado']]);
                return;
            }

            // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
            $request = new UserRequest();
            if (!$request->validateUpdate($user['email'])) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            $updateData = [];
            $changes = [];

            if ($request->input('name') !== null) {
                $newName = $request->sanitizeName($request->input('name'));
                $updateData['name'] = $newName;
                if ($newName !== $user['name']) {
                    $changes['name'] = ['antes' => $user['name'], 'despues' => $newName];
                }
            }

            if ($request->input('email') !== null) {
                $newEmail = strtolower(trim($request->input('email')));
                if ($newEmail !== $user['email']) {
                    if ($userModel->emailExists($newEmail, $id)) {
                        http_response_code(422);
                        echo json_encode(['success' => false, 'message' => 'Email en uso', 'data' => null, 'errors' => ['email' => 'El email ya está en uso.']]);
                        return;
                    }
                    $updateData['email'] = $newEmail;
                    $changes['email'] = ['antes' => $user['email'], 'despues' => $newEmail];
                }
            }

            if ($request->input('client_id') !== null && $request->input('client_id') !== '') {
                $newClientId = (int)$request->input('client_id');
                if ($newClientId !== (int)$user['client_id']) {
                    if (!$clientModel->getDetailsById($newClientId, $actorUserId, $actorRole)) {
                        http_response_code(403);
                        echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre la nueva empresa seleccionada', 'data' => null, 'errors' => ['client_id' => 'Denegado']]);
                        return;
                    }
                    $updateData['client_id'] = $newClientId;
                    $changes['client_id'] = ['antes' => (int)$user['client_id'], 'despues' => $newClientId];
                }
            }

            if ($request->input('is_active_sent') !== null) {
                $newStatus = $request->input('is_active') !== null ? 1 : 0;
                $updateData['is_active'] = $newStatus;
                if ($newStatus !== (int)$user['is_active']) {
                    $changes['is_active'] = ['antes' => (int)$user['is_active'], 'despues' => $newStatus];
                }
            }

            if (!empty($request->input('password'))) {
                $updateData['password_hash'] = password_hash($request->input('password'), PASSWORD_DEFAULT);
                $changes['password'] = 'cambiada';
            }

            if (!empty($updateData)) {
                $updated = $userModel->update($id, $updateData);

                if ($updated) {
                    if (!empty($changes)) {
                        $actionKey = 'usuario_actualizado';
                        if (isset($changes['is_active'])) {
                            $actionKey = ($updateData['is_active'] === 0) ? 'usuario_desactivado' : 'usuario_reactivado';
                        }
                        AuditLogger::log($actionKey, 'user', $id, null, ['cambios' => $changes]);
                    }

                    echo json_encode(['success' => true, 'message' => 'Usuario actualizado correctamente', 'data' => ['id' => $id], 'errors' => null]);
                } else {
                    throw new Exception("No se pudo actualizar el usuario.");
                }
            } else {
                echo json_encode(['success' => true, 'message' => 'No hubo cambios que actualizar', 'data' => ['id' => $id], 'errors' => null]);
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'UserController::update');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error de base de datos']]);
        }
    }

    public function destroy($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if (!UserPolicy::canManageClientUsers($actorRole)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Permisos insuficientes']]);
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
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado o ya eliminado', 'data' => null, 'errors' => ['user' => 'Inaccesible']]);
                return;
            }

            $clientModel = new Client();
            if (!$clientModel->getDetailsById($user['client_id'], $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre este usuario', 'data' => null, 'errors' => ['permissions' => 'Denegado']]);
                return;
            }

            $deleted = $userModel->delete($id);

            if ($deleted) {
                AuditLogger::log('usuario_eliminado', 'user', $id);
                echo json_encode(['success' => true, 'message' => 'Usuario eliminado correctamente', 'data' => ['id' => $id], 'errors' => null]);
            } else {
                throw new Exception("Error interno en base de datos al borrar");
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'UserController::destroy');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al borrar']]);
        }
    }

    public function updatePassword() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba PUT']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $userModel = new User();
            $user = $userModel->findByIdWithInactive($userId);

            // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
            $request = new UserRequest();
            if (!$request->validatePasswordChange($user['email'] ?? '')) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Datos inválidos', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            if (!$user || !password_verify($request->input('current_password'), $user['password_hash'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta', 'data' => null, 'errors' => ['current_password' => 'La contraseña actual no es correcta.']]);
                return;
            }

            $hashedPassword = password_hash($request->input('new_password'), PASSWORD_DEFAULT);
            $updated = $userModel->update($userId, ['password_hash' => $hashedPassword]);

            if ($updated) {
                AuditLogger::log('password_cambiada', 'user', $userId);

                require_once APP_PATH . '/Services/NotificationService.php';
                NotificationService::queueUserEvent($userId, 'cambio_password_seguridad', $user['email'], [
                    'nombre' => $user['name']
                ]);

                echo json_encode(['success' => true, 'message' => 'Contraseña actualizada correctamente.', 'data' => null, 'errors' => null]);
            } else {
                throw new Exception("Error al guardar en base de datos.");
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'UserController::updatePassword');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al cambiar contraseña']]);
        }
    }

    public function updateProfile() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba PUT']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $userModel = new User();
            $user = $userModel->findByIdWithInactive($userId);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado', 'data' => null, 'errors' => ['user' => 'Sesión inválida']]);
                return;
            }

            $request = new UserRequest();
            if (!$request->validateUpdate($user['email'])) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            $updateData = [];
            if ($request->input('name') !== null) {
                $newName = $request->sanitizeName($request->input('name'));
                if ($newName === $user['name']) {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'El nuevo nombre no puede ser igual al actual.', 'data' => null, 'errors' => ['name' => 'El nombre es igual al actual.']]);
                    return;
                }
                $updateData['name'] = $newName;
            }

            if (!empty($updateData)) {
                $updated = $userModel->update($userId, $updateData);
                if ($updated) {
                    AuditLogger::log('usuario_actualizado', 'user', $userId, null, [
                        'antes' => ['name' => $user['name']],
                        'despues' => $updateData
                    ]);
                    echo json_encode(['success' => true, 'message' => 'Perfil actualizado correctamente', 'data' => ['name' => $updateData['name']]]);
                } else {
                    throw new Exception("Error al actualizar en DB.");
                }
            } else {
                echo json_encode(['success' => true, 'message' => 'No hay cambios']);
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'UserController::updateProfile');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
        }
    }
}