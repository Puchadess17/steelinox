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

        if (!$project)
            return false;

        $recipients = [];
        $admins = self::getAdmins($db);
        $commercials = self::getAssignedCommercials($db, $projectId);
        $clients = self::getClientUsers($db, $projectId);

        switch ($eventName) {
            case 'nueva_propuesta':
            case 'nueva_version':
            case 'propuesta_aprobada':
            case 'solicitud_aprobacion':
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
            if ($actorUserId !== null && (int) $user['id'] === (int) $actorUserId)
                continue;

            if (!in_array($user['email'], $seenEmails)) {
                $finalRecipients[] = $user;
                $seenEmails[] = $user['email'];
            }
        }

        if (empty($finalRecipients))
            return true;

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

    private static function getAdmins($db)
    {
        $stmt = $db->query("SELECT id, email, name FROM users WHERE role = 'admin' AND is_active = 1 AND deleted_at IS NULL");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function getAssignedCommercials($db, $projectId)
    {
        $sql = "SELECT u.id, u.email, u.name 
                FROM users u 
                INNER JOIN project_user pu ON u.id = pu.user_id 
                WHERE pu.project_id = :project_id AND u.is_active = 1 AND u.deleted_at IS NULL";
        $stmt = $db->prepare($sql);
        $stmt->execute(['project_id' => $projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function getClientUsers($db, $projectId)
    {
        $sql = "SELECT u.id, u.email, u.name 
                FROM users u 
                INNER JOIN projects p ON u.client_id = p.client_id 
                WHERE p.id = :project_id AND u.is_active = 1 AND u.deleted_at IS NULL";
        $stmt = $db->prepare($sql);
        $stmt->execute(['project_id' => $projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function buildEmailTemplate($eventName, $project, $data)
    {
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
                $content .= "<p style='margin:0 0 20px 0; color:#64748b;'>Se ha añadido documentación técnica relevante al proyecto " . self::getRefBadgeHtml($projRef) . ".</p>";
                $content .= "<div style='background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:25px;'>
                                <span style='display:block; font-size:10px; font-weight:800; color:#111827; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;'>Título del Documento</span>
                                <span style='font-size:16px; font-weight:700; color:#1a1b25;'>$titulo</span>
                             </div>";
                break;

            case 'nueva_version':
                $subject = "Actualización de documento: $projRef";
                $titulo = htmlspecialchars($data['titulo'] ?? 'Documento', ENT_QUOTES, 'UTF-8');
                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Revisión de documento</h2>";
                $content .= "<p style='margin:0 0 20px 0; color:#64748b;'>Se ha subido una nueva versión para el documento <strong>$titulo</strong> en el proyecto " . self::getRefBadgeHtml($projRef) . ".</p>";
                break;

            case 'propuesta_aprobada':
                $subject = "✅ Proyecto Aprobado: {$projName}";
                $content .= "<div style='text-align:center; padding:10px 0;'>
                                <div style='display:inline-block; background:#ecfdf5; color:#059669; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:800; text-transform:uppercase; margin-bottom:15px;'>HITO ALCANZADO</div>
                                <h1 style='margin:0 0 10px 0; color:#1e293b; font-size:24px;'>Proyecto Aprobado</h1>
                                <p style='color:#475569; font-size:16px; line-height:1.6;'>
                                    Excelentes noticias. El proyecto " . self::getRefBadgeHtml($projRef) . " — <strong>{$projName}</strong> ha sido aceptado formalmente mediante confirmación de seguridad en la plataforma.
                                </p>
                                <p style='color:#475569; font-size:16px; line-height:1.6;'>
                                    El expediente pasa a estado de ejecución. El equipo técnico y comercial ya puede proceder con las siguientes fases de la obra.
                                </p>
                             </div>";
                break;

            case 'cambio_estado':
                $estado = $data['nuevo_estado'] ?? '';
                $subject = "Actualización de estado - $projRef";

                $statusConfig = match ($estado) {
                    'presupuesto', 'propuesta' => [
                        'titulo' => 'Fase de Propuesta',
                        'desc' => 'El proyecto se encuentra en fase de estudio y valoración técnica.',
                        'badge' => self::getStatusBadgeHtml('propuesta')
                    ],
                    'aprobado' => [
                        'titulo' => 'Proyecto Aprobado',
                        'desc' => 'La propuesta ha sido aceptada y el proyecto está listo para su ejecución.',
                        'badge' => self::getStatusBadgeHtml('aprobado')
                    ],
                    'ejecucion' => [
                        'titulo' => 'Proyecto en Ejecución',
                        'desc' => '¡Hito alcanzado! El proyecto ha pasado a manos del equipo técnico y de fabricación.',
                        'badge' => self::getStatusBadgeHtml('ejecucion')
                    ],
                    'pausado' => [
                        'titulo' => 'Actividad Pausada',
                        'desc' => 'Se ha detenido temporalmente el avance del proyecto. Contacta con tu comercial.',
                        'badge' => "<span style='display:inline-block; background:#fff7ed; color:#c2410c; padding:4px 12px; border-radius:100px; font-size:10px; font-weight:800; letter-spacing:1px; border:1px solid #fed7aa; text-transform:uppercase;'>Pausado</span>"
                    ],
                    'cerrado' => [
                        'titulo' => 'Expediente Finalizado',
                        'desc' => 'El proyecto se ha dado por concluido satisfactoriamente.',
                        'badge' => self::getStatusBadgeHtml('cerrado')
                    ],
                    default => [
                        'titulo' => 'Cambio de Fase',
                        'desc' => "El proyecto ha realizado una transición de estado a: " . strtoupper($estado),
                        'badge' => self::getStatusBadgeHtml($estado)
                    ]
                };

                $content .= "<div style='text-align:center; margin-bottom:30px;'>
                                <div style='margin-bottom:15px;'>{$statusConfig['badge']}</div>
                                <h2 style='margin:0 0 10px 0; color:#111827; font-size:24px;'>{$statusConfig['titulo']}</h2>
                                <p style='margin:0; color:#64748b; line-height:1.6;'>{$statusConfig['desc']}</p>
                             </div>";


                break;

            case 'nuevo_comentario':
                $subject = "Nuevo mensaje en $projRef";
                $comentario = htmlspecialchars($data['comentario'] ?? '', ENT_QUOTES, 'UTF-8');
                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Nuevo comentario</h2>";
                $content .= "<p style='margin:0 0 20px 0; color:#64748b;'>Se ha registrado una nueva anotación en el muro del proyecto " . self::getRefBadgeHtml($projRef) . ":</p>";
                $content .= "<div style='background:#f1f5f9; border-left:4px solid #1a1b25; padding:20px; border-radius:0 12px 12px 0; font-style:italic; color:#334155; line-height:1.6;'>
                                \"$comentario\"
                             </div>";
                break;

            case 'solicitud_aprobacion':
                $subject = "🔒 Código de Seguridad: Aprobación de Proyecto $projRef";
                $token2fa = $data['token'] ?? '000000';

                $content .= "<div style='text-align:center;'>
                                <div style='display:inline-block; background:#fff7ed; color:#c2410c; padding:6px 12px; border-radius:10px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px;'>ACCIÓN REQUERIDA</div>
                                <h2 style='margin:0 0 10px 0; color:#111827;'>Autorización Requerida</h2>
                                <p style='margin:0 0 25px 0; color:#64748b; line-height:1.6;'>Se ha solicitado la aprobación del proyecto " . self::getRefBadgeHtml($projRef) . ". Introduce este código en la plataforma:</p>
                             </div>";

                $content .= "<div style='background:#f8fafc; border:2px dashed #e2e8f0; border-radius:20px; padding:40px; text-align:center; margin-bottom:25px;'>
                                <span style='display:block; font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:3px; margin-bottom:15px;'>Tu Código Temporal</span>
                                <span style='font-size:42px; font-weight:900; color:#111827; letter-spacing:12px; font-family:monospace;'>$token2fa</span>
                             </div>";
                $content .= "<p style='margin:0; font-size:12px; color:#94a3b8; text-align:center; font-style:italic;'>Por motivos de seguridad, este código caducará en 10 minutos.</p>";
                break;
        }

        $buttonUrl = "{$baseUrl}/project/{$project['id']}";
        $buttonText = "Ver Detalles del Proyecto";

        // Si tenemos un ID de documento, apuntamos directamente a él
        if (!empty($data['document_id'])) {
            $buttonUrl .= "/documents/" . $data['document_id'];
            $buttonText = ($eventName === 'nuevo_comentario') ? "Ver Conversación" : "Ver Documento";
        }

        $content .= "<div style='margin-top:40px; text-align:center;'>
                        <a href='{$buttonUrl}' style='display:inline-block; background:#F97316; color:white; padding:18px 36px; border-radius:16px; font-weight:800; text-decoration:none; font-size:15px; box-shadow: 0 10px 20px rgba(249, 115, 22, 0.2); transition: all 0.3s ease;'>$buttonText</a>
                     </div>";

        $body = self::getHtmlWrapper($content, "Notificación importante sobre el proyecto $projRef");

        return [$subject, $body];
    }

    public static function queueUserEvent($recipientUserId, $eventName, $recipientEmail, $data = [])
    {
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

    private static function buildUserEmailTemplate($eventName, $data)
    {
        $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? 'https://steelinox.es', '/');
        $subject = "Notificación de Steelinox";
        $content = "";

        switch ($eventName) {
            case 'alta_usuario':
                $subject = "Bienvenido a Steelinox - Activación de cuenta";
                $nombre = htmlspecialchars($data['nombre'] ?? '', ENT_QUOTES, 'UTF-8');
                $resetUrl = htmlspecialchars($data['reset_url'] ?? '', ENT_QUOTES, 'UTF-8');

                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Hola, $nombre</h2>";
                $content .= "<p style='margin:0 0 25px 0; color:#64748b;'>Tu cuenta de acceso a la plataforma privada de Steelinox ha sido creada correctamente.</p>";

                $content .= "<div style='background:#f1f5f9; border-left:4px solid #111827; padding:20px; margin-bottom:25px;'>
                                <p style='margin:0 0 10px 0; font-size:13px; font-weight:700; color:#1a1b25;'>🛡️ Recomendaciones de seguridad:</p>
                                <ul style='margin:0; padding:0 0 0 20px; font-size:12px; color:#475569; line-height:1.6;'>
                                    <li>Usa una contraseña única que no utilices en otros servicios.</li>
                                    <li>No compartas tus credenciales con terceros.</li>
                                    <li>Cierra la sesión siempre que accedas desde un equipo público.</li>
                                </ul>
                             </div>";

                $content .= "<div style='text-align:center;'>
                                <a href='{$resetUrl}' style='display:inline-block; background:#111827; color:white; padding:16px 32px; border-radius:14px; font-weight:800; text-decoration:none; font-size:14px;'>Establecer mi Contraseña</a>
                             </div>";
                $content .= "<p style='margin:20px 0 0 0; font-size:12px; color:#94a3b8; text-align:center;'>Este enlace de activación caducará en 24 horas.</p>";
                break;

            case 'recuperar_password':
                $subject = "Recuperar Contraseña — Steelinox";
                $resetUrl = htmlspecialchars($data['reset_url'] ?? '', ENT_QUOTES, 'UTF-8');

                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Recuperación de Acceso</h2>";
                $content .= "<p style='margin:0 0 25px 0; color:#64748b;'>Has solicitado restablecer tu contraseña para acceder a la plataforma de Steelinox. Haz clic en el botón de abajo para continuar:</p>";
                $content .= "<div style='text-align:center; margin-bottom:30px;'>
                                <a href='{$resetUrl}' style='display:inline-block; background:#111827; color:white; padding:16px 32px; border-radius:14px; font-weight:800; text-decoration:none; font-size:14px;'>Restablecer Contraseña</a>
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
                $content .= "<div style='margin-top:40px; text-align:center;'>
                                <a href='{$baseUrl}/login' style='display:inline-block; background:#F97316; color:white; padding:18px 36px; border-radius:16px; font-weight:800; text-decoration:none; font-size:15px; box-shadow: 0 10px 20px rgba(249, 115, 22, 0.2);'>Acceder a la Plataforma</a>
                              </div>";
                break;

            case 'otp_login':
                $subject = "🔐 Código de verificación — Steelinox";
                $otp = htmlspecialchars($data['otp'] ?? '000000', ENT_QUOTES, 'UTF-8');
                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Verificación de Inicio de Sesión</h2>";
                $content .= "<p style='margin:0 0 20px 0; color:#64748b;'>Introduce el siguiente código de 6 dígitos en la plataforma para completar tu acceso:</p>";
                $content .= "<div style='background:#f8fafc; border:2px dashed #e2e8f0; border-radius:12px; padding:30px; text-align:center; margin-bottom:25px;'>
                                <span style='display:block; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:2px; margin-bottom:10px;'>Tu Código</span>
                                <span style='font-size:36px; font-weight:800; color:#111827; letter-spacing:8px;'>$otp</span>
                             </div>";
                $content .= "<p style='margin:0; font-size:12px; color:#94a3b8; text-align:center;'>Este código caducará en 10 minutos. Si no has intentado iniciar sesión, cambia tu contraseña inmediatamente.</p>";
                break;
        }

        $body = self::getHtmlWrapper($content, "Bienvenido a la plataforma oficial de Steelinox");
        return [$subject, $body];
    }

    private static function getStatusBadgeHtml($status)
    {
        $map = [
            'propuesta' => ['label' => 'Propuesta', 'bg' => '#fffbeb', 'text' => '#b45309', 'border' => '#fde68a', 'dot' => false],
            'aprobado' => ['label' => 'Aprobado', 'bg' => '#eff6ff', 'text' => '#1d4ed8', 'border' => '#bfdbfe', 'dot' => false],
            'ejecucion' => ['label' => 'Ejecución', 'bg' => '#ecfdf5', 'text' => '#047857', 'border' => '#a7f3d0', 'dot' => true],
            'cerrado' => ['label' => 'Cerrado', 'bg' => '#fef2f2', 'text' => '#b91c1c', 'border' => '#fecaca', 'dot' => false],
        ];

        $s = $map[$status] ?? ['label' => strtoupper($status), 'bg' => '#f1f5f9', 'text' => '#475569', 'border' => '#e2e8f0', 'dot' => false];

        $dotHtml = $s['dot'] ? "<span style='display:inline-block; width:6px; height:6px; background-color:currentColor; border-radius:50%; margin-right:6px; vertical-align:middle;'></span>" : "";

        return "
        <span style='display:inline-block; background-color:{$s['bg']}; color:{$s['text']}; border:1px solid {$s['border']}; padding:4px 12px; border-radius:100px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap;'>
            {$dotHtml}
            <span style='vertical-align:middle;'>{$s['label']}</span>
        </span>";
    }

    private static function getRefBadgeHtml($text)
    {
        if (empty($text))
            return '';
        return "<span style='display:inline-block; background-color:rgba(241, 245, 249, 0.8); color:#64748b; border:1px solid #e2e8f0; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; letter-spacing:0.02em; white-space:nowrap; vertical-align:middle;'>{$text}</span>";
    }

    private static function getHtmlWrapper($content, $preheader = "")
    {
        $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? 'https://steelinox.es', '/');

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Notificación de Steelinox</title>
        </head>
        <body style='margin:0; padding:0; background-color:#f4f7f9; font-family:\"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
            <div style='display:none; max-height:0; overflow:hidden;'>$preheader</div>
            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#f4f7f9; padding:40px 10px;'>
                <tr>
                    <td align='center'>
                        <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width:600px; background-color:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 20px 40px -10px rgba(0,0,0,0.05);'>
                            <tr>
                                <td style='background-color:#ffffff; padding:60px 40px 40px 40px; text-align:center; border-bottom:1px solid #f1f5f9;'>
                                    <div style='display:inline-block;'>
                                        <div style='font-size:32px; font-weight:300; color:#F97316; line-height:1; letter-spacing:1px; margin:0;'>Steel</div>
                                        <div style='font-size:32px; font-weight:300; color:#111827; line-height:1; letter-spacing:1px; margin:0;'>Inox</div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style='padding:60px 50px;'>
                                    $content
                                </td>
                            </tr>
                            <tr>
                                <td style='background-color:#fcfdfe; padding:45px 40px; text-align:center; border-top:1px solid #f1f5f9;'>
                                    <p style='margin:0 0 12px 0; color:#94a3b8; font-size:12px; font-weight:800; letter-spacing:1px;'>© 2026 STEELINOX S.L. · EXTRANET PRIVADA</p>
                                    <p style='margin:0; color:#cbd5e1; font-size:11px; line-height:1.8; max-width:400px; margin:0 auto;'>
                                        Este es un mensaje automático generado por el sistema de gestión. 
                                        Por seguridad, no compartas el contenido de estos correos.
                                    </p>
                                </td>
                            </tr>
                        </table>
                        <div style='margin-top:30px; text-align:center;'>
                            <p style='color:#94a3b8; font-size:11px;'>Ribarroja del Turia, Valencia · <a href='https://steel-inox.com' style='color:#94a3b8; text-decoration:underline;'>Visitar Web</a></p>
                        </div>
                    </td>
                </tr>
            </table>
        </body>
        </html>";
    }
}