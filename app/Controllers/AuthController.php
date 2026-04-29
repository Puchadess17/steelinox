<?php
// app/Controllers/AuthController.php

/**
 * AUTH CONTROLLER (AUTENTICACIÓN Y SESIONES)
 * ====================
 * Gestiona el ciclo de vida completo del usuario autenticado:
 * emisión del token CSRF, login, logout y consulta del usuario en sesión.
 * Es el primer controlador que ejecuta el frontend al cargar la aplicación.
 */
require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Models/Audit.php';
require_once APP_PATH . '/Services/AuditLogger.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/NotificationService.php';

class AuthController {

    /**
     * EMISIÓN DEL TOKEN CSRF (GET /api/csrf-token)
     * Genera (si no existe) un token aleatorio de 64 caracteres hexadecimales
     * y lo persiste en sesión. El frontend lo solicita al iniciar la app
     * y lo adjunta en la cabecera X-CSRF-TOKEN de cada petición mutante.
     */
    public function getCsrfToken() {
        if (session_status() === PHP_SESSION_NONE) @session_start();
        
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'message' => 'Token generado',
            'data'    => ['csrf_token' => $_SESSION['csrf_token']],
            'errors'  => null
        ]);
    }

    /**
     * CONSULTA DE SESIÓN ACTIVA (GET /api/me)
     * Devuelve los datos del usuario actualmente logueado.
     * Permite al frontend reconstruir el contexto de sesión cuando
     * sessionStorage se pierde (p. ej., al cerrar y reabrir la pestaña).
     * El middleware valida sesión, timeout e inactividad antes de llegar aquí.
     */
    public function me() {
        // Delega toda la capa de seguridad al middleware central.
        // Si la sesión es inválida o ha caducado, el middleware aborta con 401.
        AuthMiddleware::check();

        header('Content-Type: application/json; charset=utf-8');

        $userModel = new User();
        
        // JOIN con clients para obtener también el nombre de la empresa del usuario
        $db = Database::getInstance()->getConnection();
        $sql = "SELECT u.id, u.name, u.email, u.role, u.created_at, c.name as client_name 
                FROM users u 
                LEFT JOIN clients c ON u.client_id = c.id 
                WHERE u.id = :id AND u.deleted_at IS NULL";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(['id' => $_SESSION['user_id']]);
        $user = $stmt->fetch();

        // Si el usuario fue eliminado mientras tenía sesión activa, la destruimos
        if (!$user) {
            session_unset();
            session_destroy();
            $this->sendResponse(401, false, 'Usuario no encontrado.', null, ['auth' => 'Usuario inválido']);
            return;
        }

        $this->sendResponse(200, true, 'Sesión activa', [
            'id'          => $user['id'],
            'name'        => $user['name'],
            'email'       => $user['email'],
            'role'        => $user['role'],
            'client_name' => $user['client_name'],
            'created_at'  => $user['created_at']
        ], null);
    }

    /**
     * RENDERIZADO DE LA VISTA DE LOGIN (GET /)
     * Si el usuario ya tiene sesión activa, lo redirige directamente al panel.
     * Si no, sirve la vista login.php que contiene el formulario de acceso.
     */
    public function showLogin() {
        if (session_status() === PHP_SESSION_NONE) @session_start();
        if (isset($_SESSION['user_id'])) {
            $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? '/steelinox', '/');
            header('Location: ' . $baseUrl . '/panel');
            exit;
        }

        $viewPath = APP_PATH . '/Views/login.php';
        
        if (file_exists($viewPath)) {
            require_once $viewPath;
        } else {
            echo "Error: No se encuentra la vista del login.";
        }
    }
    
    /**
     * PROCESO DE LOGIN (POST /api/login)
     * Valida credenciales, aplica rate limiting basado en la IP del cliente,
     * regenera el ID de sesión (prevención de session fixation) y registra
     * el evento de auditoría (exitoso o fallido).
     */
    public function login() {
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->sendResponse(405, false, 'Método no permitido', null, ['method' => 'Se esperaba POST']);
            return;
        }

        if (session_status() === PHP_SESSION_NONE) @session_start();

        $input = json_decode(file_get_contents('php://input'), true);
        
        // SANITIZACIÓN: normalizar email a minúsculas y eliminar espacios
        $email    = isset($input['email']) ? strtolower(trim($input['email'])) : '';
        $password = $input['password'] ?? ''; 
        $ip       = $_SERVER['REMOTE_ADDR'];

        /**
         * RATE LIMITING (ANTI-FUERZA BRUTA)
         * Consulta el audit_log para contar fallos recientes desde la misma IP.
         * Si supera 5 intentos en 15 minutos, bloquea y registra el evento.
         */
        $auditModel = new Audit();
        $failedAttempts = $auditModel->countRecentFailedLogins($ip, 15);
        $failedOtps     = $auditModel->countRecentFailedOtps($ip, 15);

        if ($failedAttempts >= 5 || $failedOtps >= 3) {
            AuditLogger::log('ip_bloqueada', 'system', 0, null, [
                'ip' => $ip, 
                'email_intentado' => $email,
                'reason' => $failedOtps >= 3 ? 'Exceso de fallos OTP' : 'Exceso de fallos Login'
            ]);

            $this->sendResponse(429, false, 'Acceso bloqueado temporalmente por seguridad.', null, [
                'rate_limit' => 'Inténtelo de nuevo en 15 minutos'
            ]);
            return;
        }

        // Validación de formato de los campos recibidos
        $validationErrors = [];
        if (empty($email)) {
            $validationErrors['email'] = 'El email es obligatorio';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $validationErrors['email'] = 'El formato del email no es válido';
        }
        if (empty($password)) $validationErrors['password'] = 'La contraseña es obligatoria';

        if (!empty($validationErrors)) {
            $this->sendResponse(422, false, 'Error de validación', null, $validationErrors);
            return;
        }

        $userModel = new User();
        $user = $userModel->findByEmail($email);

        if ($user && password_verify($password, $user['password_hash'])) {

            // Verificación de cuenta activa antes de permitir el acceso
            if ((int)$user['is_active'] !== 1) {
                AuditLogger::log('login_bloqueado_inactivo', 'user', $user['id'], null, ['email' => $email]);

                $this->sendResponse(403, false, 'Su cuenta ha sido desactivada.', null, [
                    'auth' => 'Acceso denegado. Contacte con el administrador.'
                ]);
                return;
            }
            
            /**
             * FLUJO 2FA (SEGUNDO FACTOR)
             * En lugar de abrir la sesión, generamos un OTP y lo enviamos por email.
             * Guardamos el ID del usuario en una sesión temporal y "ciega".
             */
            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $userModel->setOtp($user['id'], $otp);

            // Encolar email de verificación
            NotificationService::queueUserEvent($user['id'], 'otp_login', $user['email'], ['otp' => $otp]);

            session_unset();
            session_regenerate_id(true);
            $_SESSION['otp_pending_user_id'] = $user['id'];
            $_SESSION['otp_limit_attempts']  = 0;

            $this->sendResponse(200, true, 'Se requiere verificación', [
                'requires_2fa' => true,
                'email_hint'   => substr($user['email'], 0, 3) . '...' . substr($user['email'], strpos($user['email'], '@'))
            ], null);
        } else {
            // entity_id = 0 indica que el evento no pertenece a ningún usuario concreto
            AuditLogger::log('login_fallido', 'system', 0, null, ['email_intentado' => $email]);

            $this->sendResponse(401, false, 'Credenciales incorrectas', null, ['auth' => 'Email o contraseña inválidos']);
        }
    }

    /**
     * VERIFICACIÓN DE OTP (POST /api/login/verify-otp)
     * Completa el inicio de sesión validando el código de 6 dígitos.
     */
    public function verifyOtp() {
        header('Content-Type: application/json; charset=utf-8');

        if (session_status() === PHP_SESSION_NONE) @session_start();

        if (empty($_SESSION['otp_pending_user_id'])) {
            $this->sendResponse(403, false, 'Sesión de verificación expirada o inválida.', null, ['auth' => 'Inicie sesión de nuevo']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $code  = $input['code'] ?? '';
        $userId = $_SESSION['otp_pending_user_id'];
        $ip     = $_SERVER['REMOTE_ADDR'];

        // Rate limiting de intentos de OTP (máximo 3 por IP en 15 min)
        $auditModel = new Audit();
        $failedOtps = $auditModel->countRecentFailedOtps($ip, 15);

        if ($failedOtps >= 3) {
            AuditLogger::log('ip_bloqueada_otp', 'system', 0, null, ['ip' => $ip, 'user_id' => $userId]);
            session_unset();
            session_destroy();
            $this->sendResponse(429, false, 'Demasiados intentos fallidos. Su IP ha sido bloqueada 15 minutos.', null, ['otp' => 'Límite de intentos excedido']);
            return;
        }

        if (empty($code)) {
            $this->sendResponse(422, false, 'El código es obligatorio', null, ['code' => 'Campo requerido']);
            return;
        }

        $userModel = new User();
        $user = $userModel->findByValidOtp($userId, $code);

        if ($user) {
            /**
             * ÉXITO: ABRIR SESIÓN REAL
             */
            $userModel->clearOtp($userId);
            $userModel->updateLastLogin($userId);

            // Guardar datos definitivos en sesión
            $_SESSION['user_id']       = $user['id'];
            $_SESSION['role']          = $user['role'];
            $_SESSION['client_id']     = $user['client_id'];
            $_SESSION['last_activity'] = time();
            
            // Limpiar flags de OTP
            unset($_SESSION['otp_pending_user_id']);
            unset($_SESSION['otp_limit_attempts']);

            // Regenerar ID para seguridad post-autenticación
            session_regenerate_id(true);

            AuditLogger::log('login_exitoso', 'user', $user['id'], null, ['method' => '2fa_email']);

            $this->sendResponse(200, true, 'Verificación exitosa', [
                'id'   => $user['id'],
                'name' => $user['name'],
                'role' => $user['role']
            ], null);
        } else {
            AuditLogger::log('otp_fallido', 'user', $userId, null, ['code_intentado' => $code]);
            $this->sendResponse(401, false, 'Código de verificación incorrecto o expirado.', null, ['code' => 'Código inválido']);
        }
    }
    
    /**
     * CIERRE DE SESIÓN (POST /api/logout)
     * Registra el evento, invalida la cookie de sesión en el cliente y
     * destruye completamente los datos de sesión en el servidor.
     */
    public function logout() {
        if (session_status() === PHP_SESSION_NONE) @session_start();
        
        if (isset($_SESSION['user_id'])) {
            AuditLogger::log('logout_exitoso', 'user', $_SESSION['user_id']);
        }

        /**
         * DESTRUCCIÓN PROFUNDA DE SESIÓN
         * Se vacían las variables, se elimina la cookie del navegador y se
         * destruye la sesión en el servidor. Triple garantía de limpieza.
         */
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_unset();
        session_destroy();

        $this->sendResponse(200, true, 'Sesión cerrada', null, null);
    }

    /**
     * HELPER PRIVADO DE RESPUESTA
     * Centraliza el envío de respuestas JSON con código HTTP y estructura
     * estándar { success, message, data, errors } para todos los métodos.
     */
    private function sendResponse($code, $success, $message, $data, $errors) {
        http_response_code($code);
        echo json_encode([
            'success' => $success,
            'message' => $message,
            'data'    => $data,
            'errors'  => $errors
        ]);
    }
}