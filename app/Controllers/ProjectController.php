<?php
// app/Controllers/ProjectController.php

require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Policies/ProjectPolicy.php';
require_once APP_PATH . '/Services/AuditLogger.php'; 
require_once APP_PATH . '/Helpers/PaginationHelper.php';
require_once APP_PATH . '/Services/ErrorLogger.php';

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

            $filters = [
                'search'   => isset($_GET['search']) ? htmlspecialchars(trim($_GET['search']), ENT_QUOTES, 'UTF-8') : null,
                'status'   => isset($_GET['status']) ? htmlspecialchars(trim($_GET['status']), ENT_QUOTES, 'UTF-8') : 'all',
                'sort_by'  => isset($_GET['sort_by']) ? $_GET['sort_by'] : 'created_at',
                'sort_dir' => isset($_GET['sort_dir']) ? $_GET['sort_dir'] : 'DESC'
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

        $input = json_decode(file_get_contents('php://input'), true);
        $errors = [];

        $cleanName        = isset($input['name']) ? $this->sanitizeName($input['name']) : '';
        $cleanDesc        = isset($input['description']) ? htmlspecialchars(trim($input['description']), ENT_QUOTES, 'UTF-8') : null;
        $cleanSurface     = isset($input['surface']) ? htmlspecialchars(trim($input['surface']), ENT_QUOTES, 'UTF-8') : null;
        $cleanStatus      = isset($input['status']) ? htmlspecialchars(trim($input['status']), ENT_QUOTES, 'UTF-8') : 'propuesta';
        $cleanProjectType = isset($input['project_type']) ? htmlspecialchars(trim($input['project_type']), ENT_QUOTES, 'UTF-8') : '';
        $budgetAmount     = isset($input['budget_amount']) ? trim($input['budget_amount']) : '';

        if (empty($input['client_id'])) {
            $errors['client_id'] = 'El cliente es obligatorio.';
        }
        if (empty($cleanName)) {
            $errors['name'] = 'El nombre del proyecto es obligatorio.';
        }
        if ($cleanProjectType === '') {
            $errors['project_type'] = 'El tipo de proyecto es obligatorio.';
        }
        if ($budgetAmount === '' || !is_numeric($budgetAmount)) {
            $errors['budget_amount'] = 'El presupuesto es obligatorio y debe ser un valor numérico.';
        }

        if (!empty($errors)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Faltan campos obligatorios', 'data' => null, 'errors' => $errors]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];

            require_once APP_PATH . '/Models/Client.php';
            $clientModel = new Client();
            $clientDetails = $clientModel->getDetailsById((int) $input['client_id'], $userId, $role);

            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado', 'data' => null, 'errors' => ['client_id' => 'Sin permisos']]);
                return;
            }

            $projectModel = new Project();
            $generatedReference = $projectModel->generateNextReference();

            $dataToInsert = [
                'client_id'     => (int) $input['client_id'],
                'name'          => $cleanName,
                'reference'     => $generatedReference,
                'status'        => $cleanStatus,
                'budget_amount' => (float) $budgetAmount,
                'description'   => $cleanDesc,
                'surface'       => $cleanSurface,
                'project_type'  => $cleanProjectType,
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

            $input = json_decode(file_get_contents('php://input'), true);
            $errors = [];

            $cleanName        = isset($input['name']) ? $this->sanitizeName($input['name']) : '';
            $cleanDesc        = isset($input['description']) ? htmlspecialchars(trim($input['description']), ENT_QUOTES, 'UTF-8') : null;
            $cleanSurface     = isset($input['surface']) ? htmlspecialchars(trim($input['surface']), ENT_QUOTES, 'UTF-8') : null;
            $cleanProjectType = isset($input['project_type']) ? htmlspecialchars(trim($input['project_type']), ENT_QUOTES, 'UTF-8') : '';
            $budgetAmount     = isset($input['budget_amount']) ? trim($input['budget_amount']) : '';

            if (empty($cleanName)) {
                $errors['name'] = 'El nombre es obligatorio.';
            }
            if ($cleanProjectType === '') {
                $errors['project_type'] = 'El tipo de proyecto es obligatorio.';
            }
            if ($budgetAmount === '' || !is_numeric($budgetAmount)) {
                $errors['budget_amount'] = 'El presupuesto es obligatorio y debe ser un valor numérico.';
            }
            
            if ($role === 'admin' && !empty($input['reference'])) {
                if (!preg_match('/^PRJ-\d{4}-\d{4}$/', trim($input['reference']))) {
                    $errors['reference'] = 'El formato debe ser PRJ-AAAA-XXXX';
                }
            } elseif ($role !== 'admin' && isset($input['reference'])) {
                unset($input['reference']);
            }

            if (!empty($errors)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Faltan campos', 'data' => null, 'errors' => $errors]);
                return;
            }

            $newData = [
                'name'          => $cleanName,
                'budget_amount' => (float) $budgetAmount,
                'description'   => $cleanDesc,
                'surface'       => $cleanSurface,
                'project_type'  => $cleanProjectType
            ];

            if ($role === 'admin' && !empty($input['reference'])) {
                $newData['reference'] = htmlspecialchars(trim($input['reference']), ENT_QUOTES, 'UTF-8');
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
                $projectModel->update($id, $newData);
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

            $input = json_decode(file_get_contents('php://input'), true);
            $newStatus = isset($input['status']) ? htmlspecialchars(trim($input['status']), ENT_QUOTES, 'UTF-8') : null;
            $reason = isset($input['reason']) ? htmlspecialchars(trim($input['reason']), ENT_QUOTES, 'UTF-8') : null;

            $validStatuses = ['propuesta', 'aprobado', 'ejecucion', 'cerrado'];
            if (!in_array($newStatus, $validStatuses)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Estado inválido', 'data' => null, 'errors' => ['status' => 'Estado no reconocido']]);
                return;
            }

            $oldStatus = $projectDetails['status'] ?? 'desconocido';

            if ($oldStatus === $newStatus) {
                http_response_code(422); 
                echo json_encode(['success' => false, 'message' => 'El proyecto ya tiene ese estado.', 'data' => null, 'errors' => ['status' => 'Igual al actual.']]);
                return;
            }

            // --- REGLA DE NEGOCIO ESTRICTA MEDIANTE POLICY ---
            if ($newStatus === 'aprobado' && !ProjectPolicy::canApprove($role, $oldStatus)) {
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Acceso denegado', 
                    'data'    => null, 
                    'errors'  => ['policy' => 'No tienes permisos para aprobar propuestas de forma directa.']
                ]);
                return;
            }

            if ($oldStatus === 'cerrado' && empty($reason)) {
                http_response_code(422);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Motivo requerido', 
                    'data'    => null, 
                    'errors'  => ['reason' => 'Por normativa, es estrictamente obligatorio registrar un motivo para reabrir un proyecto cerrado.']
                ]);
                return;
            }

            $allowedTransitions = [
                'propuesta' => ['aprobado'],         
                'aprobado'  => ['ejecucion'],        
                'ejecucion' => ['cerrado'],          
                'cerrado'   => ['ejecucion', 'propuesta'] 
            ];

            if (!isset($allowedTransitions[$oldStatus]) || !in_array($newStatus, $allowedTransitions[$oldStatus])) {
                http_response_code(422);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Transición no permitida', 
                    'data'    => null, 
                    'errors'  => [
                        'status' => "Normativa de flujo: No se puede pasar directamente de '" . ucfirst($oldStatus) . "' a '" . ucfirst($newStatus) . "'."
                    ]
                ]);
                return;
            }

            $projectModel->updateStatus($id, $newStatus, $userId, $reason);

            $actionKey = ($oldStatus === 'cerrado') ? 'proyecto_reabierto' : 'proyecto_cambio_estado';

            AuditLogger::log($actionKey, 'project', $id, $id, [
                'estado_anterior' => $oldStatus,
                'estado_nuevo'    => $newStatus,
                'motivo'          => $reason
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

            $token = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            
            $stmt = $db->prepare("UPDATE projects SET approval_token = ?, approval_token_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?");
            $stmt->execute([$token, $id]);

            require_once APP_PATH . '/Models/User.php';
            $uModel = new User();
            $userData = $uModel->findByIdWithInactive($userId);
            $userEmail = $userData['email'];

            $subject = "Código de seguridad - Aprobación de Proyecto";
            $body = "<div style='font-family: Arial, sans-serif; color: #333;'>";
            $body .= "<h2 style='color: #0056b3;'>Código de verificación</h2>";
            $body .= "<p>Has solicitado aprobar el proyecto <strong>" . $projectDetails['reference'] . "</strong>.</p>";
            $body .= "<p>Introduce el siguiente código de seguridad de 6 dígitos en la plataforma:</p>";
            $body .= "<div style='font-size: 24px; font-weight: bold; background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; display: inline-block; border: 1px solid #ddd;'>" . $token . "</div>";
            $body .= "<p><em>Este código caducará en 10 minutos.</em></p></div>";

            $stmtQ = $db->prepare("INSERT INTO notifications_queue (recipient_user_id, event_type, recipient_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $stmtQ->execute([$userId, 'codigo_aprobacion', $userEmail, $subject, $body]);

            echo json_encode(['success' => true, 'message' => 'Código de verificación enviado al email.', 'data' => null, 'errors' => null]);

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

        $input = json_decode(file_get_contents('php://input'), true);
        $tokenInput = isset($input['token']) ? trim($input['token']) : null;

        if (empty($tokenInput)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Código requerido', 'data' => null, 'errors' => ['token' => 'El código de seguridad es obligatorio.']]);
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
                'aprobado_por_usuario_id' => $userId,
                'rol_aprobador'           => $role,
                'ip_aprobacion'           => $_SERVER['REMOTE_ADDR'] ?? 'Desconocida',
                'estado_anterior'         => 'propuesta',
                'nuevo_estado'            => 'aprobado',
                'metodo'                  => 'token_2fa'
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

    private function sanitizeName($name) {
        if (empty($name)) return '';
        $name = trim($name);
        $name = preg_replace('/\s+/', ' ', $name);
        $name = mb_convert_case($name, MB_CASE_TITLE, "UTF-8");
        return htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    }
}