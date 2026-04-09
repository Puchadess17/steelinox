<?php
// app/Controllers/ProjectController.php

require_once APP_PATH . '/Models/Project.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';
require_once APP_PATH . '/Services/AuditLogger.php'; // <-- INYECTAMOS EL SERVICIO DE AUDITORÍA

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
                'errors' => ['server' => $e->getMessage()] // PRODUCCION NO DEVUELVE EL ERROR
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

        $userId = $_SESSION['user_id'];
        $role = $_SESSION['role'];
        $clientId = $_SESSION['client_id'] ?? null;

        $projectModel = new Project();
        $proyecto = $projectModel->getById($id, $userId, $role, $clientId);

        if (!$proyecto) {
            http_response_code(404); // Not Found
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
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();

            // Escudo de Autorización: ¿Tiene el usuario permisos para ver este proyecto?
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

            // Si pasa el escudo, obtenemos los usuarios asignados
            $assignedUsers = $projectModel->getAssignedUsers((int) $projectId);

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
                'errors' => ['server' => $e->getMessage()]
            ]);
        }
    }

    // Asignar un comercial a un proyecto (POST /api/projects/{projectId}/users/{userId})
    public function assignUser($projectId, $userId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización: Un cliente no puede asignar trabajadores
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
            $projectModel = new Project();
            $added = $projectModel->assignUser((int) $projectId, (int) $userId);

            if ($added) {
                
                // AUDITORÍA: Asignación de personal
                AuditLogger::log('project_user_assigned', 'project', $projectId, $projectId, [
                    'assigned_user_id' => $userId
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
                'errors' => ['server' => $e->getMessage()]
            ]);
        }
    }

    // Eliminar a un comercial de un proyecto (DELETE /api/projects/{projectId}/users/{userId})
    public function removeUser($projectId, $userId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización Estricto: Solo administradores
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
            $projectModel = new Project();

            // Ejecutamos la eliminación en la tabla pivote
            $removed = $projectModel->removeUser((int) $projectId, (int) $userId);

            if ($removed) {
                
                // AUDITORÍA: Revocación de acceso a proyecto
                AuditLogger::log('project_user_removed', 'project', $projectId, $projectId, [
                    'removed_user_id' => $userId
                ]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Comercial desasignado del proyecto correctamente',
                    'data' => null,
                    'errors' => null
                ]);
            } else {
                throw new Exception("No se pudo ejecutar la desasignación en la base de datos.");
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al desasignar al usuario',
                'data' => null,
                'errors' => ['server' => $e->getMessage()]
            ]);
        }
    }

    // Obtener usuarios disponibles para añadir a un proyecto (GET /api/projects/{projectId}/available-users)
    public function getAvailableUsers($projectId)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Muro de Autorización: Los clientes no pueden ver la lista del personal interno disponible
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
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();

            // Escudo de Autorización: ¿Tiene acceso a este proyecto?
            $projectDetails = $projectModel->getById($projectId, $userId, $role, $clientId);

            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado', 'data' => null, 'errors' => ['project' => 'Recurso inaccesible']]);
                return;
            }

            // Instanciamos el modelo de Usuario para buscar los disponibles
            require_once APP_PATH . '/Models/User.php';
            $userModel = new User();
            $availableUsers = $userModel->getAvailableForProject((int) $projectId);

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
                'errors' => ['server' => $e->getMessage()]
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

        // Validaciones obligatorias
        if (empty($input['client_id']))
            $errors['client_id'] = 'El cliente es obligatorio.';
        if (empty($input['name']))
            $errors['name'] = 'El nombre del proyecto es obligatorio.';
        if (empty($input['reference'])) {
            $errors['reference'] = 'La referencia es obligatoria.';
        } elseif (!preg_match('/^PRJ-\d{4}-\d{3,}$/', $input['reference'])) {
            $errors['reference'] = 'La referencia de proyecto debe tener el formato PRJ-AAAA-XXX (Ej: PRJ-2026-001)';
        }

        if (!empty($errors)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $errors]);
            return;
        }

        try {
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];

            // Muro de Autorización Específico: ¿Puede este usuario operar sobre este cliente?
            require_once APP_PATH . '/Models/Client.php';
            $clientModel = new Client();
            $clientDetails = $clientModel->getDetailsById((int) $input['client_id'], $userId, $role);

            if (!$clientDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente no encontrado o sin permisos', 'data' => null, 'errors' => ['client_id' => 'No tiene permisos para crear proyectos en este cliente']]);
                return;
            }

            // Preparar los datos limpios para la inserción
            $dataToInsert = [
                'client_id' => (int) $input['client_id'],
                'name' => trim($input['name']),
                'reference' => trim($input['reference']),
                'status' => $input['status'] ?? 'propuesta',
                'budget_amount' => $input['budget_amount'] ?? null,
                'description' => $input['description'] ?? null,
                'surface' => $input['surface'] ?? null,
                'project_type' => $input['project_type'] ?? null,
                'created_by' => $userId
            ];

            $projectModel = new Project();
            $newProjectId = $projectModel->createWithAutoAssign($dataToInsert, $userId, $role);

            // AUDITORÍA: Alta de proyecto
            AuditLogger::log('project_create', 'project', $newProjectId, $newProjectId, [
                'name'      => $dataToInsert['name'],
                'reference' => $dataToInsert['reference'],
                'client_id' => $dataToInsert['client_id'],
                'status'    => $dataToInsert['status']
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Proyecto creado correctamente',
                'data' => ['id' => $newProjectId],
                'errors' => null
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error interno al crear el proyecto',
                'data' => null,
                'errors' => ['server' => $e->getMessage()]
            ]);
        }
    }

    // Actualizar datos de un proyecto (PUT /api/projects/{id})
    public function update($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Clientes bloqueados
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
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();

            // Escudo: ¿Está este comercial asignado a este proyecto?
            $projectDetails = $projectModel->getById($id, $userId, $role, $clientId);
            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $errors = [];

            if (empty($input['name']))
                $errors['name'] = 'El nombre es obligatorio.';
            if (empty($input['reference']))
                $errors['reference'] = 'La referencia es obligatoria.';

            if (!empty($errors)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Error de validación', 'data' => null, 'errors' => $errors]);
                return;
            }

            $newData = [
                'name' => trim($input['name']),
                'reference' => trim($input['reference']),
                'budget_amount' => $input['budget_amount'] ?? null,
                'description' => $input['description'] ?? null,
                'surface' => $input['surface'] ?? null,
                'project_type' => $input['project_type'] ?? null
            ];

            // Construir el array de Before/After extrayendo los datos actuales de $projectDetails
            $changes = [];
            foreach ($newData as $key => $newValue) {
                $oldValue = $projectDetails[$key] ?? null;
                // Comparamos, casteando a string para evitar falsos positivos con nulls/vacíos
                if ((string)$oldValue !== (string)$newValue) {
                    $changes[$key] = [
                        'before' => $oldValue,
                        'after'  => $newValue
                    ];
                }
            }

            // Actualizamos, ignorando cualquier 'status' que nos intenten colar
            $projectModel->update($id, $newData);

            // AUDITORÍA: Edición de proyecto
            if (!empty($changes)) {
                AuditLogger::log('project_update', 'project', $id, $id, ['changes' => $changes]);
            }

            echo json_encode(['success' => true, 'message' => 'Proyecto actualizado correctamente', 'data' => ['id' => $id], 'errors' => null]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
        }
    }

    // Cambiar estado de un proyecto (PUT /api/projects/{id}/status)
    public function changeStatus($id)
    {
        AuthMiddleware::check();
        header('Content-Type: application/json; charset=utf-8');

        // Clientes bloqueados
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
            $userId = $_SESSION['user_id'];
            $role = $_SESSION['role'];
            $clientId = $_SESSION['client_id'] ?? null;

            $projectModel = new Project();

            // Escudo de asignación
            $projectDetails = $projectModel->getById($id, $userId, $role, $clientId);
            if (!$projectDetails) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado o sin permisos', 'data' => null, 'errors' => ['project' => 'Acceso denegado']]);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $newStatus = $input['status'] ?? null;
            $reason = $input['reason'] ?? null;

            $validStatuses = ['propuesta', 'aprobado', 'ejecucion', 'cerrado'];
            if (!in_array($newStatus, $validStatuses)) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Estado inválido', 'data' => null, 'errors' => ['status' => 'El estado enviado no es reconocido']]);
                return;
            }

            $oldStatus = $projectDetails['status'] ?? 'desconocido';

            // --- ESCUDO ANTI-REDUNDANCIA ---
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

            // --- MÁQUINA DE ESTADOS (Muro de Saltos Lógicos) ---
            $allowedTransitions = [
                'propuesta' => ['aprobado'],         // De propuesta solo puede pasar a aprobado
                'aprobado'  => ['ejecucion'],        // De aprobado solo puede pasar a ejecucion
                'ejecucion' => ['cerrado'],          // De ejecucion solo puede pasar a cerrado
                'cerrado'   => ['propuesta']         // REAPERTURA: De cerrado vuelve a propuesta para rehacer
            ];

            // Verificamos si el salto está permitido
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
            // ----------------------------------------------------

            // Si pasa todos los escudos, actualizamos en base de datos
            $projectModel->updateStatus($id, $newStatus, $userId, $reason);

            // AUDITORÍA: Si pasa de "cerrado" a cualquier otro, es una reapertura
            $actionKey = ($oldStatus === 'cerrado') ? 'project_reopen' : 'project_status_change';

            AuditLogger::log($actionKey, 'project', $id, $id, [
                'previous_status' => $oldStatus,
                'new_status'      => $newStatus,
                'reason'          => $reason
            ]);

            echo json_encode(['success' => true, 'message' => 'Estado actualizado y registrado', 'data' => ['status' => $newStatus], 'errors' => null]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al cambiar el estado', 'data' => null, 'errors' => ['server' => $e->getMessage()]]);
        }
    }
}