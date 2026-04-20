<?php
// app/Models/Client.php

require_once CORE_PATH . '/Database.php';

/**
 * MODELO DE CLIENTE (CLIENT / EMPRESA)
 * ====================
 * Capa de acceso a datos para la gestión de las empresas cliente.
 * Implementa una estructura multitenant donde el acceso y la visibilidad 
 * de los datos (proyectos, usuarios, KPIs) están estrictamente segregados 
 * en función del rol del usuario que realiza la consulta.
 */
class Client
{
    private $db;

    /**
     * CONSTRUCTOR E INYECCIÓN DE CONEXIÓN
     * Inicializa la instancia obteniendo la conexión PDO activa.
     */
    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * LISTADO PAGINADO CON KPIs (DASHBOARD)
     * Extrae el catálogo de empresas. Aplica un blindaje de seguridad 
     * devolviendo un conjunto vacío si el rol es 'cliente' (un cliente no 
     * puede ver a otros clientes). Para comerciales, restringe la vista 
     * a su cartera asignada.
     */
    public function getListByUser($userId, $role, $limit = 15, $offset = 0, $filters = [])
    {
        // Barrera de seguridad para usuarios finales
        if ($role === 'cliente') {
            return ['total' => 0, 'data' => [], 'kpis' => []];
        }

        $params = [];
        $where = ["c.deleted_at IS NULL"];

        // 1. Filtros Multitenant según Rol
        if ($role === 'comercial') {
            $where[] = "(c.created_by = :user_id_1 OR pu.user_id = :user_id_2)";
            $params['user_id_1'] = $userId;
            $params['user_id_2'] = $userId;
        }

        // 2. Filtros Externos (Búsqueda y Estado)
        if (!empty($filters['search'])) {
            $q = "%" . $filters['search'] . "%";
            if ($role === 'admin') {
                $where[] = "(name LIKE :search1 OR reference LIKE :search2)";
            } else {
                $where[] = "(c.name LIKE :search1 OR c.reference LIKE :search2)";
            }
            $params['search1'] = $q;
            $params['search2'] = $q;
        }

        if (isset($filters['status']) && $filters['status'] !== 'all') {
            $status = $filters['status'];
            $isActive = ($status === 'activo' || $status === 'active') ? 1 : (($status === 'inactivo' || $status === 'inactive') ? 0 : null);
            
            if ($isActive !== null) {
                if ($role === 'admin') {
                    $where[] = "c.is_active = :status";
                } else {
                    $where[] = "c.is_active = :status";
                }
                $params['status'] = $isActive;
            }
        }

        /**
         * ORDENACIÓN DINÁMICA SEGURA
         * Valida el campo de ordenación contra una lista blanca (whitelist)
         * para prevenir ataques de inyección SQL a través de los parámetros GET.
         */
        $allowedSortColumns = ['name', 'reference', 'projects_count', 'users_count', 'created_at'];
        $sortBy = isset($filters['sort_by']) && in_array($filters['sort_by'], $allowedSortColumns) ? $filters['sort_by'] : 'created_at';
        $sortDir = isset($filters['sort_dir']) && strtoupper($filters['sort_dir']) === 'ASC' ? 'ASC' : 'DESC';

        // Resolución de prefijos para evitar ambigüedades en consultas complejas (Comercial)
        $orderBy = $sortBy;
        if ($role === 'comercial' && in_array($sortBy, ['name', 'reference', 'created_at'])) {
            $orderBy = "c." . $sortBy;
        }
        $orderByClause = "ORDER BY $orderBy $sortDir";

        $whereSql = "WHERE " . implode(" AND ", $where);

        // --- CONSTRUCCIÓN DE CONSULTAS POR ROL ---
        if ($role === 'admin') {
            $countSql = "SELECT COUNT(*) FROM clients c $whereSql";
            $dataSql = "SELECT c.id, c.name, c.reference, c.is_active, c.created_at,
                               (SELECT COUNT(*) FROM projects WHERE client_id = c.id AND deleted_at IS NULL) as projects_count,
                               (SELECT COUNT(*) FROM users WHERE client_id = c.id AND deleted_at IS NULL) as users_count
                        FROM clients c
                        $whereSql 
                        $orderByClause
                        LIMIT :limit OFFSET :offset";

        } else {
            // Comercial (Requiere cruzar datos con proyectos y asignaciones)
            $countSql = "SELECT COUNT(DISTINCT c.id) 
                         FROM clients c
                         LEFT JOIN projects p ON c.id = p.client_id AND p.deleted_at IS NULL
                         LEFT JOIN project_user pu ON p.id = pu.project_id
                         $whereSql";

            $dataSql = "SELECT DISTINCT c.id, c.name, c.reference, c.is_active, c.created_at,
                               (SELECT COUNT(*) FROM projects WHERE client_id = c.id AND deleted_at IS NULL) as projects_count,
                               (SELECT COUNT(*) FROM users WHERE client_id = c.id AND deleted_at IS NULL) as users_count
                        FROM clients c
                        LEFT JOIN projects p ON c.id = p.client_id AND p.deleted_at IS NULL
                        LEFT JOIN project_user pu ON p.id = pu.project_id
                        $whereSql
                        $orderByClause
                        LIMIT :limit OFFSET :offset";
        }

        // --- EJECUCIÓN (Paginación) ---
        $stmtCount = $this->db->prepare($countSql);
        foreach ($params as $key => $val) {
            $stmtCount->bindValue(":$key", $val);
        }
        $stmtCount->execute();
        $total = (int) $stmtCount->fetchColumn();

        $stmtData = $this->db->prepare($dataSql);
        foreach ($params as $key => $val) {
            $stmtData->bindValue(":$key", $val);
        }
        $stmtData->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmtData->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmtData->execute();

        // --- 4. EXTRACCIÓN DE KPIs GLOBALES ---
        // Calcula métricas de alto nivel respetando las reglas de visibilidad del rol
        $kpiSql = "SELECT COUNT(*) as total,
                          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 ELSE 0 END) as new_this_month,
                          (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL " . ($role === 'comercial' ? "AND id IN (SELECT project_id FROM project_user WHERE user_id = :kpi_user_id)" : "") . ") as total_projects,
                          (SELECT COUNT(*) FROM users u INNER JOIN clients c ON u.client_id = c.id WHERE u.deleted_at IS NULL AND c.deleted_at IS NULL " . ($role === 'comercial' ? "AND (c.created_by = :kpi_user_id_2 OR c.id IN (SELECT client_id FROM projects WHERE id IN (SELECT project_id FROM project_user WHERE user_id = :kpi_user_id_3)))" : "") . ") as total_users
                   FROM clients c " . ($role === 'comercial' ? "WHERE (c.created_by = :kpi_user_id_4 OR c.id IN (SELECT client_id FROM projects p INNER JOIN project_user pu ON p.id = pu.project_id WHERE pu.user_id = :kpi_user_id_5)) AND c.deleted_at IS NULL" : "WHERE c.deleted_at IS NULL");
        
        $stmtKpi = $this->db->prepare($kpiSql);
        if ($role === 'comercial') {
            $stmtKpi->bindValue(':kpi_user_id', $userId, PDO::PARAM_INT);
            $stmtKpi->bindValue(':kpi_user_id_2', $userId, PDO::PARAM_INT);
            $stmtKpi->bindValue(':kpi_user_id_3', $userId, PDO::PARAM_INT);
            $stmtKpi->bindValue(':kpi_user_id_4', $userId, PDO::PARAM_INT);
            $stmtKpi->bindValue(':kpi_user_id_5', $userId, PDO::PARAM_INT);
        }
        $stmtKpi->execute();
        $kpis = $stmtKpi->fetch(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'kpis'  => [
                'total'         => (int)($kpis['total'] ?? 0),
                'newThisMonth'  => (int)($kpis['new_this_month'] ?? 0),
                'totalProjects' => (int)($kpis['total_projects'] ?? 0),
                'totalUsers'    => (int)($kpis['total_users'] ?? 0)
            ],
            'data' => $stmtData->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    /**
     * RECUPERACIÓN BÁSICA
     * Obtiene los datos esenciales de la empresa sin validación de contexto.
     */
    public function getById($id)
    {
        $sql = "SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    /**
     * VISTA 360 DEL CLIENTE (DETALLE COMPLETO)
     * Construye un perfil íntegro de la empresa, agregando su información base,
     * sus empleados (usuarios), su cartera de proyectos y calculando métricas 
     * financieras en tiempo real (Revenue/Presupuesto total).
     */
    public function getDetailsById($clientId, $userId, $role)
    {
        if ($role === 'cliente') {
            return false; // Autoprotección
        }

        // 1. Datos Maestros
        $sqlClient = "SELECT c.id, c.name, c.reference, c.is_active, c.created_at, u.name AS creator_name 
                      FROM clients c
                      LEFT JOIN users u ON c.created_by = u.id
                      WHERE c.id = :client_id AND c.deleted_at IS NULL";

        $params = ['client_id' => $clientId];

        // Validación de permisos para Comerciales
        if ($role === 'comercial') {
            $sqlClient .= " AND (c.created_by = :user_id_1 OR c.id IN (
                                SELECT p.client_id FROM projects p 
                                INNER JOIN project_user pu ON p.id = pu.project_id 
                                WHERE pu.user_id = :user_id_2 AND p.deleted_at IS NULL
                            ))";
            $params['user_id_1'] = $userId;
            $params['user_id_2'] = $userId;
        }

        $stmtClient = $this->db->prepare($sqlClient);
        $stmtClient->execute($params);
        $clientData = $stmtClient->fetch();

        if (!$clientData) {
            return false;
        }

        // 2. Personal/Contactos (Usuarios de la empresa)
        $sqlUsers = "SELECT id, name, role, email, is_active, last_login_at 
                     FROM users 
                     WHERE client_id = :client_id AND deleted_at IS NULL";
        $stmtUsers = $this->db->prepare($sqlUsers);
        $stmtUsers->execute(['client_id' => $clientId]);
        $usersList = $stmtUsers->fetchAll();

        // 3. Expedientes vinculados (Proyectos)
        $sqlProjects = "SELECT p.id, p.name, p.reference, p.status, p.budget_amount, p.created_at 
                        FROM projects p";
        
        $projectParams = ['client_id' => $clientId];

        if ($role === 'comercial') {
            $sqlProjects .= " INNER JOIN project_user pu ON p.id = pu.project_id 
                              WHERE p.client_id = :client_id 
                              AND pu.user_id = :user_id 
                              AND p.deleted_at IS NULL";
            $projectParams['user_id'] = $userId;
        } else {
            $sqlProjects .= " WHERE p.client_id = :client_id AND p.deleted_at IS NULL";
        }

        $stmtProjects = $this->db->prepare($sqlProjects);
        $stmtProjects->execute($projectParams);
        $projectsList = $stmtProjects->fetchAll();

        // 4. Procesamiento de Métricas y KPIs
        $activeProjectsCount = 0;
        $annualRevenue = 0.0;

        foreach ($projectsList as $project) {
            if ($project['status'] !== 'cerrado') {
                $activeProjectsCount++;
            }
            if (!empty($project['budget_amount'])) {
                $annualRevenue += (float) $project['budget_amount'];
            }
        }

        $activeUsersCount = 0;
        foreach ($usersList as $user) {
            if ($user['is_active']) {
                $activeUsersCount++;
            }
        }

        return [
            'info'     => $clientData,
            'kpis'     => [
                'total_projects'  => count($projectsList),
                'active_projects' => $activeProjectsCount,
                'active_users'    => $activeUsersCount,
                'annual_revenue'  => $annualRevenue
            ],
            'projects' => $projectsList,
            'users'    => $usersList
        ];
    }

    /**
     * CREACIÓN DE REGISTRO
     */
    public function create($data)
    {
        $sql = "INSERT INTO clients (name, reference, is_active, created_by, created_at) 
                VALUES (:name, :reference, :is_active, :created_by, NOW())";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name'       => $data['name'],
            'reference'  => $data['reference'] ?? null,
            'is_active'  => $data['is_active'] ?? 1,
            'created_by' => $data['created_by']
        ]);

        return $this->db->lastInsertId();
    }

    /**
     * ACTUALIZACIÓN DE DATOS MAESTROS
     */
    public function update($id, $data)
    {
        $sql = "UPDATE clients 
                SET name = :name, 
                    reference = :reference, 
                    is_active = :is_active 
                WHERE id = :id AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'name'      => $data['name'],
            'reference' => $data['reference'] ?? null,
            'is_active' => isset($data['is_active']) ? (int) $data['is_active'] : 1,
            'id'        => $id
        ]);
    }

    /**
     * BORRADO LÓGICO EN CASCADA (SOFT DELETE PROFUNDO)
     * Desactiva y marca el registro de la empresa como borrado.
     * Propaga esta eliminación a todos sus usuarios, proyectos, 
     * documentos y comentarios asociados en una única transacción atómica.
     */
    public function delete($id)
    {
        try {
            $this->db->beginTransaction();

            // 1. Borrado lógico de COMENTARIOS asociados a los proyectos del cliente
            $sqlComments = "UPDATE comments 
                            SET deleted_at = NOW() 
                            WHERE project_id IN (SELECT id FROM projects WHERE client_id = :id) 
                              AND deleted_at IS NULL";
            $stmtComments = $this->db->prepare($sqlComments);
            $stmtComments->execute(['id' => $id]);

            // 2. Borrado lógico de DOCUMENTOS asociados a los proyectos del cliente
            $sqlDocs = "UPDATE documents 
                        SET deleted_at = NOW() 
                        WHERE project_id IN (SELECT id FROM projects WHERE client_id = :id) 
                          AND deleted_at IS NULL";
            $stmtDocs = $this->db->prepare($sqlDocs);
            $stmtDocs->execute(['id' => $id]);

            // 3. Borrado lógico de los PROYECTOS del cliente
            $sqlProjects = "UPDATE projects 
                            SET deleted_at = NOW() 
                            WHERE client_id = :id 
                              AND deleted_at IS NULL";
            $stmtProjects = $this->db->prepare($sqlProjects);
            $stmtProjects->execute(['id' => $id]);

            // 4. Borrado lógico y desactivación de los USUARIOS del cliente
            // Esto corta el acceso al sistema inmediatamente.
            $sqlUsers = "UPDATE users 
                         SET deleted_at = NOW(), is_active = 0 
                         WHERE client_id = :id 
                           AND deleted_at IS NULL";
            $stmtUsers = $this->db->prepare($sqlUsers);
            $stmtUsers->execute(['id' => $id]);

            // 5. Borrado lógico y desactivación del CLIENTE (Padre)
            $sqlClient = "UPDATE clients 
                          SET deleted_at = NOW(), is_active = 0 
                          WHERE id = :id 
                            AND deleted_at IS NULL";
            $stmtClient = $this->db->prepare($sqlClient);
            $stmtClient->execute(['id' => $id]);

            $this->db->commit();
            return true;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * GENERADOR SECUENCIAL DE REFERENCIAS (BLINDADO)
     * Calcula automáticamente el identificador único del cliente (Ej: CLI-0001). 
     * Extrae numéricamente el valor más alto real para prevenir colisiones 
     * incluso si se realizan borrados lógicos o físicos desordenados.
     */
    public function generateNextReference()
    {
        $prefix = "CLI-";

        // Extrae todo lo que hay después del último guión y saca el valor numérico máximo
        $sql = "SELECT MAX(CAST(SUBSTRING_INDEX(reference, '-', -1) AS UNSIGNED)) 
                FROM clients 
                WHERE reference LIKE :prefix";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['prefix' => $prefix . '%']);
        $maxNumber = $stmt->fetchColumn();

        // Si existe un máximo, le suma 1. Si no, empieza en 1.
        $nextNumber = $maxNumber ? (int)$maxNumber + 1 : 1;

        return $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }
}