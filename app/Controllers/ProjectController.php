<?php
// app/Controllers/ProjectController.php

/**
 * PROJECT CONTROLLER (GESTIÓN DE PROYECTOS / EXPEDIENTES)
 * ====================
 * CRUD completo de proyectos más operaciones especializadas:
 *   - Asignación/desasignación de comerciales (tabla pivote project_user)
 *   - Cambio de estado con validación del mapa de transiciones (DDS §4.3)
 *   - Flujo de aprobación con 2FA de código OTP de 6 dígitos:
 *       PASO 1: requestApproval → genera token y lo envía por email
 *       PASO 2: confirmApproval → verifica hash, aplica rate limiting (3 intentos)
 * La referencia del proyecto (PRJ-AAAA-XXXX) se genera de forma atómica
 * en el Modelo con retry automático para evitar colisiones en alta concurrencia.
 */
require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Policies/ProjectPolicy.php';
require_once APP_PATH . '/Services/AuditLogger.php';
require_once APP_PATH . '/Helpers/PaginationHelper.php';
require_once APP_PATH . '/Services/ErrorLogger.php';
require_once APP_PATH . '/Requests/ProjectRequest.php';

class ProjectController
{

    /**
     * LISTADO PAGINADO (GET /api/projects)
     * Devuelve proyectos + KPIs por estado. El modelo filtra por rol:
     * cliente ve solo los suyos, comercial los asignados, admin todos.
     * La ordenación se valida contra whitelist para prevenir inyección SQL.
     */
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
                'data'       => [
                    'list' => $result['data'],
                    'kpis' => $result['kpis']
                ],
                'pagination' => PaginationHelper::format($result['total'], $limit, $page),
                'errors'     => null
            ]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::search');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error interno'] ]);
        }
    }

    /**
     * DETALLE DE PROYECTO (GET /api/projects/{id})
     * El modelo aplica restricción de acceso por rol antes de devolver datos.
     */
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

    /**
     * COMERCIALES ASIGNADOS (GET /api/projects/{id}/users)
     * Devuelve el equipo interno con acceso al proyecto.
     */
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

    /**
     * ASIGNAR COMERCIAL (POST /api/projects/{pid}/users/{uid})
     * Vincula un comercial al proyecto vía tabla pivote project_user.
     * Usa INSERT IGNORE en el Modelo para tolerar asignaciones duplicadas.
     */
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

    /**
     * DESASIGNAR COMERCIAL (DELETE /api/projects/{pid}/users/{uid})
     * Elimina la fila de project_user. El proyecto y sus datos permanecen intactos.
     */
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

    /**
     * COMERCIALES DISPONIBLES (GET /api/projects/{id}/available-users)
     * Devuelve comerciales activos que aún no están asignados al proyecto.
     * Exclusivo del administrador (ProjectPolicy::canViewAvailableUsers).
     */
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


    /**
     * CREACIÓN DE PROYECTO (POST /api/projects)
     * Genera la referencia PRJ-AAAA-XXXX atómicamente en el Modelo.
     * Si el actor es comercial, se auto-asigna al proyecto al crearlo.
     * Verifica que el cliente_id pertenece al ámbito del actor.
     */
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

            $dataToInsert = [
                'client_id'     => (int)$request->input('client_id'),
                'name'          => $request->sanitizeName($request->input('name')),
                'status'        => htmlspecialchars(trim($request->input('status', 'propuesta')), ENT_QUOTES, 'UTF-8'),
                'budget_amount' => (float)$request->input('budget_amount'),
                'description'   => htmlspecialchars(trim($request->input('description', '')), ENT_QUOTES, 'UTF-8') ?: null,
                'surface'       => htmlspecialchars(trim($request->input('surface', '')), ENT_QUOTES, 'UTF-8') ?: null,
                'project_type'  => htmlspecialchars(trim($request->input('project_type')), ENT_QUOTES, 'UTF-8'),
                'created_by'    => $userId
            ];

            $result = $projectModel->createWithAutoAssign($dataToInsert, $userId, $role);

            AuditLogger::log('proyecto_creado', 'project', $result['id'], $result['id'], [
                'nombre'     => $dataToInsert['name'],
                'referencia' => $result['reference'],
                'cliente'    => $clientDetails['info']['name'],
                'estado'     => $dataToInsert['status']
            ]);

            echo json_encode(['success' => true, 'message' => 'Proyecto creado', 'data' => ['id' => $result['id'], 'reference' => $result['reference']], 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::store');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al crear']]);
        }
    }

    /**
     * EDICIÓN DE PROYECTO (PUT /api/projects/{id})
     * Aplica auditoría diferencial: solo registra los campos que cambian.
     * Detecta colisiones de referencia (error 1062) y responde con 409.
     * El admin puede cambiar la referencia con formato PRJ-AAAA-XXXX.
     */
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

    /**
     * BORRADO LÓGICO (DELETE /api/projects/{id})
     * Solo se puede borrar un proyecto en estado 'cerrado' (DDS §4.3).
     * El Modelo propaga el borrado en cascada a documentos y comentarios.
     */
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

    /**
     * CAMBIO DE ESTADO (PUT /api/projects/{id}/status)
     * Valida la transición contra el mapa del DDS §4.3 (ProjectRequest).
     * La reapertura desde 'cerrado' exige motivo obligatorio.
     * El paso a 'aprobado' no se permite directamente (requiere flujo 2FA).
     * Tras el cambio dispara una notificación al equipo del proyecto.
     */
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

    /**
     * PASO 1 DE APROBACIÓN (POST /api/projects/{id}/approve/request)
     * Genera un código OTP de 6 dígitos, lo hashea con password_hash y
     * guarda el HASH en BD (nunca el plain text). El plain text se envía
     * al email del solicitante. El token expira en 10 minutos.
     * Requiere que haya al menos una propuesta o presupuesto subido.
     */
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

            // Generamos el código legible (6 dígitos)
            $plainToken = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT); 
            
            // Creamos el HASH para la base de datos (Seguridad)
            $hashedToken = password_hash($plainToken, PASSWORD_DEFAULT);
            
            // Guardamos el HASH y reseteamos intentos fallidos
            $stmt = $db->prepare("UPDATE projects SET approval_token = ?, approval_token_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE), approval_failed_attempts = 0 WHERE id = ?");
            $stmt->execute([$hashedToken, $id]);

            // USAMOS EL SERVICIO DE NOTIFICACIONES 
            require_once APP_PATH . '/Services/NotificationService.php';
            NotificationService::queueProjectEvent($id, 'solicitud_aprobacion', $userId, ['token' => $plainToken]);

            require_once APP_PATH . '/Models/User.php';
            $uModel = new User();
            $userData = $uModel->findByIdWithInactive($userId);
            $userEmail = $userData['email'];

            $subject = "Token de seguridad - Aprobación de Proyecto";
            
            // EMAIL ADAPTADO PARA CADENAS LARGAS (Añadido font-family monospace y word-break)
            $body = "<div style='font-family: Arial, sans-serif; color: #333;'>";
            $body .= "<h2 style='color: #0056b3;'>Autorización Requerida</h2>";
            $body .= "<p>Has solicitado aprobar el proyecto <strong>" . $projectDetails['reference'] . "</strong>.</p>";
            $body .= "<p>Introduce el siguiente código de verificación de 6 dígitos en la plataforma:</p>";
            $body .= "<div style='font-size: 32px; font-family: monospace; font-weight: bold; background: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0; display: block; border: 1px solid #ddd; text-align: center; letter-spacing: 10px; color: #E57B23;'>" . $plainToken . "</div>";
            $body .= "<p><em>Por motivos de seguridad, este código caducará en exactamente 10 minutos.</em></p></div>";

            $stmtQ = $db->prepare("INSERT INTO notifications_queue (recipient_user_id, event_type, recipient_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $stmtQ->execute([$userId, 'codigo_aprobacion', $userEmail, $subject, $body]);

            echo json_encode(['success' => true, 'message' => 'Token de seguridad enviado al email.', 'data' => null, 'errors' => null]);

        } catch (Exception $e) {
            ErrorLogger::log($e->getMessage(), 'ProjectController::requestApproval');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor', 'data' => null, 'errors' => ['server' => 'Error al solicitar aprobación']]);
        }
    }

    /**
     * PASO 2 DE APROBACIÓN (POST /api/projects/{id}/approve/confirm)
     * Verifica el OTP con password_verify() contra el hash en BD.
     * Rate limiting: máximo 3 intentos fallidos antes de anular el token.
     * Tras aprobación exitosa: limpia el token, cambia estado y notifica.
     * El log de auditoría incluye IP, rol y método (token_2fa) para trazabilidad.
     */
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

            // --- VALIDACIÓN CON HASH Y RATE LIMITING ---
            $failedAttempts = (int)($projectDetails['approval_failed_attempts'] ?? 0);
            $storedHash = $projectDetails['approval_token'] ?? '';
            $tokenInput = trim($request->input('token'));

            // Bloqueo por fuerza bruta
            if ($failedAttempts >= 3) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Token bloqueado', 'data' => null, 'errors' => ['token' => 'Demasiados intentos. Solicita un nuevo código.']]);
                return;
            }

            // Verificación de caducidad
            if (empty($projectDetails['approval_token_expires_at']) || strtotime($projectDetails['approval_token_expires_at']) < time()) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Código expirado', 'data' => null, 'errors' => ['token' => 'El código ha caducado.']]);
                return;
            }

            $db = Database::getInstance()->getConnection();

            // VERIFICACIÓN DEL HASH 
            if (empty($storedHash) || !password_verify($tokenInput, $storedHash)) {
                $failedAttempts++;
                
                if ($failedAttempts >= 3) {
                    $db->prepare("UPDATE projects SET approval_token = NULL, approval_token_expires_at = NULL, approval_failed_attempts = 0 WHERE id = ?")->execute([$id]);
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Token bloqueado', 'errors' => ['token' => 'Has fallado 3 veces. El token ha sido anulado.']]);
                } else {
                    $db->prepare("UPDATE projects SET approval_failed_attempts = ? WHERE id = ?")->execute([$failedAttempts, $id]);
                    $intentosRestantes = 3 - $failedAttempts;
                    http_response_code(422);
                    echo json_encode(['success' => false, 'message' => 'Código incorrecto', 'errors' => ['token' => "Código no válido. Te quedan $intentosRestantes intentos."]]);
                }
                return;
            }
            // --- FIN VALIDACIÓN ---

            $projectModel->updateStatus($id, 'aprobado', $userId, 'Aprobación formal por doble confirmación con código de seguridad (2FA).');

            $db->prepare("UPDATE projects SET approval_token = NULL, approval_token_expires_at = NULL, approval_failed_attempts = 0 WHERE id = ?")->execute([$id]);

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