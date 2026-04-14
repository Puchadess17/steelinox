<?php
// app/Models/Client.php

require_once CORE_PATH . '/Database.php';

class Client
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getListByUser($userId, $role, $limit = 15, $offset = 0, $filters = [])
    {
        if ($role === 'cliente') {
            return ['total' => 0, 'data' => []];
        }

        $params = [];
        $where = ["deleted_at IS NULL"];

        // 1. Filtros según Rol
        if ($role === 'comercial') {
            $where[] = "(c.created_by = :user_id_1 OR pu.user_id = :user_id_2)";
            $params['user_id_1'] = $userId;
            $params['user_id_2'] = $userId;
        }

        // 2. Filtros Externos (Search / Status)
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
                    $where[] = "is_active = :status";
                } else {
                    $where[] = "c.is_active = :status";
                }
                $params['status'] = $isActive;
            }
        }

        $whereSql = "WHERE " . implode(" AND ", $where);

        if ($role === 'admin') {
            $countSql = "SELECT COUNT(*) FROM clients $whereSql";
            $dataSql = "SELECT id, name, reference, is_active, created_at,
                               (SELECT COUNT(*) FROM projects WHERE client_id = clients.id AND deleted_at IS NULL) as projects_count,
                               (SELECT COUNT(*) FROM users WHERE client_id = clients.id AND deleted_at IS NULL) as users_count
                        FROM clients 
                        $whereSql 
                        ORDER BY created_at DESC
                        LIMIT :limit OFFSET :offset";

        } else {
            // Comercial
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
                        ORDER BY c.created_at DESC
                        LIMIT :limit OFFSET :offset";
        }

        // --- EJECUCIÓN ---
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

        // 3. KPIs Globales
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
            'data' => $stmtData->fetchAll()
        ];
    }

    public function getById($id)
    {
        $sql = "SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function getDetailsById($clientId, $userId, $role)
    {
        if ($role === 'cliente') {
            return false;
        }

        $sqlClient = "SELECT c.id, c.name, c.reference, c.is_active, c.created_at, u.name AS creator_name 
                      FROM clients c
                      LEFT JOIN users u ON c.created_by = u.id
                      WHERE c.id = :client_id AND c.deleted_at IS NULL";

        $params = ['client_id' => $clientId];

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

        $sqlUsers = "SELECT id, name, role, email, is_active, last_login_at 
                     FROM users 
                     WHERE client_id = :client_id AND deleted_at IS NULL";
        $stmtUsers = $this->db->prepare($sqlUsers);
        $stmtUsers->execute(['client_id' => $clientId]);
        $usersList = $stmtUsers->fetchAll();

        $sqlProjects = "SELECT id, name, reference, status, budget_amount, created_at 
                        FROM projects 
                        WHERE client_id = :client_id AND deleted_at IS NULL";
        $stmtProjects = $this->db->prepare($sqlProjects);
        $stmtProjects->execute(['client_id' => $clientId]);
        $projectsList = $stmtProjects->fetchAll();

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
            'info' => $clientData,
            'kpis' => [
                'total_projects' => count($projectsList),
                'active_projects' => $activeProjectsCount,
                'active_users' => $activeUsersCount,
                'annual_revenue' => $annualRevenue
            ],
            'projects' => $projectsList,
            'users' => $usersList
        ];
    }

    public function create($data)
    {
        $sql = "INSERT INTO clients (name, reference, is_active, created_by, created_at) 
                VALUES (:name, :reference, :is_active, :created_by, NOW())";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name' => $data['name'],
            'reference' => $data['reference'] ?? null,
            'is_active' => $data['is_active'] ?? 1,
            'created_by' => $data['created_by']
        ]);

        return $this->db->lastInsertId();
    }

    public function update($id, $data)
    {
        $sql = "UPDATE clients 
                SET name = :name, 
                    reference = :reference, 
                    is_active = :is_active 
                WHERE id = :id AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'name' => $data['name'],
            'reference' => $data['reference'] ?? null,
            'is_active' => isset($data['is_active']) ? (int) $data['is_active'] : 1,
            'id' => $id
        ]);
    }

    public function delete($id)
    {
        $sql = "UPDATE clients 
                SET deleted_at = NOW(), is_active = 0 
                WHERE id = :id AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function generateNextReference()
    {
        $prefix = "CLI-";

        $sql = "SELECT reference FROM clients WHERE reference LIKE :prefix ORDER BY id DESC LIMIT 1";
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