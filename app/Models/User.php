<?php
// app/Models/User.php

require_once CORE_PATH . '/Database.php';

class User {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findByEmail($email) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email AND is_active = 1 AND deleted_at IS NULL");
        $stmt->execute(['email' => $email]);
        
        return $stmt->fetch(); // Devuelve array del usuario o false
    }

    public function findById($id) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = :id AND is_active = 1 AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);
        
        return $stmt->fetch();
    }

    public function findByIdWithInactive($id) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);
        
        return $stmt->fetch();
    }

    public function updateLastLogin($userId) {
        $stmt = $this->db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = :id");
        $stmt->execute(['id' => $userId]);
    }

    public function emailExists($email, $excludeId = null) {
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

    public function create($data) {
        $sql = "INSERT INTO users (client_id, role, name, email, password_hash, is_active, created_at, updated_at) 
                VALUES (:client_id, :role, :name, :email, :password_hash, :is_active, NOW(), NOW())";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'client_id'     => $data['client_id'] ?? null,
            'role'          => $data['role'] ?? 'cliente',
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password_hash' => $data['password_hash'],
            'is_active'     => $data['is_active'] ?? 1
        ]);
        
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
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
            $params['is_active'] = (int)$data['is_active'];
        }
        
        if (empty($updates)) return false;
        
        $updates[] = "updated_at = NOW()";
        
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = :id AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $sql = "UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }
}