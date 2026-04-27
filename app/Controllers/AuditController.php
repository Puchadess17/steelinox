<?php
// app/Controllers/AuditController.php

/**
 * AUDIT CONTROLLER (CONSULTA DE LOGS DE AUDITORÍA)
 * ====================
 * Expone los registros de auditoría del sistema en tres niveles de alcance:
 *   - Por proyecto: Línea temporal de un expediente concreto
 *   - Por cliente: Actividad agrupada de una empresa
 *   - Global: Log completo del sistema (exclusivo del administrador)
 * Todos los logs son inmutables: este controlador es de solo lectura.
 * Los datos de metadata_json se decodifican a PHP antes de devolverlos al frontend.
 */
require_once APP_PATH . '/Models/Audit.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Models/Client.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Policies/AuditPolicy.php';
require_once APP_PATH . '/Helpers/PaginationHelper.php';
require_once APP_PATH . '/Services/ErrorLogger.php';

class AuditController
{
    /**
     * LOG DE PROYECTO (GET /api/projects/{id}/audit)
     * Devuelve la línea temporal paginada de eventos de un proyecto.
     * Verifica que el usuario tenga acceso al proyecto antes de mostrar los logs.
     * Solo accesible por admin y comercial (el cliente no puede ver logs).
     */
    public function getProjectTimeline($projectId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba GET', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $projectId = (int) $projectId;
            $userId    = $_SESSION['user_id'];
            $role      = $_SESSION['role'];
            $clientId  = $_SESSION['client_id'] ?? null;

            if (!AuditPolicy::canViewProjectAudit($role)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Los clientes no tienen acceso a la auditoría']]);
                return;
            }

            // Verificación de que el usuario tiene acceso al proyecto antes de mostrar sus logs
            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto inaccesible o sin permisos', 'data' => null, 'errors' => ['project' => 'No encontrado']]);
                return;
            }

            [$page, $limit, $offset] = PaginationHelper::getParams();

            $auditModel = new Audit();
            $result     = $auditModel->getByProject($projectId, $limit, $offset);

            $logs  = $result['data'];
            $total = $result['total'];

            /**
             * POST-PROCESADO DE LOGS
             * Decodifica metadata_json a array PHP para que el frontend pueda
             * acceder a los campos before/after sin parsear JSON manualmente.
             * Aplica un fallback para entidades eliminadas que ya no tienen nombre resolvible.
             */
            foreach ($logs as &$log) {
                $log['metadata'] = $log['metadata_json'] ? json_decode($log['metadata_json'], true) : null;
                unset($log['metadata_json']);
                
                if (empty($log['entity_name']) && (int)$log['entity_id'] !== 0) {
                    $log['entity_name'] = 'ID: ' . $log['entity_id'] . ' (Eliminado/No disp.)';
                } elseif ((int)$log['entity_id'] === 0) {
                    $log['entity_name'] = 'Sistema Global';
                }
            }

            echo json_encode([
                'success'    => true,
                'message'    => 'Logs recuperados correctamente',
                'data'       => $logs,
                'pagination' => PaginationHelper::format($total, $limit, $page),
                'errors'     => null
            ]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'AuditController::getProjectTimeline');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    /**
     * LOG DE CLIENTE (GET /api/clients/{id}/audit)
     * Devuelve la actividad paginada asociada a una empresa cliente.
     * Verifica que el usuario tenga acceso al cliente antes de mostrar los logs.
     */
    public function getClientTimeline($targetClientId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba GET', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $targetClientId = (int) $targetClientId;
            $userId         = $_SESSION['user_id'];
            $role           = $_SESSION['role'];

            if (!AuditPolicy::canViewClientAudit($role)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Los clientes no tienen acceso a la auditoría']]);
                return;
            }

            // Verificación de pertenencia: el comercial solo puede ver logs de sus clientes
            $clientModel = new Client();
            if (!$clientModel->getDetailsById($targetClientId, $userId, $role)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente inaccesible o sin permisos', 'data' => null, 'errors' => ['client' => 'No encontrado']]);
                return;
            }

            [$page, $limit, $offset] = PaginationHelper::getParams();

            $auditModel = new Audit();
            $result     = $auditModel->getByClient($targetClientId, $limit, $offset);

            $logs  = $result['data'];
            $total = $result['total'];

            // Post-procesado: decodifica metadata y aplica fallback de nombre de entidad
            foreach ($logs as &$log) {
                $log['metadata'] = $log['metadata_json'] ? json_decode($log['metadata_json'], true) : null;
                unset($log['metadata_json']);
                
                if (empty($log['entity_name']) && (int)$log['entity_id'] !== 0) {
                    $log['entity_name'] = 'ID: ' . $log['entity_id'] . ' (Eliminado/No disp.)';
                } elseif ((int)$log['entity_id'] === 0) {
                    $log['entity_name'] = 'Sistema Global';
                }
            }

            echo json_encode([
                'success'    => true,
                'message'    => 'Logs recuperados correctamente',
                'data'       => $logs,
                'pagination' => PaginationHelper::format($total, $limit, $page),
                'errors'     => null
            ]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'AuditController::getClientTimeline');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    /**
     * LOG GLOBAL DEL SISTEMA (GET /api/audit)
     * Exclusivo del administrador. Devuelve todos los eventos del sistema
     * con soporte de filtros por actor, tipo de acción, entidad y rango de fechas.
     * Si no se aplican filtros, devuelve los logs ordenados por fecha descendente.
     */
    public function getGlobalLogs()
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!AuditPolicy::canViewGlobalLogs($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Solo administradores']]);
            return;
        }

        try {
            // Sanitización y recogida de filtros opcionales de la query string
            $filters = [
                'actor_user_id' => isset($_GET['actor_user_id']) ? (int) $_GET['actor_user_id'] : null,
                'action_key'    => isset($_GET['action_key'])    ? htmlspecialchars(trim($_GET['action_key']),    ENT_QUOTES, 'UTF-8') : null,
                'entity_type'   => isset($_GET['entity_type'])   ? htmlspecialchars(trim($_GET['entity_type']),   ENT_QUOTES, 'UTF-8') : null,
                'date_start'    => isset($_GET['date_start'])    ? htmlspecialchars(trim($_GET['date_start']),    ENT_QUOTES, 'UTF-8') : null,
                'date_end'      => isset($_GET['date_end'])      ? htmlspecialchars(trim($_GET['date_end']),      ENT_QUOTES, 'UTF-8') : null,
            ];

            [$page, $limit, $offset] = PaginationHelper::getParams();

            $auditModel = new Audit();

            // Si hay al menos un filtro activo, usa la consulta con filtros; si no, la consulta base
            $hasFilters = array_filter($filters);
            $result = $hasFilters
                ? $auditModel->getFilteredLogs($filters, $limit, $offset)
                : $auditModel->getGlobalLogs($limit, $offset);

            $logs  = $result['data'];
            $total = $result['total'];

            // Post-procesado: decodifica metadata y aplica fallback de nombre de entidad
            foreach ($logs as &$log) {
                $log['metadata'] = $log['metadata_json'] ? json_decode($log['metadata_json'], true) : null;
                unset($log['metadata_json']);
                
                if (empty($log['entity_name']) && (int)$log['entity_id'] !== 0) {
                    $log['entity_name'] = 'ID: ' . $log['entity_id'] . ' (Eliminado/No disp.)';
                } elseif ((int)$log['entity_id'] === 0) {
                    $log['entity_name'] = 'Sistema Global';
                }
            }

            echo json_encode([
                'success'    => true,
                'message'    => 'Logs recuperados correctamente',
                'data'       => $logs,
                'pagination' => PaginationHelper::format($total, $limit, $page),
                'errors'     => null
            ]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'AuditController::getGlobalLogs');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al obtener logs']]);
        }
    }

    /**
     * DATOS DE FILTROS (GET /api/audit/filters)
     * Exclusivo del administrador. Devuelve los valores únicos necesarios para
     * poblar los selectores del visor de auditoría en el frontend:
     * lista de action_keys, entity_types y actores (usuarios del sistema).
     */
    public function getFiltersData()
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!AuditPolicy::canViewFiltersData($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Solo administradores']]);
            return;
        }

        try {
            $auditModel = new Audit();
            require_once APP_PATH . '/Models/User.php';
            $userModel  = new User();

            echo json_encode([
                'success' => true,
                'message' => 'Filtros recuperados',
                'data'    => [
                    'actions'  => $auditModel->getUniqueActions(),  // Lista de action_key distintos
                    'entities' => $auditModel->getUniqueEntities(), // Lista de entity_type distintos
                    'actors'   => $userModel->getAllBasic()         // Lista básica de usuarios del sistema
                ],
                'errors'  => null
            ]);
        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'AuditController::getFiltersData');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al obtener filtros']]);
        }
    }
}