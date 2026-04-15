<?php
// app/Controllers/DocumentController.php

require_once APP_PATH . '/Models/Document.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php';
require_once APP_PATH . '/Helpers/PaginationHelper.php';

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
            $result = $documentModel->getListByProject($projectId, $role, $limit, $offset);

            echo json_encode([
                'success'    => true, 
                'message'    => 'Documentos recuperados correctamente',
                'data'       => $result['data'],
                'pagination' => PaginationHelper::format($result['total'], $limit, $page),
                'errors'     => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error del servidor']]);
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

            if ($projectDetails['status'] === 'cerrado') {
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Proyecto cerrado', 
                    'data'    => null, 
                    'errors'  => ['status' => 'El proyecto está cerrado y no admite la carga de nuevos documentos.']
                ]);
                return;
            }

            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No se recibió ningún archivo válido o superó el límite de tamaño', 'data' => null, 'errors' => ['file' => 'Archivo inválido']]);
                return;
            }

            $file = $_FILES['file'];
            
            $safeFileName = htmlspecialchars(basename($file['name']), ENT_QUOTES, 'UTF-8');
            $rawTitle = $_POST['title'] ?? pathinfo($file['name'], PATHINFO_FILENAME);
            $title = $this->sanitizeName($rawTitle);
            
            $type = isset($_POST['type']) ? htmlspecialchars(trim($_POST['type']), ENT_QUOTES, 'UTF-8') : 'otros';
            $accessMode = isset($_POST['access_mode']) ? htmlspecialchars(trim($_POST['access_mode']), ENT_QUOTES, 'UTF-8') : 'download';
            $isVisible = isset($_POST['is_visible_to_client']) ? (int)$_POST['is_visible_to_client'] : 0;

            $allowedMimes = [
                'application/pdf', 
                'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif',
                'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska',
                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/markdown', 'text/csv', 'text/plain', 'application/json', 'application/x-yaml', 'text/yaml',
                'image/vnd.adobe.photoshop', 'application/postscript',
                'image/vnd.dwg', 'image/vnd.dxf', 'application/acad', 'application/dxf',
                'model/obj', 'model/stl', 'application/octet-stream'
            ];

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $realMime = finfo_file($finfo, $file['tmp_name']);

            if (!in_array($realMime, $allowedMimes)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'El formato del archivo no está permitido por seguridad.', 'data' => null, 'errors' => ['file' => 'Tipo mime inválido']]);
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

                // --- NOTIFICAR NUEVA VERSIÓN ---
                NotificationService::queueProjectEvent($projectId, 'nueva_version', $userId, ['titulo' => $title]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Se ha detectado un documento con el mismo nombre. Se ha subido como una nueva versión (Auto-Versionado).',
                    'data'    => ['id' => $existingId, 'version_id' => $newVersionId, 'is_new_version' => true],
                    'errors'  => null
                ]);
            } else {
                $newDocId = $documentModel->uploadNewDocument($docData, $versionData);
                
                AuditLogger::log('documento_subido', 'document', $newDocId, $projectId, [
                    'nombre_archivo'   => $safeFileName,
                    'documento_id'     => $newDocId,
                    'documento_titulo' => $title,
                    'tamaño_archivo'   => $file['size'],
                    'mime_type'        => $realMime
                ]);

                // --- NOTIFICAR NUEVA PROPUESTA/DOCUMENTO ---
                NotificationService::queueProjectEvent($projectId, 'nueva_propuesta', $userId, ['titulo' => $title]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Documento subido correctamente',
                    'data'    => ['id' => $newDocId, 'is_new_version' => false],
                    'errors'  => null
                ]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al subir documento']]);
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
                echo json_encode(['success' => false, 'message' => 'Sin permisos sobre este proyecto', 'data' => null, 'errors' => ['project' => 'Denegado']]);
                return;
            }

            if ($projectDetails['status'] === 'cerrado') {
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Proyecto cerrado', 
                    'data'    => null, 
                    'errors'  => ['status' => 'El proyecto está cerrado y no admite actualizaciones de archivos.']
                ]);
                return;
            }

            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No se recibió ningún archivo válido', 'data' => null, 'errors' => ['file' => 'Inválido']]);
                return;
            }

            $file = $_FILES['file'];
            $safeFileName = htmlspecialchars(basename($file['name']), ENT_QUOTES, 'UTF-8');

            $allowedMimes = [
                'application/pdf', 
                'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif',
                'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska',
                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/markdown', 'text/csv', 'text/plain', 'application/json', 'application/x-yaml', 'text/yaml',
                'image/vnd.adobe.photoshop', 'application/postscript',
                'image/vnd.dwg', 'image/vnd.dxf', 'application/acad', 'application/dxf',
                'model/obj', 'model/stl', 'application/octet-stream'
            ];

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $realMime = finfo_file($finfo, $file['tmp_name']);

            if (!in_array($realMime, $allowedMimes)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'El formato del archivo no está permitido.', 'data' => null, 'errors' => ['file' => 'Formato no soportado']]);
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

            // --- NOTIFICAR NUEVA VERSIÓN ---
            require_once APP_PATH . '/Services/NotificationService.php';
            NotificationService::queueProjectEvent($projectId, 'nueva_version', $userId, [
                'titulo' => $docInfo ? $docInfo['title'] : 'Desconocido'
            ]);
            // -------------------------------

            echo json_encode([
                'success' => true,
                'message' => 'Nueva versión subida correctamente',
                'data'    => ['version_id' => $versionId],
                'errors'  => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al subir version']]);
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
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener versiones', 'data' => null, 'errors' => ['server' => 'Error interno']]);
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

            if ($role === 'cliente') {
                if ($docInfo['is_visible_to_client'] == 0) {
                    http_response_code(403);
                    die("Este documento es confidencial.");
                }

                if ($disposition === 'attachment' && $docInfo['access_mode'] === 'view') {
                    http_response_code(403);
                    die("Este documento solo está disponible para visualización online.");
                }
                if ($disposition === 'inline' && $docInfo['access_mode'] === 'download') {
                    http_response_code(403);
                    die("Este documento debe ser descargado para su visualización.");
                }
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
                http_response_code(500);
                die("Error al abrir el archivo.");
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
            http_response_code(500);
            die("Error interno.");
        }
    }

    private function sanitizeName($name) {
        if (empty($name)) return '';
        $name = trim($name);
        $name = preg_replace('/\s+/', ' ', $name);
        $name = mb_convert_case($name, MB_CASE_TITLE, "UTF-8");
        return htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    }
}