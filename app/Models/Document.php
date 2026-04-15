<?php
// app/Models/Document.php
require_once CORE_PATH . '/Database.php';

/**
 * MODELO DE DOCUMENTO (DOCUMENT)
 * ====================
 * Capa de acceso a datos para la gestión de archivos y versionado.
 * Administra el ciclo de vida de los documentos, asegurando la integridad
 * referencial entre el registro lógico (documento) y sus iteraciones físicas 
 * (versiones) mediante transacciones de base de datos.
 */
class Document {
    private $db;

    /**
     * CONSTRUCTOR E INYECCIÓN DE CONEXIÓN
     * Inicializa la instancia obteniendo la conexión PDO activa.
     */
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * CREACIÓN TRANSACCIONAL DE DOCUMENTO
     * Registra un nuevo archivo en el sistema de forma atómica. Crea el 
     * contenedor lógico (documents), inserta su iteración inicial 
     * (document_versions) y actualiza el puntero de la versión activa.
     */
    public function uploadNewDocument($docData, $versionData) {
        try {
            $this->db->beginTransaction();

            // 1. Creación del registro contenedor (Padre)
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

            // 2. Registro de la primera versión física (Hijo)
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

            // 3. Vinculación bidireccional (Puntero a versión actual)
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

    /**
     * LISTADO PAGINADO Y FILTRADO
     * Extrae el catálogo de documentos de un expediente. Aplica automáticamente
     * barreras de visibilidad (is_visible_to_client) si la petición
     * proviene de un usuario externo.
     */
    public function getListByProject($projectId, $role, $limit = 15, $offset = 0) {
        $baseWhere = "WHERE d.project_id = :project_id AND d.deleted_at IS NULL";
        
        // Filtro estricto de seguridad multitenant
        if ($role === 'cliente') {
            $baseWhere .= " AND d.is_visible_to_client = 1";
        }

        // Cálculo del total para metadatos de paginación
        $countSql = "SELECT COUNT(*) FROM documents d " . $baseWhere;
        $stmtCount = $this->db->prepare($countSql);
        $stmtCount->execute(['project_id' => $projectId]);
        $total = (int)$stmtCount->fetchColumn();

        // Extracción cruzando datos de la versión activa y el autor
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

    /**
     * RESOLUCIÓN DE RUTA FÍSICA (DESCARGA/VISTA)
     * Recupera los metadatos y la ubicación exacta del archivo en el sistema
     * de almacenamiento protegido. Soporta la extracción de la versión activa 
     * por defecto, o una iteración histórica específica si se provee el ID.
     */
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

    /**
     * PREVENCIÓN DE DUPLICADOS
     * Comprueba la existencia de un título idéntico dentro del mismo
     * expediente para evitar redundancias durante la subida de archivos.
     */
    public function findDocumentByTitle($projectId, $title) {
        $sql = "SELECT id FROM documents WHERE project_id = :project_id AND title = :title AND deleted_at IS NULL LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['project_id' => $projectId, 'title' => $title]);
        return $stmt->fetchColumn();
    }

    /**
     * HISTORIAL DE VERSIONES
     * Extrae la línea temporal de un documento específico, ordenando
     * las iteraciones desde la más reciente a la más antigua.
     */
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

    /**
     * ACTUALIZACIÓN TRANSACCIONAL DE VERSIÓN
     * Inyecta una nueva iteración física sobre un registro lógico existente.
     * Calcula automáticamente el número secuencial, revoca el estado "actual"
     * de las versiones previas y actualiza el puntero principal.
     */
    public function uploadNewVersion($documentId, $versionData) {
        try {
            $this->db->beginTransaction();

            // 1. Cálculo de incremento de versión
            $sqlMax = "SELECT MAX(version_number) FROM document_versions WHERE document_id = :document_id";
            $stmtMax = $this->db->prepare($sqlMax);
            $stmtMax->execute(['document_id' => $documentId]);
            $lastVersion = (int)$stmtMax->fetchColumn();
            $newVersion = $lastVersion + 1;

            // 2. Revocación de flags activos anteriores
            $sqlDisable = "UPDATE document_versions SET is_current = 0 WHERE document_id = :document_id";
            $stmtDisable = $this->db->prepare($sqlDisable);
            $stmtDisable->execute(['document_id' => $documentId]);

            // 3. Inserción de la nueva versión física
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

            // 4. Actualización del puntero del contenedor padre
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