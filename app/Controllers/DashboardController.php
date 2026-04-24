<?php
// app/Controllers/DashboardController.php

class DashboardController
{
    public function index($id = null)
    {
        if (session_status() === PHP_SESSION_NONE) {
            @session_start();
        }

        if (!isset($_SESSION['user_id'])) {
            $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? '/steelinox', '/');
            header('Location: ' . $baseUrl . '/');
            exit;
        }

        // --- SANITIZACIÓN ---
        if ($id !== null) {
            $id = htmlspecialchars(trim($id), ENT_QUOTES, 'UTF-8');
        }
        // --------------------

        $viewPath = APP_PATH . '/Views/panel.php';

        if (file_exists($viewPath)) {
            require_once $viewPath;
        } else {
            echo "Error: No se encuentra la vista del panel principal.";
        }
    }
}