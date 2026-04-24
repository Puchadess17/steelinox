<?php
// app/Controllers/PasswordResetController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Services/AuditLogger.php';
require_once APP_PATH . '/Services/ErrorLogger.php';
require_once APP_PATH . '/Requests/PasswordResetRequest.php';

class PasswordResetController
{
    /** Renderiza la vista de cambio de contraseña (GET /password/reset?token=...) */
    public function showResetForm()
    {
        try {
            // Capturamos la URL base dinámica y le quitamos la barra final si la tiene
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

    /** Procesa la solicitud de envío de email (POST /api/password/forgot) */
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
                AuditLogger::log('recuperacion_clave_fallida', 'system', 0, null, [
                    'email_intentado' => $email
                ]);

                echo json_encode(['success' => true, 'message' => 'Si el correo está registrado, recibirás un enlace en unos minutos.', 'data' => null, 'errors' => null]);
                return;
            }

            $token = bin2hex(random_bytes(32));
            $userModel->setResetToken($email, $token, '1 HOUR');

            $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? ((isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]/steelinox"), '/');
            $resetLink = $baseUrl . "/password/reset?token=" . $token;

            require_once APP_PATH . '/Services/NotificationService.php';
            $queued = NotificationService::queueUserEvent($user['id'], 'recuperar_password', $email, [
                'reset_url' => $resetLink
            ]);

            if ($queued) {
                AuditLogger::log('recuperacion_clave_solicitada', 'user', $user['id'], null, [
                    'email' => $email
                ]);

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

    /** Procesa el cambio real de contraseña (POST /api/password/reset) */
    public function resetPassword()
    {
        header('Content-Type: application/json');
        
        try {
            // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
            $request = new PasswordResetRequest();
            $token = $request->input('token');

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
                echo json_encode([
                    'success' => false, 
                    'message' => 'Error de validación', 
                    'data'    => null,
                    'errors'  => $request->errors()
                ]);
                return;
            }

            $hashed = password_hash($request->input('password'), PASSWORD_DEFAULT);
            $updated = $userModel->update($user['id'], ['password_hash' => $hashed]);

            if ($updated) {
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