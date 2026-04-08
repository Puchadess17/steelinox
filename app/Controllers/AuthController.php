<?php
// app/Controllers/AuthController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Services/AuditLogger.php'; // <-- INYECTAMOS EL SERVICIO DE AUDITORÍA

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
        if (session_status() === PHP_SESSION_NONE) session_start();

        header('Content-Type: application/json; charset=utf-8');

        // Verificar timeout por inactividad (misma lógica que AuthMiddleware)
        if (isset($_SESSION['last_activity'])) {
            $secondsInactive = time() - $_SESSION['last_activity'];
            if ($secondsInactive >= 1800) {
                // AUDITORÍA: Timeout de sesión (Lo hacemos ANTES de destruir la sesión)
                if (isset($_SESSION['user_id'])) {
                    AuditLogger::log('auth_timeout', 'user', $_SESSION['user_id'], null, ['inactive_seconds' => $secondsInactive]);
                }

                session_unset();
                session_destroy();
                $this->sendResponse(401, false, 'Su sesión ha expirado por inactividad.', null, ['auth' => 'Sesión expirada']);
                return;
            }
        }

        if (!isset($_SESSION['user_id'])) {
            $this->sendResponse(401, false, 'No autorizado. Por favor, inicie sesión.', null, ['auth' => 'No autorizado']);
            return;
        }

        // Actualizar timestamp de actividad
        $_SESSION['last_activity'] = time();

        // Devolver datos del usuario desde la sesión
        $userModel = new User();
        $user = $userModel->findById($_SESSION['user_id']);

        if (!$user) {
            session_unset();
            session_destroy();
            $this->sendResponse(401, false, 'Usuario no encontrado.', null, ['auth' => 'Usuario inválido']);
            return;
        }

        $this->sendResponse(200, true, 'Sesión activa', [
            'id'   => $user['id'],
            'name' => $user['name'],
            'role' => $user['role']
        ], null);
    }

    public function showLogin() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        if (isset($_SESSION['user_id'])) {
            header('Location: /steelinox/panel');
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
        // Indico que devuelvo JSON
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->sendResponse(405, false, 'Método no permitido', null, ['method' => 'Se esperaba POST']);
            return;
        }

        if (session_status() === PHP_SESSION_NONE) session_start();

        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        // --- Rate Limiting
        $ip = $_SERVER['REMOTE_ADDR'];
        $rateKey = 'login_attempts_' . $ip;
        
        if (isset($_SESSION[$rateKey])) {
            $tiempoBloqueo = 900; // 15 minutos
            $intentos = $_SESSION[$rateKey]['attempts'];
            $ultimoIntento = $_SESSION[$rateKey]['last_time'];

            if ($intentos >= 5 && (time() - $ultimoIntento) < $tiempoBloqueo) {
                // AUDITORÍA: Bloqueo de IP por demasiados intentos
                AuditLogger::log('auth_lockout', 'system', null, null, ['ip' => $ip, 'email_attempted' => $email]);

                $this->sendResponse(429, false, 'Demasiados intentos fallidos. Cuenta bloqueada temporalmente.', null, ['rate_limit' => 'Inténtelo de nuevo en 15 minutos']);
                return;
            } elseif ((time() - $ultimoIntento) >= $tiempoBloqueo) {
                unset($_SESSION[$rateKey]);
            }
        }
        // --- FIN: Rate Limiting

        $validationErrors = [];
        if (empty($email)) $validationErrors['email'] = 'El email es obligatorio';
        if (empty($password)) $validationErrors['password'] = 'La contraseña es obligatoria';

        if (!empty($validationErrors)) {
            $this->sendResponse(422, false, 'Error de validación', null, $validationErrors);
            return;
        }

        $userModel = new User();
        $user = $userModel->findByEmail($email);

        if ($user && password_verify($password, $user['password_hash'])) {
            
            unset($_SESSION[$rateKey]);
            session_regenerate_id(true);

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['client_id'] = $user['client_id'];
            
            // last_login_at
            $userModel->updateLastLogin($user['id']);

            // AUDITORÍA: Login exitoso
            AuditLogger::log('auth_login_success', 'user', $user['id']);

            $this->sendResponse(200, true, 'Login correcto', [
                'id'   => $user['id'],
                'name' => $user['name'],
                'role' => $user['role']
            ], null);
        } else {
            // Login fallido--> Sumar un intento
            $_SESSION[$rateKey] = [
                'attempts' => ($_SESSION[$rateKey]['attempts'] ?? 0) + 1,
                'last_time' => time()
            ];

            // AUDITORÍA
            AuditLogger::log('auth_login_failed', 'system', null, null, ['email_attempted' => $email]);

            $this->sendResponse(401, false, 'Credenciales incorrectas', null, ['auth' => 'Email o contraseña inválidos']);
        }
    }
    
    public function logout() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        
        // AUDITORÍA
        if (isset($_SESSION['user_id'])) {
            AuditLogger::log('auth_logout', 'user', $_SESSION['user_id']);
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