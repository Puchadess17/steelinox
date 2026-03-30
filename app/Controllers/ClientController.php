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
}