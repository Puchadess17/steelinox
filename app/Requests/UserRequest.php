<?php
// app/Requests/UserRequest.php
require_once APP_PATH . '/Requests/BaseRequest.php';

class UserRequest extends BaseRequest {
    
    public function validateStore() {
        $cleanName = $this->sanitizeName($this->input('name'));
        $cleanEmail = strtolower(trim($this->input('email', '')));
        
        if (empty($cleanName)) $this->addError('name', 'El nombre es obligatorio.');
        
        if (empty($cleanEmail)) {
            $this->addError('email', 'El email es obligatorio.');
        } elseif (!preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $cleanEmail)) {
            $this->addError('email', 'El formato del email no es válido.');
        }
        
        $password = $this->input('password');
        if (empty($password)) {
            $this->addError('password', 'La contraseña es obligatoria.');
        } else {
            $pwdCheck = $this->validatePasswordPolicy($password, $cleanEmail);
            if ($pwdCheck !== true) {
                $this->addError('password', $pwdCheck);
            }
        }
        
        if (empty($this->input('client_id'))) {
            $this->addError('client_id', 'ID de cliente obligatorio.');
        }

        return !$this->fails();
    }

    public function validateUpdate($currentEmail) {
        if ($this->input('name') !== null) {
            $cleanName = $this->sanitizeName($this->input('name'));
            if (empty($cleanName)) $this->addError('name', 'El nombre es obligatorio.');
        }

        $newEmail = null;
        if ($this->input('email') !== null) {
            $newEmail = strtolower(trim($this->input('email')));
            if (empty($newEmail) || !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
                $this->addError('email', 'Email no válido.');
            }
        }

        if (!empty($this->input('password'))) {
            $emailToCompare = !empty($newEmail) ? $newEmail : $currentEmail;
            $pwdCheck = $this->validatePasswordPolicy($this->input('password'), $emailToCompare);
            if ($pwdCheck !== true) {
                $this->addError('password', $pwdCheck);
            }
        }

        return !$this->fails();
    }

    public function validatePasswordChange($currentEmail) {
        $currentPassword = $this->input('current_password');
        $newPassword = $this->input('new_password');

        if (empty($currentPassword) || empty($newPassword)) {
            $this->addError('password', 'Ambas contraseñas son obligatorias.');
        } elseif ($currentPassword === $newPassword) {
            $this->addError('new_password', 'La nueva contraseña no puede ser igual a la anterior.');
        } else {
            $pwdCheck = $this->validatePasswordPolicy($newPassword, $currentEmail);
            if ($pwdCheck !== true) {
                $this->addError('new_password', $pwdCheck);
            }
        }

        return !$this->fails();
    }
}