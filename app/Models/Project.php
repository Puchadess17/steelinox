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

    // Proyecto individual->fetch
    public function getById($projectId, $userId, $role, $clientId) {
        $sql = "SELECT p.*, 
                       c.name AS client_name, 
                       c.reference AS client_reference, 
                       c.is_active AS client_is_active 
                FROM projects p
                LEFT JOIN clients c ON p.client_id = c.id
                WHERE p.id = :project_id AND p.deleted_at IS NULL";

        $params = ['project_id' => $projectId];

        // Reglas de seguridad
        if ($role === 'cliente') {
            $sql .= " AND p.client_id = :client_id";
            $params['client_id'] = $clientId;

        } elseif ($role === 'comercial') {
            $sql .= " AND p.id IN (SELECT project_id FROM project_user WHERE user_id = :user_id)";
            $params['user_id'] = $userId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetch(); 
    }

    /** Obtiene la lista de comerciales asignados a un proyecto */
    public function getAssignedUsers($projectId) {
        $sql = "SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login_at 
                FROM users u
                INNER JOIN project_user pu ON u.id = pu.user_id
                WHERE pu.project_id = :project_id
                AND u.role = 'comercial' 
                  AND u.deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['project_id' => $projectId]);
        
        return $stmt->fetchAll();
    }

    /** Asigna un comercial a un proyecto */
    public function assignUser($projectId, $userId) {
        $sql = "INSERT IGNORE INTO project_user (project_id, user_id) 
                VALUES (:project_id, :user_id)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'project_id' => $projectId,
            'user_id'    => $userId
        ]);
    }

    /** Elimina la asignación de un usuario a un proyecto específico */
    public function removeUser($projectId, $userId) {
        $sql = "DELETE FROM project_user 
                WHERE project_id = :project_id AND user_id = :user_id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'project_id' => $projectId,
            'user_id'    => $userId
        ]);
    }

    /** Crea un nuevo proyecto y auto-asigna al creador si es comercial */
    public function createWithAutoAssign($data, $userId, $role) {
        try {
            // Iniciamos la transacción
            $this->db->beginTransaction();

            $sql = "INSERT INTO projects (client_id, name, reference, status, budget_amount, description, surface, project_type, created_by, created_at) 
                    VALUES (:client_id, :name, :reference, :status, :budget_amount, :description, :surface, :project_type, :created_by, NOW())";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                'client_id'     => $data['client_id'],
                'name'          => $data['name'],
                'reference'     => $data['reference'],
                'status'        => $data['status'] ?? 'propuesta',
                'budget_amount' => !empty($data['budget_amount']) ? (float)$data['budget_amount'] : null,
                'description'   => $data['description'] ?? null,
                'surface'       => $data['surface'] ?? null,
                'project_type'  => $data['project_type'] ?? null,
                'created_by'    => $data['created_by']
            ]);

            $newProjectId = $this->db->lastInsertId();

            // Si es un comercial, lo auto-asignamos a la tabla pivote de inmediato
            if ($role === 'comercial') {
                $sqlAssign = "INSERT INTO project_user (project_id, user_id) VALUES (:project_id, :user_id)";
                $stmtAssign = $this->db->prepare($sqlAssign);
                $stmtAssign->execute([
                    'project_id' => $newProjectId,
                    'user_id'    => $userId
                ]);
            }

            // Si todo ha ido bien, consolidamos los cambios
            $this->db->commit();
            return $newProjectId;

        } catch (Exception $e) {
            // Si algo falla, deshacemos todo
            $this->db->rollBack();
            throw $e;
        }
    }

    /** Actualiza la información general del proyecto (EXCLUYENDO el estado) */
    public function update($id, $data) {
        $sql = "UPDATE projects 
                SET name = :name, 
                    reference = :reference, 
                    budget_amount = :budget_amount, 
                    description = :description, 
                    surface = :surface, 
                    project_type = :project_type 
                WHERE id = :id AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'name'          => $data['name'],
            'reference'     => $data['reference'],
            'budget_amount' => !empty($data['budget_amount']) ? (float)$data['budget_amount'] : null,
            'description'   => $data['description'] ?? null,
            'surface'       => $data['surface'] ?? null,
            'project_type'  => $data['project_type'] ?? null,
            'id'            => $id
        ]);
    }

    /** Actualiza exclusivamente el estado del proyecto */
    public function updateStatus($projectId, $newStatus, $userId, $reason = null) {
        try {
            $this->db->beginTransaction();

            // 1. Obtener el estado actual antes de cambiarlo
            $stmtOld = $this->db->prepare("SELECT status FROM projects WHERE id = :id");
            $stmtOld->execute(['id' => $projectId]);
            $oldStatus = $stmtOld->fetchColumn();

            // Si el estado es el mismo, no hacemos nada para evitar logs basura
            if ($oldStatus === $newStatus) {
                $this->db->rollBack();
                return true;
            }

            // 2. Actualizar el estado en el proyecto
            $stmtUpdate = $this->db->prepare("UPDATE projects SET status = :status WHERE id = :id");
            $stmtUpdate->execute(['status' => $newStatus, 'id' => $projectId]);

            // 3. Insertar el registro en project_status_logs
            $sqlLog = "INSERT INTO project_status_logs 
                        (project_id, changed_by_user_id, old_status, new_status, reason, created_at) 
                       VALUES (:project_id, :user_id, :old_status, :new_status, :reason, NOW())";
            $stmtLog = $this->db->prepare($sqlLog);
            $stmtLog->execute([
                'project_id' => $projectId,
                'user_id'    => $userId,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason'     => $reason // El comercial puede justificar por qué lo cambia
            ]);

            $this->db->commit();
            return true;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}