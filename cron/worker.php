<?php
// cron/worker.php

/**
 * ====================
 * WORKER DE NOTIFICACIONES (CRON JOB)
 * ====================
 * Este script está diseñado para ejecutarse en segundo plano (vía CLI o Cron).
 * Lee la cola de correos pendientes, intenta enviarlos a través del MailService
 * y actualiza su estado. Maneja reintentos automáticos para evitar bloqueos.
 */

// 1. Definir TODAS las constantes estructurales que usa tu sistema
define('ROOT_PATH', realpath(__DIR__ . '/..'));
define('APP_PATH', ROOT_PATH . '/app');
define('CORE_PATH', ROOT_PATH . '/core');
define('STORAGE_PATH', ROOT_PATH . '/storage');

// 2. Cargar las variables de entorno (.env) para tener las contraseñas de la BD
require_once CORE_PATH . '/DotEnvLoader.php';
$envLoader = new DotEnvLoader();
$envLoader->load(ROOT_PATH . '/.env');

// 3. Cargar las clases principales
require_once CORE_PATH . '/Database.php';
require_once APP_PATH . '/Services/MailService.php';

class NotificationWorker {

    private $db;
    private $maxAttempts = 3; // Límite de reintentos antes de descartar el correo
    private $batchSize = 50;  // Cuántos correos enviar por cada ejecución

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function processQueue() {
        echo "[" . date('Y-m-d H:i:s') . "] Iniciando procesamiento de cola...\n";

        // 1. Extraer lote de correos pendientes
        $sql = "SELECT id, recipient_email, subject, body, attempts 
                FROM notifications_queue 
                WHERE status = 'pending' AND attempts < :max_attempts
                ORDER BY created_at ASC 
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':max_attempts', $this->maxAttempts, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $this->batchSize, PDO::PARAM_INT);
        $stmt->execute();
        
        $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($emails)) {
            echo "[" . date('Y-m-d H:i:s') . "] Cola vacía. Nada que enviar.\n";
            return;
        }

        echo "[" . date('Y-m-d H:i:s') . "] Encontrados " . count($emails) . " correos pendientes.\n";

        // 2. Procesar y enviar cada correo
        $stmtSuccess = $this->db->prepare("UPDATE notifications_queue SET status = 'sent', sent_at = NOW() WHERE id = :id");
        $stmtFail = $this->db->prepare("UPDATE notifications_queue SET attempts = attempts + 1, error_log = :error WHERE id = :id");
        $stmtDiscard = $this->db->prepare("UPDATE notifications_queue SET status = 'failed', error_log = :error WHERE id = :id");

        foreach ($emails as $email) {
            echo " -> Enviando a: {$email['recipient_email']} (Asunto: {$email['subject']})... ";

            // Llamada a nuestro servicio de Brevo
            $result = MailService::send($email['recipient_email'], $email['subject'], $email['body']);

            if ($result['success']) {
                $stmtSuccess->execute(['id' => $email['id']]);
                echo "¡EXITO!\n";
            } else {
                $newAttemptCount = $email['attempts'] + 1;
                $errorMsg = substr($result['message'], 0, 500); // Truncar por seguridad

                if ($newAttemptCount >= $this->maxAttempts) {
                    // Si ya ha fallado 3 veces, lo marca como fallido para siempre (Dead Letter)
                    $stmtDiscard->execute(['error' => $errorMsg, 'id' => $email['id']]);
                    echo "FALLO CRÍTICO (Descartado tras {$this->maxAttempts} intentos).\n";
                } else {
                    // Sumar un intento y lo deja en pending para la próxima pasada
                    $stmtFail->execute(['error' => $errorMsg, 'id' => $email['id']]);
                    echo "ERROR (Intento $newAttemptCount de {$this->maxAttempts}).\n";
                }
            }

            // Pequeña pausa de 200ms para no saturar la API de Brevo
            usleep(200000); 
        }

        echo "[" . date('Y-m-d H:i:s') . "] Procesamiento finalizado.\n";
    }
}

// Ejecutar el worker
try {
    $worker = new NotificationWorker();
    $worker->processQueue();
} catch (Exception $e) {
    error_log("Error fatal en NotificationWorker: " . $e->getMessage());
    echo "Fallo catastrófico: " . $e->getMessage() . "\n";
}