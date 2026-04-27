<?php
// app/Controllers/CommentController.php

require_once APP_PATH . '/Models/Comment.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Models/Document.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Policies/CommentPolicy.php';
require_once APP_PATH . '/Services/AuditLogger.php';
require_once APP_PATH . '/Helpers/PaginationHelper.php';
require_once APP_PATH . '/Services/ErrorLogger.php'; 
require_once APP_PATH . '/Requests/CommentRequest.php'; // <-- NUEVO REQUEST

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

            if (!CommentPolicy::canView($role, $docInfo['is_visible_to_client'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Documento confidencial', 'data' => null, 'errors' => ['policy' => 'Denegado']]);
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

        } catch (Throwable $e) {
            ErrorLogger::log($e->getMessage(), 'CommentController::index');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al recuperar comentarios']]);
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

            if (!CommentPolicy::canCreateOnProject($projectDetails['status'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Proyecto cerrado', 'data' => null, 'errors' => ['policy' => 'El proyecto está cerrado. Debe reabrirse para poder añadir comentarios.']]);
                return;
            }

            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload($documentId, $projectId);
            
            if (!$docInfo) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Documento no encontrado', 'data' => null, 'errors' => ['document' => 'Recurso inaccesible']]);
                return;
            }

            if (!CommentPolicy::canCreateOnDocument($role, $projectDetails['status'], $docInfo['is_visible_to_client'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No puedes comentar en un documento interno', 'data' => null, 'errors' => ['policy' => 'Denegado']]);
                return;
            }

            // --- USO DEL REQUEST PARA VALIDACIÓN Y SANITIZACIÓN ---
            $request = new CommentRequest();
            if (!$request->validateStore()) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'El comentario no puede estar vacío', 'data' => null, 'errors' => $request->errors()]);
                return;
            }
            $safeBody = $request->sanitizeBody($request->input('body'));
            // ------------------------------------------------------

            $commentModel = new Comment();
            $db = Database::getInstance()->getConnection();
            $versionIdToSave = null;

            if (!empty($request->input('version_id'))) {
                $stmtCheckVer = $db->prepare("SELECT id FROM document_versions WHERE id = :v_id AND document_id = :d_id");
                $stmtCheckVer->execute(['v_id' => (int)$request->input('version_id'), 'd_id' => $documentId]);
                
                if ($stmtCheckVer->fetchColumn()) {
                    $versionIdToSave = (int)$request->input('version_id');
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

                require_once APP_PATH . '/Services/NotificationService.php';
                NotificationService::queueProjectEvent($projectId, 'nuevo_comentario', $userId, [
                    'comentario' => $safeBody
                ]);

                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'Comentario publicado', 'data' => ['id' => $newCommentId], 'errors' => null]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'No se pudo guardar', 'data' => null, 'errors' => ['database' => 'Error al guardar']]);
            }

        } catch (Throwable $e) {
            ErrorLogger::log($e->getMessage(), 'CommentController::store');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al publicar']]);
        }
    }

    public function update($projectId, $documentId, $commentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba PUT o PATCH', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectId = (int)$projectId;
            $documentId = (int)$documentId;
            $commentId = (int)$commentId;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload($documentId, $projectId);
            if (!$docInfo) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Documento no encontrado', 'data' => null, 'errors' => ['document' => 'Recurso inaccesible']]);
                return;
            }

            if ($role === 'cliente' && !$docInfo['is_visible_to_client']) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Sin permisos sobre este documento', 'data' => null, 'errors' => ['policy' => 'Denegado']]);
                return;
            }

            $commentModel = new Comment();
            $comment = $commentModel->getById($commentId, $projectId, $documentId);

            if (!$comment) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Comentario no encontrado', 'data' => null, 'errors' => ['comment' => 'No existe o fue movido']]);
                return;
            }

            if (!CommentPolicy::canEdit($role, $projectDetails['status'], (int)$comment['author_user_id'], $userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Sin permisos', 'data' => null, 'errors' => ['policy' => 'No puedes editar este comentario.']]);
                return;
            }

            // --- USO DEL REQUEST PARA VALIDACIÓN ---
            $request = new CommentRequest();
            if (!$request->validateStore()) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'El comentario no puede estar vacío', 'data' => null, 'errors' => $request->errors()]);
                return;
            }
            $safeBody = $request->sanitizeBody($request->input('body'));
            // ---------------------------------------

            if ($safeBody !== $comment['body']) {
                if ($commentModel->update($commentId, $projectId, $safeBody)) {
                    AuditLogger::log('comentario_editado', 'comment', $commentId, $projectId, [
                        'documento_id'   => $documentId,
                        'texto_anterior' => $comment['body'],
                        'texto_nuevo'    => $safeBody
                    ]);
                } else {
                    throw new Exception("Fallo en la persistencia de la base de datos");
                }
            }

            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Comentario editado correctamente', 'data' => null, 'errors' => null]);

        } catch (Throwable $e) {
            ErrorLogger::log($e->getMessage(), 'CommentController::update');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al actualizar']]);
        }
    }

    public function destroy($projectId, $documentId, $commentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba DELETE', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectId = (int)$projectId;
            $documentId = (int)$documentId;
            $commentId = (int)$commentId;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            if (!CommentPolicy::canDelete($role)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Sin permisos', 'data' => null, 'errors' => ['policy' => 'No tienes autorización para eliminar comentarios.']]);
                return;
            }

            if ($projectDetails['status'] === 'cerrado') {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Proyecto cerrado', 'data' => null, 'errors' => ['policy' => 'El proyecto está cerrado y no se pueden eliminar comentarios.']]);
                return;
            }

            $commentModel = new Comment();
            $comment = $commentModel->getById($commentId, $projectId, $documentId);
            if (!$comment) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Comentario no encontrado', 'data' => null, 'errors' => ['comment' => 'No existe']]);
                return;
            }

            if ($commentModel->delete($commentId, $projectId, $documentId)) {
                AuditLogger::log('comentario_eliminado', 'comment', $commentId, $projectId, [
                    'documento_id' => $documentId
                ]);

                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'Comentario eliminado', 'data' => null, 'errors' => null]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'No se pudo eliminar', 'data' => null, 'errors' => ['database' => 'Error al eliminar']]);
            }
            
        } catch (Throwable $e) {
            ErrorLogger::log($e->getMessage(), 'CommentController::destroy');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al eliminar']]);
        }
    }
}