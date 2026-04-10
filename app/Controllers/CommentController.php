<?php
// app/Controllers/CommentController.php

require_once APP_PATH . '/Models/Comment.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Models/Document.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php'; // <-- INYECTAMOS EL SERVICIO DE AUDITORÍA

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

            // --- SANITIZACIÓN BÁSICA DE RUTAS ---
            $projectId = (int)$projectId;
            $documentId = (int)$documentId;
            // ------------------------------------

            // 1. Escudo de Autorización: ¿Tiene acceso al proyecto?
            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos']);
                return;
            }

            // 2. Escudo del Documento: ¿Existe y es visible para este usuario?
            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload($documentId, $projectId);
            
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

            // Capturar el parámetro de la URL si existe (?version_id=X)
            $versionId = isset($_GET['version_id']) && is_numeric($_GET['version_id']) 
                            ? (int)$_GET['version_id'] 
                            : null;

            // 3. Obtener el hilo de comentarios (filtrado o completo)
            $commentModel = new Comment();
            $comments = $commentModel->getByDocument($documentId, $versionId);

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

    // Enviar un nuevo comentario (POST /api/projects/{projectId}/documents/{documentId}/comments)
    public function store($projectId, $documentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba POST']);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            // --- SANITIZACIÓN BÁSICA DE RUTAS ---
            $projectId = (int)$projectId;
            $documentId = (int)$documentId;
            // ------------------------------------

            // Escudo de Autorización: ¿Tiene acceso al proyecto?
            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos']);
                return;
            }

            // Escudo del Documento: Recuperamos el docInfo (que incluye el current_version_id gracias al JOIN)
            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload($documentId, $projectId);
            
            if (!$docInfo) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Documento no encontrado']);
                return;
            }

            // Si es cliente, verificamos que el documento sea público para él
            if ($role === 'cliente' && $docInfo['is_visible_to_client'] == 0) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No puedes comentar en un documento interno']);
                return;
            }

            // Procesar el texto del comentario
            $input = json_decode(file_get_contents('php://input'), true);
            $rawBody = isset($input['body']) ? $input['body'] : '';

            // --- SANITIZACIÓN DE COMENTARIOS ---
            $safeBody = $this->sanitizeCommentBody($rawBody);
            // -----------------------------------

            if (empty($safeBody)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'El comentario no puede estar vacío', 'errors' => ['body' => 'Campo requerido']]);
                return;
            }

            $commentModel = new Comment();
            $db = Database::getInstance()->getConnection();
            $versionIdToSave = null;

            // Si Joan envía un ID de versión específico desde su <select>
            if (!empty($input['version_id'])) {
                // Verificar que esa versión pertenece REALMENTE a este documento
                $stmtCheckVer = $db->prepare("SELECT id FROM document_versions WHERE id = :v_id AND document_id = :d_id");
                $stmtCheckVer->execute(['v_id' => (int)$input['version_id'], 'd_id' => $documentId]);
                
                if ($stmtCheckVer->fetchColumn()) {
                    $versionIdToSave = (int)$input['version_id'];
                } else {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Versión inválida', 'errors' => ['version_id' => 'Esta versión no pertenece al documento actual.']]);
                    return;
                }
            } else {
                $stmtVer = $db->prepare("SELECT current_version_id FROM documents WHERE id = ?");
                $stmtVer->execute([$documentId]);
                $versionIdToSave = $stmtVer->fetchColumn();
            }

            // Inserción final con la versión correcta
            $newCommentId = $commentModel->create([
                'project_id'          => $projectId,
                'document_id'         => $documentId,
                'document_version_id' => $versionIdToSave, 
                'author_user_id'      => $userId,
                'body'                => $safeBody
            ]);

            if ($newCommentId) {

                // AUDITORÍA: Alta de comentario
                // Guardamos un extracto del body para el timeline y a qué versión pertenece
                AuditLogger::log('comentario_creado', 'comment', $newCommentId, $projectId, [
                    'documento_id'  => $documentId,
                    'version_id'   => $versionIdToSave,
                    'body_snippet' => mb_substr($safeBody, 0, 50, 'UTF-8') . (mb_strlen($safeBody, 'UTF-8') > 50 ? '...' : '')
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
                echo json_encode(['success' => false, 'message' => 'No se pudo guardar el comentario', 'data' => null, 'errors' => null]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    /** Helper privado para limpiar y formatear comentarios largos
     * Ej: "   hola, esto  es   un comentario " => "Hola, esto es un comentario"
     */
    private function sanitizeCommentBody($text) {
        if (empty($text)) return '';
        
        // 1. Quitar espacios a los lados
        $text = trim($text);
        
        // 2. Reemplazar múltiples espacios en el medio por uno solo
        $text = preg_replace('/\s+/', ' ', $text);
        
        // 3. Forzar que la primera letra del comentario entero sea mayúscula (con soporte para tildes)
        $firstChar = mb_substr($text, 0, 1, "UTF-8");
        $restOfText = mb_substr($text, 1, null, "UTF-8");
        $text = mb_strtoupper($firstChar, "UTF-8") . $restOfText;
        
        // 4. Protección extrema contra XSS antes de guardar en la DB
        return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    }
}