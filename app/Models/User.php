<?php
// app/Models/User.php

require_once CORE_PATH . '/Database.php';

/**
 * MODELO DE USUARIO (USER)
 * ====================
 * Capa de acceso a datos para la gestión unificada de cuentas.
 * Administra el ciclo de vida, autenticación y permisos de los diferentes
 * tipos de actores del sistema (Administradores, Comerciales y Clientes).
 */
class User
{
    private $db;

    /**
     * CONSTRUCTOR E INYECCIÓN DE CONEXIÓN
     * Obtiene la instancia Singleton de PDO para ejecutar las sentencias.
     */
    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * AUTENTICACIÓN Y BÚSQUEDA BASE
     * Métodos para localizar usuarios verificando restricciones de estado 
     * (activos y sin marcas de borrado lógico).
     */
    public function findByEmail($email)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email AND is_active = 1 AND deleted_at IS NULL");
        $stmt->execute(['email' => $email]);

        return $stmt->fetch(); 
    }

    public function findById($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = :id AND is_active = 1 AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);

        return $stmt->fetch();
    }

    public function findByIdWithInactive($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);

        return $stmt->fetch();
    }

    /**
     * TRAZABILIDAD DE ACCESO
     * Actualiza la marca de tiempo del último inicio de sesión exitoso.
     */
    public function updateLastLogin($userId)
    {
        $stmt = $this->db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = :id");
        $stmt->execute(['id' => $userId]);
    }

    /**
     * VALIDACIÓN DE UNICIDAD (EMAIL)
     * Comprueba la existencia previa de un correo para evitar duplicados.
     * Soporta exclusión de ID para validaciones durante la edición de perfiles.
     */
    public function emailExists($email, $excludeId = null)
    {
        $sql = "SELECT id FROM users WHERE email = :email";
        $params = ['email' => $email];

        if ($excludeId !== null) {
            $sql .= " AND id != :excludeId";
            $params['excludeId'] = $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() !== false;
    }

    /**
     * OPERACIONES CRUD (ESCRITURA)
     * Gestión de inserciones, actualizaciones parciales dinámicas y borrado 
     * lógico (soft delete) para mantener la integridad referencial en auditorías.
     */
    public function softDelete($id) {
        $sql = "UPDATE users 
                SET deleted_at = NOW(), is_active = 0 
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function create($data)
    {
        $sql = "INSERT INTO users (client_id, role, name, email, password_hash, is_active, created_at, updated_at) 
                VALUES (:client_id, :role, :name, :email, :password_hash, :is_active, NOW(), NOW())";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'client_id'     => $data['client_id'] ?? null,
            'role'          => $data['role'] ?? 'cliente',
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password_hash' => $data['password_hash'],
            'is_active'     => $data['is_active'] ?? 1
        ]);

        return $this->db->lastInsertId();
    }

    public function update($id, $data)
    {
        $updates = [];
        $params = ['id' => $id];

        if (isset($data['name'])) {
            $updates[] = "name = :name";
            $params['name'] = $data['name'];
        }
        if (isset($data['email'])) {
            $updates[] = "email = :email";
            $params['email'] = $data['email'];
        }
        if (isset($data['password_hash'])) {
            $updates[] = "password_hash = :password_hash";
            $params['password_hash'] = $data['password_hash'];
        }
        if (isset($data['is_active'])) {
            $updates[] = "is_active = :is_active";
            $params['is_active'] = (int) $data['is_active'];
        }
        if (isset($data['client_id'])) {
            $updates[] = "client_id = :client_id";
            $params['client_id'] = (int) $data['client_id'];
        }

        if (empty($updates)) {
            return false;
        }

        $updates[] = "updated_at = NOW()";

        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = :id AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id)
    {
        $sql = "UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    /**
     * ASIGNACIÓN DE RECURSOS
     * Filtra empleados comerciales que no estén previamente asignados 
     * a un proyecto específico.
     */
    public function getAvailableForProject($projectId)
    {
        $sql = "SELECT id, name, email, role 
                FROM users 
                WHERE role = 'comercial'    
                  AND is_active = 1 
                  AND deleted_at IS NULL 
                  AND id NOT IN (
                      SELECT user_id FROM project_user WHERE project_id = :project_id
                  )
                ORDER BY name ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['project_id' => $projectId]);

        return $stmt->fetchAll();
    }

    /**
     * RECUPERACIÓN DE CREDENCIALES (TOKENS)
     * Genera, valida y destruye tokens criptográficos temporales con un 
     * límite de tiempo predefinido (1 hora) para el reseteo de contraseñas.
     */
    public function setResetToken($email, $token, $interval = '1 HOUR')
    {
        $sql = "UPDATE users SET reset_token = :token, reset_token_expires_at = DATE_ADD(NOW(), INTERVAL $interval) WHERE email = :email AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['token' => $token, 'email' => $email]);
    }

    public function findByResetToken($token)
    {
        $sql = "SELECT id, email FROM users WHERE reset_token = :token AND reset_token_expires_at > NOW() AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['token' => $token]);
        return $stmt->fetch();
    }

    public function clearResetToken($userId)
    {
        $sql = "UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $userId]);
    }

    /**
     * ====================
     * GESTIÓN DE 2FA (OTP)
     * ====================
     */

    /** Genera y persiste el OTP en la BD (expira en N minutos) */
    public function setOtp($userId, $code, $interval = '10 MINUTE')
    {
        $sql = "UPDATE users 
                SET otp_code = :code, 
                    otp_expires_at = DATE_ADD(NOW(), INTERVAL $interval) 
                WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'code' => $code,
            'id'   => $userId
        ]);
    }

    /** Verifica el OTP: devuelve el usuario si es válido y no ha expirado */
    public function findByValidOtp($userId, $code)
    {
        $sql = "SELECT id, name, email, role, client_id 
                FROM users 
                WHERE id = :id 
                  AND otp_code = :code 
                  AND otp_expires_at > NOW() 
                  AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'id'   => $userId,
            'code' => $code
        ]);
        return $stmt->fetch();
    }

    /** Borra el OTP tras verificación exitosa o caducidad */
    public function clearOtp($userId)
    {
        $sql = "UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $userId]);
    }

    /**
     * ====================
     * ÁMBITO: COMERCIALES (PERSONAL INTERNO)
     * ====================
     */

    /**
     * LISTADO EXHAUSTIVO Y KPIs
     * Extrae el personal interno calculando dinámicamente sus métricas de 
     * rendimiento (proyectos totales y activos). Soporta búsqueda y paginación.
     */
    public function getCommercialsWithStats($limit = 15, $offset = 0, $filters = []) {
        $params = [];
        $where = ["u.role = 'comercial' AND u.deleted_at IS NULL"];

        if (!empty($filters['search'])) {
            $q = "%" . $filters['search'] . "%";
            $where[] = "(u.name LIKE :search1 OR u.email LIKE :search2)";
            $params['search1'] = $q;
            $params['search2'] = $q;
        }

        if (isset($filters['status']) && $filters['status'] !== 'all') {
            $status = $filters['status'];
            $isActive = ($status === 'activo' || $status === 'active') ? 1 : (($status === 'inactivo' || $status === 'inactive') ? 0 : null);
            if ($isActive !== null) {
                $where[] = "u.is_active = :status";
                $params['status'] = $isActive;
            }
        }

        $whereSql = "WHERE " . implode(" AND ", $where);

        // Extracción de indicadores globales
        $kpiSql = "SELECT COUNT(*) as total,
                          SUM(CASE WHEN u.is_active = 1 THEN 1 ELSE 0 END) as activos,
                          SUM(CASE WHEN u.is_active = 0 THEN 1 ELSE 0 END) as inactivos
                   FROM users u
                   $whereSql";
        
        $stmtKpis = $this->db->prepare($kpiSql);
        foreach ($params as $key => $val) {
            $stmtKpis->bindValue(":$key", $val);
        }
        $stmtKpis->execute();
        $kpiData = $stmtKpis->fetch(PDO::FETCH_ASSOC);

        $total = (int)($kpiData['total'] ?? 0);

        // Extracción de carga de datos paginada con métricas individuales
        $dataSql = "SELECT u.id, u.name, u.email, u.is_active, u.last_login_at, u.created_at,
                           COUNT(DISTINCT pu.project_id) as total_projects,
                           COUNT(DISTINCT CASE WHEN p.status != 'cerrado' THEN p.id ELSE NULL END) as active_projects
                    FROM users u
                    LEFT JOIN project_user pu ON u.id = pu.user_id
                    LEFT JOIN projects p ON pu.project_id = p.id AND p.deleted_at IS NULL
                    $whereSql
                    GROUP BY u.id
                    ORDER BY u.name ASC
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
                'activos'   => (int)($kpiData['activos'] ?? 0),
                'inactivos' => (int)($kpiData['inactivos'] ?? 0)
            ],
            'data'  => $stmtData->fetchAll()
        ];
    }

    /**
     * CREACIÓN DE USUARIO INTERNO
     * Inserta un nuevo comercial (o admin) con client_id siempre NULL,
     * ya que los usuarios internos no pertenecen a ninguna empresa cliente.
     */
    public function createInternalUser($data) {
        $sql = "INSERT INTO users (client_id, role, name, email, password_hash, is_active, created_at) 
                VALUES (NULL, :role, :name, :email, :password_hash, :is_active, NOW())";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'role'          => $data['role'],
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password_hash' => $data['password_hash'],
            'is_active'     => isset($data['is_active']) ? (int)$data['is_active'] : 1
        ]);
        
        return $this->db->lastInsertId();
    }

    /**
     * ACTUALIZACIÓN DE USUARIO INTERNO
     * Permite cambiar nombre, email, estado y opcionalmente la contraseña.
     * La cláusula role = 'comercial' evita que este método afecte a admins
     * aunque se llame con su ID por error.
     */
    public function updateInternalUser($id, $data) {
        $sql = "UPDATE users 
                SET name = :name, 
                    email = :email, 
                    is_active = :is_active";
        
        if (!empty($data['password_hash'])) {
            $sql .= ", password_hash = :password_hash";
        }
        
        $sql .= " WHERE id = :id AND role = 'comercial' AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        
        $params = [
            'name'      => $data['name'],
            'email'     => $data['email'],
            'is_active' => $data['is_active'],
            'id'        => $id
        ];
        
        if (!empty($data['password_hash'])) {
            $params['password_hash'] = $data['password_hash'];
        }
        
        return $stmt->execute($params);
    }

    /**
     * FICHA DE COMERCIAL
     * Recupera los datos de un usuario interno. Filtra por role = 'comercial'
     * para evitar exponer datos de administradores a través de este endpoint.
     */
    public function getCommercialDetails($id) {
        $sql = "SELECT id, name, email, is_active, last_login_at, created_at
                FROM users 
                WHERE id = :id AND role = 'comercial' AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    /**
     * CARTERA DE PROYECTOS DEL COMERCIAL
     * Devuelve los proyectos a los que está asignado un comercial,
     * incluyendo el nombre de la empresa cliente para cada expediente.
     */
    public function getCommercialProjects($commercialId) {
        $sql = "SELECT p.id, p.name, p.reference, p.status, p.budget_amount, p.created_at, 
                       p.client_id, c.name AS client_name
                FROM projects p
                INNER JOIN project_user pu ON p.id = pu.project_id
                INNER JOIN clients c ON p.client_id = c.id
                WHERE pu.user_id = :user_id 
                  AND p.deleted_at IS NULL 
                  AND c.deleted_at IS NULL
                ORDER BY p.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['user_id' => $commercialId]);
        return $stmt->fetchAll();
    }

    /**
     * LISTADO BÁSICO DE TODOS LOS USUARIOS
     * Usado por AuditController para poblar el selector de "Actor" en el
     * panel de auditoría. Incluye deleted_at para poder indicar si la
     * cuenta ya no existe sin ocultar entradas históricas del log.
     */
    public function getAllBasic() {
        $sql = "SELECT id, name, role, deleted_at FROM users ORDER BY name ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * ====================
     * ÁMBITO: CLIENTES (CONTACTOS EXTERNOS)
     * ====================
     */

    /**
     * LISTADO SEGREGADO POR PERMISOS (MULTITENANT)
     * Resuelve los accesos aplicando políticas de visibilidad estrictas:
     * - Administrador: Acceso íntegro.
     * - Comercial: Solo usuarios vinculados a sus proyectos asignados.
     * - Cliente: Solo compañeros de su misma entidad corporativa.
     */
    public function getClientUsersList($actorUserId, $actorRole, $limit = 15, $offset = 0, $filters = []) {
        $baseWhere = ["u.role = 'cliente' AND u.deleted_at IS NULL AND c.deleted_at IS NULL"];
        $params = [];

        // Filtro de seguridad por rol
        if ($actorRole === 'comercial') {
            $baseWhere[] = "(c.created_by = :actor_id_1 OR c.id IN (
                            SELECT p.client_id FROM projects p 
                            INNER JOIN project_user pu ON p.id = pu.project_id 
                            WHERE pu.user_id = :actor_id_2 AND p.deleted_at IS NULL
                          ))";
            $params['actor_id_1'] = $actorUserId;
            $params['actor_id_2'] = $actorUserId;
        } elseif ($actorRole === 'cliente') {
            $baseWhere[] = "c.id = (SELECT client_id FROM users WHERE id = :actor_id)";
            $params['actor_id'] = $actorUserId;
        }

        if (!empty($filters['search'])) {
            $q = "%" . $filters['search'] . "%";
            $baseWhere[] = "(u.name LIKE :search1 OR u.email LIKE :search2 OR c.name LIKE :search3)";
            $params['search1'] = $q;
            $params['search2'] = $q;
            $params['search3'] = $q;
        }

        if (isset($filters['status']) && $filters['status'] !== 'all') {
            $status = $filters['status'];
            $isActive = ($status === 'activo' || $status === 'active') ? 1 : (($status === 'inactivo' || $status === 'inactive') ? 0 : null);
            if ($isActive !== null) {
                $baseWhere[] = "u.is_active = :status";
                $params['status'] = $isActive;
            }
        }

        $baseSql = "FROM users u
                    INNER JOIN clients c ON u.client_id = c.id
                    WHERE " . implode(" AND ", $baseWhere);

        // Extracción de indicadores globales
        $kpiSql = "SELECT COUNT(*) as total,
                          SUM(CASE WHEN u.is_active = 1 THEN 1 ELSE 0 END) as activos,
                          COUNT(DISTINCT u.client_id) as empresas_cubiertas
                   " . $baseSql;
                   
        $stmtKpis = $this->db->prepare($kpiSql);
        foreach ($params as $key => $value) {
            if (strpos($key, 'search') !== false) {
                $stmtKpis->bindValue(":$key", $value);
            } else {
                $stmtKpis->bindValue(":$key", $value, PDO::PARAM_INT);
            }
        }
        $stmtKpis->execute();
        $kpiData = $stmtKpis->fetch(PDO::FETCH_ASSOC);

        $total = (int)($kpiData['total'] ?? 0);

        /**
         * ORDENACIÓN DINÁMICA SEGURA
         * Previene inyecciones SQL verificando la columna entrante contra
         * una lista blanca estricta antes de integrarla en la cadena de consulta.
         */
        $allowedSortColumns = ['name', 'email', 'company_name', 'last_login_at', 'created_at'];
        $sortBy = isset($filters['sort_by']) && in_array($filters['sort_by'], $allowedSortColumns) ? $filters['sort_by'] : 'created_at';
        $sortDir = isset($filters['sort_dir']) && strtoupper($filters['sort_dir']) === 'ASC' ? 'ASC' : 'DESC';

        if ($sortBy === 'company_name') {
            $orderByClause = "ORDER BY c.name $sortDir";
        } else {
            $orderByClause = "ORDER BY u.$sortBy $sortDir";
        }

        // Extracción de datos paginados
        $dataSql = "SELECT u.id, u.name, u.email, u.is_active, u.last_login_at, u.created_at, 
                           c.name AS company_name, c.id AS client_id
                    " . $baseSql . " 
                    $orderByClause
                    LIMIT :limit OFFSET :offset";

        $stmtData = $this->db->prepare($dataSql);
        foreach ($params as $key => $value) {
            if (strpos($key, 'search') !== false) {
                $stmtData->bindValue(":$key", $value);
            } else {
                $stmtData->bindValue(":$key", $value, PDO::PARAM_INT);
            }
        }
        $stmtData->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmtData->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmtData->execute();

        return [
            'total' => $total,
            'kpis'  => [
                'total'              => $total,
                'activos'            => (int)($kpiData['activos'] ?? 0),
                'empresas_cubiertas' => (int)($kpiData['empresas_cubiertas'] ?? 0)
            ],
            'data'  => $stmtData->fetchAll(PDO::FETCH_ASSOC)
        ];
    }
}