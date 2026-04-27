<?php
// app/Controllers/ClientController.php

/**
 * CLIENT CONTROLLER (GESTIÓN DE EMPRESAS CLIENTE)
 * ====================
 * CRUD completo para la entidad Client. Solo accesible por admin y comercial.
 * Cada operación verifica permisos con ClientPolicy antes de ejecutarse.
 * La eliminación es lógica (soft delete) y requiere que el cliente esté
 * previamente desactivado para garantizar integridad referencial.
 */
require_once APP_PATH . '/Models/Client.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Policies/ClientPolicy.php';
require_once APP_PATH . '/Services/AuditLogger.php'; 
require_once APP_PATH . '/Helpers/PaginationHelper.php';
require_once APP_PATH . '/Services/ErrorLogger.php';
require_once APP_PATH . '/Requests/ClientRequest.php';

class ClientController {

    /**
     * LISTADO PAGINADO (GET /api/clients)
     * Devuelve la lista de clientes con KPIs globales y soporte de filtros:
     * búsqueda libre, estado (activo/inactivo) y ordenación configurable.
     */
    public function index() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!ClientPolicy::canManage($_SESSION['role'])) {
            http_response_code(403); 
            echo json_encode(['success' => false, 'message' => 'Acceso denegado.', 'data' => null, 'errors' => ['role' => 'Operación no permitida por políticas de seguridad.']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role   = $_SESSION['role'];

            [$page, $limit, $offset] = PaginationHelper::getParams();

            // Sanitización de todos los parámetros de query string antes de pasarlos al Modelo
            $filters = [
                'search'   => isset($_GET['search'])   ? htmlspecialchars(trim($_GET['search']),   ENT_QUOTES, 'UTF-8') : null,
                'status'   => isset($_GET['status'])   ? htmlspecialchars(trim($_GET['status']),   ENT_QUOTES, 'UTF-8') : 'all',
                'sort_by'  => isset($_GET['sort_by'])  ? htmlspecialchars(trim($_GET['sort_by']),  ENT_QUOTES, 'UTF-8') : 'created_at',
                'sort_dir' => isset($_GET['sort_dir']) ? htmlspecialchars(trim($_GET['sort_dir']), ENT_QUOTES, 'UTF-8') : 'desc'
            ];

            $clientModel = new Client();
            $result = $clientModel->getListByUser($userId, $role, $limit, $offset, $filters);

            echo json_encode([
                'success'    => true, 
                'message'    => 'Listado de clientes recuperado', 
                'data'       => ['list' => $result['data'], 'kpis' => $result['kpis']], 
                'pagination' => PaginationHelper::format($result['total'], $limit, $page),
                'errors'     => null
            ]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ClientController::index');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al recuperar los clientes']]);
        }
    }

    /**
     * DETALLE DE CLIENTE (GET /api/clients/{id})
     * Devuelve toda la información de un cliente: ficha, usuarios, proyectos y KPIs.
     */
    public function show($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!ClientPolicy::canManage($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Operación no permitida.']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        try {
            $clientModel   = new Client();
            $clientDetails = $clientModel->getDetailsById((int)$id, $_SESSION['user_id'], $_SESSION['role']);

            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado o sin permisos', 'data' => null, 'errors' => ['client' => 'Recurso inaccesible']]);
                return;
            }

            echo json_encode(['success' => true, 'message' => 'Detalle del cliente recuperado', 'data' => $clientDetails, 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ClientController::show');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al recuperar el cliente']]);
        }
    }

    /**
     * CREACIÓN DE CLIENTE (POST /api/clients)
     * Genera automáticamente la referencia siguiente (CLI-XXXX) en el Modelo.
     * Detecta colisiones de referencia (error 1062) y responde con 409 Conflict.
     */
    public function store() {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!ClientPolicy::canManage($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Operación no permitida.']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba POST']]);
            return;
        }

        $request = new ClientRequest();
        if (!$request->validateStore()) {
            http_response_code(422); 
            echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
            return;
        }

        try {
            $clientModel       = new Client();
            $generatedReference = $clientModel->generateNextReference();
            $cleanName         = $request->sanitizeName($request->input('name'));

            $newClientId = $clientModel->create([
                'name'       => $cleanName,
                'reference'  => $generatedReference,
                'is_active'  => $request->input('is_active') !== null ? (int)$request->input('is_active') : 1,
                'created_by' => $_SESSION['user_id']
            ]);

            AuditLogger::log('cliente_creado', 'client', $newClientId, null, [
                'nombre'     => $cleanName,
                'referencia' => $generatedReference
            ]);

            echo json_encode(['success' => true, 'message' => 'Cliente creado correctamente', 'data' => ['id' => $newClientId, 'reference' => $generatedReference], 'errors' => null]);

        } catch (Exception $e) {
            // 1062 = Duplicate entry: la referencia generada ya existe (colisión de secuencia)
            if (strpos($e->getMessage(), '1062') !== false && strpos($e->getMessage(), 'reference') !== false) {
                http_response_code(409); 
                echo json_encode(['success' => false, 'message' => 'Se ha producido una colisión al generar el código.', 'data' => null, 'errors' => ['reference' => 'Código duplicado generado automáticamente']]);
                return;
            }

            ErrorLogger::log($e->getMessage(), 'ClientController::store');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al guardar']]);
        }
    }

    /**
     * EDICIÓN DE CLIENTE (PUT /api/clients/{id})
     * Aplica lógica de auditoría diferencial: solo registra los campos que cambian.
     * Impide desactivar un cliente con proyectos activos (protección de integridad).
     * El admin puede cambiar la referencia si cumple el formato CLI-XXXX.
     */
    public function update($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!ClientPolicy::canManage($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Operación no permitida.']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba PUT']]);
            return;
        }

        try {
            $id     = (int)$id;
            $userId = $_SESSION['user_id'];
            $role   = $_SESSION['role'];
            
            $clientModel   = new Client();
            $clientDetails = $clientModel->getDetailsById($id, $userId, $role);
            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado o sin permisos', 'data' => null, 'errors' => ['client' => 'Recurso inaccesible']]);
                return;
            }

            $request = new ClientRequest();
            if (!$request->validateUpdate($role)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            $oldData = [
                'name'      => $clientDetails['info']['name'],
                'reference' => $clientDetails['info']['reference'],
                'is_active' => (int)$clientDetails['info']['is_active']
            ];

            $newData = [
                'name'      => $request->input('name') !== null ? $request->sanitizeName($request->input('name')) : $oldData['name'],
                'reference' => $oldData['reference'],
                'is_active' => $request->input('is_active') !== null ? (int)$request->input('is_active') : $oldData['is_active']
            ];

            // Bloquea la desactivación si tiene proyectos activos (integridad referencial)
            if ($oldData['is_active'] === 1 && $newData['is_active'] === 0) {
                if ($clientModel->hasActiveProjects($id)) {
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'No se puede desactivar la empresa.', 'data' => null, 'errors' => ['is_active' => 'El cliente tiene proyectos activos. Ciérralos primero.']]);
                    return;
                }
            }

            // Solo el admin puede cambiar la referencia manualmente
            if ($role === 'admin' && !empty($request->input('reference'))) {
                $newData['reference'] = htmlspecialchars(trim($request->input('reference')), ENT_QUOTES, 'UTF-8');
            }

            // Auditoría diferencial: captura solo los campos que cambiaron
            $changes = [];
            foreach ($newData as $key => $value) {
                if ($oldData[$key] !== $value) {
                    $changes[$key] = ['antes' => $oldData[$key], 'despues' => $value];
                }
            }

            try {
                $updated = $clientModel->update($id, $newData);
            } catch (Exception $e) {
                if (strpos($e->getMessage(), '1062') !== false && strpos($e->getMessage(), 'reference') !== false) {
                    http_response_code(409); 
                    echo json_encode(['success' => false, 'message' => 'El código introducido ya pertenece a otro cliente.', 'data' => null, 'errors' => ['reference' => 'Código duplicado']]);
                    return;
                }
                throw $e; 
            }

            if ($updated) {
                if (!empty($changes)) {
                    // Personaliza la acción de auditoría según si se activó o desactivó el cliente
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
            ErrorLogger::log($e->getMessage(), 'ClientController::update');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error de actualización']]);
        }
    }

    /**
     * BORRADO LÓGICO (DELETE /api/clients/{id})
     * Solo se puede eliminar un cliente previamente desactivado (is_active = 0).
     * Esta restricción garantiza que no queden proyectos activos huérfanos.
     */
    public function destroy($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!ClientPolicy::canDelete($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Operación no permitida.']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba DELETE']]);
            return;
        }

        try {
            $clientModel   = new Client();
            $clientDetails = $clientModel->getDetailsById((int)$id, $_SESSION['user_id'], $_SESSION['role']);
            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado o sin permisos de borrado', 'data' => null, 'errors' => ['client' => 'Recurso inaccesible']]);
                return;
            }

            // Regla de negocio: el cliente debe estar desactivado antes de poder eliminarse
            if ((int)$clientDetails['info']['is_active'] === 1) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Operación no permitida.', 'data' => null, 'errors' => ['client' => 'El cliente está activo. Debes desactivarlo primero antes de poder eliminarlo.']]);
                return;
            }

            $deleted = $clientModel->delete((int)$id);

            if ($deleted) {
                AuditLogger::log('cliente_eliminado', 'client', $id);
                echo json_encode(['success' => true, 'message' => 'Cliente eliminado correctamente', 'data' => ['id' => $id], 'errors' => null]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'El cliente no se pudo eliminar o ya estaba borrado', 'data' => null, 'errors' => null]);
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ClientController::destroy');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al borrar']]);
        }
    }
}