<?php
// app/Controllers/AuthController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Models/Audit.php';
require_once APP_PATH . '/Services/AuditLogger.php';

class AuthController {

    // Devuelvo el token CSRF para que el front lo guarde y lo use en fetch
    public function getCsrfToken() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        
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
     * Devuelve los datos del usuario actual desde la sesión PHP.
     * Permite al frontend recuperar la sesión cuando sessionStorage se pierde
     * (ej: al cerrar y reabrir pestaña).
     */
    public function me() {
        // Delegamos toda la capa de seguridad (sesión, timeout, inactividad) al middleware central.
        // Si la sesión es inválida o ha caducado, el middleware abortará y enviará el 401 automáticamente.
        AuthMiddleware::check();

        header('Content-Type: application/json; charset=utf-8');

        // Llegados a este punto, la sesión es 100% válida.
        $userModel = new User();
        
        // Realizamos un JOIN para obtener el nombre de la empresa
        $db = Database::getInstance()->getConnection();
        $sql = "SELECT u.id, u.name, u.role, u.created_at, c.name as client_name 
                FROM users u 
                LEFT JOIN clients c ON u.client_id = c.id 
                WHERE u.id = :id AND u.deleted_at IS NULL";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(['id' => $_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            session_unset();
            session_destroy();
            $this->sendResponse(401, false, 'Usuario no encontrado.', null, ['auth' => 'Usuario inválido']);
            return;
        }

        $this->sendResponse(200, true, 'Sesión activa', [
            'id'          => $user['id'],
            'name'        => $user['name'],
            'role'        => $user['role'],
            'client_name' => $user['client_name'],
            'created_at'  => $user['created_at']
        ], null);
    }

    public function showLogin() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        if (isset($_SESSION['user_id'])) {
            $baseUrl = $_ENV['APP_BASE_URL'] ?? '/steelinox';
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
    
    public function login() {
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->sendResponse(405, false, 'Método no permitido', null, ['method' => 'Se esperaba POST']);
            return;
        }

        if (session_status() === PHP_SESSION_NONE) session_start();

        $input = json_decode(file_get_contents('php://input'), true);
        
        // --- SANITIZACIÓN ---
        $email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
        $password = $input['password'] ?? ''; 
        $ip = $_SERVER['REMOTE_ADDR'];
        // --------------------

        // --- RATE LIMITING REAL (A prueba de Bots) ---
        $auditModel = new Audit();
        $failedAttempts = $auditModel->countRecentFailedLogins($ip, 15);

        if ($failedAttempts >= 5) {
            AuditLogger::log('ip_bloqueada', 'system', 0, null, ['ip' => $ip, 'email_intentado' => $email]);

            $this->sendResponse(429, false, 'Demasiados intentos fallidos. Cuenta bloqueada temporalmente.', null, ['rate_limit' => 'Inténtelo de nuevo en 15 minutos']);
            return;
        }
        // --- FIN RATE LIMITING ---

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
            
            session_regenerate_id(true);

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['client_id'] = $user['client_id'];
            
            // last_login_at
            $userModel->updateLastLogin($user['id']);

            // AUDITORÍA: Login exitoso
            AuditLogger::log('login_exitoso', 'user', $user['id']);

            $this->sendResponse(200, true, 'Login correcto', [
                'id'   => $user['id'],
                'name' => $user['name'],
                'role' => $user['role']
            ], null);
        } else {
            // AUDITORÍA: Login fallido (entity_id = 0). 
            AuditLogger::log('login_fallido', 'system', 0, null, ['email_intentado' => $email]);

            $this->sendResponse(401, false, 'Credenciales incorrectas', null, ['auth' => 'Email o contraseña inválidos']);
        }
    }
    
    public function logout() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        
        // AUDITORÍA
        if (isset($_SESSION['user_id'])) {
            AuditLogger::log('logout', 'user', $_SESSION['user_id']);
        }

        session_unset();
        session_destroy();
        
        $this->sendResponse(200, true, 'Sesión cerrada', null, null);
    }

    // Helpers internos
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