<?php
// app/Controllers/ProjectController.php

require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php'; 
require_once APP_PATH . '/Helpers/PaginationHelper.php';

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
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error interno'] ]);
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
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    public function assignUser($projectId, $userId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Privilegios insuficientes']]);
            return;
        }

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

            if ($projectDetails['status'] === 'cerrado') {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Proyecto cerrado', 'data' => null, 'errors' => ['status' => 'No se puede asignar personal.']]);
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
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno al asignar', 'data' => null, 'errors' => ['server' => 'Error al asignar']]);
        }
    }

    public function removeUser($projectId, $userId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Privilegios insuficientes.']]);
            return;
        }

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

            if ($projectDetails['status'] === 'cerrado') {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Proyecto cerrado', 'data' => null, 'errors' => ['status' => 'No se puede desasignar personal.']]);
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
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error de desasignación']]);
        }
    }

    public function getAvailableUsers($projectId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Privilegios insuficientes']]);
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
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    public function store()
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Los clientes no pueden crear proyectos']]);
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
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al crear']]);
        }
    }

    public function update($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Privilegios insuficientes']]);
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

            if ($projectDetails['status'] === 'cerrado') {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Proyecto cerrado.', 'data' => null, 'errors' => ['status' => 'No se puede editar.']]);
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
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar', 'data' => null, 'errors' => ['server' => 'Error interno']]);
        }
    }

    public function changeStatus($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Privilegios insuficientes']]);
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

            $allowedTransitions = [
                'propuesta' => ['aprobado'],         
                'aprobado'  => ['ejecucion'],        
                'ejecucion' => ['cerrado'],          
                'cerrado'   => ['propuesta'] 
            ];

            if (!isset($allowedTransitions[$oldStatus]) || !in_array($newStatus, $allowedTransitions[$oldStatus])) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Transición no permitida', 'data' => null, 'errors' => ['status' => "No puedes pasar de $oldStatus a $newStatus"]]);
                return;
            }

            $projectModel->updateStatus($id, $newStatus, $userId, $reason);

            $actionKey = ($oldStatus === 'cerrado') ? 'proyecto_reabierto' : 'proyecto_cambio_estado';

            AuditLogger::log($actionKey, 'project', $id, $id, [
                'estado_anterior' => $oldStatus,
                'estado_nuevo'    => $newStatus,
                'motivo'          => $reason
            ]);

            // --- INYECCIÓN DE NOTIFICACIÓN DE ESTADO ---
            require_once APP_PATH . '/Services/NotificationService.php';
            NotificationService::queueProjectEvent($id, 'cambio_estado', $userId, [
                'nuevo_estado' => $newStatus
            ]);
            // -------------------------------------------

            echo json_encode(['success' => true, 'message' => 'Estado actualizado y registrado', 'data' => ['status' => $newStatus], 'errors' => null]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error al cambiar estado']]);
        }
    }

    public function approve($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            return;
        }

        if ($_SESSION['role'] === 'comercial') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Los comerciales no pueden realizar la aprobación formal.']]);
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

            if ($projectDetails['status'] !== 'propuesta') {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Proyecto no en fase de propuesta.', 'data' => null, 'errors' => ['status' => 'Ya ha sido aprobado.']]);
                return;
            }

            // --- Verificar si hay al menos un documento ---
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
            // ----------------------------------------------------------------------

            $projectModel->updateStatus($id, 'aprobado', $userId, 'Aprobación formal por doble confirmación.');

            AuditLogger::log('propuesta_aprobada', 'project', $id, $id, [
                'aprobado_por_usuario_id' => $userId,
                'rol_aprobador'           => $role,
                'ip_aprobacion'           => $_SERVER['REMOTE_ADDR'] ?? 'Desconocida',
                'estado_anterior'         => 'propuesta',
                'nuevo_estado'            => 'aprobado'
            ]);

            // --- INYECCIÓN DE NOTIFICACIÓN DE APROBACIÓN ---
            require_once APP_PATH . '/Services/NotificationService.php';
            NotificationService::queueProjectEvent($id, 'propuesta_aprobada', $userId);
            // -----------------------------------------------

            echo json_encode(['success' => true, 'message' => 'Proyecto aprobado correctamente.', 'data' => ['status' => 'aprobado'], 'errors' => null]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno', 'data' => null, 'errors' => ['server' => 'Error de servidor']]);
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