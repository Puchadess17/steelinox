<?php
// app/Models/Client.php

require_once CORE_PATH . '/Database.php';

class Client {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getListByUser($userId, $role) {
        // Si llega un cliente, devolvemos vacío
        if ($role === 'cliente') {
            return [];
        }

        $params = [];
        
        if ($role === 'admin') {
            $sql = "SELECT id, name, reference, is_active, created_at 
                    FROM clients 
                    WHERE deleted_at IS NULL 
                    ORDER BY created_at DESC";
                    
        } elseif ($role === 'comercial') {
            // Comercial ve clientes que creó él, o clientes de los proyectos en los que participa
            $sql = "SELECT DISTINCT c.id, c.name, c.reference, c.is_active, c.created_at 
                    FROM clients c
                    LEFT JOIN projects p ON c.id = p.client_id AND p.deleted_at IS NULL
                    LEFT JOIN project_user pu ON p.id = pu.project_id
                    WHERE (c.created_by = :user_id OR pu.user_id = :user_id) 
                      AND c.deleted_at IS NULL
                    ORDER BY c.created_at DESC";
                    
            $params['user_id'] = $userId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }
}