<?php
// app/Controllers/DocumentController.php

require_once APP_PATH . '/Models/Document.php';
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';

class DocumentController {

    // Listar los documentos de un proyecto (GET /api/projects/{projectId}/documents)
    public function index($projectId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            // Escudo de Autorización: Reutilizamos el modelo Project
            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos']);
                return;
            }

            $documentModel = new Document();
            $documents = $documentModel->getListByProject((int)$projectId, $role);

            echo json_encode(['success' => true, 'data' => $documents]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Subir un nuevo documento (POST /api/projects/{projectId}/documents)
    public function store($projectId) {
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

            // Escudo de Autorización
            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Sin permisos sobre este proyecto']);
                return;
            }

            // Validar que se ha enviado un archivo
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No se recibió ningún archivo válido o superó el límite de tamaño']);
                return;
            }

            $file = $_FILES['file'];
            $title = $_POST['title'] ?? pathinfo($file['name'], PATHINFO_FILENAME); // Por defecto, el nombre del archivo
            $type = $_POST['type'] ?? 'otros';
            $isVisible = isset($_POST['is_visible_to_client']) ? (int)$_POST['is_visible_to_client'] : 0;

            // Seguridad: Tipos MIME permitidos
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
                'model/obj', 'model/stl', 'application/octet-stream' // Para formatos propietarios (.fig, .prproj, .dwg, etc)
            ];

            // Comprobamos el MIME type real del archivo (no la extensión que puede ser falsificada)
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $realMime = finfo_file($finfo, $file['tmp_name']);

            if (!in_array($realMime, $allowedMimes)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'El formato del archivo no está permitido por seguridad.']);
                return;
            }

            // Seguridad: Generar nombre cifrado y preparar ruta
            // __DIR__ sube dos niveles (desde app/Controllers) hasta la raíz y busca storage/documents
            $storageDir = __DIR__ . '/../../storage/documents/';
            
            // Si la carpeta no existe, la creamos de forma segura
            if (!is_dir($storageDir)) {
                mkdir($storageDir, 0755, true);
            }

            $secureFileName = bin2hex(random_bytes(16)) . '_' . time();
            $destinationPath = $storageDir . $secureFileName;

            // Calcular el Checksum (Firma única del archivo para evitar duplicados o manipulación)
            $checksum = hash_file('sha256', $file['tmp_name']);

            // Mover archivo del temporal al storage privado
            if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
                throw new Exception("Error al guardar el archivo en el disco.");
            }

            $accessMode = $_POST['access_mode'] ?? 'download';

            // Preparar datos para el modelo
            $docData = [
                'project_id'           => (int)$projectId,
                'type'                 => $type,
                'title'                => trim($title),
                'is_visible_to_client' => $isVisible,
                'access_mode'          => $accessMode,
                'created_by'           => $userId
            ];

            $versionData = [
                'file_name'       => $file['name'], // Guardamos el nombre original para cuando se descargue
                'storage_path'    => $secureFileName, // Guardamos la ruta segura relativa
                'mime_type'       => $realMime,
                'file_size'       => $file['size'],
                'checksum_sha256' => $checksum,
                'uploaded_by'     => $userId
            ];

            $documentModel = new Document();
            
            // Deduplicación Automática: ¿Existe ya un documento con este título en el proyecto?
            $existingId = $documentModel->findDocumentByTitle((int)$projectId, trim($title));

            if ($existingId) {
                // Si existe, lo tratamos como una nueva VERSIÓN automáticamente
                $newVersionId = $documentModel->uploadNewVersion((int)$existingId, $versionData);
                echo json_encode([
                    'success' => true,
                    'message' => 'Se ha detectado un documento con el mismo nombre. Se ha subido como una nueva versión (Auto-Versionado).',
                    'data'    => ['id' => $existingId, 'version_id' => $newVersionId, 'is_new_version' => true]
                ]);
            } else {
                // Si no existe, creamos un documento NUEVO
                $newDocId = $documentModel->uploadNewDocument($docData, $versionData);
                echo json_encode([
                    'success' => true,
                    'message' => 'Documento subido correctamente',
                    'data'    => ['id' => $newDocId, 'is_new_version' => false]
                ]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Subir una nueva versión de un documento existente (POST /api/projects/{projectId}/documents/{documentId}/versions)
    public function addVersion($projectId, $documentId) {
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

            // Escudo de Autorización sobre el Proyecto
            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Sin permisos sobre este proyecto']);
                return;
            }

            // Validar que se ha enviado un archivo
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No se recibió ningún archivo válido']);
                return;
            }

            $file = $_FILES['file'];

            // Seguridad: Tipos MIME permitidos
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
                echo json_encode(['success' => false, 'message' => 'El formato del archivo no está permitido.']);
                return;
            }

            $storageDir = __DIR__ . '/../../storage/documents/';
            $secureFileName = bin2hex(random_bytes(16)) . '_' . time();
            $destinationPath = $storageDir . $secureFileName;
            $checksum = hash_file('sha256', $file['tmp_name']);

            if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
                throw new Exception("Error al guardar el archivo.");
            }

            $versionData = [
                'file_name'       => $file['name'],
                'storage_path'    => $secureFileName,
                'mime_type'       => $realMime,
                'file_size'       => $file['size'],
                'checksum_sha256' => $checksum,
                'uploaded_by'     => $userId
            ];

            $documentModel = new Document();
            $versionId = $documentModel->uploadNewVersion((int)$documentId, $versionData);

            echo json_encode([
                'success' => true,
                'message' => 'Nueva versión subida correctamente',
                'data'    => ['version_id' => $versionId]
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Obtener historial de versiones (GET /api/projects/{projectId}/documents/{documentId}/versions)
    public function versions($projectId, $documentId) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Sin permisos']);
                return;
            }

            $documentModel = new Document();
            $versions = $documentModel->getVersions((int)$documentId);

            echo json_encode(['success' => true, 'data' => $versions]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener versiones']);
        }
    }

    // Descargar documento de forma segura (GET /api/projects/{projectId}/documents/{documentId}/download)
    public function download($projectId, $documentId) {
        $this->serveFile($projectId, $documentId, 'attachment');
    }

    // Visualizar documento de forma segura (GET /api/projects/{projectId}/documents/{documentId}/view)
    public function view($projectId, $documentId) {
        $this->serveFile($projectId, $documentId, 'inline');
    }

    /** Helper privado para servir archivos con control de modo de acceso y soporte de streaming (Range) */
    private function serveFile($projectId, $documentId, $disposition) {
        AuthMiddleware::check();

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            // Escudo de Autorización sobre el Proyecto
            $projectModel = new Project();
            if (!$projectModel->getById($projectId, $userId, $role, $clientId)) {
                http_response_code(404);
                die("Proyecto no encontrado o sin permisos.");
            }

            // IMPORTANTE: Liberar el bloqueo de sesión de PHP.
            // Los videos pesados y los Range Requests abren múltiples conexiones.
            // Si no cerramos la sesión, la segunda petición esperará a que termine la primera, causando buffering infinito.
            session_write_close();

            $versionId = $_GET['version_id'] ?? null;
            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload((int)$documentId, (int)$projectId, $versionId);

            if (!$docInfo) {
                http_response_code(404);
                die("Documento no encontrado.");
            }

            // Escudo de Autorización sobre el Documento
            if ($role === 'cliente') {
                if ($docInfo['is_visible_to_client'] == 0) {
                    http_response_code(403);
                    die("Este documento es confidencial.");
                }

                // Aplicar ENFORCEMENT de access_mode
                if ($disposition === 'attachment' && $docInfo['access_mode'] === 'view') {
                    http_response_code(403);
                    die("Este documento solo está disponible para visualización online.");
                }
                if ($disposition === 'inline' && $docInfo['access_mode'] === 'download') {
                    http_response_code(403);
                    die("Este documento debe ser descargado para su visualización.");
                }
            }

            $storageDir = __DIR__ . '/../../storage/documents/';
            $filePath = $storageDir . $docInfo['storage_path'];

            if (!file_exists($filePath)) {
                http_response_code(404);
                die("Archivo no encontrado en el servidor.");
            }

            // Preparar para streaming / Range Requests
            $size = filesize($filePath);
            $start = 0;
            $end = $size - 1;
            
            // Abrir archivo en modo binario
            $fp = @fopen($filePath, 'rb');
            if (!$fp) {
                http_response_code(500);
                die("Error al abrir el archivo.");
            }

            // Soporte de HTTP Range (Crucial para videos en móvil)
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

            // Headers estándar
            header('Content-Type: ' . $docInfo['mime_type']);
            header('Content-Disposition: ' . $disposition . '; filename="' . basename($docInfo['file_name']) . '"');
            header("Accept-Ranges: bytes");
            header("Content-Range: bytes $start-$end/$size");
            header("Content-Length: " . $length);
            header('Cache-Control: private, max-age=86400, must-revalidate'); // Cachear un día el recurso estático
            header('Pragma: public');
            
            // Enviar el archivo por fragmentos (buffer)
            $buffer = 64 * 1024; // 64kb por ciclo (mejor rendimiento en streaming)
            while (!feof($fp) && ($p = ftell($fp)) <= $end) {
                if ($p + $buffer > $end) {
                    $buffer = $end - $p + 1;
                }
                set_time_limit(0); 
                echo fread($fp, $buffer);
                flush(); 
            }

            fclose($fp);
            exit;

        } catch (Exception $e) {
            http_response_code(500);
            die("Error interno.");
        }
    }
}