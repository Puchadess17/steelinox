<?php
// app/Controllers/PasswordResetController.php

require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Services/MailService.php';
require_once APP_PATH . '/Services/AuditLogger.php';

class PasswordResetController
{
    /** Renderiza la vista de cambio de contraseña (GET /password/reset?token=...) */
    public function showResetForm()
    {
        $token = $_GET['token'] ?? null;
        if (!$token) {
            header('Location: /steelinox/');
            exit;
        }

        $userModel = new User();
        $user = $userModel->findByResetToken($token);

        if (!$user) {
            // Token inválido o expirado
            header('Location: /steelinox/?error=token_invalid');
            exit;
        }

        require_once APP_PATH . '/Views/reset_password.php';
    }

    /** Procesa la solicitud de envío de email (POST /api/password/forgot) */
    public function sendResetEmail()
    {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        
        // --- SANITIZACIÓN ---
        $email = isset($input['email']) ? strtolower(trim($input['email'])) : null;
        // --------------------

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
            // AUDITORÍA: Intento de recuperación sobre un email inexistente
            AuditLogger::log('recuperacion_clave_fallida', 'system', 0, null, [
                'email_intentado' => $email
            ]);

            // Por seguridad, no decimos si el email existe o no (Anti-Enumeración)
            echo json_encode(['success' => true, 'message' => 'Si el correo está registrado, recibirás un enlace en unos minutos.', 'data' => null, 'errors' => null]);
            return;
        }

        // Generar Token
        $token = bin2hex(random_bytes(32));
        $userModel->setResetToken($email, $token);

        // Enviar Email
        $resetLink = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]/steelinox/password/reset?token=" . $token;

        $html = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eef2f6; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <h2 style='color: #f97316; margin: 0;'>Recuperar Contraseña</h2>
                    <p style='color: #64748b; font-size: 14px;'>Steel Inox Extranet</p>
                </div>
                <p style='color: #1e293b; font-size: 16px; line-height: 1.6;'>Hola,</p>
                <p style='color: #1e293b; font-size: 16px; line-height: 1.6;'>Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
                <div style='text-align: center; margin: 32px 0;'>
                    <a href='{$resetLink}' style='background-color: #f97316; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;'>Restablecer Contraseña</a>
                </div>
                <p style='color: #64748b; font-size: 12px; line-height: 1.6;'>Este enlace caducará en 60 minutos. Si no has solicitado este cambio, puedes ignorar este correo con seguridad.</p>
                <hr style='border: 0; border-top: 1px solid #eef2f6; margin: 24px 0;'>
                <p style='color: #94a3b8; font-size: 11px; text-align: center;'>© 2026 Steel Inox. Todos los derechos reservados.</p>
            </div>";

        $mailResult = MailService::send($email, "Recuperar Contraseña — Steel Inox", $html);

        if ($mailResult['success']) {
            // AUDITORÍA
            AuditLogger::log('recuperacion_clave_solicitada', 'user', $user['id'], null, [
                'email' => $email
            ]);

            echo json_encode(['success' => true, 'message' => 'Si el correo está registrado, recibirás un enlace en unos minutos.', 'data' => null, 'errors' => null]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al enviar el correo. Por favor, contacte con soporte.', 'data' => null, 'errors' => ['server' => 'Fallo envío email']]);
        }
    }

    /** Procesa el cambio real de contraseña (POST /api/password/reset) */
    public function resetPassword()
    {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);

        $token = $input['token'] ?? null;
        $password = $input['password'] ?? null;

        if (!$token || !$password) {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos.', 'data' => null, 'errors' => ['request' => 'Faltan parámetros']]);
            return;
        }

        $userModel = new User();
        $user = $userModel->findByResetToken($token);

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'El enlace ha caducado o es inválido.', 'data' => null, 'errors' => ['token' => 'Inválido o expirado']]);
            return;
        }

        // --- ESCUDO DE POLÍTICA DE CONTRASEÑAS ---
        $pwdCheck = $this->validatePasswordPolicy($password, $user['email']);
        if ($pwdCheck !== true) {
            http_response_code(422);
            echo json_encode([
                'success' => false, 
                'message' => 'Error de validación', 
                'data'    => null,
                'errors'  => ['password' => $pwdCheck]
            ]);
            return;
        }
        // -----------------------------------------

        // Actualizar clave
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $updated = $userModel->update($user['id'], ['password_hash' => $hashed]);

        if ($updated) {
            $userModel->clearResetToken($user['id']);

            // AUDITORÍA
            AuditLogger::log('clave_actualizada', 'user', $user['id']);

            echo json_encode(['success' => true, 'message' => 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.', 'data' => null, 'errors' => null]);
        } else {
            echo json_encode(['success' => false, 'message' => 'No se pudo actualizar la contraseña.', 'data' => null, 'errors' => ['server' => 'Error al guardar en base de datos']]);
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
            // strcasecmp compara sin importar mayúsculas/minúsculas
            if (strcasecmp($password, $emailPrefix) === 0) {
                return 'La contraseña no puede ser igual a la primera parte de tu correo electrónico.';
            }
        }
        return true;
    }
}