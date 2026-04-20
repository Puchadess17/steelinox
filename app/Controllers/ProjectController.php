<?php
// app/Controllers/ProjectController.php

require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Policies/ProjectPolicy.php';
require_once APP_PATH . '/Services/AuditLogger.php'; 
require_once APP_PATH . '/Helpers/PaginationHelper.php';
require_once APP_PATH . '/Services/ErrorLogger.php';
require_once APP_PATH . '/Requests/ProjectRequest.php';

class ProjectController
{

    public function search()
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba una petición GET']]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            [$page, $limit, $offset] = PaginationHelper::getParams();

            $allowedSortColumns = ['client_name', 'name', 'reference', 'commercials_count', 'created_at'];
            $sortBy = isset($_GET['sort_by']) ? trim($_GET['sort_by']) : 'created_at';
            $sortDir = isset($_GET['sort_dir']) ? strtoupper(trim($_GET['sort_dir'])) : 'DESC';
            
            $filters = [
                'search'   => isset($_GET['search']) ? htmlspecialchars(trim($_GET['search']), ENT_QUOTES, 'UTF-8') : null,
                'status'   => isset($_GET['status']) ? htmlspecialchars(trim($_GET['status']), ENT_QUOTES, 'UTF-8') : 'all',
                'sort_by'  => in_array($sortBy, $allowedSortColumns) ? $sortBy : 'created_at',
                'sort_dir' => in_array($sortDir, ['ASC', 'DESC']) ? $sortDir : 'DESC'
            ];
            
            $projectModel = new Project();
            $result = $projectModel->getListByUser($userId, $role, $clientId, $limit, $offset, $filters);

            echo json_encode([
                'success'    => true,
                'message'    => 'Proyectos recuperados correctamente',
                'data'       => $result['data'],
                'pagination' => PaginationHelper::format($result['total'], $limit, $page),
                'errors'     => null
            ]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::search');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno'] ]);
        }
    }

    public function show($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
            return;
        }

        try {
            $id = (int)$id;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $proyecto = $projectModel->getById($id, $userId, $role, $clientId);

            if (!$proyecto) {
                http_response_code(404); 
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos', 'data' => null, 'errors' => ['project' => 'Recurso inaccesible']]);
                return;
            }

            echo json_encode(['success' => true, 'message' => 'Detalle del proyecto', 'data' => $proyecto, 'errors' => null]);
            
        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::show');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno'] ]);
        }
    }

    public function getAssignedUsers($projectId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
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
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Recurso inaccesible']]);
                return;
            }

            $assignedUsers = $projectModel->getAssignedUsers($projectId);

            echo json_encode(['success' => true, 'message' => 'Usuarios asignados recuperados', 'data' => $assignedUsers, 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::getAssignedUsers');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    public function assignUser($projectId, $userId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba POST']]);
            return;
        }

        try {
            $projectId = (int)$projectId;
            $userId = (int)$userId;
            $actorUserId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($projectId, $actorUserId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Recurso inaccesible']]);
                return;
            }

            if (!ProjectPolicy::canManageUsers($role, $projectDetails['status'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No permitido', 'data' => null, 'errors' => ['policy' => 'Operación no permitida por políticas de seguridad.']]);
                return;
            }

            $added = $projectModel->assignUser($projectId, $userId);

            if ($added) {
                require_once APP_PATH . '/Models/User.php';
                $uModel = new User();
                $comercialData = $uModel->findByIdWithInactive($userId);
                $nombreComercial = $comercialData ? $comercialData['name'] : 'Desconocido';

                AuditLogger::log('proyecto_comercial_asignado', 'project', $projectId, $projectId, [
                    'usuario_asignado_id' => $userId,
                    'nombre_comercial'    => $nombreComercial
                ]);

                echo json_encode(['success' => true, 'message' => 'Usuario asignado', 'data' => ['project_id' => $projectId, 'user_id' => $userId], 'errors' => null]);
            } else {
                throw new Exception("Error base de datos.");
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::assignUser');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al asignar']]);
        }
    }

    public function removeUser($projectId, $userId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba DELETE']]);
            return;
        }

        try {
            $projectId = (int)$projectId;
            $userId = (int)$userId;
            $actorUserId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($projectId, $actorUserId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Recurso inaccesible']]);
                return;
            }

            if (!ProjectPolicy::canRemoveUsers($role, $projectDetails['status'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No permitido', 'data' => null, 'errors' => ['policy' => 'Operación no permitida por políticas de seguridad.']]);
                return;
            }

            $removed = $projectModel->removeUser($projectId, $userId);

            if ($removed) {
                require_once APP_PATH . '/Models/User.php';
                $uModel = new User();
                $comercialData = $uModel->findByIdWithInactive($userId);
                $nombreComercial = $comercialData ? $comercialData['name'] : 'Desconocido';

                AuditLogger::log('proyecto_comercial_removido', 'project', $projectId, $projectId, [
                    'usuario_removido_id' => $userId,
                    'nombre_comercial'    => $nombreComercial 
                ]);

                echo json_encode(['success' => true, 'message' => 'Comercial desasignado', 'data' => null, 'errors' => null]);
            } else {
                throw new Exception("Error de base de datos.");
            }

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::removeUser');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error de desasignación']]);
        }
    }

    public function getAvailableUsers($projectId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!ProjectPolicy::canViewAvailableUsers($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Operación no permitida.']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba GET']]);
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
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Recurso inaccesible']]);
                return;
            }

            require_once APP_PATH . '/Models/User.php';
            $userModel = new User();
            $availableUsers = $userModel->getAvailableForProject($projectId);

            echo json_encode(['success' => true, 'message' => 'Usuarios recuperados', 'data' => $availableUsers, 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::getAvailableUsers');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }


    public function store()
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!ProjectPolicy::canCreate($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Los clientes no pueden crear proyectos']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido', 'data' => null, 'errors' => ['method' => 'Se esperaba POST']]);
            return;
        }

        // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
        $request = new ProjectRequest();

        if (!$request->validateStore()) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Faltan campos obligatorios', 'data' => null, 'errors' => $request->errors()]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];

            require_once APP_PATH . '/Models/Client.php';
            $clientModel = new Client();
            $clientDetails = $clientModel->getDetailsById((int)$request->input('client_id'), $userId, $role);

            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado', 'data' => null, 'errors' => ['client_id' => 'Sin permisos']]);
                return;
            }

            $projectModel = new Project();
            $generatedReference = $projectModel->generateNextReference();

            $dataToInsert = [
                'client_id'     => (int)$request->input('client_id'),
                'name'          => $request->sanitizeName($request->input('name')),
                'reference'     => $generatedReference,
                'status'        => htmlspecialchars(trim($request->input('status', 'propuesta')), ENT_QUOTES, 'UTF-8'),
                'budget_amount' => (float)$request->input('budget_amount'),
                'description'   => htmlspecialchars(trim($request->input('description', '')), ENT_QUOTES, 'UTF-8') ?: null,
                'surface'       => htmlspecialchars(trim($request->input('surface', '')), ENT_QUOTES, 'UTF-8') ?: null,
                'project_type'  => htmlspecialchars(trim($request->input('project_type')), ENT_QUOTES, 'UTF-8'),
                'created_by'    => $userId
            ];

            $newProjectId = $projectModel->createWithAutoAssign($dataToInsert, $userId, $role);

            AuditLogger::log('proyecto_creado', 'project', $newProjectId, $newProjectId, [
                'nombre'     => $dataToInsert['name'],
                'referencia' => $dataToInsert['reference'],
                'cliente'    => $clientDetails['info']['name'],
                'estado'     => $dataToInsert['status']
            ]);

            echo json_encode(['success' => true, 'message' => 'Proyecto creado', 'data' => ['id' => $newProjectId, 'reference' => $generatedReference], 'errors' => null]);

        } catch (Exception $e) {
            if (strpos($e->getMessage(), '1062') !== false && strpos($e->getMessage(), 'reference') !== false) {
                http_response_code(409); 
                echo json_encode(['success' => false, 'message' => 'Colisión al generar código.', 'data' => null, 'errors' => ['reference' => 'Código duplicado']]);
                return;
            }
            ErrorLogger::log($e->getMessage(), 'ProjectController::store');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al crear']]);
        }
    }

    public function update($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            return;
        }

        try {
            $id = (int)$id;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();

            $projectDetails = $projectModel->getById($id, $userId, $role, $clientId);
            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            if (!ProjectPolicy::canEdit($role, $projectDetails['status'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No permitido.', 'data' => null, 'errors' => ['policy' => 'No puedes editar el proyecto en este estado.']]);
                return;
            }

            // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
            $request = new ProjectRequest();
            if (!$request->validateUpdate($role)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Faltan campos', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            $newData = [];
            if ($request->input('name') !== null) {
                $newData['name'] = $request->sanitizeName($request->input('name'));
            }
            if ($request->input('budget_amount') !== null) {
                $newData['budget_amount'] = (float)$request->input('budget_amount');
            }
            if ($request->input('description') !== null) {
                $newData['description'] = htmlspecialchars(trim($request->input('description')), ENT_QUOTES, 'UTF-8') ?: null;
            }
            if ($request->input('surface') !== null) {
                $newData['surface'] = htmlspecialchars(trim($request->input('surface')), ENT_QUOTES, 'UTF-8') ?: null;
            }
            if ($request->input('project_type') !== null) {
                $newData['project_type'] = htmlspecialchars(trim($request->input('project_type')), ENT_QUOTES, 'UTF-8');
            }
            if ($role === 'admin' && !empty($request->input('reference'))) {
                $newData['reference'] = htmlspecialchars(trim($request->input('reference')), ENT_QUOTES, 'UTF-8');
            }

            $changes = [];
            foreach ($newData as $key => $newValue) {
                $oldValue = $projectDetails[$key] ?? null;
                if ((string)$oldValue !== (string)$newValue) {
                    $changes[$key] = [
                        'antes'   => $oldValue,
                        'despues' => $newValue
                    ];
                }
            }

            try {
                if (!empty($newData)) {
                    $projectModel->update($id, $newData);
                }
            } catch (Exception $e) {
                if (strpos($e->getMessage(), '1062') !== false && strpos($e->getMessage(), 'reference') !== false) {
                    http_response_code(409); 
                    echo json_encode(['success' => false, 'message' => 'El código ya existe.', 'data' => null, 'errors' => ['reference' => 'Código duplicado']]);
                    return;
                }
                throw $e; 
            }

            if (!empty($changes)) {
                AuditLogger::log('proyecto_actualizado', 'project', $id, $id, ['cambios' => $changes]);
            }

            echo json_encode(['success' => true, 'message' => 'Proyecto actualizado', 'data' => ['id' => $id], 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::update');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al actualizar']]);
        }
    }

    public function destroy($id) {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            return;
        }

        try {
            $id = (int)$id;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();

            $projectDetails = $projectModel->getById($id, $userId, $role, $clientId);
            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            if (!ProjectPolicy::canDelete($role, $projectDetails['status'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No permitido.', 'data' => null, 'errors' => ['policy' => 'No tienes permisos para eliminar proyectos.']]);
                return;
            }

            $projectModel->delete($id);

            AuditLogger::log('proyecto_eliminado', 'project', $id, $id, [
                'nombre'     => $projectDetails['name'],
                'referencia' => $projectDetails['reference']
            ]);

            echo json_encode(['success' => true, 'message' => 'Proyecto eliminado', 'data' => null, 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::destroy');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al eliminar']]);
        }
    }

    public function changeStatus($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if (!ProjectPolicy::canChangeStatus($_SESSION['role'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Operación no permitida.']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            return;
        }

        try {
            $id = (int)$id;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();

            $projectDetails = $projectModel->getById($id, $userId, $role, $clientId);
            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            $oldStatus = $projectDetails['status'] ?? 'desconocido';

            // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
            $request = new ProjectRequest();
            if (!$request->validateStatusChange($oldStatus)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $request->errors()]);
                return;
            }

            $newStatus = trim($request->input('status'));
            $reason = trim($request->input('reason'));

            if ($newStatus === 'aprobado' && !ProjectPolicy::canApprove($role, $oldStatus)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'No tienes permisos para aprobar propuestas de forma directa.']]);
                return;
            }

            $projectModel->updateStatus($id, $newStatus, $userId, $reason);

            $actionKey = ($oldStatus === 'cerrado') ? 'proyecto_reabierto' : 'proyecto_cambio_estado';

            AuditLogger::log($actionKey, 'project', $id, $id, [
                'previous_status'   => $oldStatus,
                'new_status'        => $newStatus,
                'reason'            => $reason,
                'project_name'      => $projectDetails['name'],
                'project_reference' => $projectDetails['reference']
            ]);

            require_once APP_PATH . '/Services/NotificationService.php';
            NotificationService::queueProjectEvent($id, 'cambio_estado', $userId, [
                'nuevo_estado' => $newStatus
            ]);

            echo json_encode(['success' => true, 'message' => 'Estado actualizado y registrado', 'data' => ['status' => $newStatus], 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::changeStatus');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al cambiar estado']]);
        }
    }

    public function requestApproval($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            return;
        }

        if (!ProjectPolicy::canApprove($_SESSION['role'], 'propuesta')) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'No tienes permisos para realizar la aprobación.']]);
            return;
        }

        try {
            $id = (int)$id;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($id, $userId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            if (!ProjectPolicy::canApprove($role, $projectDetails['status'])) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Proyecto no en fase de propuesta.', 'data' => null, 'errors' => ['policy' => 'Ya ha sido aprobado o no es válido.']]);
                return;
            }

            $db = Database::getInstance()->getConnection();
            $stmtDoc = $db->prepare("SELECT COUNT(*) FROM documents WHERE project_id = ? AND deleted_at IS NULL AND (type = 'propuesta' OR type = 'presupuesto')");
            $stmtDoc->execute([$id]);
            
            if ($stmtDoc->fetchColumn() == 0) {
                http_response_code(422);
                echo json_encode([
                    'success' => false, 
                    'message' => 'No se puede aprobar el proyecto.', 
                    'data'    => null, 
                    'errors'  => ['document' => 'No hay ninguna propuesta o presupuesto subido para aprobar.']
                ]);
                return;
            }

            // GENERACIÓN DE TOKEN CRIPTOGRÁFICO DE ALTA SEGURIDAD (48 Caracteres)
            $token = bin2hex(random_bytes(24)); 
            
            $stmt = $db->prepare("UPDATE projects SET approval_token = ?, approval_token_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?");
            $stmt->execute([$token, $id]);

            require_once APP_PATH . '/Models/User.php';
            $uModel = new User();
            $userData = $uModel->findByIdWithInactive($userId);
            $userEmail = $userData['email'];

            $subject = "Token de seguridad - Aprobación de Proyecto";
            
            // EMAIL ADAPTADO PARA CADENAS LARGAS (Añadido font-family monospace y word-break)
            $body = "<div style='font-family: Arial, sans-serif; color: #333;'>";
            $body .= "<h2 style='color: #0056b3;'>Autorización Requerida</h2>";
            $body .= "<p>Has solicitado aprobar el proyecto <strong>" . $projectDetails['reference'] . "</strong>.</p>";
            $body .= "<p>Copia y pega el siguiente token criptográfico de seguridad en la plataforma:</p>";
            $body .= "<div style='font-size: 16px; font-family: monospace; word-break: break-all; font-weight: bold; background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; display: block; border: 1px solid #ddd; text-align: center; letter-spacing: 1px;'>" . $token . "</div>";
            $body .= "<p><em>Por motivos de seguridad, este token caducará en exactamente 10 minutos.</em></p></div>";

            $stmtQ = $db->prepare("INSERT INTO notifications_queue (recipient_user_id, event_type, recipient_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $stmtQ->execute([$userId, 'codigo_aprobacion', $userEmail, $subject, $body]);

            echo json_encode(['success' => true, 'message' => 'Token criptográfico enviado al email.', 'data' => null, 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::requestApproval');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al solicitar aprobación']]);
        }
    }

    public function confirmApproval($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            return;
        }

        if (!ProjectPolicy::canApprove($_SESSION['role'], 'propuesta')) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['policy' => 'Privilegios insuficientes.']]);
            return;
        }

        // --- DELEGAMOS LA VALIDACIÓN AL REQUEST ---
        $request = new ProjectRequest();
        if (!$request->validateApprovalConfirm()) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Código requerido', 'data' => null, 'errors' => $request->errors()]);
            return;
        }

        try {
            $id = (int)$id;
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $projectDetails = $projectModel->getById($id, $userId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            if (!ProjectPolicy::canApprove($role, $projectDetails['status'])) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Proyecto no en fase de propuesta.', 'data' => null, 'errors' => ['policy' => 'Ya ha sido aprobado o no está en propuesta.']]);
                return;
            }

            $tokenInput = trim($request->input('token'));

            if (empty($projectDetails['approval_token']) || $projectDetails['approval_token'] !== $tokenInput) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Código incorrecto', 'data' => null, 'errors' => ['token' => 'El código de seguridad no es válido.']]);
                return;
            }

            if (strtotime($projectDetails['approval_token_expires_at']) < time()) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Código expirado', 'data' => null, 'errors' => ['token' => 'El código ha caducado. Solicita uno nuevo.']]);
                return;
            }

            $projectModel->updateStatus($id, 'aprobado', $userId, 'Aprobación formal por doble confirmación con código de seguridad (2FA).');

            $db = Database::getInstance()->getConnection();
            $db->prepare("UPDATE projects SET approval_token = NULL, approval_token_expires_at = NULL WHERE id = ?")->execute([$id]);

            AuditLogger::log('propuesta_aprobada', 'project', $id, $id, [
                'actor_user_id'     => $userId,
                'actor_role'        => $role,
                'ip_address'        => $_SERVER['REMOTE_ADDR'] ?? 'Desconocida',
                'previous_status'   => 'propuesta',
                'new_status'        => 'aprobado',
                'method'            => 'token_2fa',
                'project_name'      => $projectDetails['name'],
                'project_reference' => $projectDetails['reference']
            ]);

            require_once APP_PATH . '/Services/NotificationService.php';
            NotificationService::queueProjectEvent($id, 'propuesta_aprobada', $userId);

            echo json_encode(['success' => true, 'message' => 'Proyecto aprobado correctamente.', 'data' => ['status' => 'aprobado'], 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::confirmApproval');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error de servidor']]);
        }
    }
}