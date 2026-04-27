<?php
// app/Requests/PasswordResetRequest.php

/**
 * PASSWORD RESET REQUEST (VALIDACIÓN DE RESET DE CONTRASEÑA)
 * ====================
 * Valida la nueva contraseña en el flujo de recuperación de acceso.
 * Se invoca desde PasswordResetController::resetPassword() después de
 * verificar que el token de reset existe y no ha expirado en la BD.
 * Reutiliza la política centralizada de contraseñas del BaseRequest.
 */
require_once APP_PATH . '/Requests/BaseRequest.php';

class PasswordResetRequest extends BaseRequest {
    
    /**
     * VALIDACIÓN DE NUEVA CONTRASEÑA
     * Aplica la política de seguridad centralizada de BaseRequest.
     * El email del usuario se pasa para prevenir contraseñas iguales al prefijo del email.
     *
     * @param string $email Email del usuario (obtenido del token de reset en BD)
     */
    public function validateReset($email) {
        $password = $this->input('password');
        
        if (empty($password)) {
            $this->addError('password', 'La contraseña es obligatoria.');
        } else {
            // Reutiliza la política centralizada del BaseRequest
            $pwdCheck = $this->validatePasswordPolicy($password, $email);
            if ($pwdCheck !== true) {
                $this->addError('password', $pwdCheck);
            }
        }
        
        return !$this->fails();
    }
}