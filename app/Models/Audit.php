<?php
// app/Models/Audit.php

require_once CORE_PATH . '/Database.php';

class Audit {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /** Obtiene el historial de un proyecto específico */
    public function getByProject($projectId) {
        $sql = "SELECT a.id, a.action_key, a.entity_type, a.entity_id, a.metadata_json, a.created_at,
                       u.name AS actor_name, a.actor_role
                FROM audit_logs a
                LEFT JOIN users u ON a.actor_user_id = u.id
                WHERE a.project_id = :project_id
                ORDER BY a.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['project_id' => $projectId]);
        
        return $stmt->fetchAll();
    }

    /** Obtiene el log global del sistema (Solo para Superadmins) */
    public function getGlobalLogs($limit = 100) {
        $sql = "SELECT a.id, a.action_key, a.entity_type, a.entity_id, a.metadata_json, a.ip, a.created_at,
                       u.name AS actor_name, a.actor_role
                FROM audit_logs a
                LEFT JOIN users u ON a.actor_user_id = u.id
                ORDER BY a.created_at DESC
                LIMIT " . (int)$limit;
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }

    /** * Cuenta los intentos de login fallidos de una IP en un periodo de tiempo.
     * Usado para el Rate Limiting persistente (Anti-Fuerza Bruta).
     */
    public function countRecentFailedLogins($ip, $minutes = 15) {
        $timeLimit = date('Y-m-d H:i:s', time() - ($minutes * 60));
        
        $sql = "SELECT COUNT(*) FROM audit_logs 
                WHERE action_key = 'auth_login_failed' 
                  AND ip = :ip 
                  AND created_at >= :time_limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'ip'         => $ip,
            'time_limit' => $timeLimit
        ]);
        
        return (int) $stmt->fetchColumn();
    }
}