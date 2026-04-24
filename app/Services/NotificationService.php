<?php
// app/Services/NotificationService.php

require_once CORE_PATH . '/Database.php';

/**
 * NOTIFICATION SERVICE (GESTOR DE COLAS)
 * ====================
 * Servicio encargado de encolar correos electrónicos transaccionales.
 */
class NotificationService
{
    public static function queueProjectEvent($projectId, $eventName, $actorUserId = null, $data = [])
    {
        $db = Database::getInstance()->getConnection();

        $stmtProj = $db->prepare("SELECT id, name, reference FROM projects WHERE id = :id");
        $stmtProj->execute(['id' => $projectId]);
        $project = $stmtProj->fetch(PDO::FETCH_ASSOC);

        if (!$project) return false;

        $recipients = [];
        $admins = self::getAdmins($db);
        $commercials = self::getAssignedCommercials($db, $projectId);
        $clients = self::getClientUsers($db, $projectId);

        switch ($eventName) {
            case 'nueva_propuesta':
            case 'nueva_version':
            case 'propuesta_aprobada':
                $recipients = array_merge($admins, $commercials);
                break;

            case 'cambio_estado':
            case 'nuevo_comentario':
                $recipients = array_merge($admins, $commercials, $clients);
                break;

            default:
                return false; 
        }

        $finalRecipients = [];
        $seenEmails = [];

        foreach ($recipients as $user) {
            if ($actorUserId !== null && (int) $user['id'] === (int) $actorUserId) continue;
            
            if (!in_array($user['email'], $seenEmails)) {
                $finalRecipients[] = $user;
                $seenEmails[] = $user['email'];
            }
        }

        if (empty($finalRecipients)) return true;

        list($subject, $body) = self::buildEmailTemplate($eventName, $project, $data);

        $sqlQueue = "INSERT INTO notifications_queue 
                     (recipient_user_id, event_type, recipient_email, subject, body, created_at) 
                     VALUES (:user_id, :event_type, :email, :subject, :body, NOW())";

        $stmtQueue = $db->prepare($sqlQueue);

        foreach ($finalRecipients as $recipient) {
            $stmtQueue->execute([
                'user_id' => $recipient['id'],
                'event_type' => $eventName,
                'email' => $recipient['email'],
                'subject' => $subject,
                'body' => $body
            ]);
        }

        return true;
    }

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

    private static function buildEmailTemplate($eventName, $project, $data) {
        $projRef = $project['reference'];
        $projName = htmlspecialchars($project['name'], ENT_QUOTES, 'UTF-8');
        $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? 'https://steelinox.es', '/');

        $subject = "Steelinox: Notificación de Proyecto $projRef";
        $content = "";

        switch ($eventName) {
            case 'nueva_propuesta':
                $subject = "Documento disponible: $projRef";
                $titulo = htmlspecialchars($data['titulo'] ?? 'Documento', ENT_QUOTES, 'UTF-8');
                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Nuevo documento subido</h2>";
                $content .= "<p style='margin:0 0 20px 0; color:#64748b;'>Se ha añadido documentación técnica relevante al proyecto <strong>$projRef</strong>.</p>";
                $content .= "<div style='background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:25px;'>
                                <span style='display:block; font-size:10px; font-weight:800; color:#E57B23; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;'>Título del Documento</span>
                                <span style='font-size:16px; font-weight:700; color:#1a1b25;'>$titulo</span>
                             </div>";
                break;

            case 'nueva_version':
                $subject = "Actualización de documento: $projRef";
                $titulo = htmlspecialchars($data['titulo'] ?? 'Documento', ENT_QUOTES, 'UTF-8');
                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Revisión de documento</h2>";
                $content .= "<p style='margin:0 0 20px 0; color:#64748b;'>Se ha subido una nueva versión para el documento <strong>$titulo</strong> en el proyecto <strong>$projRef</strong>.</p>";
                break;

            case 'propuesta_aprobada':
                $subject = "✅ Proyecto Aprobado: {$projName}";
                $content .= "<div style='text-align:center; padding:10px 0;'>
                                <div style='display:inline-block; background:#ecfdf5; color:#059669; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:800; text-transform:uppercase; margin-bottom:15px;'>HITO ALCANZADO</div>
                                <h1 style='margin:0 0 10px 0; color:#1e293b; font-size:24px;'>Proyecto Aprobado</h1>
                                <p style='color:#475569; font-size:16px; line-height:1.6;'>
                                    Excelentes noticias. El proyecto <strong>{$projRef} - {$projName}</strong> ha sido aceptado formalmente mediante confirmación de seguridad en la plataforma.
                                </p>
                                <p style='color:#475569; font-size:16px; line-height:1.6;'>
                                    El expediente pasa a estado de ejecución. El equipo técnico y comercial ya puede proceder con las siguientes fases de la obra.
                                </p>
                             </div>";
                break;

            case 'cambio_estado':
                $estado = $data['nuevo_estado'] ?? '';
                $subject = "Actualización de estado - $projRef";
                
                // DDS §10: Definición de contenidos y estilos diferenciados por hito
                $statusConfig = match($estado) {
                    'presupuesto' => [
                        'titulo' => 'Elaboración de Presupuesto',
                        'desc'   => 'Nuestro equipo comercial está preparando la valoración económica detallada. Te notificaremos cuando el documento esté listo para tu revisión.',
                        'color'  => '#3b82f6'
                    ],
                    'ejecucion' => [
                        'titulo' => 'Proyecto en Ejecución',
                        'desc'   => '¡Hito alcanzado! El proyecto ha pasado a manos del equipo técnico y de fabricación para comenzar con las obras/pedidos.',
                        'color'  => '#8b5cf6'
                    ],
                    'pausado' => [
                        'titulo' => 'Actividad Pausada',
                        'desc'   => 'Se ha detenido temporalmente el avance del proyecto. Ponte en contacto con tu comercial para conocer los detalles de la pausa.',
                        'color'  => '#f59e0b'
                    ],
                    'cerrado' => [
                        'titulo' => 'Expediente Finalizado',
                        'desc'   => 'El proyecto se ha dado por concluido satisfactoriamente. Todos los documentos seguirán disponibles para tu consulta.',
                        'color'  => '#64748b'
                    ],
                    default => [
                        'titulo' => 'Cambio de Fase',
                        'desc'   => "El proyecto ha realizado una transición de estado a: " . strtoupper($estado),
                        'color'  => '#1a1b25'
                    ]
                };

                $content .= "<h2 style='margin:0 0 10px 0; color:{$statusConfig['color']};'>{$statusConfig['titulo']}</h2>";
                $content .= "<p style='margin:0 0 25px 0; color:#64748b; line-height:1.5;'>{$statusConfig['desc']}</p>";
                $content .= "<div style='background:{$statusConfig['color']}; color:white; border-radius:12px; padding:20px; text-align:center;'>
                                <span style='display:block; font-size:11px; opacity:0.7; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;'>Estado del Proyecto</span>
                                <span style='font-size:18px; font-weight:800; letter-spacing:0.5px; border-left:3px solid #E57B23; padding-left:12px;'>" . strtoupper($estado) . "</span>
                             </div>";
                break;

            case 'nuevo_comentario':
                $subject = "Nuevo mensaje en $projRef";
                $comentario = htmlspecialchars($data['comentario'] ?? '', ENT_QUOTES, 'UTF-8');
                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Nuevo comentario</h2>";
                $content .= "<p style='margin:0 0 20px 0; color:#64748b;'>Se ha registrado una nueva anotación en el muro del proyecto <strong>$projRef</strong>:</p>";
                $content .= "<div style='background:#f1f5f9; border-left:4px solid #1a1b25; padding:20px; border-radius:0 12px 12px 0; font-style:italic; color:#334155; line-height:1.6;'>
                                \"$comentario\"
                             </div>";
                break;
        }

        $content .= "<div style='margin-top:40px; text-align:center;'>
                        <a href='{$baseUrl}/project/{$project['id']}' style='display:inline-block; background:#E57B23; color:white; padding:16px 32px; border-radius:14px; font-weight:800; text-decoration:none; font-size:14px; box-shadow: 0 4px 12px rgba(229, 123, 35, 0.3); transition: transform 0.2s;'>Ver Detalles del Proyecto</a>
                     </div>";

        $body = self::getHtmlWrapper($content, "Notificación importante sobre el proyecto $projRef");

        return [$subject, $body];
    }

    public static function queueUserEvent($recipientUserId, $eventName, $recipientEmail, $data = []) {
        $db = Database::getInstance()->getConnection();
        list($subject, $body) = self::buildUserEmailTemplate($eventName, $data);

        $sqlQueue = "INSERT INTO notifications_queue 
                     (recipient_user_id, event_type, recipient_email, subject, body, created_at) 
                     VALUES (:user_id, :event_type, :email, :subject, :body, NOW())";

        $stmtQueue = $db->prepare($sqlQueue);
        return $stmtQueue->execute([
            'user_id' => $recipientUserId,
            'event_type' => $eventName,
            'email' => $recipientEmail,
            'subject' => $subject,
            'body' => $body
        ]);
    }

    private static function buildUserEmailTemplate($eventName, $data) {
        $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? 'https://steelinox.es', '/');
        $subject = "Notificación de Steelinox";
        $content = "";

        switch ($eventName) {
            case 'alta_usuario':
                $subject = "Bienvenido a Steelinox";
                $nombre = htmlspecialchars($data['nombre'] ?? '', ENT_QUOTES, 'UTF-8');
                $email = htmlspecialchars($data['email'] ?? '', ENT_QUOTES, 'UTF-8');
                $resetUrl = htmlspecialchars($data['reset_url'] ?? '', ENT_QUOTES, 'UTF-8');

                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Hola, $nombre</h2>";
                $content .= "<p style='margin:0 0 25px 0; color:#64748b;'>Tu cuenta para acceder a nuestra plataforma privada ha sido creada correctamente.</p>";
                $content .= "<div style='background:#f1f5f9; border-radius:16px; padding:25px; margin-bottom:30px;'>
                                <div style='margin-bottom:15px;'>
                                    <span style='display:block; font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;'>Correo Electrónico (Usuario)</span>
                                    <span style='font-size:15px; font-weight:700; color:#1a1b25;'>$email</span>
                                </div>
                             </div>";
                $content .= "<p style='margin:0 0 20px 0; font-size:13px; color:#94a3b8;'>Para completar tu registro y establecer tu contraseña, haz clic en el siguiente enlace. Este enlace caduca en 24 horas.</p>";
                $content .= "<div style='text-align:center;'>
                                <a href='{$resetUrl}' style='display:inline-block; background:#E57B23; color:white; padding:16px 32px; border-radius:14px; font-weight:800; text-decoration:none; font-size:14px;'>Establecer Contraseña</a>
                             </div>";
                break;

            case 'recuperar_password':
                $subject = "Recuperar Contraseña — Steelinox";
                $resetUrl = htmlspecialchars($data['reset_url'] ?? '', ENT_QUOTES, 'UTF-8');

                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Recuperación de Acceso</h2>";
                $content .= "<p style='margin:0 0 25px 0; color:#64748b;'>Has solicitado restablecer tu contraseña para acceder a la plataforma de Steelinox. Haz clic en el botón de abajo para continuar:</p>";
                $content .= "<div style='text-align:center; margin-bottom:30px;'>
                                <a href='{$resetUrl}' style='display:inline-block; background:#E57B23; color:white; padding:16px 32px; border-radius:14px; font-weight:800; text-decoration:none; font-size:14px;'>Restablecer Contraseña</a>
                             </div>";
                $content .= "<p style='margin:0; font-size:13px; color:#94a3b8;'>Este enlace caducará en 60 minutos. Si no has solicitado este cambio, puedes ignorar este correo con seguridad.</p>";
                break;
                
            case 'cambio_password_seguridad':
                $subject = "Alerta de Seguridad: Cambio de contraseña";
                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Contraseña actualizada</h2>";
                $content .= "<p style='margin:0 0 20px 0; color:#64748b;'>Te informamos que la contraseña de acceso a tu cuenta en la plataforma de Steelinox ha sido modificada exitosamente.</p>";
                $content .= "<div style='background:#fef2f2; border-left:4px solid #ef4444; padding:20px; border-radius:0 12px 12px 0; color:#991b1b; line-height:1.5; font-size:14px;'>
                                <strong>Importante:</strong> Si tú no has solicitado o realizado este cambio, por favor contacta inmediatamente con tu comercial asignado o con el soporte técnico, ya que tu cuenta podría estar comprometida.
                             </div>";
                $content .= "<div style='margin-top:30px; text-align:center;'>
                                <a href='{$baseUrl}/login' style='display:inline-block; background:#1a1b25; color:white; padding:14px 28px; border-radius:12px; font-weight:700; text-decoration:none; font-size:14px;'>Ir al Login</a>
                             </div>";
                break;
        }

        $body = self::getHtmlWrapper($content, "Bienvenido a la plataforma oficial de Steelinox");
        return [$subject, $body];
    }

    private static function getHtmlWrapper($content, $preheader = "") {
        $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? 'https://steelinox.es', '/');
        $logoUrl = $baseUrl . "/logo-header-blanco.svg";

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Notificación de Steelinox</title>
        </head>
        <body style='margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
            <div style='display:none; max-height:0; overflow:hidden;'>$preheader</div>
            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#f8fafc; padding:40px 10px;'>
                <tr>
                    <td align='center'>
                        <table width='100%' max-width='600' border='0' cellspacing='0' cellpadding='0' style='max-width:600px; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);'>
                            <tr>
                                <td style='background-color:#1a1b25; padding:40px; text-align:center; border-bottom:5px solid #E57B23;'>
                                    <img src='{$logoUrl}' alt='STEELINOX' style='max-height:40px; width:auto; display:inline-block;'>
                                </td>
                            </tr>
                            <tr>
                                <td style='padding:50px 40px;'>
                                    $content
                                </td>
                            </tr>
                            <tr>
                                <td style='background-color:#f1f5f9; padding:40px; text-align:center; border-top:1px solid #e2e8f0;'>
                                    <p style='margin:0 0 10px 0; color:#94a3b8; font-size:12px; font-weight:700;'>© 2026 STEELINOX S.L. · Todos los derechos reservados</p>
                                    <p style='margin:0; color:#cbd5e1; font-size:11px; line-height:1.6;'>
                                        Has recibido este correo porque formas parte de la extranet de Steelinox.<br>
                                        Por favor, no respondas directamente a este mensaje automático.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>";
    }
}