<?php
// app/Controllers/CommentController.php

require_once APP_PATH . '/Models/Comment.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Models/Document.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php';
require_once APP_PATH . '/Helpers/PaginationHelper.php';

class CommentController {

    public function index($projectId, $documentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba GET', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectId = (int)$projectId;
            $documentId = (int)$documentId;

            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload($documentId, $projectId);
            
            if (!$docInfo) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Documento no encontrado', 'data' => null, 'errors' => ['document' => 'Recurso inaccesible']]);
                return;
            }

            if ($role === 'cliente' && $docInfo['is_visible_to_client'] == 0) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Documento confidencial', 'data' => null, 'errors' => ['permissions' => 'Denegado']]);
                return;
            }

            $versionId = isset($_GET['version_id']) && is_numeric($_GET['version_id']) 
                            ? (int)$_GET['version_id'] 
                            : null;

            [$page, $limit, $offset] = PaginationHelper::getParams();

            $commentModel = new Comment();
            $result = $commentModel->getByDocument($documentId, $versionId, $limit, $offset);

            echo json_encode([
                'success'    => true,
                'message'    => 'Comentarios recuperados correctamente',
                'data'       => $result['data'],
                'pagination' => PaginationHelper::format($result['total'], $limit, $page),
                'errors'     => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al recuperar comentarios']]);
        }
    }

    public function store($projectId, $documentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba POST', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectId = (int)$projectId;
            $documentId = (int)$documentId;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            // --- CANDADO UNIVERSAL: PROYECTO CERRADO ---
            if ($projectDetails['status'] === 'cerrado') {
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Proyecto cerrado', 
                    'data'    => null, 
                    'errors'  => ['status' => 'El proyecto está cerrado. Debe reabrirse para poder añadir comentarios.']
                ]);
                return;
            }
            // -------------------------------------------

            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload($documentId, $projectId);
            
            if (!$docInfo) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Documento no encontrado', 'data' => null, 'errors' => ['document' => 'Recurso inaccesible']]);
                return;
            }

            if ($role === 'cliente' && $docInfo['is_visible_to_client'] == 0) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No puedes comentar en un documento interno', 'data' => null, 'errors' => ['permissions' => 'Denegado']]);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $rawBody = isset($input['body']) ? $input['body'] : '';

            $safeBody = $this->sanitizeCommentBody($rawBody);

            if (empty($safeBody)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'El comentario no puede estar vacío', 'data' => null, 'errors' => ['body' => 'Campo requerido']]);
                return;
            }

            $commentModel = new Comment();
            $db = Database::getInstance()->getConnection();
            $versionIdToSave = null;

            if (!empty($input['version_id'])) {
                $stmtCheckVer = $db->prepare("SELECT id FROM document_versions WHERE id = :v_id AND document_id = :d_id");
                $stmtCheckVer->execute(['v_id' => (int)$input['version_id'], 'd_id' => $documentId]);
                
                if ($stmtCheckVer->fetchColumn()) {
                    $versionIdToSave = (int)$input['version_id'];
                } else {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Versión inválida', 'data' => null, 'errors' => ['version_id' => 'Esta versión no pertenece al documento actual.']]);
                    return;
                }
            } else {
                $stmtVer = $db->prepare("SELECT current_version_id FROM documents WHERE id = ?");
                $stmtVer->execute([$documentId]);
                $versionIdToSave = $stmtVer->fetchColumn();
            }

            $newCommentId = $commentModel->create([
                'project_id'          => $projectId,
                'document_id'         => $documentId,
                'document_version_id' => $versionIdToSave, 
                'author_user_id'      => $userId,
                'body'                => $safeBody
            ]);

            if ($newCommentId) {
                AuditLogger::log('comentario_creado', 'comment', $newCommentId, $projectId, [
                    'documento_id'     => $documentId,
                    'documento_titulo' => $docInfo['title'],
                    'version_id'       => $versionIdToSave,
                    'body_snippet'     => mb_substr($safeBody, 0, 50, 'UTF-8') . (mb_strlen($safeBody, 'UTF-8') > 50 ? '...' : '')
                ]);

                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Comentario publicado correctamente',
                    'data'    => ['id' => $newCommentId],
                    'errors'  => null
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'No se pudo guardar el comentario', 'data' => null, 'errors' => ['database' => 'Error al guardar']]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al publicar']]);
        }
    }

    private function sanitizeCommentBody($text) {
        if (empty($text)) return '';
        $text = trim($text);
        $text = preg_replace('/\s+/', ' ', $text);
        $firstChar = mb_substr($text, 0, 1, "UTF-8");
        $restOfText = mb_substr($text, 1, null, "UTF-8");
        $text = mb_strtoupper($firstChar, "UTF-8") . $restOfText;
        return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    }
}