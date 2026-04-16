<?php
// app/Services/ErrorLogger.php

class ErrorLogger 
{
    /**
     * Registra un error en un archivo local dentro de storage/logs/
     * * @param string $message El mensaje de error (ej. $e->getMessage())
     * @param string $context El lugar donde ocurrió (ej. 'DocumentController::index')
     * @param string $fileName El nombre del archivo de log (ej. 'database_errors.log')
     */
    public static function log($message, $context = '', $fileName = 'app_errors.log') 
    {
        // Usa la constante definida en index.php si existe, si no, usa una ruta relativa
        $logDir = defined('STORAGE_PATH') ? STORAGE_PATH . '/logs' : __DIR__ . '/../../storage/logs';
        $logFile = $logDir . '/' . $fileName;

        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        $date = date('Y-m-d H:i:s');
        $contextString = !empty($context) ? "[$context] " : "";
        
        $formattedMessage = "[{$date}] {$contextString}{$message}" . PHP_EOL;

        error_log($formattedMessage, 3, $logFile);
    }
}