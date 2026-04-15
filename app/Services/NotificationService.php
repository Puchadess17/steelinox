<?php
// app/Services/NotificationService.php

require_once CORE_PATH . '/Database.php';

/**
 * ====================
 * NOTIFICATION SERVICE (GESTOR DE COLAS)
 * ====================
 * Servicio encargado de encolar correos electrónicos transaccionales.
 * Traduce eventos de negocio (ej. "proyecto_aprobado") a destinatarios reales,
 * extrayendo de la base de datos a los comerciales, administradores o clientes
 * implicados en un proyecto, y registrando el envío en notifications_queue
 * para que un proceso asíncrono los envíe en segundo plano.
 */
class NotificationService
{
    /**
     * Encola una notificación relacionada con un proyecto.
     * * @param int $projectId ID del proyecto afectado
     * @param string $eventName Tipo de evento (ej: 'nuevo_comentario', 'aprobado', 'cambio_estado')
     * @param int|null $actorUserId ID del usuario que realiza la acción (para NO notificarle a sí mismo)
     * @param array $data Metadatos extra para construir el cuerpo del correo
     */
    public static function queueProjectEvent($projectId, $eventName, $actorUserId = null, $data = [])
    {
        $db = Database::getInstance()->getConnection();

        // 1. Extraer información básica del proyecto
        $stmtProj = $db->prepare("SELECT name, reference FROM projects WHERE id = :id");
        $stmtProj->execute(['id' => $projectId]);
        $project = $stmtProj->fetch(PDO::FETCH_ASSOC);

        if (!$project) return false;

        // 2. Determinar a quién debemos avisar según las reglas del DDS
        $recipients = [];

        // Los administradores siempre reciben copia de lo importante
        $admins = self::getAdmins($db);
        
        // Comerciales asignados a este proyecto
        $commercials = self::getAssignedCommercials($db, $projectId);
        
        // Usuarios cliente asociados al cliente dueño del proyecto
        $clients = self::getClientUsers($db, $projectId);

        switch ($eventName) {
            case 'nueva_propuesta':
            case 'nueva_version':
            case 'propuesta_aprobada':
                // Según DDS: Avisa a comerciales y administradores.
                $recipients = array_merge($admins, $commercials);
                break;

            case 'cambio_estado':
            case 'nuevo_comentario':
                // Según DDS: Avisa a todos los implicados (incluyendo al cliente)
                $recipients = array_merge($admins, $commercials, $clients);
                break;
            
            default:
                return false; // Evento no reconocido
        }

        // 3. Limpiar duplicados (por si un admin es también comercial, etc.) y auto-notificaciones
        $finalRecipients = [];
        $seenEmails = [];

        foreach ($recipients as $user) {
            // No enviar correo al que acaba de pulsar el botón
            if ($actorUserId !== null && (int)$user['id'] === (int)$actorUserId) {
                continue;
            }
            // Evitar duplicados por email
            if (!in_array($user['email'], $seenEmails)) {
                $finalRecipients[] = $user;
                $seenEmails[] = $user['email'];
            }
        }

        // 4. Construir y encolar los correos
        if (empty($finalRecipients)) return true;

        list($subject, $body) = self::buildEmailTemplate($eventName, $project, $data);

        $sqlQueue = "INSERT INTO notifications_queue 
                     (recipient_user_id, event_type, recipient_email, subject, body, created_at) 
                     VALUES (:user_id, :event_type, :email, :subject, :body, NOW())";
        
        $stmtQueue = $db->prepare($sqlQueue);

        foreach ($finalRecipients as $recipient) {
            $stmtQueue->execute([
                'user_id'    => $recipient['id'],
                'event_type' => $eventName,
                'email'      => $recipient['email'],
                'subject'    => $subject,
                'body'       => $body
            ]);
        }

        return true;
    }

    /**
     * ====================
     * HELPERS DE EXTRACCIÓN DE ROLES
     * ====================
     */
    private static function getAdmins($db) {
        $stmt = $db->query("SELECT id, email, name FROM users WHERE role = 'admin' AND is_active = 1 AND deleted_at IS NULL");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function getAssignedCommercials($db, $projectId) {
        $sql = "SELECT u.id, u.email, u.name 
                FROM users u 
                INNER JOIN project_user pu ON u.id = pu.user_id 
                WHERE pu.project_id = :project_id AND u.is_active = 1 AND u.deleted_at IS NULL";
        $stmt = $db->prepare($sql);
        $stmt->execute(['project_id' => $projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function getClientUsers($db, $projectId) {
        $sql = "SELECT u.id, u.email, u.name 
                FROM users u 
                INNER JOIN projects p ON u.client_id = p.client_id 
                WHERE p.id = :project_id AND u.is_active = 1 AND u.deleted_at IS NULL";
        $stmt = $db->prepare($sql);
        $stmt->execute(['project_id' => $projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * ====================
     * MOTOR DE PLANTILLAS (BÁSICO)
     * ====================
     */
    private static function buildEmailTemplate($eventName, $project, $data) {
        $projRef = $project['reference'];
        $projName = htmlspecialchars($project['name'], ENT_QUOTES, 'UTF-8');
        
        $subject = "Notificación de Steel Inox - Proyecto $projRef";
        $body = "<div style='font-family: Arial, sans-serif; color: #333;'>";
        $body .= "<h2>Proyecto: $projRef - $projName</h2>";

        switch ($eventName) {
            case 'nueva_propuesta':
                $subject = "Nuevo documento subido: $projRef";
                $body .= "<p>Se ha subido un nuevo documento titulado <strong>" . htmlspecialchars($data['titulo'] ?? 'Documento', ENT_QUOTES, 'UTF-8') . "</strong>.</p>";
                break;

            case 'nueva_version':
                $subject = "Nueva versión de documento: $projRef";
                $body .= "<p>Se ha subido una actualización para el documento <strong>" . htmlspecialchars($data['titulo'] ?? 'Documento', ENT_QUOTES, 'UTF-8') . "</strong>.</p>";
                break;

            case 'propuesta_aprobada':
                $subject = "¡Proyecto Aprobado! - $projRef";
                $body .= "<p style='color: #28a745; font-size: 16px;'><strong>El cliente ha aprobado formalmente el proyecto.</strong></p>";
                break;

            case 'cambio_estado':
                $estado = htmlspecialchars($data['nuevo_estado'] ?? '', ENT_QUOTES, 'UTF-8');
                $subject = "Cambio de estado ($estado) - $projRef";
                $body .= "<p>El estado del proyecto ha cambiado a: <strong>" . strtoupper($estado) . "</strong>.</p>";
                break;

            case 'nuevo_comentario':
                $subject = "Nuevo comentario en $projRef";
                $body .= "<p>Se ha añadido un nuevo comentario en la plataforma:</p>";
                $body .= "<blockquote style='background: #f9f9f9; padding: 10px; border-left: 4px solid #0056b3;'>" . htmlspecialchars($data['comentario'] ?? '', ENT_QUOTES, 'UTF-8') . "</blockquote>";
                break;
        }

        $body .= "<hr style='border: none; border-top: 1px solid #eee; margin-top: 20px;' />";
        $body .= "<p style='font-size: 12px; color: #999;'>Este es un mensaje automático de la plataforma Steel Inox. Por favor, no responda a este correo.</p>";
        $body .= "</div>";

        return [$subject, $body];
    }
}