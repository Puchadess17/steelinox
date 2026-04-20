<?php
// app/Requests/ClientRequest.php
require_once APP_PATH . '/Requests/BaseRequest.php';

class ClientRequest extends BaseRequest {
    
    public function validateStore() {
        $cleanName = $this->sanitizeName($this->input('name'));
        
        if (empty($cleanName)) {
            $this->addError('name', 'El nombre de la empresa es obligatorio.');
        }

        return !$this->fails();
    }

    public function validateUpdate($role) {
        if ($this->input('name') !== null) {
            $cleanName = $this->sanitizeName($this->input('name'));
            if (empty($cleanName)) {
                $this->addError('name', 'El nombre es obligatorio.');
            }
        }

        if ($role === 'admin' && $this->input('reference') !== null && $this->input('reference') !== '') {
            if (!preg_match('/^CLI-\d{4}$/', trim($this->input('reference')))) {
                $this->addError('reference', 'La referencia debe tener el formato CLI-XXXX (Ej: CLI-0001)');
            }
        }

        return !$this->fails();
    }
}