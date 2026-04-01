<?php
// app/Controllers/DashboardController.php

class DashboardController
{

    public function index()
    {
        if (session_status() === PHP_SESSION_NONE)
            session_start();

        if (!isset($_SESSION['user_id'])) {
            header('Location: /steelinox/');
            exit;
        }

        $viewPath = APP_PATH . '/Views/panel.php';

        if (file_exists($viewPath)) {
            require_once $viewPath;
        } else {
            echo "Error: No se encuentra la vista del panel principal.";
        }
    }

    public function showProject($id)
    {
        // ... (existing code)
        if (session_status() === PHP_SESSION_NONE)
            session_start();
        if (!isset($_SESSION['user_id'])) {
            header('Location: /steelinox/');
            exit;
        }

        $role = $_SESSION['role'] ?? 'cliente';

        if ($role === 'admin' || $role === 'comercial') {
            $viewPath = APP_PATH . '/Views/project_detail_admin.php';
        } else {
            $viewPath = APP_PATH . '/Views/panel.php';
        }

        if (file_exists($viewPath)) {
            $projectId = (int) $id;
            require_once $viewPath;
        } else {
            echo "Error: No se encuentra la vista solicitada ($viewPath).";
        }
    }

    public function showClient($id)
    {
        if (session_status() === PHP_SESSION_NONE)
            session_start();

        if (!isset($_SESSION['user_id'])) {
            header('Location: /steelinox/');
            exit;
        }

        // Determinar qué vista cargar según el rol
        $role = $_SESSION['role'] ?? 'cliente';

        if ($role === 'admin' || $role === 'comercial') {
            $viewPath = APP_PATH . '/Views/client_detail_admin.php';
        } else {
            $viewPath = APP_PATH . '/Views/panel.php';
        }

        if (file_exists($viewPath)) {
            $clientId = (int) $id;
            require_once $viewPath;
        } else {
            echo "Error: No se encuentra la vista solicitada ($viewPath).";
        }
    }
}