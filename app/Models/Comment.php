<?php
// app/Models/Comment.php

require_once CORE_PATH . '/Database.php';

class Comment {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /** Hilo de comentarios de un documento con los datos del autor y la versión, filtrando por version especifica */
    public function getByDocument($documentId, $versionId = null) {
        $sql = "SELECT c.id, c.body, c.created_at, c.updated_at,
                       u.id AS author_id, u.name AS author_name, u.role AS author_role,
                       dv.version_number, dv.id AS version_id
                FROM comments c
                INNER JOIN users u ON c.author_user_id = u.id
                LEFT JOIN document_versions dv ON c.document_version_id = dv.id
                WHERE c.document_id = :document_id 
                  AND c.deleted_at IS NULL";
        
        $params = ['document_id' => $documentId];

        // Si se pasa un ID de versión, aplicamos el filtro
        if ($versionId !== null) {
            $sql .= " AND c.document_version_id = :version_id";
            $params['version_id'] = $versionId;
        }

        $sql .= " ORDER BY c.created_at ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Castear campos numéricos para que el JSON los devuelva como enteros, no strings
        return array_map(function($row) {
            $row['id']             = (int) $row['id'];
            $row['author_id']      = (int) $row['author_id'];
            $row['version_number'] = isset($row['version_number']) ? (int) $row['version_number'] : null;
            $row['version_id']     = isset($row['version_id'])     ? (int) $row['version_id']     : null;
            return $row;
        }, $rows);
    }

    /** Inserta un nuevo comentario en la base de datos */
    public function create($data) {
        $sql = "INSERT INTO comments (project_id, document_id, document_version_id, author_user_id, body, created_at) 
                VALUES (:project_id, :document_id, :document_version_id, :author_user_id, :body, NOW())";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'project_id'          => $data['project_id'],
            'document_id'         => $data['document_id'],
            'document_version_id' => $data['document_version_id'],
            'author_user_id'      => $data['author_user_id'],
            'body'                => $data['body']
        ]);
        
        return $this->db->lastInsertId();
    }
}