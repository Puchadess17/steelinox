<?php
// app/Services/AuditLogger.php

require_once CORE_PATH . '/Database.php';

/**
 * ====================
 * AUDIT LOGGER (SERVICIO)
 * ====================
 * Servicio estático responsable de registrar la trazabilidad de acciones
 * en toda la aplicación. Almacena el contexto del usuario, detalles técnicos
 * (IP, User-Agent) y metadatos específicos del evento de forma inmutable.
 */
class AuditLogger {

    /**
     * REGISTRO DE EVENTO DE AUDITORÍA
     * Inserta un nuevo registro en la base de datos. Extrae automáticamente
     * la información de la sesión y del servidor para certificar la autoría.
     *
     * @param string $actionKey Identificador de la acción (ej: 'documento_descargado')
     * @param string $entityType Tipo de entidad afectada (ej: 'document', 'project')
     * @param int $entityId ID del registro afectado en la base de datos
     * @param int|null $projectId ID del proyecto (opcional, para agrupar históricos)
     * @param array|null $metadata Datos adicionales en formato array asociativo
     * @return bool True si se registró con éxito, False en caso de error
     */
    public static function log($actionKey, $entityType, $entityId, $projectId = null, $metadata = null) {
        try {
            // Extrae la conexión global a la base de datos
            $db = Database::getInstance()->getConnection();

            // Captura automática de variables de entorno y sesión
            $actorUserId = $_SESSION['user_id'] ?? null;
            $actorRole = $_SESSION['role'] ?? null;
            $ip = $_SERVER['REMOTE_ADDR'] ?? null;
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
            
            // Conversión segura de metadatos a JSON soportando caracteres unicode
            $metadataJson = $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null;

            $sql = "INSERT INTO audit_logs 
                    (actor_user_id, actor_role, action_key, entity_type, entity_id, project_id, metadata_json, ip, user_agent, created_at) 
                    VALUES (:actor_user_id, :actor_role, :action_key, :entity_type, :entity_id, :project_id, :metadata_json, :ip, :user_agent, NOW())";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([
                'actor_user_id' => $actorUserId,
                'actor_role'    => $actorRole,
                'action_key'    => $actionKey,
                'entity_type'   => $entityType,
                'entity_id'     => $entityId,
                'project_id'    => $projectId,
                'metadata_json' => $metadataJson,
                'ip'            => $ip,
                'user_agent'    => $userAgent
            ]);

            return true;
            
        } catch (Exception $e) {
            /**
             * EJECUCIÓN SILENCIOSA (FALLBACK A ARCHIVO)
             * Si ocurre un error al guardar el log, se captura la excepción y 
             * se escribe en un archivo físico aislando el fallo. Retorna false 
             * para no interrumpir ni tumbar la transacción principal del usuario.
             */
            $logDir = STORAGE_PATH . '/logs';
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
            $logMessage = "[" . date('Y-m-d H:i:s') . "] Fallo en AuditLogger: " . $e->getMessage() . PHP_EOL;
            error_log($logMessage, 3, $logDir . '/system_errors.log');

            return false;
        }
    }
}