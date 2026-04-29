<?php
// app/Policies/AuthMiddleware.php

/**
 * AUTH MIDDLEWARE (FILTRO DE SEGURIDAD)
 * ====================
 * Capa de seguridad interceptora. Protege los endpoints privados validando
 * la existencia de una sesión activa, gestionando la expiración por inactividad
 * y mitigando ataques CSRF mediante la verificación de tokens en cabeceras HTTP.
 */
class AuthMiddleware
{

    /**
     * LÍMITE DE INACTIVIDAD
     * Define el tiempo máximo (en segundos) sin interacción antes de invalidar
     * la sesión de forma automática (1800s = 30 minutos).
     */
    private const TIMEOUT_SECONDS = 180;

    /**
     * VERIFICACIÓN DE ACCESO
     * Punto de entrada del middleware. Ejecuta la cadena de validaciones de
     * sesión, tiempo y token de seguridad.
     */
    public static function check()
    {

        // Inicia o reanuda la sesión de usuario
        if (session_status() === PHP_SESSION_NONE) {
            @session_start();
        }

        // Verifica si existe un identificador de usuario activo
        if (!isset($_SESSION['user_id'])) {
            self::reject('No autorizado. Por favor, inicie sesión.', 401);
        }

        /**
         * CONTROL DE TIMEOUT POR INACTIVIDAD
         * Calcula la diferencia entre la hora actual y la última marca de tiempo.
         * Si supera el límite, registra el evento en auditoría y destruye la sesión.
         */
        if (isset($_SESSION['last_activity'])) {
            $secondsInactive = time() - $_SESSION['last_activity'];

            if ($secondsInactive >= self::TIMEOUT_SECONDS) {

                // Registra la expiración en el log de auditoría
                if (isset($_SESSION['user_id'])) {
                    require_once APP_PATH . '/Services/AuditLogger.php';
                    AuditLogger::log('sesion_expirada', 'user', $_SESSION['user_id'], null, ['inactive_seconds' => $secondsInactive]);
                }

                // Elimina datos y destruye la sesión
                session_unset();
                session_destroy();
                self::reject('Su sesión ha expirado por inactividad.', 401);
            }
        }

        // Actualiza la marca de tiempo de la última actividad
        $_SESSION['last_activity'] = time();

        /**
         * VALIDACIÓN CSRF (CROSS-SITE REQUEST FORGERY)
         * Obligatorio para métodos HTTP que mutan datos (POST, PUT, PATCH, DELETE).
         * Compara el token almacenado en sesión con el recibido en la cabecera X-CSRF-TOKEN.
         */
        if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {

            // Extrae y normaliza las cabeceras HTTP entrantes ignorando mayúsculas/minúsculas
            $headers = getallheaders();
            $headers = array_change_key_case($headers, CASE_UPPER);

            $tokenRecibido = $headers['X-CSRF-TOKEN'] ?? '';

            if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $tokenRecibido)) {

                // Registra el intento de violación de seguridad
                require_once APP_PATH . '/Services/AuditLogger.php';
                AuditLogger::log('auth_csrf_blocked', 'system', 0, null, ['ip' => $_SERVER['REMOTE_ADDR']]);

                self::reject('Fallo de seguridad CSRF. Petición rechazada.', 403);
            }
        }

        return true;
    }

    /**
     * RESPUESTA DE RECHAZO (FALLBACK)
     * Interrumpe la ejecución del script y devuelve una respuesta HTTP
     * estándar en formato JSON indicando el motivo del bloqueo.
     */
    private static function reject($message, $code)
    {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => ['auth' => $message]
        ]);
        exit();
    }
}