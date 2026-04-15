<?php
// app/Services/MailService.php

/**
 * MAIL SERVICE (BREVO API)
 * ====================
 * Servicio integrador para el envío de correos electrónicos transaccionales.
 * Utiliza la API REST v3 de Brevo (anteriormente Sendinblue) a través de cURL,
 * evitando la dependencia de librerías externas para mantener el núcleo ligero.
 */
class MailService
{
    /**
     * CREDENCIALES DE AUTENTICACIÓN
     * Propiedades estáticas que almacenan la configuración cargada desde 
     * el archivo de entorno (.env) de forma segura.
     */
    private static $apiKey;
    private static $senderEmail;
    private static $senderName;

    /**
     * INICIALIZACIÓN PEREZOSA (LAZY LOADING)
     * Carga las credenciales en memoria únicamente cuando se solicita el
     * primer envío de correo, optimizando el rendimiento global de las
     * peticiones que no requieren envío de emails.
     */
    private static function init()
    {
        if (self::$apiKey === null) {
            self::$apiKey = getenv('BREVO_API_KEY');
            self::$senderEmail = getenv('MAIL_SENDER_EMAIL');
            self::$senderName = getenv('MAIL_SENDER_NAME') ?: 'Soporte Steel Inox';
        }
    }

    /**
     * EJECUCIÓN DEL ENVÍO (CLIENTE HTTP cURL)
     * Construye el payload JSON requerido por Brevo y ejecuta la petición POST.
     * Retorna un array estandarizado para que el Controlador pueda manejar
     * la respuesta hacia el Frontend.
     * * @param string $to Email del destinatario
     * @param string $subject Asunto del correo
     * @param string $htmlContent Contenido en formato HTML
     * @return array Resumen del resultado ['success' => bool, 'message' => string]
     */
    public static function send($to, $subject, $htmlContent)
    {
        self::init();
        
        $url = 'https://api.brevo.com/v3/smtp/email';

        $data = [
            "sender" => [
                "name" => self::$senderName,
                "email" => self::$senderEmail
            ],
            "to" => [
                ["email" => $to]
            ],
            "subject" => $subject,
            "htmlContent" => $htmlContent
        ];

        // Configuración del contexto cURL
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'api-key: ' . self::$apiKey,
            'Content-Type: application/json',
            'Accept: application/json'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($httpCode === 201 || $httpCode === 200) {
            return [
                'success' => true,
                'message' => 'Correo enviado correctamente'
            ];
        } else {
            /**
             * MANEJO DE ERRORES DE TERCEROS (FALLBACK A ARCHIVO)
             * Si la API de Brevo rechaza la petición, se aísla el error en el
             * registro físico del sistema para su posterior diagnóstico,
             * devolviendo un mensaje genérico a la capa de presentación.
             */
            $logDir = STORAGE_PATH . '/logs';
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
            $logMessage = "[" . date('Y-m-d H:i:s') . "] Brevo API Error ($httpCode): " . $response . PHP_EOL;
            error_log($logMessage, 3, $logDir . '/system_errors.log');

            return [
                'success' => false,
                'message' => 'No se pudo enviar el correo electrónico (' . $httpCode . ')'
            ];
        }
    }
}