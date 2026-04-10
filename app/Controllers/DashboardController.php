<?php
// app/Controllers/DashboardController.php

class DashboardController
{
    public function index($id = null)
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['user_id'])) {
            header('Location: /steelinox/');
            exit;
        }

        // --- SANITIZACIÓN ---
        if ($id !== null) {
            $id = htmlspecialchars(trim($id), ENT_QUOTES, 'UTF-8');
            
            // Para blindaje total seria:
            // $id = filter_var($id, FILTER_SANITIZE_NUMBER_INT);
        }
        // --------------------

        $viewPath = APP_PATH . '/Views/panel.php';

        if (file_exists($viewPath)) {
            // La variable $id ya esta sanitizada 
            require_once $viewPath;
        } else {
            echo "Error: No se encuentra la vista del panel principal.";
        }
    }
}