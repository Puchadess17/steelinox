<?php
// app/Models/User.php

require_once CORE_PATH . '/Database.php';

class User
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findByEmail($email)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email AND is_active = 1 AND deleted_at IS NULL");
        $stmt->execute(['email' => $email]);

        return $stmt->fetch(); // Devuelve array del usuario o false
    }

    public function findById($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = :id AND is_active = 1 AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);

        return $stmt->fetch();
    }

    public function findByIdWithInactive($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);

        return $stmt->fetch();
    }

    public function updateLastLogin($userId)
    {
        $stmt = $this->db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = :id");
        $stmt->execute(['id' => $userId]);
    }

    public function emailExists($email, $excludeId = null)
    {
        $sql = "SELECT id FROM users WHERE email = :email";
        $params = ['email' => $email];

        if ($excludeId !== null) {
            $sql .= " AND id != :excludeId";
            $params['excludeId'] = $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() !== false;
    }

    /** Soft Delete de un usuario */
    public function softDelete($id) {
        $sql = "UPDATE users 
                SET deleted_at = NOW(), is_active = 0 
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function create($data)
    {
        $sql = "INSERT INTO users (client_id, role, name, email, password_hash, is_active, created_at, updated_at) 
                VALUES (:client_id, :role, :name, :email, :password_hash, :is_active, NOW(), NOW())";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'client_id' => $data['client_id'] ?? null,
            'role' => $data['role'] ?? 'cliente',
            'name' => $data['name'],
            'email' => $data['email'],
            'password_hash' => $data['password_hash'],
            'is_active' => $data['is_active'] ?? 1
        ]);

        return $this->db->lastInsertId();
    }

    public function update($id, $data)
    {
        $updates = [];
        $params = ['id' => $id];

        if (isset($data['name'])) {
            $updates[] = "name = :name";
            $params['name'] = $data['name'];
        }
        if (isset($data['email'])) {
            $updates[] = "email = :email";
            $params['email'] = $data['email'];
        }
        if (isset($data['password_hash'])) {
            $updates[] = "password_hash = :password_hash";
            $params['password_hash'] = $data['password_hash'];
        }
        if (isset($data['is_active'])) {
            $updates[] = "is_active = :is_active";
            $params['is_active'] = (int) $data['is_active'];
        }

        if (empty($updates))
            return false;

        $updates[] = "updated_at = NOW()";

        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = :id AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id)
    {
        $sql = "UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    /**  Obtiene la lista de comerciales/admins activos que NO están asignados a un proyecto concreto */
    public function getAvailableForProject($projectId)
    {
        // Seleccionamos usuarios que sean comercial (o admin), estén activos y no estén borrados
        // Y excluimos los IDs que ya existan en la tabla pivote para este proyecto
        $sql = "SELECT id, name, email, role 
                FROM users 
                WHERE role = 'comercial'    
                  AND is_active = 1 
                  AND deleted_at IS NULL 
                  AND id NOT IN (
                      SELECT user_id FROM project_user WHERE project_id = :project_id
                  )
                ORDER BY name ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['project_id' => $projectId]);

        return $stmt->fetchAll();
    }

    /** Guarda un token de recuperación */
    public function setResetToken($email, $token)
    {
        // 1 hora de validez
        $sql = "UPDATE users SET reset_token = :token, reset_token_expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE email = :email AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['token' => $token, 'email' => $email]);
    }

    /** Valida un token de recuperación */
    public function findByResetToken($token)
    {
        $sql = "SELECT id, email FROM users WHERE reset_token = :token AND reset_token_expires_at > NOW() AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['token' => $token]);
        return $stmt->fetch();
    }

    /** Limpia los tokens tras el reset exitoso */
    public function clearResetToken($userId)
    {
        $sql = "UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $userId]);
    }

    /** ---COMERCIALES--- */

    /** La lista de todos los comerciales y estadísticas de sus proyectos asignados */
    public function getCommercialsWithStats() {
        // Obtenemos los datos del comercial y cruzamos para contar sus proyectos
        $sql = "SELECT u.id, u.name, u.email, u.is_active, u.last_login_at, u.created_at,
                       COUNT(DISTINCT pu.project_id) as total_projects,
                       COUNT(DISTINCT CASE WHEN p.status != 'cerrado' THEN p.id ELSE NULL END) as active_projects
                FROM users u
                LEFT JOIN project_user pu ON u.id = pu.user_id
                LEFT JOIN projects p ON pu.project_id = p.id AND p.deleted_at IS NULL
                WHERE u.role = 'comercial' 
                  AND u.deleted_at IS NULL
                GROUP BY u.id
                ORDER BY u.name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }

    /** Crea un usuario comercial */
    public function createInternalUser($data) {
        $sql = "INSERT INTO users (client_id, role, name, email, password_hash, is_active, created_at) 
                VALUES (NULL, :role, :name, :email, :password_hash, :is_active, NOW())";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'role'          => $data['role'],
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password_hash' => $data['password_hash'],
            'is_active'     => isset($data['is_active']) ? (int)$data['is_active'] : 1
        ]);
        
        return $this->db->lastInsertId();
    }

    /** Update comercial */
    public function updateInternalUser($id, $data) {
        $sql = "UPDATE users 
                SET name = :name, 
                    email = :email, 
                    is_active = :is_active";
        
        // Solo actualizamos la contraseña si nos envían una nueva
        if (!empty($data['password_hash'])) {
            $sql .= ", password_hash = :password_hash";
        }
        
        $sql .= " WHERE id = :id AND role = 'comercial' AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        
        $params = [
            'name'      => $data['name'],
            'email'     => $data['email'],
            'is_active' => $data['is_active'],
            'id'        => $id
        ];
        
        if (!empty($data['password_hash'])) {
            $params['password_hash'] = $data['password_hash'];
        }
        
        return $stmt->execute($params);
    }

    /** Obtiene los detalles básicos de un comercial por su ID */
    public function getCommercialDetails($id) {
        $sql = "SELECT id, name, email, is_active, last_login_at, created_at
                FROM users 
                WHERE id = :id AND role = 'comercial' AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    /** Lista de proyectos asignados a un comercial */
    public function getCommercialProjects($commercialId) {
        $sql = "SELECT p.id, p.name, p.reference, p.status, p.budget_amount, p.created_at, 
                       c.name AS client_name
                FROM projects p
                INNER JOIN project_user pu ON p.id = pu.project_id
                INNER JOIN clients c ON p.client_id = c.id
                WHERE pu.user_id = :user_id 
                  AND p.deleted_at IS NULL 
                  AND c.deleted_at IS NULL
                ORDER BY p.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['user_id' => $commercialId]);
        return $stmt->fetchAll();
    }

    /** Obtiene todos los usuarios (incluyendo borrados) para filtros de auditoría */
    public function getAllBasic() {
        $sql = "SELECT id, name, role, deleted_at FROM users ORDER BY name ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}