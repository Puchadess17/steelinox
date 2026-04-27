<?php
// app/Services/ErrorLogger.php

/**
 * ERROR LOGGER (SERVICIO)
 * ====================
 * Servicio estático de escritura de errores en disco. Actúa como fallback
 * de último recurso cuando una excepción ocurre en una capa crítica
 * (p. ej. fallo de conexión a la BD) y no se puede responder con normalidad.
 * Escribe en /storage/logs/ con timestamp y contexto de origen.
 */
class ErrorLogger 
{
    /**
     * ESCRITURA DE ENTRADA DE ERROR
     * Formatea y persiste el mensaje en el archivo de log indicado.
     * Si el directorio no existe, lo crea automáticamente.
     *
     * @param string $message  El mensaje de error (ej. $e->getMessage())
     * @param string $context  Dónde ocurrió el error (ej. 'DocumentController::index')
     * @param string $fileName Nombre del archivo de log (ej. 'database_errors.log')
     */
    public static function log($message, $context = '', $fileName = 'app_errors.log') 
    {
        // Usa la constante STORAGE_PATH definida en index.php; si no existe, calcula la ruta relativa
        $logDir = defined('STORAGE_PATH') ? STORAGE_PATH . '/logs' : __DIR__ . '/../../storage/logs';
        $logFile = $logDir . '/' . $fileName;

        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        $date = date('Y-m-d H:i:s');
        // Añade el contexto entre corchetes si se ha proporcionado (ej: [DocumentController::index])
        $contextString = !empty($context) ? "[$context] " : "";
        
        $formattedMessage = "[{$date}] {$contextString}{$message}" . PHP_EOL;

        error_log($formattedMessage, 3, $logFile);
    }
}