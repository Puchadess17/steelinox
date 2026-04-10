<?php
// app/Controllers/ClientController.php

require_once APP_PATH . '/Models/Client.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php'; 

class ClientController {

    public function index() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403); 
            echo json_encode(['success' => false, 'message' => 'Acceso denegado.', 'data' => null, 'errors' => ['role' => 'Se requiere rol admin o comercial']]);
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

            echo json_encode(['success' => true, 'message' => 'Listado de clientes recuperado', 'data' => $clientes, 'errors' => null]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al recuperar los clientes', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    public function show($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

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
            $id = (int)$id;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];

            $clientModel = new Client();
            $clientDetails = $clientModel->getDetailsById($id, $userId, $role);

            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado o sin permisos', 'data' => null, 'errors' => ['client' => 'Recurso inaccesible']]);
                return;
            }

            echo json_encode(['success' => true, 'message' => 'Detalle del cliente recuperado', 'data' => $clientDetails, 'errors' => null]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al recuperar el cliente', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    public function store() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

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

        $input = json_decode(file_get_contents('php://input'), true);
        $errors = [];

        // --- SANITIZACIÓN ---
        $cleanName = isset($input['name']) ? $this->sanitizeName($input['name']) : '';
        // --------------------

        if (empty($cleanName)) {
            $errors['name'] = 'El nombre de la empresa es obligatorio.';
        }

        if (!empty($errors)) {
            http_response_code(422); 
            echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $errors]);
            return;
        }

        try {
            $clientModel = new Client();
            
            // GENERACIÓN AUTOMÁTICA DE REFERENCIA
            $generatedReference = $clientModel->generateNextReference();

            $newClientId = $clientModel->create([
                'name'       => $cleanName,
                'reference'  => $generatedReference,
                'is_active'  => isset($input['is_active']) ? (int)$input['is_active'] : 1,
                'created_by' => $_SESSION['user_id']
            ]);

            AuditLogger::log('cliente_creado', 'client', $newClientId, null, [
                'nombre'     => $cleanName,
                'referencia' => $generatedReference
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Cliente creado correctamente',
                'data'    => [
                    'id' => $newClientId,
                    'reference' => $generatedReference
                ],
                'errors'  => null
            ]);

        } catch (Exception $e) {
            // ESCUDO ANTI COLISIONES (1062 Duplicate entry)
            if (strpos($e->getMessage(), '1062') !== false && strpos($e->getMessage(), 'reference') !== false) {
                http_response_code(409); 
                echo json_encode([
                    'success' => false,
                    'message' => 'Se ha producido una colisión al generar el código de referencia. Por favor, pulsa en Guardar de nuevo.',
                    'data' => null,
                    'errors' => ['reference' => 'Código duplicado generado automáticamente']
                ]);
                return;
            }

            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno al crear el cliente', 'data' => null, 'errors' => ['server' => 'Error al guardar']]);
        }
    }

    public function update($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Se requiere rol admin o comercial']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba PUT']]);
            return;
        }

        try {
            $id = (int)$id;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            
            $clientModel = new Client();
            
            $clientDetails = $clientModel->getDetailsById($id, $userId, $role);
            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado o sin permisos de edición', 'data' => null, 'errors' => ['client' => 'Recurso inaccesible']]);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $errors = [];

            // --- SANITIZACIÓN ---
            $cleanName = isset($input['name']) ? $this->sanitizeName($input['name']) : '';
            // --------------------

            if (empty($cleanName)) {
                $errors['name'] = 'El nombre es obligatorio.';
            }

            // EL ESCUDO DEL ADMINISTRADOR: Solo el admin puede editar 'reference'
            if ($role === 'admin' && !empty($input['reference'])) {
                if (!preg_match('/^CLI-\d{4}$/', trim($input['reference']))) {
                    $errors['reference'] = 'La referencia debe tener el formato CLI-XXXX (Ej: CLI-0001)';
                }
            } elseif ($role !== 'admin' && isset($input['reference'])) {
                // Bloqueamos el intento de un comercial por cambiar la referencia
                unset($input['reference']);
            }

            if (!empty($errors)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $errors]);
                return;
            }

            $oldData = [
                'name'      => $clientDetails['info']['name'],
                'reference' => $clientDetails['info']['reference'],
                'is_active' => (int)$clientDetails['info']['is_active']
            ];

            $newData = [
                'name'      => $cleanName,
                'reference' => $oldData['reference'], // Por defecto conservamos el antiguo
                'is_active' => isset($input['is_active']) ? (int)$input['is_active'] : $oldData['is_active']
            ];

            // Inyectar la nueva referencia SOLO si pasó el escudo del admin
            if ($role === 'admin' && !empty($input['reference'])) {
                $newData['reference'] = htmlspecialchars(trim($input['reference']), ENT_QUOTES, 'UTF-8');
            }

            $changes = [];
            foreach ($newData as $key => $value) {
                if ($oldData[$key] !== $value) {
                    $changes[$key] = [
                        'antes'   => $oldData[$key],
                        'despues' => $value
                    ];
                }
            }

            try {
                $updated = $clientModel->update($id, $newData);
            } catch (Exception $e) {
                if (strpos($e->getMessage(), '1062') !== false && strpos($e->getMessage(), 'reference') !== false) {
                    http_response_code(409); 
                    echo json_encode(['success' => false, 'message' => 'El código de referencia introducido ya pertenece a otro cliente.', 'data' => null, 'errors' => ['reference' => 'Código duplicado']]);
                    return;
                }
                throw $e; 
            }

            if ($updated) {
                if (!empty($changes)) {
                    $actionKey = 'cliente_actualizado';
                    if (isset($changes['is_active'])) {
                        $actionKey = ($newData['is_active'] === 0) ? 'cliente_desactivado' : 'cliente_reactivado';
                    }
                    AuditLogger::log($actionKey, 'client', $id, null, ['cambios' => $changes]);
                }

                echo json_encode(['success' => true, 'message' => 'Cliente actualizado correctamente', 'data' => ['id' => $id], 'errors' => null]);
            } else {
                throw new Exception("No se pudo actualizar el registro en la base de datos");
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno al actualizar el cliente', 'data' => null, 'errors' => ['server' => 'Error de actualización']]);
        }
    }

    public function destroy($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Se requiere rol admin o comercial']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba DELETE']]);
            return;
        }

        try {
            $id = (int)$id;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            
            $clientModel = new Client();
            
            $clientDetails = $clientModel->getDetailsById($id, $userId, $role);
            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado o sin permisos de borrado', 'data' => null, 'errors' => ['client' => 'Recurso inaccesible']]);
                return;
            }

            $deleted = $clientModel->delete($id);

            if ($deleted) {
                AuditLogger::log('cliente_eliminado', 'client', $id);
                echo json_encode(['success' => true, 'message' => 'Cliente eliminado correctamente', 'data' => ['id' => $id], 'errors' => null]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'El cliente no se pudo eliminar o ya estaba borrado', 'data' => null, 'errors' => null]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno al eliminar el cliente', 'data' => null, 'errors' => ['server' => 'Error al borrar']]);
        }
    }

    /** Helper privado para limpiar y formatear nombres */
    private function sanitizeName($name) {
        if (empty($name)) return '';
        $name = trim($name);
        $name = preg_replace('/\s+/', ' ', $name);
        $name = mb_convert_case($name, MB_CASE_TITLE, "UTF-8");
        return htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    }
}