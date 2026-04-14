<?php
// app/Models/Document.php
require_once CORE_PATH . '/Database.php';

class Document {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /** Sube un documento NUEVO (crea el registro padre y su primera versión) */
    public function uploadNewDocument($docData, $versionData) {
        try {
            $this->db->beginTransaction();

            $sqlDoc = "INSERT INTO documents (project_id, type, title, is_visible_to_client, access_mode, created_by, created_at) 
                       VALUES (:project_id, :type, :title, :is_visible_to_client, :access_mode, :created_by, NOW())";
            $stmtDoc = $this->db->prepare($sqlDoc);
            $stmtDoc->execute([
                'project_id'           => $docData['project_id'],
                'type'                 => $docData['type'],
                'title'                => $docData['title'],
                'is_visible_to_client' => isset($docData['is_visible_to_client']) ? (int)$docData['is_visible_to_client'] : 0,
                'access_mode'          => $docData['access_mode'] ?? 'download',
                'created_by'           => $docData['created_by']
            ]);
            
            $documentId = $this->db->lastInsertId();

            $sqlVer = "INSERT INTO document_versions (document_id, version_number, file_name, storage_path, mime_type, file_size, checksum_sha256, is_current, uploaded_by, uploaded_at) 
                       VALUES (:document_id, 1, :file_name, :storage_path, :mime_type, :file_size, :checksum_sha256, 1, :uploaded_by, NOW())";
            $stmtVer = $this->db->prepare($sqlVer);
            $stmtVer->execute([
                'document_id'     => $documentId,
                'file_name'       => $versionData['file_name'],
                'storage_path'    => $versionData['storage_path'],
                'mime_type'       => $versionData['mime_type'],
                'file_size'       => $versionData['file_size'],
                'checksum_sha256' => $versionData['checksum_sha256'],
                'uploaded_by'     => $versionData['uploaded_by']
            ]);

            $versionId = $this->db->lastInsertId();

            $sqlUpdateDoc = "UPDATE documents SET current_version_id = :version_id WHERE id = :document_id";
            $stmtUpdateDoc = $this->db->prepare($sqlUpdateDoc);
            $stmtUpdateDoc->execute([
                'version_id'  => $versionId,
                'document_id' => $documentId
            ]);

            $this->db->commit();
            return $documentId;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /** Obtiene la lista de documentos de un proyecto, aplicando paginación y filtro de cliente */
    public function getListByProject($projectId, $role, $limit = 15, $offset = 0) {
        $baseWhere = "WHERE d.project_id = :project_id AND d.deleted_at IS NULL";
        
        if ($role === 'cliente') {
            $baseWhere .= " AND d.is_visible_to_client = 1";
        }

        // 1. Contar el total de documentos permitidos
        $countSql = "SELECT COUNT(*) FROM documents d " . $baseWhere;
        $stmtCount = $this->db->prepare($countSql);
        $stmtCount->execute(['project_id' => $projectId]);
        $total = (int)$stmtCount->fetchColumn();

        // 2. Extraer datos con paginación
        $dataSql = "SELECT d.id, d.type, d.title, d.is_visible_to_client, d.access_mode, d.created_at,
                           v.version_number, v.file_name, v.file_size, v.mime_type, v.uploaded_at,
                           u.name AS uploaded_by_name
                    FROM documents d
                    INNER JOIN document_versions v ON d.current_version_id = v.id
                    LEFT JOIN users u ON v.uploaded_by = u.id
                    $baseWhere
                    ORDER BY d.created_at DESC
                    LIMIT :limit OFFSET :offset";

        $stmtData = $this->db->prepare($dataSql);
        $stmtData->bindValue(':project_id', $projectId, PDO::PARAM_INT);
        $stmtData->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmtData->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmtData->execute();
        
        return [
            'total' => $total,
            'data'  => $stmtData->fetchAll()
        ];
    }

    /** Obtiene los metadatos de un documento y su ruta física para forzar la descarga */
    public function getForDownload($documentId, $projectId, $versionId = null) {
        if (!$versionId) {
            $sql = "SELECT d.id, d.title, d.is_visible_to_client, d.access_mode,
                           v.id AS version_id, v.version_number, v.file_name, v.storage_path, v.mime_type, v.file_size 
                    FROM documents d
                    INNER JOIN document_versions v ON d.current_version_id = v.id
                    WHERE d.id = :document_id 
                      AND d.project_id = :project_id 
                      AND d.deleted_at IS NULL";
            $params = ['document_id' => $documentId, 'project_id' => $projectId];
        } else {
            $sql = "SELECT d.id, d.title, d.is_visible_to_client, d.access_mode,
                           v.id AS version_id, v.version_number, v.file_name, v.storage_path, v.mime_type, v.file_size 
                    FROM documents d
                    INNER JOIN document_versions v ON d.id = v.document_id
                    WHERE d.id = :document_id 
                      AND d.project_id = :project_id 
                      AND v.id = :version_id
                      AND d.deleted_at IS NULL";
            $params = ['document_id' => $documentId, 'project_id' => $projectId, 'version_id' => $versionId];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetch();
    }

    /** Busca un documento por título dentro de un proyecto (para evitar duplicados) */
    public function findDocumentByTitle($projectId, $title) {
        $sql = "SELECT id FROM documents WHERE project_id = :project_id AND title = :title AND deleted_at IS NULL LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['project_id' => $projectId, 'title' => $title]);
        return $stmt->fetchColumn();
    }

    /** Obtiene el historial completo de versiones de un documento */
    public function getVersions($documentId) {
        $sql = "SELECT v.id, v.version_number, v.file_name, v.file_size, v.mime_type, v.uploaded_at, u.name AS uploaded_by_name, v.is_current
                FROM document_versions v
                LEFT JOIN users u ON v.uploaded_by = u.id
                WHERE v.document_id = :document_id
                ORDER BY v.version_number DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['document_id' => $documentId]);
        return $stmt->fetchAll();
    }

    /** Sube una NUEVA VERSIÓN de un documento existente */
    public function uploadNewVersion($documentId, $versionData) {
        try {
            $this->db->beginTransaction();

            $sqlMax = "SELECT MAX(version_number) FROM document_versions WHERE document_id = :document_id";
            $stmtMax = $this->db->prepare($sqlMax);
            $stmtMax->execute(['document_id' => $documentId]);
            $lastVersion = (int)$stmtMax->fetchColumn();
            $newVersion = $lastVersion + 1;

            $sqlDisable = "UPDATE document_versions SET is_current = 0 WHERE document_id = :document_id";
            $stmtDisable = $this->db->prepare($sqlDisable);
            $stmtDisable->execute(['document_id' => $documentId]);

            $sqlVer = "INSERT INTO document_versions (document_id, version_number, file_name, storage_path, mime_type, file_size, checksum_sha256, is_current, uploaded_by, uploaded_at) 
                       VALUES (:document_id, :version_number, :file_name, :storage_path, :mime_type, :file_size, :checksum_sha256, 1, :uploaded_by, NOW())";
            $stmtVer = $this->db->prepare($sqlVer);
            $stmtVer->execute([
                'document_id'     => $documentId,
                'version_number'  => $newVersion,
                'file_name'       => $versionData['file_name'],
                'storage_path'    => $versionData['storage_path'],
                'mime_type'       => $versionData['mime_type'],
                'file_size'       => $versionData['file_size'],
                'checksum_sha256' => $versionData['checksum_sha256'],
                'uploaded_by'     => $versionData['uploaded_by']
            ]);

            $newVersionId = $this->db->lastInsertId();

            $sqlUpdateDoc = "UPDATE documents SET current_version_id = :version_id WHERE id = :document_id";
            $stmtUpdateDoc = $this->db->prepare($sqlUpdateDoc);
            $stmtUpdateDoc->execute([
                'version_id'  => $newVersionId,
                'document_id' => $documentId
            ]);

            $this->db->commit();
            return $newVersionId;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}