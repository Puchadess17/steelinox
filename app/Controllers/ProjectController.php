<?php
// app/Controllers/ProjectController.php

require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php'; 

class ProjectController
{
    public function search()
    {
        AuthMiddleware::check();

        header('Content-Type: application/json; charset=utf-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Método no permitido',
                'data' => null,
                'errors' => ['method' => 'Se esperaba una petición GET']
            ]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();
            $proyectos = $projectModel->getListByUser($userId, $role, $clientId);

            echo json_encode([
                'success' => true,
                'message' => 'Proyectos recuperados correctamente',
                'data' => $proyectos,
                'errors' => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno del servidor al recuperar los proyectos',
                'data' => null,
                'errors' => ['server' => 'Error interno'] // NUNCA DEVOLVEMOS $e->getMessage() EN PRODUCCIÓN
            ]);
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

        // Sanitización del ID de URL
        $id = (int)$id;

        $userId = $_SESSION['user_id'];
        $role = $_SESSION['role'];
        $clientId = $_SESSION['client_id'] ?? null;

        $projectModel = new Project();
        $proyecto = $projectModel->getById($id, $userId, $role, $clientId);

        if (!$proyecto) {
            http_response_code(404); 
            echo json_encode([
                'success' => false,
                'message' => 'Proyecto no encontrado o no tienes permisos para visualizarlo',
                'data' => null,
                'errors' => ['project' => 'Recurso inaccesible']
            ]);
            return;
        }

        echo json_encode([
            'success' => true,
            'message' => 'Detalle del proyecto recuperado correctamente',
            'data' => $proyecto,
            'errors' => null
        ]);
    }

    // Obtener todos los usuarios asignados a un proyecto (GET /api/projects/{projectId}/users)
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

            // Escudo de Autorización
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Proyecto no encontrado o sin permisos',
                    'data' => null,
                    'errors' => ['project' => 'Recurso inaccesible']
                ]);
                return;
            }

            $assignedUsers = $projectModel->getAssignedUsers($projectId);

            echo json_encode([
                'success' => true,
                'message' => 'Usuarios asignados recuperados correctamente',
                'data' => $assignedUsers,
                'errors' => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al recuperar los usuarios asignados',
                'data' => null,
                'errors' => ['server' => 'Error interno']
            ]);
        }
    }

    // Asignar un comercial a un proyecto (POST /api/projects/{projectId}/users/{userId})
    public function assignUser($projectId, $userId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización
        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Solo administradores o comerciales pueden asignar personal']]);
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

            $projectModel = new Project();
            $added = $projectModel->assignUser($projectId, $userId);

            if ($added) {
                AuditLogger::log('proyecto_comercial_asignado', 'project', $projectId, $projectId, [
                    'usuario_asignado_id' => $userId
                ]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Usuario asignado al proyecto correctamente',
                    'data' => ['project_id' => $projectId, 'user_id' => $userId],
                    'errors' => null
                ]);
            } else {
                throw new Exception("No se pudo registrar la asignación en la base de datos.");
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al asignar el usuario',
                'data' => null,
                'errors' => ['server' => 'Error al asignar']
            ]);
        }
    }

    // Eliminar a un comercial de un proyecto (DELETE /api/projects/{projectId}/users/{userId})
    public function removeUser($projectId, $userId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización Estricto
        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Acceso denegado',
                'data' => null,
                'errors' => ['role' => 'Privilegios insuficientes. Solo un administrador puede revocar accesos.']
            ]);
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

            $projectModel = new Project();
            $removed = $projectModel->removeUser($projectId, $userId);

            if ($removed) {
                AuditLogger::log('proyecto_comercial_removido', 'project', $projectId, $projectId, [
                    'usuario_removido_id' => $userId
                ]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Comercial desasignado del proyecto correctamente',
                    'data' => null,
                    'errors' => null
                ]);
            } else {
                throw new Exception("No se pudo ejecutar la desasignación.");
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al desasignar al usuario',
                'data' => null,
                'errors' => ['server' => 'Error de desasignación']
            ]);
        }
    }

    // Obtener usuarios disponibles para añadir a un proyecto (GET /api/projects/{projectId}/available-users)
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

            // Escudo de Autorización
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Recurso inaccesible']]);
                return;
            }

            require_once APP_PATH . '/Models/User.php';
            $userModel = new User();
            $availableUsers = $userModel->getAvailableForProject($projectId);

            echo json_encode([
                'success' => true,
                'message' => 'Usuarios disponibles recuperados correctamente',
                'data' => $availableUsers,
                'errors' => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al recuperar los usuarios disponibles',
                'data' => null,
                'errors' => ['server' => 'Error interno']
            ]);
        }
    }

    // Crear un nuevo proyecto (POST /api/projects)
    public function store()
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización General
        if ($_SESSION['role'] === 'cliente') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado', 'data' => null, 'errors' => ['role' => 'Los clientes no pueden crear proyectos directamente']]);
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
        $cleanDesc = isset($input['description']) ? htmlspecialchars(trim($input['description']), ENT_QUOTES, 'UTF-8') : null;
        $cleanSurface = isset($input['surface']) ? htmlspecialchars(trim($input['surface']), ENT_QUOTES, 'UTF-8') : null;
        $cleanStatus = isset($input['status']) ? htmlspecialchars(trim($input['status']), ENT_QUOTES, 'UTF-8') : 'propuesta';
        $cleanProjectType = isset($input['project_type']) ? htmlspecialchars(trim($input['project_type']), ENT_QUOTES, 'UTF-8') : null;
        // --------------------

        // Validaciones obligatorias (ya no pedimos reference)
        if (empty($input['client_id'])) {
            $errors['client_id'] = 'El cliente es obligatorio.';
        }
        if (empty($cleanName)) {
            $errors['name'] = 'El nombre del proyecto es obligatorio.';
        }

        if (!empty($errors)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $errors]);
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
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado o sin permisos', 'data' => null, 'errors' => ['client_id' => 'No tiene permisos para crear proyectos en este cliente']]);
                return;
            }

            $projectModel = new Project();

            // --- GENERACIÓN SECUENCIAL INTELIGENTE ---
            // Le pedimos al modelo que nos dé el siguiente número libre de este año
            $generatedReference = $projectModel->generateNextReference();
            // -----------------------------------------

            $dataToInsert = [
                'client_id' => (int) $input['client_id'],
                'name' => $cleanName,
                'reference' => $generatedReference,
                'status' => $cleanStatus,
                'budget_amount' => $input['budget_amount'] ?? null,
                'description' => $cleanDesc,
                'surface' => $cleanSurface,
                'project_type' => $cleanProjectType,
                'created_by' => $userId
            ];

            $newProjectId = $projectModel->createWithAutoAssign($dataToInsert, $userId, $role);

            AuditLogger::log('proyecto_creado', 'project', $newProjectId, $newProjectId, [
                'nombre'     => $dataToInsert['name'],
                'referencia' => $dataToInsert['reference'],
                'cliente'    => $clientDetails['info']['name'],
                'estado'     => $dataToInsert['status']
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Proyecto creado correctamente',
                'data' => [
                    'id' => $newProjectId,
                    'reference' => $generatedReference // Le devolvemos el código generado para que Joan lo vea
                ],
                'errors' => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al crear el proyecto',
                'data' => null,
                'errors' => ['server' => 'Error al crear proyecto']
            ]);
        }
    }

    // Actualizar datos de un proyecto (PUT /api/projects/{id})
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
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $errors = [];

            // --- SANITIZACIÓN ---
            $cleanName = isset($input['name']) ? $this->sanitizeName($input['name']) : '';
            $cleanDesc = isset($input['description']) ? htmlspecialchars(trim($input['description']), ENT_QUOTES, 'UTF-8') : null;
            $cleanSurface = isset($input['surface']) ? htmlspecialchars(trim($input['surface']), ENT_QUOTES, 'UTF-8') : null;
            $cleanProjectType = isset($input['project_type']) ? htmlspecialchars(trim($input['project_type']), ENT_QUOTES, 'UTF-8') : null;
            // --------------------

            if (empty($cleanName)) {
                $errors['name'] = 'El nombre es obligatorio.';
            }
            
            // EL ESCUDO DEL ADMINISTRADOR: Solo el admin puede editar 'reference'
            if ($role === 'admin' && !empty($input['reference'])) {
                if (!preg_match('/^PRJ-\d{4}-\d{4}$/', trim($input['reference']))) {
                    $errors['reference'] = 'La referencia de proyecto debe tener el formato PRJ-AAAA-XXXX (Ej: PRJ-2026-0001)';
                }
            } elseif ($role !== 'admin' && isset($input['reference'])) {
                // Si es un comercial e intenta hackear la petición mandando el campo 'reference', lo fulminamos silenciosamente.
                unset($input['reference']);
            }

            if (!empty($errors)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $errors]);
                return;
            }

            $newData = [
                'name' => $cleanName,
                'budget_amount' => $input['budget_amount'] ?? null,
                'description' => $cleanDesc,
                'surface' => $cleanSurface,
                'project_type' => $cleanProjectType
            ];

            // Inyectar la nueva referencia SOLO si pasó el escudo del admin
            if ($role === 'admin' && !empty($input['reference'])) {
                $newData['reference'] = htmlspecialchars(trim($input['reference']), ENT_QUOTES, 'UTF-8');
            }

            $changes = [];
            foreach ($newData as $key => $newValue) {
                $oldValue = $projectDetails[$key] ?? null;
                if ((string)$oldValue !== (string)$newValue) {
                    $changes[$key] = [
                        'antes' => $oldValue,
                        'despues'  => $newValue
                    ];
                }
            }

            // Envolvemos en Try/Catch específico por si el Admin mete un código duplicado
            try {
                $projectModel->update($id, $newData);
            } catch (Exception $e) {
                if (strpos($e->getMessage(), '1062') !== false && strpos($e->getMessage(), 'reference') !== false) {
                    http_response_code(409); // 409 Conflict
                    echo json_encode([
                        'success' => false,
                        'message' => 'El código de referencia introducido ya pertenece a otro proyecto.',
                        'data' => null,
                        'errors' => ['reference' => 'Código duplicado']
                    ]);
                    return;
                }
                throw $e; // Si no es error de duplicado, lo lanzamos al Catch principal
            }

            if (!empty($changes)) {
                AuditLogger::log('proyecto_actualizado', 'project', $id, $id, ['cambios' => $changes]);
            }

            echo json_encode(['success' => true, 'message' => 'Proyecto actualizado correctamente', 'data' => ['id' => $id], 'errors' => null]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar', 'data' => null, 'errors' => ['server' => 'Error en la actualización']]);
        }
    }

    // Cambiar estado de un proyecto (PUT /api/projects/{id}/status)
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
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $newStatus = isset($input['status']) ? htmlspecialchars(trim($input['status']), ENT_QUOTES, 'UTF-8') : null;
            $reason = isset($input['reason']) ? htmlspecialchars(trim($input['reason']), ENT_QUOTES, 'UTF-8') : null;

            $validStatuses = ['propuesta', 'aprobado', 'ejecucion', 'cerrado'];
            if (!in_array($newStatus, $validStatuses)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Estado inválido', 'data' => null, 'errors' => ['status' => 'El estado enviado no es reconocido']]);
                return;
            }

            $oldStatus = $projectDetails['status'] ?? 'desconocido';

            if ($oldStatus === $newStatus) {
                http_response_code(422); 
                echo json_encode([
                    'success' => false, 
                    'message' => 'El proyecto ya se encuentra en estado "' . ucfirst($newStatus) . '".', 
                    'data'    => null, 
                    'errors'  => ['status' => 'El nuevo estado no puede ser igual al actual.']
                ]);
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
                echo json_encode([
                    'success' => false, 
                    'message' => 'Transición de estado no permitida', 
                    'data'    => null, 
                    'errors'  => [
                        'status' => "No se puede pasar directamente de '" . ucfirst($oldStatus) . "' a '" . ucfirst($newStatus) . "'."
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

            echo json_encode(['success' => true, 'message' => 'Estado actualizado y registrado', 'data' => ['status' => $newStatus], 'errors' => null]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al cambiar el estado', 'data' => null, 'errors' => ['server' => 'Error al cambiar estado']]);
        }
    }

    /** Helper privado para limpiar y formatear nombres
     * Ej: "   nave   industrial norte " => "Nave Industrial Norte"
     */
    private function sanitizeName($name) {
        if (empty($name)) return '';
        $name = trim($name);
        $name = preg_replace('/\s+/', ' ', $name);
        
        // Ponemos todo en minúsculas y capitalizamos la primera letra de cada palabra
        $name = mb_convert_case($name, MB_CASE_TITLE, "UTF-8");
        
        return htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    }
}