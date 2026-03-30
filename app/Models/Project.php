<?php
// app/Models/Project.php

require_once CORE_PATH . '/Database.php';

class Project {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // Lista de proyectos dashboard, filtrada por rol y usuario
    public function getListByUser($userId, $role, $clientId) {
        $sql = "SELECT p.id, p.name, p.reference, p.status, p.created_at, c.name AS client_name 
                FROM projects p
                LEFT JOIN clients c ON p.client_id = c.id
                WHERE p.deleted_at IS NULL";

        $params = [];

        if ($role === 'cliente') {
            $sql .= " AND p.client_id = :client_id";
            $params['client_id'] = $clientId;

        } elseif ($role === 'comercial') {
            $sql .= " AND p.id IN (SELECT project_id FROM project_user WHERE user_id = :user_id)";
            $params['user_id'] = $userId;
        }

        $sql .= " ORDER BY p.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }
}