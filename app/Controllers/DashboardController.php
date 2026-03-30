<?php
// app/Controllers/DashboardController.php

class DashboardController {
    
    public function index() {
        if (session_status() === PHP_SESSION_NONE) session_start();

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

    public function showProject($slug, $id) {
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (!isset($_SESSION['user_id'])) {
            header('Location: /steelinox/');
            exit;
        }

        // Ruteo dinámico basado en rol
        $role = $_SESSION['role'] ?? 'cliente';
        
        if ($role === 'cliente') {
            $viewPath = APP_PATH . '/Views/project_detail.php';
        } else {
            $viewPath = APP_PATH . '/Views/project_detail_admin.php';
        }
        
        if (file_exists($viewPath)) {
            // Se pasa el ID a la vista para cargarlo como global JS
            $projectId = (int)$id;
            require_once $viewPath;
        } else {
            echo "Error: No se encuentra la vista del detalle del proyecto.";
        }
    }
}