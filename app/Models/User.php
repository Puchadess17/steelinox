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

    public function updateLastLogin($userId) {
        $stmt = $this->db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = :id");
        $stmt->execute(['id' => $userId]);
    }
}