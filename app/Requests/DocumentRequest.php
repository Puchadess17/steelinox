<?php
// app/Requests/DocumentRequest.php
require_once APP_PATH . '/Requests/BaseRequest.php';

class DocumentRequest extends BaseRequest {

    // Extrae los datos cuando vienen por Form-Data en lugar de JSON plano
    public function getPostInput($key, $default = null) {
        return $_POST[$key] ?? $default;
    }

    public function validateStore() {
        $type = $this->getPostInput('type', 'otros');
        $accessMode = $this->getPostInput('access_mode', 'download');

        $allowedTypes = ['propuesta', 'presupuesto', 'pdf', 'imagen', 'video', 'plano', 'documento_tecnico', 'materiales', 'otros'];
        if (!in_array($type, $allowedTypes)) {
            $this->addError('type', 'Tipo de documento no válido.');
        }

        $allowedAccessModes = ['view', 'download', 'both'];
        if (!in_array($accessMode, $allowedAccessModes)) {
            $this->addError('access_mode', 'Modo de acceso no válido.');
        }

        return !$this->fails();
    }

    public function validateFile($file) {
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->addError('file', 'No se recibió ningún archivo válido o superó el límite del servidor.');
            return false;
        }

        $maxFileSizeMB = isset($_ENV['MAX_FILE_SIZE_MB']) ? (int)$_ENV['MAX_FILE_SIZE_MB'] : 100;
        $maxFileSizeBytes = $maxFileSizeMB * 1024 * 1024;
        
        if ($file['size'] > $maxFileSizeBytes) {
            $this->addError('file', 'El archivo supera el tamaño máximo de ' . $maxFileSizeMB . 'MB.');
        }

        return !$this->fails();
    }

    public function validateUpdate() {
        if ($this->input('type') !== null) {
            $cleanType = trim($this->input('type'));
            $allowedTypes = ['propuesta', 'presupuesto', 'pdf', 'imagen', 'video', 'plano', 'documento_tecnico', 'materiales', 'otros'];
            if (!in_array($cleanType, $allowedTypes)) {
                $this->addError('type', 'Tipo de documento no válido.');
            }
        }

        if ($this->input('access_mode') !== null) {
            $newMode = trim($this->input('access_mode'));
            $allowedAccessModes = ['view', 'download', 'both'];
            if (!in_array($newMode, $allowedAccessModes)) {
                $this->addError('access_mode', 'Modo de acceso no válido.');
            }
        }
        return !$this->fails();
    }
}