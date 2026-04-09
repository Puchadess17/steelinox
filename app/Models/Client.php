<?php
// app/Models/Client.php

require_once CORE_PATH . '/Database.php';

class Client {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getListByUser($userId, $role) {
        if ($role === 'cliente') {
            return [];
        }

        $params = [];
        
        if ($role === 'admin') {
            $sql = "SELECT id, name, reference, is_active, created_at,
                           (SELECT COUNT(*) FROM projects WHERE client_id = clients.id AND deleted_at IS NULL) as projects_count,
                           (SELECT COUNT(*) FROM users WHERE client_id = clients.id AND deleted_at IS NULL) as users_count
                    FROM clients 
                    WHERE deleted_at IS NULL 
                    ORDER BY created_at DESC";
                    
        } elseif ($role === 'comercial') {
            $sql = "SELECT DISTINCT c.id, c.name, c.reference, c.is_active, c.created_at,
                           (SELECT COUNT(*) FROM projects WHERE client_id = c.id AND deleted_at IS NULL) as projects_count,
                           (SELECT COUNT(*) FROM users WHERE client_id = c.id AND deleted_at IS NULL) as users_count
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

    /** Obtener info básica del cliente */
    public function getById($id) {
        $sql = "SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function getDetailsById($clientId, $userId, $role) {
        if ($role === 'cliente') {
            return false;
        }

        // Datos básicos del cliente y el nombre de su creador
        $sqlClient = "SELECT c.id, c.name, c.reference, c.is_active, c.created_at, u.name AS creator_name 
                      FROM clients c
                      LEFT JOIN users u ON c.created_by = u.id
                      WHERE c.id = :client_id AND c.deleted_at IS NULL";
        
        $params = ['client_id' => $clientId];

        // Validar permisos si es comercial
        if ($role === 'comercial') {
            $sqlClient .= " AND (c.created_by = :user_id OR c.id IN (
                                SELECT p.client_id FROM projects p 
                                INNER JOIN project_user pu ON p.id = pu.project_id 
                                WHERE pu.user_id = :user_id AND p.deleted_at IS NULL
                            ))";
            $params['user_id'] = $userId;
        }

        $stmtClient = $this->db->prepare($sqlClient);
        $stmtClient->execute($params);
        $clientData = $stmtClient->fetch();

        if (!$clientData) {
            return false; // No existe o no tiene permisos
        }

        // Usuarios asociados
        $sqlUsers = "SELECT id, name, role, email, is_active, last_login_at 
                     FROM users 
                     WHERE client_id = :client_id AND deleted_at IS NULL";
        $stmtUsers = $this->db->prepare($sqlUsers);
        $stmtUsers->execute(['client_id' => $clientId]);
        $usersList = $stmtUsers->fetchAll();

        // Proyectos vinculados
        $sqlProjects = "SELECT id, name, reference, status, budget_amount, created_at 
                        FROM projects 
                        WHERE client_id = :client_id AND deleted_at IS NULL";
        $stmtProjects = $this->db->prepare($sqlProjects);
        $stmtProjects->execute(['client_id' => $clientId]);
        $projectsList = $stmtProjects->fetchAll();

        // KPIs
        $activeProjectsCount = 0;
        $annualRevenue = 0.0;
        
        foreach ($projectsList as $project) {
            if ($project['status'] !== 'cerrado') {
                $activeProjectsCount++;
            }
            if (!empty($project['budget_amount'])) {
                $annualRevenue += (float) $project['budget_amount'];
            }
        }

        $activeUsersCount = 0;
        foreach ($usersList as $user) {
            if ($user['is_active']) {
                $activeUsersCount++;
            }
        }

        return [
            'info' => $clientData,
            'kpis' => [
                'total_projects'  => count($projectsList),
                'active_projects' => $activeProjectsCount,
                'active_users'    => $activeUsersCount,
                'annual_revenue'  => $annualRevenue
            ],
            'projects' => $projectsList,
            'users'    => $usersList
        ];
    }

    /** Crear nuevo cliente */
    public function create($data) {
        $sql = "INSERT INTO clients (name, reference, is_active, created_by, created_at) 
                VALUES (:name, :reference, :is_active, :created_by, NOW())";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name'       => $data['name'],
            'reference'  => $data['reference'] ?? null,
            'is_active'  => $data['is_active'] ?? 1,
            'created_by' => $data['created_by']
        ]);
        
        return $this->db->lastInsertId();
    }

    /** Actualiza los datos de un cliente */
    public function update($id, $data) {
        $sql = "UPDATE clients 
                SET name = :name, 
                    reference = :reference, 
                    is_active = :is_active 
                WHERE id = :id AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'name'      => $data['name'],
            'reference' => $data['reference'] ?? null,
            'is_active' => isset($data['is_active']) ? (int)$data['is_active'] : 1,
            'id'        => $id
        ]);
    }

    /** Borrado lógico de un cliente (Soft Delete) */
    public function delete($id) {
        $sql = "UPDATE clients 
                SET deleted_at = NOW(), is_active = 0 
                WHERE id = :id AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }
}