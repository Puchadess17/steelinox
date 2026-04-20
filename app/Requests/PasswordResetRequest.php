<?php
// app/Requests/PasswordResetRequest.php
require_once APP_PATH . '/Requests/BaseRequest.php';

class PasswordResetRequest extends BaseRequest {
    
    public function validateReset($email) {
        $password = $this->input('password');
        
        if (empty($password)) {
            $this->addError('password', 'La contraseña es obligatoria.');
        } else {
            // Reutilizamos la política centralizada del BaseRequest
            $pwdCheck = $this->validatePasswordPolicy($password, $email);
            if ($pwdCheck !== true) {
                $this->addError('password', $pwdCheck);
            }
        }
        
        return !$this->fails();
    }
}