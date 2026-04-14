<?php
// app/Controllers/UserController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Models/Client.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php'; 
require_once APP_PATH . '/Helpers/PaginationHelper.php';

class UserController {

    // Listar usuarios clientes (GET /api/users)
    public function index() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        $actorUserId = $_SESSION['user_id'];
        $actorRole = $_SESSION['role'];

        if ($actorRole === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Privilegios insuficientes']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        try {
            // Extraemos los parámetros de paginación
            [$page, $limit, $offset] = PaginationHelper::getParams();

            // 2. Extraemos filtros extra y ordenación
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
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
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
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Privilegios insuficientes']]);
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

            // ESCUDO DE PERMISOS
            $clientModel = new Client();
            if (!$clientModel->getDetailsById($user['client_id'], $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre la empresa de este usuario', 'data' => null, 'errors' => ['permissions' => 'Denegado']]);
                return;
            }

            unset($user['password_hash']); // Nunca enviamos el hash al front

            echo json_encode(['success' => true, 'message' => 'Detalle recuperado', 'data' => $user, 'errors' => null]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
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

        // --- SANITIZACIÓN PRE-VALIDACIÓN ---
        $cleanName = isset($input['name']) ? $this->sanitizeName($input['name']) : '';
        $cleanEmail = isset($input['email']) ? strtolower(trim($input['email'])) : '';
        // -----------------------------------

        if (empty($cleanName)) $errors['name'] = 'El nombre es obligatorio.';
        if (empty($cleanEmail)) {
            $errors['email'] = 'El email es obligatorio.';
        } elseif (!preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $cleanEmail)) {
            $errors['email'] = 'El formato del email no es válido.';
        }
        
        if (empty($input['password'])) {
            $errors['password'] = 'La contraseña es obligatoria.';
        } else {
            $pwdCheck = $this->validatePasswordPolicy($input['password'], $cleanEmail);
            if ($pwdCheck !== true) {
                $errors['password'] = $pwdCheck;
            }
        }
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
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre esta empresa', 'data' => null, 'errors' => ['client_id' => 'Denegado']]);
                return;
            }

            $userModel = new User();

            // Verificar si el email ya existe usando el email sanitizado
            if ($userModel->emailExists($cleanEmail)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => ['email' => 'El email ya está en uso.']]);
                return;
            }

            $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);

            $newUserId = $userModel->create([
                'client_id'     => $input['client_id'],
                'role'          => 'cliente', // Forzado por seguridad
                'name'          => $cleanName,
                'email'         => $cleanEmail,
                'password_hash' => $hashedPassword,
                'is_active'     => isset($input['is_active']) ? (int)$input['is_active'] : 1
            ]);

            // AUDITORÍA
            AuditLogger::log('usuario_creado', 'user', $newUserId, null, [
                'role'      => 'cliente',
                'client_id' => $input['client_id'],
                'nombre'    => $cleanName,
                'email'     => $cleanEmail
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
            echo json_encode(['success' => false, 'message' => 'Error al crear el usuario.', 'data' => null, 'errors' => ['server' => 'Error al guardar']]);
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
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre la empresa de este usuario', 'data' => null, 'errors' => ['permissions' => 'Denegado']]);
                return;
            }

            $updateData = [];
            $changes = [];

            // --- SANITIZACIÓN Y VALIDACIÓN AL ACTUALIZAR ---
            if (isset($input['name'])) {
                $newName = $this->sanitizeName($input['name']);
                if (empty($newName)) {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => ['name' => 'El nombre es obligatorio.']]);
                    return;
                }
                $updateData['name'] = $newName;
                if ($newName !== $user['name']) {
                    $changes['name'] = ['antes' => $user['name'], 'despues' => $newName];
                }
            }

            if (isset($input['email'])) {
                $newEmail = strtolower(trim($input['email']));
                if (empty($newEmail) || !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Email no válido', 'data' => null, 'errors' => ['email' => 'Email no válido.']]);
                    return;
                }
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

            if (isset($input['client_id']) && !empty($input['client_id'])) {
                $newClientId = (int)$input['client_id'];
                if ($newClientId !== (int)$user['client_id']) {
                    // Validar permisos sobre la NUEVA empresa
                    if (!$clientModel->getDetailsById($newClientId, $actorUserId, $actorRole)) {
                        http_response_code(403);
                        echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre la nueva empresa seleccionada', 'data' => null, 'errors' => ['client_id' => 'Denegado']]);
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
                $emailToCompare = isset($newEmail) ? $newEmail : $user['email'];
                $pwdCheck = $this->validatePasswordPolicy($input['password'], $emailToCompare);
                
                if ($pwdCheck !== true) {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => ['password' => $pwdCheck]]);
                    return;
                }
                
                $updateData['password_hash'] = password_hash($input['password'], PASSWORD_DEFAULT);
                $changes['password'] = 'cambiada';
            }

            // Si hay datos para actualizar
            if (!empty($updateData)) {
                $updated = $userModel->update($id, $updateData);

                if ($updated) {
                    // AUDITORÍA
                    if (!empty($changes)) {
                        $actionKey = 'usuario_actualizado';
                        if (isset($changes['is_active'])) {
                            $actionKey = ($updateData['is_active'] === 0) ? 'usuario_desactivado' : 'usuario_reactivado';
                        }
                        AuditLogger::log($actionKey, 'user', $id, null, ['cambios' => $changes]);
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
            } else {
                // Si no enviaron nada distinto, lo damos por bueno
                echo json_encode([
                    'success' => true,
                    'message' => 'No hubo cambios que actualizar',
                    'data'    => ['id' => $id],
                    'errors'  => null
                ]);
            }

        } catch (Exception $e) {
            error_log('UserController::update - ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar el usuario.', 'data' => null, 'errors' => ['server' => 'Error de base de datos']]);
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
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado o ya eliminado', 'data' => null, 'errors' => ['user' => 'Inaccesible']]);
                return;
            }

            // ESCUDO DE PERMISOS
            $clientModel = new Client();
            if (!$clientModel->getDetailsById($user['client_id'], $actorUserId, $actorRole)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permisos sobre este usuario', 'data' => null, 'errors' => ['permissions' => 'Denegado']]);
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
            echo json_encode(['success' => false, 'message' => 'Error al eliminar usuario.', 'data' => null, 'errors' => ['server' => 'Error al borrar']]);
        }
    }

    /** Helper privado para validar la política de contraseñas */
    private function validatePasswordPolicy($password, $email) {
        if (strlen($password) < 8) return 'La contraseña debe tener al menos 8 caracteres.';
        if (!preg_match('/[A-Z]/', $password)) return 'La contraseña debe incluir al menos una letra mayúscula.';
        if (!preg_match('/[a-z]/', $password)) return 'La contraseña debe incluir al menos una letra minúscula.';
        if (!preg_match('/[0-9]/', $password)) return 'La contraseña debe incluir al menos un número.';
        
        if (!empty($email)) {
            $emailPrefix = explode('@', $email)[0];
            if (strcasecmp($password, $emailPrefix) === 0) {
                return 'La contraseña no puede ser igual a la primera parte de tu correo electrónico.';
            }
        }
        return true;
    }

    /** Helper privado para limpiar y formatear nombres */
    private function sanitizeName($name) {
        if (empty($name)) return '';
        
        $name = trim($name);
        
        // Reemplazar múltiples espacios en medio por un solo espacio
        $name = preg_replace('/\s+/', ' ', $name);
        
        // Poner SOLO la primera letra en mayúscula y respetar el resto (Evita destrozar siglas como S.L.)
        $firstChar = mb_strtoupper(mb_substr($name, 0, 1, "UTF-8"), "UTF-8");
        $restOfText = mb_substr($name, 1, null, "UTF-8");
        $name = $firstChar . $restOfText;
        
        // Sanitización XSS
        return htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    }
}