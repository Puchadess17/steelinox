<?php
// app/Models/Audit.php

require_once CORE_PATH . '/Database.php';

/**
 * MODELO DE AUDITORÍA (AUDIT)
 * ====================
 * Capa de acceso a datos para la trazabilidad del sistema.
 * Gestiona la extracción, filtrado y cruce relacional de los registros
 * inmutables de actividad almacenados en la tabla audit_logs.
 */
class Audit
{
    private $db;

    /**
     * CONSTRUCTOR E INYECCIÓN DE CONEXIÓN
     * Obtiene la instancia Singleton de PDO para ejecutar consultas.
     */
    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * RESOLUTOR DINÁMICO DE NOMBRES (SELECT)
     * Helper privado que construye un bloque SQL condicional (CASE WHEN).
     * Evita realizar múltiples consultas aisladas resolviendo el nombre 
     * semántico de la entidad afectada (Proyecto, Documento, Usuario, etc.)
     * directamente en la consulta principal.
     */
    private function getSelectEntityNameSql() {
        return ", CASE 
                    WHEN a.entity_type = 'project' THEN p_ent.name
                    WHEN a.entity_type = 'document' THEN d_ent.title
                    WHEN a.entity_type = 'document_version' THEN dv_ent.file_name
                    WHEN a.entity_type = 'client' THEN c_ent.name
                    WHEN a.entity_type = 'user' THEN u_ent.name
                    WHEN a.entity_type = 'comment' THEN 'Comentario'
                    ELSE NULL
                 END AS entity_name,
                 p_ctx.name AS project_name,
                 p_ctx.reference AS project_ref,
                 COALESCE(c_ctx.name, c_ent_direct.name) AS client_name,
                 COALESCE(c_ctx.reference, c_ent_direct.reference) AS client_ref,
                 COALESCE(p_ctx.client_id, CASE WHEN a.entity_type = 'client' THEN a.entity_id ELSE NULL END) AS client_id_ctx";
    }

    /**
     * MOTOR DE UNIONES RELACIONALES (JOIN)
     * Helper privado que construye los LEFT JOINs dinámicos necesarios 
     * para cruzar la tabla polimórfica de auditoría con las tablas físicas
     * del sistema y obtener el contexto (Nombres, Referencias).
     */
    private function getJoinEntityNameSql() {
        return " LEFT JOIN projects p_ent ON a.entity_type = 'project' AND a.entity_id = p_ent.id
                 LEFT JOIN documents d_ent ON a.entity_type = 'document' AND a.entity_id = d_ent.id
                 LEFT JOIN document_versions dv_ent ON a.entity_type = 'document_version' AND a.entity_id = dv_ent.id
                 LEFT JOIN clients c_ent ON a.entity_type = 'client' AND a.entity_id = c_ent.id
                 LEFT JOIN users u_ent ON a.entity_type = 'user' AND a.entity_id = u_ent.id 
                 LEFT JOIN projects p_ctx ON a.project_id = p_ctx.id
                 LEFT JOIN clients c_ctx ON p_ctx.client_id = c_ctx.id
                 LEFT JOIN clients c_ent_direct ON a.entity_type = 'client' AND a.entity_id = c_ent_direct.id ";
    }

    /**
     * HISTORIAL ESPECÍFICO POR PROYECTO
     * Extrae el ciclo de vida completo de un expediente, incluyendo acciones
     * sobre sus documentos, versiones y comentarios anidados. 
     * Implementa paginación nativa SQL para optimizar memoria.
     */
    public function getByProject($projectId, $limit = 15, $offset = 0)
    {
        $countSql = "SELECT COUNT(*) FROM audit_logs WHERE project_id = :project_id";
        $stmtCount = $this->db->prepare($countSql);
        $stmtCount->execute(['project_id' => $projectId]);
        $total = (int) $stmtCount->fetchColumn();

        $selectDynamic = $this->getSelectEntityNameSql();
        $joinDynamic = $this->getJoinEntityNameSql();

        $sql = "SELECT a.id, a.action_key, a.entity_type, a.entity_id, a.project_id, a.metadata_json, a.created_at,
                       u.name AS actor_name, a.actor_role
                       $selectDynamic
                FROM audit_logs a
                LEFT JOIN users u ON a.actor_user_id = u.id
                $joinDynamic
                WHERE a.project_id = :project_id
                ORDER BY a.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':project_id', $projectId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['total' => $total, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    /**
     * HISTORIAL CRUZADO POR CLIENTE
     * Recupera la actividad vinculada a una empresa (Cliente), incluyendo
     * acciones directas sobre la entidad, sus usuarios (contactos) y 
     * todos los proyectos que tiene asignados.
     */
    public function getByClient($clientId, $limit = 15, $offset = 0)
    {
        $whereSql = "WHERE (a.entity_type = 'client' AND a.entity_id = :c1)
                        OR (a.entity_type = 'user' AND a.entity_id IN (SELECT id FROM users WHERE client_id = :c2))
                        OR (a.project_id IN (SELECT id FROM projects WHERE client_id = :c3))";

        $countSql = "SELECT COUNT(*) FROM audit_logs a " . $whereSql;
        $stmtCount = $this->db->prepare($countSql);
        $stmtCount->execute(['c1' => $clientId, 'c2' => $clientId, 'c3' => $clientId]);
        $total = (int) $stmtCount->fetchColumn();

        $selectDynamic = $this->getSelectEntityNameSql();
        $joinDynamic = $this->getJoinEntityNameSql();

        $sql = "SELECT a.id, a.action_key, a.entity_type, a.entity_id, a.metadata_json, a.created_at,
                       u.name AS actor_name, a.actor_role
                       $selectDynamic
                FROM audit_logs a
                LEFT JOIN users u ON a.actor_user_id = u.id
                $joinDynamic
                $whereSql
                ORDER BY a.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':c1', $clientId, PDO::PARAM_INT);
        $stmt->bindValue(':c2', $clientId, PDO::PARAM_INT);
        $stmt->bindValue(':c3', $clientId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['total' => $total, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    /**
     * HISTORIAL GLOBAL (SUPERADMIN)
     * Extrae la línea temporal completa del sistema. Diseñado para
     * auditorías y trazabilidad por parte del admin.
     */
    public function getGlobalLogs($limit = 15, $offset = 0)
    {
        $total = (int) $this->db->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();

        $selectDynamic = $this->getSelectEntityNameSql();
        $joinDynamic = $this->getJoinEntityNameSql();

        $sql = "SELECT a.id, a.action_key, a.entity_type, a.entity_id, a.project_id, a.metadata_json, a.ip, a.created_at,
                       u.name AS actor_name, a.actor_role
                       $selectDynamic
                FROM audit_logs a
                LEFT JOIN users u ON a.actor_user_id = u.id
                $joinDynamic
                ORDER BY a.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['total' => $total, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    /**
     * BÚSQUEDA AVANZADA MULTICRITERIO
     * Construye dinámicamente sentencias WHERE basadas en los filtros 
     * proporcionados (Actor, Acción, Fechas). Utiliza una función anónima 
     * para vincular los parámetros de forma segura y evitar 
     * inyección SQL en consultas de estructura variable.
     */
    public function getFilteredLogs($filters = [], $limit = 15, $offset = 0)
    {
        $where = [];

        if (!empty($filters['actor_user_id']))
            $where[] = "a.actor_user_id = :actor_user_id";
        if (!empty($filters['action_key']))
            $where[] = "a.action_key = :action_key";
        if (!empty($filters['entity_type']))
            $where[] = "a.entity_type = :entity_type";
        if (!empty($filters['date_start']))
            $where[] = "a.created_at >= :date_start";
        if (!empty($filters['date_end']))
            $where[] = "a.created_at <= :date_end";

        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $bindParams = function ($stmt) use ($filters) {
            if (!empty($filters['actor_user_id']))
                $stmt->bindValue(':actor_user_id', $filters['actor_user_id'], PDO::PARAM_INT);
            if (!empty($filters['action_key']))
                $stmt->bindValue(':action_key', $filters['action_key'], PDO::PARAM_STR);
            if (!empty($filters['entity_type']))
                $stmt->bindValue(':entity_type', $filters['entity_type'], PDO::PARAM_STR);
            if (!empty($filters['date_start']))
                $stmt->bindValue(':date_start', $filters['date_start'] . " 00:00:00", PDO::PARAM_STR);
            if (!empty($filters['date_end']))
                $stmt->bindValue(':date_end', $filters['date_end'] . " 23:59:59", PDO::PARAM_STR);
        };

        $countSql = "SELECT COUNT(*) FROM audit_logs a $whereSql";
        $stmtCount = $this->db->prepare($countSql);
        $bindParams($stmtCount);
        $stmtCount->execute();
        $total = (int) $stmtCount->fetchColumn();

        $selectDynamic = $this->getSelectEntityNameSql();
        $joinDynamic = $this->getJoinEntityNameSql();

        $sql = "SELECT a.id, a.action_key, a.entity_type, a.entity_id, a.project_id, a.metadata_json, a.ip, a.user_agent, a.created_at,
                       u.name AS actor_name, a.actor_role
                       $selectDynamic
                FROM audit_logs a
                LEFT JOIN users u ON a.actor_user_id = u.id
                $joinDynamic
                $whereSql
                ORDER BY a.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $bindParams($stmt);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['total' => $total, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    /**
     * SELECTORES DE FILTRO (DISTINCT)
     * Recupera los valores únicos existentes en la base de datos para
     * poblar dinámicamente los menús desplegables del panel de auditoría.
     */
    public function getUniqueActions()
    {
        $sql = "SELECT DISTINCT action_key FROM audit_logs ORDER BY action_key ASC";
        return $this->db->query($sql)->fetchAll(PDO::FETCH_COLUMN);
    }

    public function getUniqueEntities()
    {
        $sql = "SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type ASC";
        return $this->db->query($sql)->fetchAll(PDO::FETCH_COLUMN);
    }

    /**
     * PREVENCIÓN DE FUERZA BRUTA (RATE LIMITING)
     * Cuenta los intentos de acceso fallidos desde una IP específica en 
     * un margen de tiempo determinado. Utilizado para bloquear temporalmente
     * ataques automatizados o ingresos no autorizados.
     */
    public function countRecentFailedLogins($ip, $minutes = 15)
    {
        $timeLimit = date('Y-m-d H:i:s', time() - ($minutes * 60));

        $sql = "SELECT COUNT(*) FROM audit_logs 
                WHERE action_key = 'login_fallido' 
                  AND ip = :ip 
                  AND created_at >= :time_limit";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['ip' => $ip, 'time_limit' => $timeLimit]);

        return (int) $stmt->fetchColumn();
    }
}