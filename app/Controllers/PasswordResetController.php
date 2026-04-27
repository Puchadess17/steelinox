<?php
// app/Controllers/PasswordResetController.php

/**
 * PASSWORD RESET CONTROLLER (RECUPERACIÓN DE CONTRASEÑA)
 * ====================
 * Gestiona el flujo de dos pasos para recuperar el acceso:
 *   PASO 1 — sendResetEmail: genera token con expiración de 1 hora y envía email.
 *   PASO 2 — resetPassword: valida token, actualiza hash e invalida el token.
 *   showResetForm: sirve la vista HTML del formulario (no es endpoint API).
 * Por seguridad, si el email no existe, se responde con el mismo mensaje genérico
 * para no revelar qué cuentas están registradas en el sistema.
 */
require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Services/AuditLogger.php';
require_once APP_PATH . '/Services/ErrorLogger.php';
require_once APP_PATH . '/Requests/PasswordResetRequest.php';

class PasswordResetController
{
    /**
     * RENDERIZADO DEL FORMULARIO (GET /password/reset?token=...)
     * Valida el token antes de mostrar el formulario.
     * Si el token no existe o expiró, redirige al login con parámetro de error.
     */
    public function showResetForm()
    {
        try {
            $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? '/steelinox', '/');
            
            $token = $_GET['token'] ?? null;
            if (!$token) {
                header("Location: {$baseUrl}/");
                exit;
            }

            $userModel = new User();
            $user = $userModel->findByResetToken($token);

            if (!$user) {
                header("Location: {$baseUrl}/?error=token_invalid");
                exit;
            }

            require_once APP_PATH . '/Views/reset_password.php';

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'PasswordResetController::showResetForm');
            $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? '/steelinox', '/');
            header("Location: {$baseUrl}/?error=server_error");
            exit;
        }
    }

    /**
     * ENVÍO DE EMAIL DE RECUPERACIÓN (POST /api/password/forgot)
     * Genera token de 64 chars hexadecimales, lo persiste con expiración de 1 hora
     * y delega el envío del enlace a NotificationService.
     */
    public function sendResetEmail()
    {
        header('Content-Type: application/json');
        
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $email = isset($input['email']) ? strtolower(trim($input['email'])) : null;

            if (empty($email)) {
                echo json_encode(['success' => false, 'message' => 'El email es obligatorio.', 'data' => null, 'errors' => ['email' => 'Requerido']]);
                return;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(['success' => false, 'message' => 'El formato del email no es válido.', 'data' => null, 'errors' => ['email' => 'Formato inválido']]);
                return;
            }

            $userModel = new User();
            $user = $userModel->findByEmail($email);

            if (!$user) {
                // Respuesta genérica: no revelar si el email está o no en el sistema
                AuditLogger::log('recuperacion_clave_fallida', 'system', 0, null, ['email_intentado' => $email]);
                echo json_encode(['success' => true, 'message' => 'Si el correo está registrado, recibirás un enlace en unos minutos.', 'data' => null, 'errors' => null]);
                return;
            }

            $token = bin2hex(random_bytes(32));
            $userModel->setResetToken($email, $token, '1 HOUR');

            $baseUrl   = rtrim($_ENV['APP_BASE_URL'] ?? ((isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]/steelinox"), '/');
            $resetLink = $baseUrl . "/password/reset?token=" . $token;

            require_once APP_PATH . '/Services/NotificationService.php';
            $queued = NotificationService::queueUserEvent($user['id'], 'recuperar_password', $email, [
                'reset_url' => $resetLink
            ]);

            if ($queued) {
                AuditLogger::log('recuperacion_clave_solicitada', 'user', $user['id'], null, ['email' => $email]);
                echo json_encode(['success' => true, 'message' => 'Si el correo está registrado, recibirás un enlace en unos minutos.', 'data' => null, 'errors' => null]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error al encolar el correo. Por favor, contacte con soporte.', 'data' => null, 'errors' => ['server' => 'Fallo encolado email']]);
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'PasswordResetController::sendResetEmail');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    /**
     * APLICACIÓN DEL NUEVO HASH (POST /api/password/reset)
     * Verifica el token, valida la contraseña, actualiza el hash e invalida el token.
     */
    public function resetPassword()
    {
        header('Content-Type: application/json');
        
        try {
            $request = new PasswordResetRequest();
            $token   = $request->input('token');

            if (!$token || !$request->input('password')) {
                echo json_encode(['success' => false, 'message' => 'Datos incompletos.', 'data' => null, 'errors' => ['request' => 'Faltan parámetros']]);
                return;
            }

            $userModel = new User();
            $user = $userModel->findByResetToken($token);

            if (!$user) {
                echo json_encode(['success' => false, 'message' => 'El enlace ha caducado o es inválido.', 'data' => null, 'errors' => ['token' => 'Inválido o expirado']]);
                return;
            }

            if (!$request->validateReset($user['email'])) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            $hashed  = password_hash($request->input('password'), PASSWORD_DEFAULT);
            $updated = $userModel->update($user['id'], ['password_hash' => $hashed]);

            if ($updated) {
                // Invalida el token para impedir su reutilización
                $userModel->clearResetToken($user['id']);
                AuditLogger::log('clave_actualizada', 'user', $user['id']);
                echo json_encode(['success' => true, 'message' => 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.', 'data' => null, 'errors' => null]);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se pudo actualizar la contraseña.', 'data' => null, 'errors' => ['server' => 'Error al guardar en base de datos']]);
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'PasswordResetController::resetPassword');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }
}