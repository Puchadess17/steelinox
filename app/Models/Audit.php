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

    /**
     * Obtiene logs filtrados con soporte para búsqueda avanzada
     */
    public function getFilteredLogs($filters = [], $limit = 500) {
        $where = [];
        $params = [];

        if (!empty($filters['actor_user_id'])) {
            $where[] = "a.actor_user_id = :actor_user_id";
            $params['actor_user_id'] = $filters['actor_user_id'];
        }

        if (!empty($filters['action_key'])) {
            $where[] = "a.action_key = :action_key";
            $params['action_key'] = $filters['action_key'];
        }

        if (!empty($filters['entity_type'])) {
            $where[] = "a.entity_type = :entity_type";
            $params['entity_type'] = $filters['entity_type'];
        }

        if (!empty($filters['date_start'])) {
            $where[] = "a.created_at >= :date_start";
            $params['date_start'] = $filters['date_start'] . " 00:00:00";
        }

        if (!empty($filters['date_end'])) {
            $where[] = "a.created_at <= :date_end";
            $params['date_end'] = $filters['date_end'] . " 23:59:59";
        }

        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "SELECT a.id, a.action_key, a.entity_type, a.entity_id, a.metadata_json, a.ip, a.user_agent, a.created_at,
                       u.name AS actor_name, a.actor_role
                FROM audit_logs a
                LEFT JOIN users u ON a.actor_user_id = u.id
                $whereSql
                ORDER BY a.created_at DESC
                LIMIT " . (int)$limit;
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }

    /** Obtiene todos los tipos de acciones registrados para los filtros */
    public function getUniqueActions() {
        $sql = "SELECT DISTINCT action_key FROM audit_logs ORDER BY action_key ASC";
        return $this->db->query($sql)->fetchAll(PDO::FETCH_COLUMN);
    }

    /** Obtiene todos los tipos de entidades registrados para los filtros */
    public function getUniqueEntities() {
        $sql = "SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type ASC";
        return $this->db->query($sql)->fetchAll(PDO::FETCH_COLUMN);
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