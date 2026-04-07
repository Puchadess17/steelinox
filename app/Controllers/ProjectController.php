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

    public function show($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        $userId = $_SESSION['user_id'];
        $role = $_SESSION['role'];
        $clientId = $_SESSION['client_id'] ?? null;

        $projectModel = new Project();
        $proyecto = $projectModel->getById($id, $userId, $role, $clientId);

        if (!$proyecto) {
            http_response_code(404); // Not Found
            echo json_encode([
                'success' => false,
                'message' => 'Proyecto no encontrado o no tienes permisos para visualizarlo',
                'data'    => null,
                'errors'  => ['project' => 'Recurso inaccesible']
            ]);
            return;
        }

        echo json_encode([
            'success' => true,
            'message' => 'Detalle del proyecto recuperado correctamente',
            'data'    => $proyecto,
            'errors'  => null
        ]);
    }

    // Asignar un comercial a un proyecto (POST /api/projects/{projectId}/users/{userId})
    public function assignUser($projectId, $userId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización: Un cliente no puede asignar trabajadores
        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Solo administradores o comerciales pueden asignar personal']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba POST']]);
            return;
        }

        try {
            $projectModel = new Project();
            $added = $projectModel->assignUser((int)$projectId, (int)$userId);

            if ($added) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Usuario asignado al proyecto correctamente',
                    'data'    => ['project_id' => $projectId, 'user_id' => $userId],
                    'errors'  => null
                ]);
            } else {
                throw new Exception("No se pudo registrar la asignación en la base de datos.");
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al asignar el usuario',
                'data'    => null,
                'errors'  => ['server' => $e->getMessage()]
            ]);
        }
    }

    // Eliminar a un comercial de un proyecto (DELETE /api/projects/{projectId}/users/{userId})
    public function removeUser($projectId, $userId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización Estricto: Solo administradores
        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'message' => 'Acceso denegado', 
                'data'    => null, 
                'errors'  => ['role' => 'Privilegios insuficientes. Solo un administrador puede revocar accesos.']
            ]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba DELETE']]);
            return;
        }

        try {
            $projectModel = new Project();
            
            // Ejecutamos la eliminación en la tabla pivote
            $removed = $projectModel->removeUser((int)$projectId, (int)$userId);

            if ($removed) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Comercial desasignado del proyecto correctamente',
                    'data'    => null,
                    'errors'  => null
                ]);
            } else {
                throw new Exception("No se pudo ejecutar la desasignación en la base de datos.");
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al desasignar al usuario',
                'data'    => null,
                'errors'  => ['server' => $e->getMessage()]
            ]);
        }
    }
}