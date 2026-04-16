<?php
// app/Services/NotificationService.php

require_once CORE_PATH . '/Database.php';

/**
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

        if (!$project)
            return false;

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
            if ($actorUserId !== null && (int) $user['id'] === (int) $actorUserId) {
                continue;
            }
            // Evitar duplicados por email
            if (!in_array($user['email'], $seenEmails)) {
                $finalRecipients[] = $user;
                $seenEmails[] = $user['email'];
            }
        }

        // 4. Construir y encolar los correos
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

    /**
     * ====================
     * HELPERS DE EXTRACCIÓN DE ROLES
     * ====================
     */
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

    /**
     * ====================
     * MOTOR DE PLANTILLAS PREMIUM
     * ====================
     */
    private static function buildEmailTemplate($eventName, $project, $data)
    {
        $projRef = $project['reference'];
        $projName = htmlspecialchars($project['name'], ENT_QUOTES, 'UTF-8');
        
        // Cargar URL base desde el entorno, con fallback de seguridad
        $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? 'https://steelinox.es', '/');

        $subject = "Steelinox: Notificación de Proyecto $projRef";
        $content = ""; // Aquí construiremos el cuerpo específico

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
                $subject = "¡Proyecto Aprobado! - $projRef";
                $content .= "<div style='text-align:center; padding:10px 0;'>
                                <div style='display:inline-block; background:#ecfdf5; color:#059669; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:800; text-transform:uppercase; margin-bottom:15px;'>HITO ALCANZADO</div>
                                <h1 style='margin:0 0 10px 0; color:#1a1b25; font-size:24px;'>¡Propuesta Aprobada!</h1>
                                <p style='margin:0 0 25px 0; color:#64748b;'>El proyecto <strong>$projRef</strong> ha sido aceptado formalmente por el cliente.</p>
                             </div>";
                break;

            case 'cambio_estado':
                $estado = htmlspecialchars($data['nuevo_estado'] ?? '', ENT_QUOTES, 'UTF-8');
                $subject = "Actualización de estado - $projRef";
                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Cambio de fase</h2>";
                $content .= "<p style='margin:0 0 25px 0; color:#64748b;'>El proyecto <strong>$projRef</strong> ha avanzado en su ciclo de vida.</p>";
                $content .= "<div style='background:#1a1b25; color:white; border-radius:12px; padding:20px; text-align:center;'>
                                <span style='display:block; font-size:11px; opacity:0.7; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;'>Nuevo Estado</span>
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

        // Botón de acción con URL dinámica basada en el entorno
        $content .= "<div style='margin-top:40px; text-align:center;'>
                        <a href='{$baseUrl}/proyectos' style='display:inline-block; background:#E57B23; color:white; padding:16px 32px; border-radius:14px; font-weight:800; text-decoration:none; font-size:14px; box-shadow: 0 4px 12px rgba(229, 123, 35, 0.3); transition: transform 0.2s;'>Ver Detalles del Proyecto</a>
                     </div>";

        $body = self::getHtmlWrapper($content, "Notificación importante sobre el proyecto $projRef");

        return [$subject, $body];
    }

    /**
     * EVENTOS DE USUARIO (SIN PROYECTO)
     * ====================
     * Encola una notificación directa a un usuario, independiente de cualquier proyecto.
     * Ideal para emails de bienvenida, recuperación de contraseñas o avisos de seguridad.
     */
    public static function queueUserEvent($recipientUserId, $eventName, $recipientEmail, $data = [])
    {
        $db = Database::getInstance()->getConnection();

        // Construimos el correo con una plantilla adaptada a usuarios
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

    /**
     * Plantilla de correos genéricos para usuarios.
     */
    private static function buildUserEmailTemplate($eventName, $data)
    {
        // Cargar URL base desde el entorno, con fallback de seguridad
        $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? 'https://steelinox.es', '/');
        
        $subject = "Notificación de Steelinox";
        $content = "";

        switch ($eventName) {
            case 'alta_usuario':
                $subject = "Bienvenido a Steelinox";
                $nombre = htmlspecialchars($data['nombre'] ?? '', ENT_QUOTES, 'UTF-8');
                $email = htmlspecialchars($data['email'] ?? '', ENT_QUOTES, 'UTF-8');
                $pass = htmlspecialchars($data['password_plana'] ?? '', ENT_QUOTES, 'UTF-8');

                $content .= "<h2 style='margin:0 0 10px 0; color:#1a1b25;'>Hola, $nombre</h2>";
                $content .= "<p style='margin:0 0 25px 0; color:#64748b;'>Tu cuenta para acceder a nuestra plataforma privada ha sido activada correctamente.</p>";
                $content .= "<div style='background:#f1f5f9; border-radius:16px; padding:25px; margin-bottom:30px;'>
                                <div style='margin-bottom:15px;'>
                                    <span style='display:block; font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;'>Correo Electrónico</span>
                                    <span style='font-size:15px; font-weight:700; color:#1a1b25;'>$email</span>
                                </div>
                                <div style='margin-bottom:0;'>
                                    <span style='display:block; font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;'>Contraseña Temporal</span>
                                    <span style='font-size:15px; font-weight:700; color:#E57B23; font-family:monospace;'>$pass</span>
                                </div>
                             </div>";
                $content .= "<p style='margin:0 0 20px 0; font-size:13px; color:#94a3b8;'>Por seguridad, se recomienda cambiar esta contraseña desde los ajustes de tu perfil tras el primer inicio de sesión.</p>";
                $content .= "<div style='text-align:center;'>
                                <a href='{$baseUrl}/' style='display:inline-block; background:#1a1b25; color:white; padding:16px 32px; border-radius:14px; font-weight:800; text-decoration:none; font-size:14px;'>Iniciar Sesión Ahora</a>
                             </div>";
                break;
        }

        $body = self::getHtmlWrapper($content, "Bienvenido a la plataforma oficial de Steelinox");

        return [$subject, $body];
    }

    /**
     * ENVOLTORIO HTML CORPORATIVO
     * ==========================
     * Encapsula el contenido en una estructura visual premium.
     */
    private static function getHtmlWrapper($content, $preheader = "")
    {
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
                                    <h1 style='margin:0; color:#ffffff; font-size:22px; font-weight:900; letter-spacing:3px; text-transform:uppercase;'>STEELINOX</h1>
                                    <span style='display:block; color:#E57B23; font-size:10px; font-weight:800; letter-spacing:1.5px; margin-top:5px;'>INGENIERÍA & INNOVACIÓN</span>
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