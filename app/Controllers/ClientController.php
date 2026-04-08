<?php
// app/Controllers/ClientController.php

require_once APP_PATH . '/Models/Client.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php'; // <-- INYECTAMOS EL SERVICIO DE AUDITORÍA

class ClientController {

    public function index() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Autorización por Rol
        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403); // Prohibido
            echo json_encode([
                'success' => false,
                'message' => 'Acceso denegado. No tiene permisos para ver esta sección.',
                'data'    => null,
                'errors'  => ['role' => 'Se requiere rol admin o comercial']
            ]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];

            $clientModel = new Client();
            $clientes = $clientModel->getListByUser($userId, $role);

            echo json_encode([
                'success' => true,
                'message' => 'Listado de clientes recuperado',
                'data'    => $clientes,
                'errors'  => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al recuperar los clientes',
                'data'    => null,
                'errors'  => ['server' => $e->getMessage()]
            ]);
        }
    }

    // Obtener el detalle individual de un cliente
    public function show($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización
        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Se requiere rol admin o comercial']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];

            $clientModel = new Client();
            $clientDetails = $clientModel->getDetailsById($id, $userId, $role);

            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Cliente no encontrado o sin permisos',
                    'data'    => null,
                    'errors'  => ['client' => 'Recurso inaccesible']
                ]);
                return;
            }

            echo json_encode([
                'success' => true,
                'message' => 'Detalle del cliente recuperado',
                'data'    => $clientDetails,
                'errors'  => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al recuperar el cliente',
                'data'    => null,
                'errors'  => ['server' => $e->getMessage()]
            ]);
        }
    }

    // Crear un nuevo cliente (POST)
    public function store() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización
        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Se requiere rol admin o comercial']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba POST']]);
            return;
        }

        // Leer el JSON del body (raw input)
        $input = json_decode(file_get_contents('php://input'), true);

        // Validación básica
        $errors = [];
        if (empty($input['name'])) {
            $errors['name'] = 'El nombre de la empresa es obligatorio.';
        }

        if (!empty($input['reference'])) {
            if (!preg_match('/^CLI-\d{3,}$/', $input['reference'])) {
                $errors['reference'] = 'La referencia de cliente debe tener el formato CLI-XXX (Ej: CLI-001)';
            }
        }

        if (!empty($errors)) {
            http_response_code(422); // Unprocessable Entity
            echo json_encode([
                'success' => false,
                'message' => 'Error de validación',
                'data'    => null,
                'errors'  => $errors
            ]);
            return;
        }

        try {
            $clientModel = new Client();
            
            // Empaquetamos los datos, inyectando el ID del usuario creador desde la sesión
            $newClientId = $clientModel->create([
                'name'       => trim($input['name']),
                'reference'  => !empty($input['reference']) ? trim($input['reference']) : null,
                'is_active'  => isset($input['is_active']) ? (int)$input['is_active'] : 1,
                'created_by' => $_SESSION['user_id']
            ]);

            // AUDITORÍA: Alta de cliente
            AuditLogger::log('client_create', 'client', $newClientId, null, [
                'name'      => trim($input['name']),
                'reference' => !empty($input['reference']) ? trim($input['reference']) : null
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Cliente creado correctamente',
                'data'    => ['id' => $newClientId],
                'errors'  => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al crear el cliente',
                'data'    => null,
                'errors'  => ['server' => $e->getMessage()]
            ]);
        }
    }

    // Actualizar un cliente existente (PUT)
    public function update($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización
        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Se requiere rol admin o comercial']]);
            return;
        }

        // Aceptamos PUT (o POST si el frontend usa method spoofing con _method=PUT)
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba PUT']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            
            $clientModel = new Client();
            
            // Tiene permiso para ver/editar este cliente?
            $clientDetails = $clientModel->getDetailsById($id, $userId, $role);
            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Cliente no encontrado o sin permisos de edición',
                    'data'    => null,
                    'errors'  => ['client' => 'Recurso inaccesible']
                ]);
                return;
            }

            // Leer los datos enviados
            $input = json_decode(file_get_contents('php://input'), true);

            // Validación básica
            if (empty($input['name'])) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => ['name' => 'El nombre es obligatorio']]);
                return;
            }

            // --- PREPARAR DATOS PARA AUDITORÍA (ANTES DE ACTUALIZAR) ---
            $oldData = [
                'name'      => $clientDetails['info']['name'],
                'reference' => $clientDetails['info']['reference'],
                'is_active' => (int)$clientDetails['info']['is_active']
            ];

            $newData = [
                'name'      => trim($input['name']),
                'reference' => !empty($input['reference']) ? trim($input['reference']) : null,
                'is_active' => isset($input['is_active']) ? (int)$input['is_active'] : $oldData['is_active']
            ];

            // Detectar qué campos han cambiado realmente
            $changes = [];
            foreach ($newData as $key => $value) {
                if ($oldData[$key] !== $value) {
                    $changes[$key] = [
                        'before' => $oldData[$key],
                        'after'  => $value
                    ];
                }
            }

            // Actualizar en la base de datos
            $updated = $clientModel->update($id, $newData);

            if ($updated) {

                // AUDITORÍA: Edición o Desactivación
                if (!empty($changes)) {
                    // Si el estado activo cambió, le doy un action_key específico, sino, es un simple update
                    $actionKey = 'client_update';
                    if (isset($changes['is_active'])) {
                        $actionKey = ($newData['is_active'] === 0) ? 'client_deactivate' : 'client_reactivate';
                    }

                    AuditLogger::log($actionKey, 'client', $id, null, ['changes' => $changes]);
                }

                echo json_encode([
                    'success' => true,
                    'message' => 'Cliente actualizado correctamente',
                    'data'    => ['id' => $id],
                    'errors'  => null
                ]);
            } else {
                throw new Exception("No se pudo actualizar el registro en la base de datos");
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al actualizar el cliente',
                'data'    => null,
                'errors'  => ['server' => $e->getMessage()]
            ]);
        }
    }
}