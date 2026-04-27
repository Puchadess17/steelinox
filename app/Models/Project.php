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
            $where[] = "(p.name LIKE :search1 OR p.reference LIKE :search2 OR c.name LIKE :search3)";
            $params['search1'] = $q;
            $params['search2'] = $q;
            $params['search3'] = $q;
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

        // Cálculo del total de registros y KPIs dinámicos
        $kpiSql = "SELECT COUNT(*) as total,
                          SUM(CASE WHEN p.status = 'propuesta' THEN 1 ELSE 0 END) as propuesta,
                          SUM(CASE WHEN p.status = 'aprobado' THEN 1 ELSE 0 END) as aprobado,
                          SUM(CASE WHEN p.status = 'ejecucion' THEN 1 ELSE 0 END) as ejecucion,
                          SUM(CASE WHEN p.status = 'cerrado' THEN 1 ELSE 0 END) as cerrado
                   FROM projects p LEFT JOIN clients c ON p.client_id = c.id " . $whereSql;
        
        $stmtKpi = $this->db->prepare($kpiSql);
        foreach ($params as $key => $val) {
            $stmtKpi->bindValue(":$key", $val);
        }
        $stmtKpi->execute();
        $kpis = $stmtKpi->fetch(PDO::FETCH_ASSOC);
        
        $total = (int)($kpis['total'] ?? 0);

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
            'kpis'  => [
                'total'     => $total,
                'propuesta' => (int)($kpis['propuesta'] ?? 0),
                'aprobado'  => (int)($kpis['aprobado'] ?? 0),
                'ejecucion' => (int)($kpis['ejecucion'] ?? 0),
                'cerrado'   => (int)($kpis['cerrado'] ?? 0)
            ],
            'data'  => $stmtData->fetchAll(PDO::FETCH_ASSOC)
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
     * CREACIÓN TRANSACCIONAL DE PROYECTO CON ANTI-COLISIÓN (Race Condition Safe)
     * Genera la referencia en el instante de la inserción y aplica un bucle
     * de reintento automático si detecta alta concurrencia.
     */
    public function createWithAutoAssign($data, $userId, $role) {
        $maxRetries = 3;
        $attempt = 0;

        while ($attempt < $maxRetries) {
            try {
                $this->db->beginTransaction();

                $reference = $this->generateNextReference();

                $sql = "INSERT INTO projects (client_id, name, reference, status, budget_amount, description, surface, project_type, created_by, created_at) 
                        VALUES (:client_id, :name, :reference, :status, :budget_amount, :description, :surface, :project_type, :created_by, NOW())";
                
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    'client_id'     => $data['client_id'],
                    'name'          => $data['name'],
                    'reference'     => $reference,
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
                
                // Retornamos tanto el ID generado como la referencia definitiva
                return [
                    'id' => $newProjectId, 
                    'reference' => $reference
                ];

            } catch (PDOException $e) {
                $this->db->rollBack();
                
                // 1062 = Duplicate entry for key 'reference'
                if ($e->errorInfo[1] == 1062 && strpos($e->getMessage(), 'reference') !== false) {
                    $attempt++;
                    if ($attempt >= $maxRetries) {
                        throw new Exception("Alta concurrencia en la red. No se pudo generar la referencia del proyecto.");
                    }
                    // Espera aleatoria entre 50 y 150 milisegundos para desincronizar peticiones
                    usleep(rand(50000, 150000));
                    continue;
                }
                
                throw $e;
            }
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
     * BORRADO LÓGICO EN CASCADA
     * Marca el proyecto como eliminado y propaga el borrado lógico a todas 
     * sus entidades dependientes (documentos y comentarios) usando una transacción
     * para asegurar la integridad de los datos.
     */
    public function delete($projectId) {
        try {
            $this->db->beginTransaction();

            // 1. Borrado lógico del proyecto
            $sqlProject = "UPDATE projects SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL";
            $stmtProject = $this->db->prepare($sqlProject);
            $stmtProject->execute(['id' => $projectId]);

            // 2. Borrado lógico en cascada de los documentos asociados
            $sqlDocs = "UPDATE documents SET deleted_at = NOW() WHERE project_id = :id AND deleted_at IS NULL";
            $stmtDocs = $this->db->prepare($sqlDocs);
            $stmtDocs->execute(['id' => $projectId]);

            // 3. Borrado lógico en cascada de los comentarios asociados
            $sqlComments = "UPDATE comments SET deleted_at = NOW() WHERE project_id = :id AND deleted_at IS NULL";
            $stmtComments = $this->db->prepare($sqlComments);
            $stmtComments->execute(['id' => $projectId]);

            // La tabla project_user (asignaciones) se deja intacta a propósito. 
            // Así, si el día de mañana se desarrolla una función de "Restaurar Proyecto", 
            // el equipo comercial original seguirá estando asignado.

            $this->db->commit();
            return true;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * GENERADOR SECUENCIAL DE REFERENCIAS (BLINDADO)
     * Calcula automáticamente el identificador único del proyecto basado 
     * en el año actual (Ej: PRJ-2026-0001). Extrae numéricamente el valor 
     * más alto real para prevenir colisiones ante borrados desordenados.
     */
    public function generateNextReference() {
        $year = date('Y');
        $prefix = "PRJ-$year-";

        // Extrae todo lo que hay después del último guión y saca el valor numérico máximo
        $sql = "SELECT MAX(CAST(SUBSTRING_INDEX(reference, '-', -1) AS UNSIGNED)) 
                FROM projects 
                WHERE reference LIKE :prefix";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['prefix' => $prefix . '%']);
        $maxNumber = $stmt->fetchColumn();

        // Si existe un máximo en el año actual, le suma 1. Si no, empieza en 1.
        $nextNumber = $maxNumber ? (int)$maxNumber + 1 : 1;

        return $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }
}