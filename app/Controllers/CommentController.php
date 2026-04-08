<?php
// app/Controllers/CommentController.php

require_once APP_PATH . '/Models/Comment.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Models/Document.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';

class CommentController {

    // Obtener los comentarios de un documento (GET /api/projects/{projectId}/documents/{documentId}/comments)
    public function index($projectId, $documentId) {
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

            // 1. Escudo de Autorización: ¿Tiene acceso al proyecto?
            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos']);
                return;
            }

            // 2. Escudo del Documento: ¿Existe y es visible para este usuario?
            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload((int)$documentId, (int)$projectId);
            
            if (!$docInfo) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Documento no encontrado']);
                return;
            }

            // Si es cliente, verificamos que el documento sea público para él
            if ($role === 'cliente' && $docInfo['is_visible_to_client'] == 0) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Documento confidencial']);
                return;
            }

            // 3. Obtener el hilo de comentarios
            $commentModel = new Comment();
            $comments = $commentModel->getByDocument((int)$documentId);

            echo json_encode([
                'success' => true,
                'message' => 'Comentarios recuperados correctamente',
                'data'    => $comments,
                'errors'  => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }
}