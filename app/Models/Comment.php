<?php
// app/Models/Comment.php

require_once CORE_PATH . '/Database.php';

class Comment {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /** Hilo de comentarios de un documento con los datos del autor y la versión */
    public function getByDocument($documentId) {
        $sql = "SELECT c.id, c.body, c.created_at, c.updated_at,
                       u.id AS author_id, u.name AS author_name, u.role AS author_role,
                       dv.version_number
                FROM comments c
                INNER JOIN users u ON c.author_user_id = u.id
                LEFT JOIN document_versions dv ON c.document_version_id = dv.id
                WHERE c.document_id = :document_id 
                  AND c.deleted_at IS NULL
                ORDER BY c.created_at ASC"; // ASC = Los más antiguos arriba, los nuevos abajo
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['document_id' => $documentId]);
        
        return $stmt->fetchAll();
    }
}