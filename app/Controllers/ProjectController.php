<?php
// app/Controllers/ProjectController.php

require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';

class ProjectController {

    public function search() {
        AuthMiddleware::check();

        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Método no permitido',
                'data'    => null,
                'errors'  => ['method' => 'Se esperaba una petición GET']
            ]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $proyectos = $projectModel->getListByUser($userId, $role, $clientId);

            echo json_encode([
                'success' => true,
                'message' => 'Proyectos recuperados correctamente',
                'data'    => $proyectos,
                'errors'  => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno del servidor al recuperar los proyectos',
                'data'    => null,
                'errors'  => ['server' => $e->getMessage()] // PRODUCCION NO DEVUELVE EL ERROR
            ]);
        }
    }
}