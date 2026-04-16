<?php
// app/Models/Project.php

require_once CORE_PATH . '/Database.php';

/**
 * MODELO DE PROYECTO (PROJECT)
 * ====================
 * Capa de acceso a datos para la gestión de proyectos/expedientes.
 * Centraliza la lógica de negocio relacionada con la creación, edición,
 * asignación de personal y transiciones de estado de los proyectos.
 */
class Project {
    private $db;

    /**
     * CONSTRUCTOR E INYECCIÓN DE CONEXIÓN
     * Inicializa la instancia obteniendo la conexión PDO activa.
     */
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * LISTADO PAGINADO Y FILTRADO (DASHBOARD)
     * Extrae los proyectos aplicando reglas de visibilidad basadas en el rol.
     * Soporta búsqueda por texto, filtrado por estado, conteo de comerciales y ordenación dinámica.
     */
    public function getListByUser($userId, $role, $clientId, $limit = 15, $offset = 0, $filters = []) {
        $params = [];
        $where = ["p.deleted_at IS NULL"];

        // Reglas de visibilidad (Multitenant y Asignación)
        if ($role === 'cliente') {
            $where[] = "p.client_id = :client_id";
            $params['client_id'] = $clientId;
        } elseif ($role === 'comercial') {
            $where[] = "p.id IN (SELECT project_id FROM project_user WHERE user_id = :user_id)";
            $params['user_id'] = $userId;
        }

        // Filtros de búsqueda y estado
        if (!empty($filters['search'])) {
            $q = "%" . $filters['search'] . "%";
            $where[] = "(p.name LIKE :search1 OR p.reference LIKE :search2)";
            $params['search1'] = $q;
            $params['search2'] = $q;
        }

        if (isset($filters['status']) && $filters['status'] !== 'all') {
            $where[] = "p.status = :status";
            $params['status'] = $filters['status'];
        }

        $whereSql = "WHERE " . implode(" AND ", $where);

        // --- ORDENACIÓN DINÁMICA SECURE (Lista Blanca) ---
        $allowedSortColumns = ['client_name', 'name', 'reference', 'commercials_count', 'created_at'];
        $sortBy = isset($filters['sort_by']) && in_array($filters['sort_by'], $allowedSortColumns) ? $filters['sort_by'] : 'created_at';
        $sortDir = isset($filters['sort_dir']) && strtoupper($filters['sort_dir']) === 'ASC' ? 'ASC' : 'DESC';

        if ($sortBy === 'client_name') {
            $orderBy = "c.name";
        } elseif ($sortBy === 'name') {
            $orderBy = "p.name";
        } elseif ($sortBy === 'reference') {
            $orderBy = "p.reference";
        } elseif ($sortBy === 'commercials_count') {
            $orderBy = "commercials_count";
        } else {
            $orderBy = "p.created_at";
        }
        
        $orderByClause = "ORDER BY $orderBy $sortDir";
        // -------------------------------------------------

        // Cálculo del total de registros para paginación
        $countSql = "SELECT COUNT(*) FROM projects p LEFT JOIN clients c ON p.client_id = c.id " . $whereSql;
        $stmtCount = $this->db->prepare($countSql);
        foreach ($params as $key => $val) {
            $stmtCount->bindValue(":$key", $val);
        }
        $stmtCount->execute();
        $total = (int)$stmtCount->fetchColumn();

        // Extracción de datos paginados con el recuento de comerciales
        $dataSql = "SELECT p.id, p.name, p.reference, p.status, p.created_at, p.client_id, c.name AS client_name,
                           (SELECT COUNT(*) FROM project_user pu_count WHERE pu_count.project_id = p.id) AS commercials_count
                    FROM projects p
                    LEFT JOIN clients c ON p.client_id = c.id
                    $whereSql
                    $orderByClause
                    LIMIT :limit OFFSET :offset";

        $stmtData = $this->db->prepare($dataSql);
        foreach ($params as $key => $val) {
            $stmtData->bindValue(":$key", $val);
        }
        
        $stmtData->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmtData->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmtData->execute();
        
        return [
            'total' => $total,
            'data'  => $stmtData->fetchAll()
        ];
    }

    /**
     * RECUPERACIÓN DE PROYECTO INDIVIDUAL
     * Obtiene los detalles completos de un expediente cruzando datos del cliente.
     * Valida estrictamente los permisos de acceso antes de devolver el registro.
     */
    public function getById($projectId, $userId, $role, $clientId) {
        $sql = "SELECT p.*, 
                       c.name AS client_name, 
                       c.reference AS client_reference, 
                       c.is_active AS client_is_active 
                FROM projects p
                LEFT JOIN clients c ON p.client_id = c.id
                WHERE p.id = :project_id AND p.deleted_at IS NULL";

        $params = ['project_id' => $projectId];

        // Inyección de reglas de seguridad
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

    /**
     * COMERCIALES ASIGNADOS
     * Extrae la lista del personal interno con acceso al proyecto.
     */
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

    /**
     * ASIGNACIÓN DE PERSONAL (TABLA PIVOTE)
     * Vincula un usuario comercial a un expediente. Utiliza INSERT IGNORE
     * para prevenir errores por duplicidad de asignaciones.
     */
    public function assignUser($projectId, $userId) {
        $sql = "INSERT IGNORE INTO project_user (project_id, user_id) 
                VALUES (:project_id, :user_id)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'project_id' => $projectId,
            'user_id'    => $userId
        ]);
    }

    /**
     * REVOCACIÓN DE ACCESO
     * Elimina el vínculo entre un usuario comercial y un proyecto.
     */
    public function removeUser($projectId, $userId) {
        $sql = "DELETE FROM project_user 
                WHERE project_id = :project_id AND user_id = :user_id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'project_id' => $projectId,
            'user_id'    => $userId
        ]);
    }

    /**
     * CREACIÓN TRANSACCIONAL DE PROYECTO
     * Genera un nuevo registro y, si el creador es un usuario de perfil
     * comercial, lo auto-asigna de inmediato al proyecto. Asegura la 
     * consistencia de los datos mediante el uso de transacciones.
     */
    public function createWithAutoAssign($data, $userId, $role) {
        try {
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

            if ($role === 'comercial') {
                $sqlAssign = "INSERT INTO project_user (project_id, user_id) VALUES (:project_id, :user_id)";
                $stmtAssign = $this->db->prepare($sqlAssign);
                $stmtAssign->execute([
                    'project_id' => $newProjectId,
                    'user_id'    => $userId
                ]);
            }

            $this->db->commit();
            return $newProjectId;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * ACTUALIZACIÓN DE PROYECTO (DINÁMICA)
     * Construye la consulta SQL sobre la marcha basándose únicamente en las 
     * claves que vengan en el array $data. Evita sobrescribir con NULL 
     * valores que no han sido enviados en la petición (ej: reference).
     */
    public function update($id, $data)
    {
        $updates = [];
        $params = ['id' => $id];

        // Mapeo dinámico de campos
        if (isset($data['name'])) {
            $updates[] = "name = :name";
            $params['name'] = $data['name'];
        }
        if (array_key_exists('reference', $data)) {
            // array_key_exists por si realmente el admin quiere forzar un NULL/vacío
            $updates[] = "reference = :reference";
            $params['reference'] = $data['reference'];
        }
        if (isset($data['budget_amount'])) {
            $updates[] = "budget_amount = :budget_amount";
            $params['budget_amount'] = $data['budget_amount'];
        }
        if (array_key_exists('description', $data)) {
            $updates[] = "description = :description";
            $params['description'] = $data['description'];
        }
        if (array_key_exists('surface', $data)) {
            $updates[] = "surface = :surface";
            $params['surface'] = $data['surface'];
        }
        if (isset($data['project_type'])) {
            $updates[] = "project_type = :project_type";
            $params['project_type'] = $data['project_type'];
        }

        // Si no hay nada que actualizar, se sale sin error
        if (empty($updates)) {
            return true;
        }

        // Construcción de la SQL final
        $sql = "UPDATE projects SET " . implode(', ', $updates) . " WHERE id = :id AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * TRANSICIÓN DE ESTADO CONTROLADA
     * Actualiza la fase del proyecto y genera un registro automático en 
     * la tabla de logs de estado para preservar el histórico de evolución.
     */
    public function updateStatus($projectId, $newStatus, $userId, $reason = null) {
        try {
            $this->db->beginTransaction();

            $stmtOld = $this->db->prepare("SELECT status, approved_at FROM projects WHERE id = :id");
            $stmtOld->execute(['id' => $projectId]);
            $projectRow = $stmtOld->fetch();
            $oldStatus = $projectRow['status'] ?? null;

            // Prevención de registros redundantes
            if ($oldStatus === $newStatus) {
                $this->db->rollBack();
                return true;
            }

            $dateUpdates = "";
            if ($newStatus === 'aprobado' && empty($projectRow['approved_at'])) {
                $dateUpdates = ", approved_at = NOW()";
            } elseif ($newStatus === 'cerrado') {
                $dateUpdates = ", closed_at = NOW()";
            } elseif ($newStatus === 'propuesta' || $newStatus === 'aprobado') {
                // Al reabrir o volver atrás, limpiamos la fecha de cierre si existía
                $dateUpdates = ", closed_at = NULL";
            }

            $stmtUpdate = $this->db->prepare("UPDATE projects SET status = :status $dateUpdates WHERE id = :id");
            $stmtUpdate->execute(['status' => $newStatus, 'id' => $projectId]);

            $sqlLog = "INSERT INTO project_status_logs 
                        (project_id, changed_by_user_id, old_status, new_status, reason, created_at) 
                       VALUES (:project_id, :user_id, :old_status, :new_status, :reason, NOW())";
            $stmtLog = $this->db->prepare($sqlLog);
            $stmtLog->execute([
                'project_id' => $projectId,
                'user_id'    => $userId,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'reason'     => $reason 
            ]);

            $this->db->commit();
            return true;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * GENERADOR SECUENCIAL DE REFERENCIAS
     * Calcula automáticamente el identificador único del proyecto basado 
     * en el año actual (Ej: PRJ-2026-0001). Previene colisiones consultando
     * el último registro insertado.
     */
    public function generateNextReference() {
        $year = date('Y');
        $prefix = "PRJ-$year-";

        $sql = "SELECT reference FROM projects WHERE reference LIKE :prefix ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['prefix' => $prefix . '%']);
        $lastReference = $stmt->fetchColumn();

        if ($lastReference) {
            $lastNumber = (int) substr($lastReference, -4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }
}