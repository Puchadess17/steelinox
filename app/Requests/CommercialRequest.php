<?php
// app/Requests/CommercialRequest.php
require_once APP_PATH . '/Requests/BaseRequest.php';

class CommercialRequest extends BaseRequest {
    
    public function validateStore() {
        $cleanName = $this->sanitizeName($this->input('name'));
        $cleanEmail = strtolower(trim($this->input('email', '')));
        
        if (empty($cleanName)) $this->addError('name', 'El nombre es obligatorio.');
        
        if (empty($cleanEmail) || !filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
            $this->addError('email', 'El email es obligatorio y debe tener un formato válido.');
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
                $this->addError('email', 'El email es obligatorio y válido.');
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
}