<?php
// app/Services/MailService.php

class MailService
{
    // Configuración desde variables de entorno (.env)
    private static $apiKey;
    private static $senderEmail;
    private static $senderName;

    private static function init()
    {
        if (self::$apiKey === null) {
            self::$apiKey = getenv('BREVO_API_KEY');
            self::$senderEmail = getenv('MAIL_SENDER_EMAIL');
            self::$senderName = getenv('MAIL_SENDER_NAME') ?: 'Soporte Steel Inox';
        }
    }

    /**
     * Envía un email transaccional usando la API v3 de Brevo.
     * 
     * @param string $to Email del destinatario
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
        curl_close($ch);

        if ($httpCode === 201 || $httpCode === 200) {
            return [
                'success' => true,
                'message' => 'Correo enviado correctamente'
            ];
        } else {
            error_log("Brevo API Error: " . $response);
            return [
                'success' => false,
                'message' => 'No se pudo enviar el correo electrónico (' . $httpCode . ')'
            ];
        }
    }
}
