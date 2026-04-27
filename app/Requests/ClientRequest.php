<?php
// app/Requests/ClientRequest.php

/**
 * CLIENT REQUEST (VALIDACIÓN DE CLIENTES)
 * ====================
 * Valida y sanitiza los datos de entrada para las operaciones sobre empresas cliente.
 * La referencia (ej: CLI-0001) solo la puede modificar el admin y sigue un formato fijo.
 */
require_once APP_PATH . '/Requests/BaseRequest.php';

class ClientRequest extends BaseRequest {

    /**
     * VALIDACIÓN DE CREACIÓN
     * Solo el nombre es obligatorio. La referencia se genera automáticamente
     * en el Modelo (generateNextReference), no la envía el usuario en el alta.
     */
    public function validateStore() {
        $cleanName = $this->sanitizeName($this->input('name'));
        
        if (empty($cleanName)) {
            $this->addError('name', 'El nombre de la empresa es obligatorio.');
        }

        return !$this->fails();
    }

    /**
     * VALIDACIÓN DE EDICIÓN PARCIAL
     * El nombre solo se valida si viene en el body (edición parcial).
     * La referencia solo puede cambiarla el admin y debe seguir el formato CLI-XXXX.
     */
    public function validateUpdate($role) {
        if ($this->input('name') !== null) {
            $cleanName = $this->sanitizeName($this->input('name'));
            if (empty($cleanName)) {
                $this->addError('name', 'El nombre es obligatorio.');
            }
        }

        // Solo el admin puede cambiar la referencia y debe respetar el formato CLI-XXXX
        if ($role === 'admin' && $this->input('reference') !== null && $this->input('reference') !== '') {
            if (!preg_match('/^CLI-\d{4}$/', trim($this->input('reference')))) {
                $this->addError('reference', 'La referencia debe tener el formato CLI-XXXX (Ej: CLI-0001)');
            }
        }

        return !$this->fails();
    }
}