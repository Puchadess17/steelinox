<?php
// app/Controllers/AuditController.php

require_once APP_PATH . '/Models/Audit.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Models/Client.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Helpers/PaginationHelper.php';

class AuditController
{
    // Obtener la línea temporal de un proyecto (GET /api/projects/{id}/audit)
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
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            if ($role === 'cliente') {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Los clientes no tienen acceso a la auditoría']]);
                return;
            }

            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto inaccesible o sin permisos', 'data' => null, 'errors' => ['project' => 'No encontrado']]);
                return;
            }

            // Aplicamos Paginación Global
            [$page, $limit, $offset] = PaginationHelper::getParams();

            $auditModel = new Audit();
            $result = $auditModel->getByProject($projectId, $limit, $offset);

            $logs = $result['data'];
            $total = $result['total'];

            foreach ($logs as &$log) {
                $log['metadata'] = $log['metadata_json'] ? json_decode($log['metadata_json'], true) : null;
                unset($log['metadata_json']);
                
                // --- RESOLUCIÓN Y FALLBACK DE NOMBRES ---
                if (empty($log['entity_name']) && (int)$log['entity_id'] !== 0) {
                    // Si no hay nombre pero hay ID, significa que la entidad fue borrada físicamente
                    $log['entity_name'] = 'ID: ' . $log['entity_id'] . ' (Eliminado/No disp.)';
                } elseif ((int)$log['entity_id'] === 0) {
                    // Eventos de sistema como login fallido
                    $log['entity_name'] = 'Sistema Global';
                }
                // ----------------------------------------
            }

            echo json_encode([
                'success' => true,
                'message' => 'Logs recuperados correctamente',
                'data' => $logs,
                'pagination' => PaginationHelper::format($total, $limit, $page),
                'errors' => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Obtener la línea temporal de un cliente (GET /api/clients/{id}/audit)
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
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];

            if ($role === 'cliente') {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Los clientes no tienen acceso a la auditoría']]);
                return;
            }

            $clientModel = new Client();
            if (!$clientModel->getDetailsById($targetClientId, $userId, $role)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente inaccesible o sin permisos', 'data' => null, 'errors' => ['client' => 'No encontrado']]);
                return;
            }

            // Aplicamos Paginación Global
            [$page, $limit, $offset] = PaginationHelper::getParams();

            $auditModel = new Audit();
            $result = $auditModel->getByClient($targetClientId, $limit, $offset);

            $logs = $result['data'];
            $total = $result['total'];

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
                'success' => true,
                'message' => 'Logs recuperados correctamente',
                'data' => $logs,
                'pagination' => PaginationHelper::format($total, $limit, $page),
                'errors' => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Logs Globales del Sistema
    public function getGlobalLogs()
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Solo administradores']]);
            return;
        }

        try {
            $filters = [
                'actor_user_id' => isset($_GET['actor_user_id']) ? (int) $_GET['actor_user_id'] : null,
                'action_key' => isset($_GET['action_key']) ? htmlspecialchars(trim($_GET['action_key']), ENT_QUOTES, 'UTF-8') : null,
                'entity_type' => isset($_GET['entity_type']) ? htmlspecialchars(trim($_GET['entity_type']), ENT_QUOTES, 'UTF-8') : null,
                'date_start' => isset($_GET['date_start']) ? htmlspecialchars(trim($_GET['date_start']), ENT_QUOTES, 'UTF-8') : null,
                'date_end' => isset($_GET['date_end']) ? htmlspecialchars(trim($_GET['date_end']), ENT_QUOTES, 'UTF-8') : null,
            ];

            // Aplicamos Paginación Global
            [$page, $limit, $offset] = PaginationHelper::getParams();

            $auditModel = new Audit();

            $hasFilters = array_filter($filters);
            $result = $hasFilters
                ? $auditModel->getFilteredLogs($filters, $limit, $offset)
                : $auditModel->getGlobalLogs($limit, $offset);

            $logs = $result['data'];
            $total = $result['total'];

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
                'success' => true,
                'message' => 'Logs recuperados correctamente',
                'data' => $logs,
                'pagination' => PaginationHelper::format($total, $limit, $page),
                'errors' => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener logs', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    public function getFiltersData()
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Solo administradores']]);
            return;
        }

        try {
            $auditModel = new Audit();
            require_once APP_PATH . '/Models/User.php';
            $userModel = new User();

            echo json_encode([
                'success' => true,
                'message' => 'Filtros recuperados',
                'data' => [
                    'actions' => $auditModel->getUniqueActions(),
                    'entities' => $auditModel->getUniqueEntities(),
                    'actors' => $userModel->getAllBasic()
                ],
                'errors' => null
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener filtros', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }
}