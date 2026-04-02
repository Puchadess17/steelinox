<?php
// app/Controllers/ClientController.php

require_once APP_PATH . '/Models/Client.php';
require_once APP_PATH . '/Policies/AuthMiddleware.php';

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

    // Obtener el detalle individual de un cliente (Vista 360)
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
}