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
                'image/jpeg', 
                'image/png', 
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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

            // Preparar datos para el modelo
            $docData = [
                'project_id'           => (int)$projectId,
                'type'                 => $type,
                'title'                => trim($title),
                'is_visible_to_client' => $isVisible,
                'access_mode'          => 'download',
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
            $newDocId = $documentModel->uploadNewDocument($docData, $versionData);

            echo json_encode([
                'success' => true,
                'message' => 'Documento subido correctamente',
                'data'    => ['id' => $newDocId]
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Descargar documento de forma segura (GET /api/projects/{projectId}/documents/{documentId}/download)
    public function download($projectId, $documentId) {
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

            $documentModel = new Document();
            $docInfo = $documentModel->getForDownload((int)$documentId, (int)$projectId);

            if (!$docInfo) {
                http_response_code(404);
                die("Documento no encontrado.");
            }

            // Escudo de Autorización sobre el Documento (Si es cliente, comprobar si es visible)
            if ($role === 'cliente' && $docInfo['is_visible_to_client'] == 0) {
                http_response_code(403);
                die("Este documento es confidencial y solo visible para personal interno.");
            }

            $storageDir = __DIR__ . '/../../storage/documents/';
            $filePath = $storageDir . $docInfo['storage_path'];

            if (!file_exists($filePath)) {
                http_response_code(404);
                die("El archivo físico no se encuentra en el servidor.");
            }

            // Forzar al navegador a descargar el archivo ocultando la ruta real
            header('Content-Description: File Transfer');
            header('Content-Type: ' . $docInfo['mime_type']);
            // Añadir comillas alrededor del nombre de archivo previene errores con espacios
            header('Content-Disposition: attachment; filename="' . basename($docInfo['file_name']) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . filesize($filePath));
            
            readfile($filePath);
            exit;

        } catch (Exception $e) {
            http_response_code(500);
            die("Error interno en la descarga del documento.");
        }
    }
}