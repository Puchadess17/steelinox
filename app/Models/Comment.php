<?php
// app/Models/Comment.php

require_once CORE_PATH . '/Database.php';

class Comment {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /** Hilo de comentarios de un documento con paginación */
    public function getByDocument($documentId, $versionId = null, $limit = 15, $offset = 0) {
        $baseWhere = "WHERE c.document_id = :document_id AND c.deleted_at IS NULL";
        
        // 1. Contar el total de comentarios
        $countSql = "SELECT COUNT(*) FROM comments c " . $baseWhere;
        if ($versionId !== null) {
            $countSql .= " AND c.document_version_id = :version_id";
        }
        
        $stmtCount = $this->db->prepare($countSql);
        $stmtCount->bindValue(':document_id', $documentId, PDO::PARAM_INT);
        if ($versionId !== null) {
            $stmtCount->bindValue(':version_id', $versionId, PDO::PARAM_INT);
        }
        $stmtCount->execute();
        $total = (int)$stmtCount->fetchColumn();

        // 2. Obtener los comentarios paginados
        $dataSql = "SELECT c.id, c.body, c.created_at, c.updated_at,
                           u.id AS author_id, u.name AS author_name, u.role AS author_role,
                           dv.version_number, dv.id AS version_id
                    FROM comments c
                    INNER JOIN users u ON c.author_user_id = u.id
                    LEFT JOIN document_versions dv ON c.document_version_id = dv.id
                    $baseWhere";
        
        if ($versionId !== null) {
            $dataSql .= " AND c.document_version_id = :version_id";
        }

        $dataSql .= " ORDER BY c.created_at ASC LIMIT :limit OFFSET :offset";
        
        $stmtData = $this->db->prepare($dataSql);
        $stmtData->bindValue(':document_id', $documentId, PDO::PARAM_INT);
        if ($versionId !== null) {
            $stmtData->bindValue(':version_id', $versionId, PDO::PARAM_INT);
        }
        $stmtData->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmtData->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmtData->execute();
        
        $rows = $stmtData->fetchAll(\PDO::FETCH_ASSOC);

        // Castear campos numéricos
        $mappedRows = array_map(function($row) {
            $row['id']             = (int) $row['id'];
            $row['author_id']      = (int) $row['author_id'];
            $row['version_number'] = isset($row['version_number']) ? (int) $row['version_number'] : null;
            $row['version_id']     = isset($row['version_id'])     ? (int) $row['version_id']     : null;
            return $row;
        }, $rows);

        return [
            'total' => $total,
            'data'  => $mappedRows
        ];
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