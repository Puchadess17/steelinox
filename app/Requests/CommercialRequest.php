<?php
// app/Requests/CommercialRequest.php

/**
 * COMMERCIAL REQUEST (VALIDACIÓN DE COMERCIALES)
 * ====================
 * Valida y sanitiza los datos de entrada para las operaciones sobre comerciales.
 * Idéntico en estructura a UserRequest pero sin la validación de client_id
 * (los comerciales son usuarios internos sin empresa asociada).
 * Solo el administrador puede invocar estos endpoints (validado en UserPolicy).
 */
require_once APP_PATH . '/Requests/BaseRequest.php';

class CommercialRequest extends BaseRequest {
    
    /**
     * VALIDACIÓN DE CREACIÓN DE COMERCIAL
     * La contraseña no se valida aquí: se genera automáticamente en el Controlador
     * y se envía al nuevo comercial mediante enlace de activación por email.
     */
    public function validateStore() {
        $cleanName  = $this->sanitizeName($this->input('name'));
        $cleanEmail = strtolower(trim($this->input('email', '')));
        
        if (empty($cleanName)) $this->addError('name', 'El nombre es obligatorio.');
        
        // Email obligatorio y con formato válido
        if (empty($cleanEmail) || !filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
            $this->addError('email', 'El email es obligatorio y debe tener un formato válido.');
        }

        return !$this->fails();
    }

    /**
     * VALIDACIÓN DE EDICIÓN PARCIAL
     * Los campos son opcionales: solo se valida lo que viene en el body.
     * La unicidad del email se verifica en el Controlador contra la BD.
     */
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

        // Si se envía contraseña nueva, se valida contra la política de seguridad
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