<?php
// app/Models/Comment.php

require_once CORE_PATH . '/Database.php';

/**
 * MODELO DE COMENTARIOS (COMMENT)
 * ====================
 * Capa de acceso a datos para el sistema de comunicación anidado.
 * Gestiona la inserción y recuperación de los hilos de mensajes asociados
 * a los documentos del proyecto y sus iteraciones (versiones) específicas.
 */
class Comment {
    private $db;

    /**
     * CONSTRUCTOR E INYECCIÓN DE CONEXIÓN
     * Inicializa la instancia obteniendo la conexión PDO activa.
     */
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * EXTRACCIÓN DE HILOS DE CONVERSACIÓN (PAGINADOS)
     * Recupera los comentarios vinculados a un documento. Permite filtrar
     * opcionalmente por una versión específica del archivo. Cruza datos
     * relacionales para incluir la información del autor en tiempo real.
     */
    public function getByDocument($documentId, $versionId = null, $limit = 15, $offset = 0) {
        $baseWhere = "WHERE c.document_id = :document_id AND c.deleted_at IS NULL";
        
        // 1. Cálculo del volumen total para metadatos de paginación
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

        // 2. Extracción de carga útil con resolución de relaciones (JOINs)
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

        /**
         * SANITIZACIÓN DE TIPOS (TYPE CASTING)
         * Asegura que los identificadores numéricos se devuelvan como enteros (int)
         * en lugar de cadenas (string), garantizando un JSON estricto y predecible
         * para la capa del frontend.
         */
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

    /**
     * INSERCIÓN DE NUEVO COMENTARIO
     * Registra el mensaje en la base de datos vinculándolo a su contexto
     * jerárquico completo: Proyecto -> Documento -> Versión -> Autor.
     */
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

    /**
     * RECUPERACIÓN INDIVIDUAL
     * Obtiene los datos de un comentario específico si no está borrado.
     */
    public function getById($commentId, $projectId) {
        $sql = "SELECT * FROM comments 
                WHERE id = :id AND project_id = :project_id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $commentId, 'project_id' => $projectId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * EDICIÓN LÓGICA
     * Sobrescribe el cuerpo del comentario y actualiza el timestamp de modificación.
     */
    public function update($commentId, $projectId, $newBody) {
        $sql = "UPDATE comments 
                SET body = :body, updated_at = NOW() 
                WHERE id = :id AND project_id = :project_id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'body'       => $newBody,
            'id'         => $commentId,
            'project_id' => $projectId
        ]);
    }

    /**
     * BORRADO LÓGICO
     * Oculta un comentario utilizando el campo deleted_at para preservar la auditoría.
     */
    public function delete($commentId, $projectId) {
        $sql = "UPDATE comments SET deleted_at = NOW() WHERE id = :comment_id AND project_id = :project_id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'comment_id' => $commentId,
            'project_id' => $projectId
        ]);
    }
}