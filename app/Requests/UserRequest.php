<?php
// app/Requests/UserRequest.php

/**
 * USER REQUEST (VALIDACIÓN DE USUARIOS CLIENTE)
 * ====================
 * Valida y sanitiza los datos de entrada para las operaciones sobre usuarios cliente.
 * Incluye tres validadores:
 *   - validateStore(): Alta de usuario (obligatorio: nombre, email, client_id)
 *   - validateUpdate(): Edición parcial con validación de email único y política de contraseña
 *   - validatePasswordChange(): Cambio de contraseña del propio usuario desde ajustes
 * La política de contraseñas está centralizada en BaseRequest::validatePasswordPolicy().
 */
require_once APP_PATH . '/Requests/BaseRequest.php';

class UserRequest extends BaseRequest {
    
    /**
     * VALIDACIÓN DE CREACIÓN DE USUARIO CLIENTE
     * La contraseña no se valida aquí porque se genera aleatoriamente en el Controlador
     * y se envía por email al usuario mediante un enlace de reset.
     */
    public function validateStore() {
        $cleanName  = $this->sanitizeName($this->input('name'));
        $cleanEmail = strtolower(trim($this->input('email', '')));
        
        if (empty($cleanName)) $this->addError('name', 'El nombre es obligatorio.');
        
        // Validación de formato de email con regex de producción
        if (empty($cleanEmail)) {
            $this->addError('email', 'El email es obligatorio.');
        } elseif (!preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $cleanEmail)) {
            $this->addError('email', 'El formato del email no es válido.');
        }

        // El usuario cliente debe estar siempre asociado a una empresa
        if (empty($this->input('client_id'))) {
            $this->addError('client_id', 'ID de cliente obligatorio.');
        }

        return !$this->fails();
    }

    /**
     * VALIDACIÓN DE EDICIÓN PARCIAL
     * Los campos son opcionales: solo se valida lo que viene en el body.
     * Si se envía contraseña, se pasa por la política de seguridad centralizada.
     * Se recibe el email actual para poder comparar si ha cambiado.
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
                $this->addError('email', 'Email no válido.');
            }
        }

        // Si se envía contraseña, se valida contra la política centralizada
        if (!empty($this->input('password'))) {
            // Usar el nuevo email si cambió, o el actual si no
            $emailToCompare = !empty($newEmail) ? $newEmail : $currentEmail;
            $pwdCheck = $this->validatePasswordPolicy($this->input('password'), $emailToCompare);
            if ($pwdCheck !== true) {
                $this->addError('password', $pwdCheck);
            }
        }

        return !$this->fails();
    }

    /**
     * VALIDACIÓN DE CAMBIO DE CONTRASEÑA (DESDE PERFIL PROPIO)
     * Requiere la contraseña actual para verificarla contra el hash en BD.
     * La nueva contraseña no puede ser igual a la anterior ni violar la política.
     */
    public function validatePasswordChange($currentEmail) {
        $currentPassword = $this->input('current_password');
        $newPassword     = $this->input('new_password');

        if (empty($currentPassword) || empty($newPassword)) {
            $this->addError('password', 'Ambas contraseñas son obligatorias.');
        } elseif ($currentPassword === $newPassword) {
            $this->addError('new_password', 'La nueva contraseña no puede ser igual a la anterior.');
        } else {
            // Delega en la política centralizada del BaseRequest
            $pwdCheck = $this->validatePasswordPolicy($newPassword, $currentEmail);
            if ($pwdCheck !== true) {
                $this->addError('new_password', $pwdCheck);
            }
        }

        return !$this->fails();
    }
}