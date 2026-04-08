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
}