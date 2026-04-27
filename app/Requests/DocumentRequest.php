<?php
// app/Requests/DocumentRequest.php

/**
 * DOCUMENT REQUEST (VALIDACIÓN DE DOCUMENTOS)
 * ====================
 * Valida los datos de entrada para la gestión documental. A diferencia del
 * resto de Requests, los documentos se suben como multipart/form-data (no JSON),
 * por lo que se usa $_POST y $_FILES en lugar de php://input.
 * Incluye tres validadores:
 *   - validateStore(): Valida tipo y modo de acceso al subir un nuevo documento
 *   - validateFile(): Valida el archivo binario subido (tamaño y errores de PHP)
 *   - validateUpdate(): Valida edición parcial de metadatos del documento
 */
require_once APP_PATH . '/Requests/BaseRequest.php';

class DocumentRequest extends BaseRequest {

    /**
     * ACCESO A DATOS DE FORMULARIO (FORM-DATA)
     * Los documentos se envían como multipart/form-data para poder adjuntar
     * el archivo binario. Los metadatos llegan por $_POST, no por php://input.
     */
    public function getPostInput($key, $default = null) {
        return $_POST[$key] ?? $default;
    }

    /**
     * VALIDACIÓN DE METADATOS AL CREAR DOCUMENTO
     * Verifica que el tipo documental y el modo de acceso pertenezcan
     * a los valores del ENUM definidos en el DDS §6.2 y en la base de datos.
     */
    public function validateStore() {
        $type       = $this->getPostInput('type', 'otros');
        $accessMode = $this->getPostInput('access_mode', 'download');

        // Tipos documentales válidos según el DDS §8.1
        $allowedTypes = ['propuesta', 'presupuesto', 'pdf', 'imagen', 'video', 'plano', 'documento_tecnico', 'materiales', 'otros'];
        if (!in_array($type, $allowedTypes)) {
            $this->addError('type', 'Tipo de documento no válido.');
        }

        // Modos de acceso: 'view' (solo visor), 'download' (solo descarga), 'both' (ambos)
        $allowedAccessModes = ['view', 'download', 'both'];
        if (!in_array($accessMode, $allowedAccessModes)) {
            $this->addError('access_mode', 'Modo de acceso no válido.');
        }

        return !$this->fails();
    }

    /**
     * VALIDACIÓN DEL ARCHIVO BINARIO
     * Comprueba que PHP haya recibido el archivo sin errores y que no supere
     * el límite máximo configurado en el .env (MAX_FILE_SIZE_MB, por defecto 100MB).
     */
    public function validateFile($file) {
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->addError('file', 'No se recibió ningún archivo válido o superó el límite del servidor.');
            return false;
        }

        // Lee el límite desde .env para facilitar la configuración por entorno
        $maxFileSizeMB    = isset($_ENV['MAX_FILE_SIZE_MB']) ? (int)$_ENV['MAX_FILE_SIZE_MB'] : 100;
        $maxFileSizeBytes = $maxFileSizeMB * 1024 * 1024;
        
        if ($file['size'] > $maxFileSizeBytes) {
            $this->addError('file', 'El archivo supera el tamaño máximo de ' . $maxFileSizeMB . 'MB.');
        }

        return !$this->fails();
    }

    /**
     * VALIDACIÓN DE EDICIÓN PARCIAL DE METADATOS
     * Solo valida los campos que vienen en el body JSON (edición parcial).
     * Se usa cuando el frontend solo actualiza el tipo o el modo de acceso.
     */
    public function validateUpdate() {
        if ($this->input('type') !== null) {
            $cleanType    = trim($this->input('type'));
            $allowedTypes = ['propuesta', 'presupuesto', 'pdf', 'imagen', 'video', 'plano', 'documento_tecnico', 'materiales', 'otros'];
            if (!in_array($cleanType, $allowedTypes)) {
                $this->addError('type', 'Tipo de documento no válido.');
            }
        }

        if ($this->input('access_mode') !== null) {
            $newMode          = trim($this->input('access_mode'));
            $allowedAccessModes = ['view', 'download', 'both'];
            if (!in_array($newMode, $allowedAccessModes)) {
                $this->addError('access_mode', 'Modo de acceso no válido.');
            }
        }
        return !$this->fails();
    }
}