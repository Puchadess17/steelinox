<?php
// app/Services/AuditLogger.php

require_once CORE_PATH . '/Database.php';

class AuditLogger {

    /**
     * Registra un evento en la base de datos de auditoría
     * * @param string $actionKey Ej: 'documento_descargado', 'proyecto_cambio_estado'
     * @param string $entityType Ej: 'document', 'project', 'user'
     * @param int $entityId El ID de la entidad afectada
     * @param int|null $projectId (Opcional) Para vincularlo a la línea temporal del proyecto
     * @param array|null $metadata (Opcional) Array asociativo con datos extra (old_status, etc.)
     */
    public static function log($actionKey, $entityType, $entityId, $projectId = null, $metadata = null) {
        try {
            $db = Database::getInstance()->getConnection();

            $actorUserId = $_SESSION['user_id'] ?? null;
            $actorRole = $_SESSION['role'] ?? null;
            $ip = $_SERVER['REMOTE_ADDR'] ?? null;
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
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
            // En un sistema crítico, un fallo en el log no debería tumbar la acción principal.
            error_log("Fallo crítico en AuditLogger: " . $e->getMessage());
            return false;
        }
    }
}