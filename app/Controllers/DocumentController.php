<?php
// app/Controllers/DocumentController.php

require_once APP_PATH . '/Models/Document.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Policies/DocumentPolicy.php';
require_once APP_PATH . '/Services/AuditLogger.php';
require_once APP_PATH . '/Helpers/PaginationHelper.php';
require_once APP_PATH . '/Services/ErrorLogger.php';
require_once APP_PATH . '/Requests/DocumentRequest.php'; // <-- NUEVO REQUEST

class DocumentController {

    public function index($projectId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba GET', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $projectId = (int)$projectId;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            [$page, $limit, $offset] = PaginationHelper::getParams();

            $documentModel = new Document();
            $result = $documentModel->getListByProject($projectId, $role, $clientId, $limit, $offset);

            echo json_encode([
                'success'    => true, 
                'message'    => 'Documentos recuperados correctamente',
                'data'       => $result['data'],
                'pagination' => PaginationHelper::format($result['total'], $limit, $page),
                'errors'     => null
            ]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'DocumentController::index');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al recuperar documentos']]);
        }
    }

    public function store($projectId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba POST', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $projectId = (int)$projectId;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);
            
            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Sin permisos sobre este proyecto', 'data' => null, 'errors' => ['permissions' => 'Denegado']]);
                return;
            }

            if (!DocumentPolicy::canUploadToProject($projectDetails['status'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Proyecto cerrado', 'data' => null, 'errors' => ['policy' => 'El proyecto está cerrado y no admite documentos.']]);
                return;
            }

            // --- USO DEL REQUEST PARA VALIDACIÓN ---
            $request = new DocumentRequest();
            if (!$request->validateFile($_FILES['file'] ?? null)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Archivo inválido', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            if (!$request->validateStore()) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            $file = $_FILES['file'];
            $safeFileName = htmlspecialchars(basename($file['name']), ENT_QUOTES, 'UTF-8');
            $rawTitle = $request->getPostInput('title', pathinfo($file['name'], PATHINFO_FILENAME));
            $title = $this->sanitizeName($rawTitle);
            $type = htmlspecialchars(trim($request->getPostInput('type', 'otros')), ENT_QUOTES, 'UTF-8');
            $accessMode = htmlspecialchars(trim($request->getPostInput('access_mode', 'download')), ENT_QUOTES, 'UTF-8');
            $isVisible = (int)$request->getPostInput('is_visible_to_client', 0);
            // ----------------------------------------

            $allowedMimes = Document::getAllowedMimeTypes();
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $realMime = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($realMime, $allowedMimes)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'El formato del archivo no está permitido.', 'data' => null, 'errors' => ['file' => 'Tipo mime inválido']]);
                return;
            }

            $storageDir = __DIR__ . '/../../storage/documents/';
            if (!is_dir($storageDir)) {
                mkdir($storageDir, 0755, true);
            }

            $secureStorageName = bin2hex(random_bytes(16)) . '_' . time();
            $destinationPath = $storageDir . $secureStorageName;
            $checksum = hash_file('sha256', $file['tmp_name']);

            if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
                throw new Exception("Error al guardar el archivo en el disco.");
            }

            $docData = [
                'project_id'           => $projectId,
                'type'                 => $type,
                'title'                => $title,
                'is_visible_to_client' => $isVisible,
                'access_mode'          => $accessMode,
                'created_by'           => $userId
            ];

            $versionData = [
                'file_name'       => $safeFileName,
                'storage_path'    => $secureStorageName,
                'mime_type'       => $realMime,
                'file_size'       => $file['size'],
                'checksum_sha256' => $checksum,
                'uploaded_by'     => $userId
            ];

            $documentModel = new Document();
            $existingId = $documentModel->findDocumentByTitle($projectId, $title);

            require_once APP_PATH . '/Services/NotificationService.php';

            if ($existingId) {
                $newVersionId = $documentModel->uploadNewVersion($existingId, $versionData);
                
                AuditLogger::log('documento_nueva_version', 'document_version', $newVersionId, $projectId, [
                    'nombre_archivo'   => $safeFileName,
                    'documento_id'     => $existingId,
                    'documento_titulo' => $title,
                    'tamaño_archivo'   => $file['size'],
                    'auto_versionado'  => true
                ]);

                NotificationService::queueProjectEvent($projectId, 'nueva_version', $userId, ['titulo' => $title]);

                echo json_encode(['success' => true, 'message' => 'Auto-Versionado exitoso.', 'data' => ['id' => $existingId, 'version_id' => $newVersionId, 'is_new_version' => true], 'errors' => null]);
            } else {
                $newDocId = $documentModel->uploadNewDocument($docData, $versionData);
                
                AuditLogger::log('documento_subido', 'document', $newDocId, $projectId, [
                    'nombre_archivo'   => $safeFileName,
                    'documento_id'     => $newDocId,
                    'documento_titulo' => $title,
                    'tamaño_archivo'   => $file['size'],
                    'mime_type'        => $realMime
                ]);

                NotificationService::queueProjectEvent($projectId, 'nueva_propuesta', $userId, ['titulo' => $title]);

                echo json_encode(['success' => true, 'message' => 'Documento subido.', 'data' => ['id' => $newDocId, 'is_new_version' => false], 'errors' => null]);
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'DocumentController::store');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al subir']]);
        }
    }

    public function addVersion($projectId, $documentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba POST', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $projectId = (int)$projectId;
            $documentId = (int)$documentId;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);
            
            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Sin permisos', 'data' => null, 'errors' => ['project' => 'Denegado']]);
                return;
            }

            if (!DocumentPolicy::canUploadToProject($projectDetails['status'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Proyecto cerrado', 'data' => null, 'errors'  => ['policy' => 'Cerrado']]);
                return;
            }

            // --- USO DEL REQUEST PARA VALIDACIÓN ---
            $request = new DocumentRequest();
            if (!$request->validateFile($_FILES['file'] ?? null)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Archivo inválido', 'data' => null, 'errors' => $request->errors()]);
                return;
            }
            $file = $_FILES['file'];
            // ----------------------------------------
            
            $safeFileName = htmlspecialchars(basename($file['name']), ENT_QUOTES, 'UTF-8');
            $allowedMimes = Document::getAllowedMimeTypes();
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $realMime = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($realMime, $allowedMimes)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Formato no soportado', 'data' => null, 'errors' => ['file' => 'MIME inválido']]);
                return;
            }

            $storageDir = __DIR__ . '/../../storage/documents/';
            $secureStorageName = bin2hex(random_bytes(16)) . '_' . time();
            $destinationPath = $storageDir . $secureStorageName;
            $checksum = hash_file('sha256', $file['tmp_name']);

            if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
                throw new Exception("Error al guardar el archivo.");
            }

            $versionData = [
                'file_name'       => $safeFileName,
                'storage_path'    => $secureStorageName,
                'mime_type'       => $realMime,
                'file_size'       => $file['size'],
                'checksum_sha256' => $checksum,
                'uploaded_by'     => $userId
            ];

            $documentModel = new Document();
            $versionId = $documentModel->uploadNewVersion($documentId, $versionData);
            $docInfo = $documentModel->getForDownload($documentId, $projectId); 

            AuditLogger::log('documento_nueva_version', 'document_version', $versionId, $projectId, [
                'nombre_archivo'   => $safeFileName,
                'document_id'      => $documentId,
                'documento_titulo' => $docInfo ? $docInfo['title'] : 'Desconocido',
                'numero_version'   => $docInfo ? $docInfo['version_number'] : null,
                'tamaño_archivo'   => $file['size'],
                'auto_versioned'   => false
            ]);

            require_once APP_PATH . '/Services/NotificationService.php';
            NotificationService::queueProjectEvent($projectId, 'nueva_version', $userId, [
                'titulo' => $docInfo ? $docInfo['title'] : 'Desconocido'
            ]);

            echo json_encode(['success' => true, 'message' => 'Nueva versión subida', 'data' => ['version_id' => $versionId], 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'DocumentController::addVersion');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error']]);
        }
    }

    public function versions($projectId, $documentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        try {
            $projectId = (int)$projectId;
            $documentId = (int)$documentId;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Sin permisos', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            $documentModel = new Document();
            $versions = $documentModel->getVersions($documentId);

            echo json_encode(['success' => true, 'message' => 'Versiones recuperadas', 'data' => $versions, 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'DocumentController::versions');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
        }
    }

    public function update($projectId, $documentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!DocumentPolicy::canEditMetadata($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Privilegios insuficientes']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba PUT', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $projectId = (int)$projectId;
            $documentId = (int)$documentId;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);
            
            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado']);
                return;
            }

            if (!DocumentPolicy::canUploadToProject($projectDetails['status'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Proyecto cerrado']);
                return;
            }

            $documentModel = new Document();
            $currentDoc = $documentModel->getMetadata($documentId, $projectId);

            if (!$currentDoc) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Documento no encontrado']);
                return;
            }

            // --- USO DEL REQUEST PARA VALIDACIÓN ---
            $request = new DocumentRequest();
            if (!$request->validateUpdate()) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            $newData = [];
            $changes = [];

            if ($request->input('title') !== null) {
                $cleanTitle = $this->sanitizeName($request->input('title'));
                if (!empty($cleanTitle) && $cleanTitle !== $currentDoc['title']) {
                    $newData['title'] = $cleanTitle;
                    $changes['title'] = ['antes' => $currentDoc['title'], 'despues' => $cleanTitle];
                }
            }

            if ($request->input('type') !== null) {
                $cleanType = htmlspecialchars(trim($request->input('type')), ENT_QUOTES, 'UTF-8');
                if ($cleanType !== $currentDoc['type']) {
                    $newData['type'] = $cleanType;
                    $changes['type'] = ['antes' => $currentDoc['type'], 'despues' => $cleanType];
                }
            }

            if ($request->input('access_mode') !== null) {
                $newMode = htmlspecialchars(trim($request->input('access_mode')), ENT_QUOTES, 'UTF-8');
                if ($newMode !== $currentDoc['access_mode']) {
                    $newData['access_mode'] = $newMode;
                    $changes['access_mode'] = ['antes' => $currentDoc['access_mode'], 'despues' => $newMode];
                }
            }

            if ($request->input('is_visible_to_client') !== null) {
                $newVis = (int)$request->input('is_visible_to_client');
                if ($newVis !== (int)$currentDoc['is_visible_to_client']) {
                    $newData['is_visible_to_client'] = $newVis;
                    $changes['is_visible_to_client'] = ['antes' => (int)$currentDoc['is_visible_to_client'], 'despues' => $newVis];
                }
            }
            // ---------------------------------------

            if (!empty($newData)) {
                $documentModel->updateMetadata($documentId, $projectId, $newData);
                AuditLogger::log('documento_actualizado', 'document', $documentId, $projectId, ['cambios' => $changes]);
            }

            echo json_encode(['success' => true, 'message' => 'Metadatos actualizados', 'data' => null, 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'DocumentController::update');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al actualizar']]);
        }
    }

    public function destroy($projectId, $documentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Se esperaba DELETE', 'data' => null, 'errors' => ['method' => 'Método no permitido']]);
            return;
        }

        try {
            $projectId = (int)$projectId;
            $documentId = (int)$documentId;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);
            
            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado']);
                return;
            }

            if (!DocumentPolicy::canUploadToProject($projectDetails['status'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Proyecto cerrado']);
                return;
            }

            $documentModel = new Document();
            $currentDoc = $documentModel->getMetadata($documentId, $projectId);

            if (!$currentDoc) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Documento no encontrado']);
                return;
            }

            $documentModel->delete($documentId, $projectId);
            AuditLogger::log('documento_eliminado', 'document', $documentId, $projectId, [
                'titulo_documento' => $currentDoc['title']
            ]);

            echo json_encode(['success' => true, 'message' => 'Documento eliminado', 'data' => null, 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'DocumentController::destroy');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno']);
        }
    }

    public function download($projectId, $documentId) {
        $this->serveFile($projectId, $documentId, 'attachment');
    }

    public function view($projectId, $documentId) {
        $this->serveFile($projectId, $documentId, 'inline');
    }

    private function serveFile($projectId, $documentId, $disposition) {
        AuthMiddleware::check();

        try {
            $projectId = (int)$projectId;
            $documentId = (int)$documentId;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                die("Proyecto no encontrado o sin permisos.");
            }

            $versionId = isset($_GET['version_id']) ? (int)$_GET['version_id'] : null;

            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload($documentId, $projectId, $versionId);

            if (!$docInfo) {
                http_response_code(404);
                die("Documento no encontrado.");
            }

            if (!DocumentPolicy::canAccessDocument($role, $docInfo['is_visible_to_client'])) {
                http_response_code(403);
                die("Este documento es confidencial.");
            }

            if ($disposition === 'attachment' && !DocumentPolicy::canDownload($role, $docInfo['access_mode'])) {
                http_response_code(403);
                die("Este documento solo está disponible para visualización online.");
            }

            if ($disposition === 'inline' && !DocumentPolicy::canViewInline($role, $docInfo['access_mode'])) {
                http_response_code(403);
                die("Este documento debe ser descargado para su visualización.");
            }

            session_write_close();

            $storageDir = __DIR__ . '/../../storage/documents/';
            $filePath = $storageDir . $docInfo['storage_path'];

            if (!file_exists($filePath)) {
                http_response_code(404);
                die("Archivo no encontrado en el servidor.");
            }

            $size = filesize($filePath);
            $start = 0;
            $end = $size - 1;
            
            $fp = @fopen($filePath, 'rb');
            if (!$fp) {
                throw new Exception("Error al abrir el archivo.");
            }

            if (isset($_SERVER['HTTP_RANGE'])) {
                $c_start = $start;
                $c_end = $end;

                list(, $range) = explode('=', $_SERVER['HTTP_RANGE'], 2);
                if (strpos($range, ',') !== false) {
                    header('HTTP/1.1 416 Requested Range Not Satisfiable');
                    header("Content-Range: bytes $start-$end/$size");
                    exit;
                }
                if ($range[0] == '-') {
                    $c_start = $size - substr($range, 1);
                } else {
                    $range = explode('-', $range);
                    $c_start = $range[0];
                    $c_end = (isset($range[1]) && is_numeric($range[1])) ? $range[1] : $size - 1;
                }
                $c_end = ($c_end > $end) ? $end : $c_end;
                if ($c_start > $c_end || $c_start > $size - 1 || $c_end >= $size) {
                    header('HTTP/1.1 416 Requested Range Not Satisfiable');
                    header("Content-Range: bytes $start-$end/$size");
                    exit;
                }
                $start = $c_start;
                $end = $c_end;
                $length = $end - $start + 1;
                fseek($fp, $start);
                header('HTTP/1.1 206 Partial Content');
            } else {
                $length = $size;
            }

            header('Content-Type: ' . $docInfo['mime_type']);
            header('Content-Disposition: ' . $disposition . '; filename="' . basename($docInfo['file_name']) . '"');
            header("Accept-Ranges: bytes");
            header("Content-Range: bytes $start-$end/$size");
            header("Content-Length: " . $length);
            header('Cache-Control: no-cache, no-store, must-revalidate'); 
            header('Pragma: no-cache');
            header('Expires: 0');
            
            $buffer = 64 * 1024; 
            $aborted = false; 

            while (!feof($fp) && ($p = ftell($fp)) <= $end) {
                if ($p + $buffer > $end) {
                    $buffer = $end - $p + 1;
                }
                set_time_limit(0); 
                echo fread($fp, $buffer);
                
                ob_flush(); 
                flush(); 
                
                if (connection_aborted()) {
                    $aborted = true;
                    break;
                }
            }

            fclose($fp);

            $isChunked = isset($_SERVER['HTTP_RANGE']);
            $isFirstChunk = $isChunked ? (strpos($_SERVER['HTTP_RANGE'], 'bytes=0-') !== false) : true;

            if (!$aborted && $isFirstChunk) {
                $actionKey = ($disposition === 'attachment') ? 'documento_descargado' : 'documento_visualizado';
                
                AuditLogger::log($actionKey, 'document', $documentId, $projectId, [
                    'nombre_archivo'        => $docInfo['file_name'],
                    'documento_id'          => $documentId,
                    'numero_version'        => $docInfo['version_number'] ?? null,
                    'es_version_especifica' => $versionId ? true : false,
                    'version_id'            => $versionId ?: ($docInfo['version_id'] ?? null)
                ]);
            }
            
            exit;

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'DocumentController::serveFile');
            http_response_code(500);
            die("Error interno del servidor.");
        }
    }

    private function sanitizeName($name) {
        if (empty($name)) return '';
        $name = trim($name);
        $name = str_replace(['-', '_'], ' ', $name);
        $name = preg_replace('/\s+/', ' ', $name);
        return htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    }
}