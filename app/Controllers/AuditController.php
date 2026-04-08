<?php
// app/Controllers/AuditController.php

require_once APP_PATH . '/Models/Audit.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';

class AuditController {

    // Obtener la línea temporal de un proyecto (GET /api/projects/{id}/audit)
    public function getProjectTimeline($projectId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba GET']);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto inaccesible']);
                return;
            }

            $auditModel = new Audit();
            $logs = $auditModel->getByProject((int)$projectId);

            foreach ($logs as &$log) {
                if ($log['metadata_json']) {
                    $log['metadata'] = json_decode($log['metadata_json'], true);
                } else {
                    $log['metadata'] = null;
                }
                unset($log['metadata_json']);
            }

            echo json_encode(['success' => true, 'data' => $logs]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    public function getGlobalLogs() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');
        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
            return;
        }
        try {
            $filters = [
                'actor_user_id' => $_GET['actor_user_id'] ?? null,
                'action_key'    => $_GET['action_key'] ?? null,
                'entity_type'   => $_GET['entity_type'] ?? null,
                'date_start'    => $_GET['date_start'] ?? null,
                'date_end'      => $_GET['date_end'] ?? null,
            ];
            $auditModel = new Audit();
            $logs = $auditModel->getFilteredLogs($filters);
            foreach ($logs as &$log) {
                if ($log['metadata_json']) {
                    $log['metadata'] = json_decode($log['metadata_json'], true);
                } else {
                    $log['metadata'] = null;
                }
                unset($log['metadata_json']);
            }
            echo json_encode(['success' => true, 'data' => $logs]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener logs', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    public function getFiltersData() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');
        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
            return;
        }
        try {
            $auditModel = new Audit();
            require_once APP_PATH . '/Models/User.php';
            $userModel = new User();
            echo json_encode([
                'success' => true,
                'data' => [
                    'actions'  => $auditModel->getUniqueActions(),
                    'entities' => $auditModel->getUniqueEntities(),
                    'actors'   => $userModel->getAllBasic()
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener filtros']);
        }
    }
}