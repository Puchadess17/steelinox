<?php
// app/Policies/AuthMiddleware.php

class AuthMiddleware {
    
    // Tiempo máximo de inactividad en segundos
    private const TIMEOUT_SECONDS = 1800;

    public static function check() {
        // Iniciar o reanudar la sesión de usuario
        if (session_status() === PHP_SESSION_NONE) session_start();

        // Verificar si existe la sesión de usuario
        if (!isset($_SESSION['user_id'])) self::reject('No autorizado. Por favor, inicie sesión.', 401);

        // Control--> Timeout por inactividad
        if (isset($_SESSION['last_activity'])) {
            $secondsInactive = time() - $_SESSION['last_activity'];
            
            if ($secondsInactive >= self::TIMEOUT_SECONDS) {
                
                // AUDITORÍA: Registrar el timeout antes de matar la sesión
                if (isset($_SESSION['user_id'])) {
                    require_once APP_PATH . '/Services/AuditLogger.php';
                    AuditLogger::log('auth_timeout', 'user', $_SESSION['user_id'], null, ['inactive_seconds' => $secondsInactive]);
                }

                // Si ha pasado el tiempo, destroy session
                session_unset();
                session_destroy();
                self::reject('Su sesión ha expirado por inactividad.', 401);
            }
        }

        // Marca de tiempo de la última actividad
        $_SESSION['last_activity'] = time();

        // Validación CSRF (Solo para métodos que modifican datos)
        if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            
            // getallheaders()--> lee las cabeceras HTTP que envía el front
            $headers = getallheaders();
            // Case sensitivity
            $headers = array_change_key_case($headers, CASE_UPPER);
            
            $tokenRecibido = $headers['X-CSRF-TOKEN'] ?? '';
            
            if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $tokenRecibido)) {
                
                // Opcional pero recomendado: Registrar también bloqueos CSRF
                require_once APP_PATH . '/Services/AuditLogger.php';
                AuditLogger::log('auth_csrf_blocked', 'system', 0, null, ['ip' => $_SERVER['REMOTE_ADDR']]);
                
                self::reject('Fallo de seguridad CSRF. Petición rechazada.', 403);
            }
        }

        return true;
    }

    // Método privado para cortar la ejecución y devolver JSON
    private static function reject($message, $code) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'message' => $message,
            'data'    => null,
            'errors'  => ['auth' => $message]
        ]);
        exit();
    }
}