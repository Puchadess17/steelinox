<?php
// app/Controllers/DashboardController.php

/**
 * DASHBOARD CONTROLLER (SHELL SPA)
 * ====================
 * Controlador mínimo cuya única responsabilidad es servir la vista HTML
 * principal de la aplicación (panel.php). Este archivo es la "carcasa" de
 * la Single Page Application (SPA): una vez cargado en el navegador,
 * el enrutador JavaScript (router.js) toma el control de la navegación.
 *
 * Todas las rutas de administración definidas en web.php apuntan aquí
 * (ej: /clients, /project/5, /audit-log...) para que el navegador siempre
 * reciba el mismo HTML y el JS pueda redibujar la vista sin recargar la página.
 */
class DashboardController
{
    /**
     * ENTRADA ÚNICA (PUNTO DE MONTAJE DE LA SPA)
     * Verifica que el usuario tenga sesión activa antes de servir el panel.
     * Si no está autenticado, redirige al login. Si lo está, carga la vista.
     * El parámetro $id es ignorado; está ahí porque algunas rutas con ID
     * (ej: /project/(\\d+)) inyectan el valor al instanciar el controlador.
     */
    public function index($id = null)
    {
        if (session_status() === PHP_SESSION_NONE) {
            @session_start();
        }

        // Si no hay sesión, redirige al login en lugar de mostrar el panel
        if (!isset($_SESSION['user_id'])) {
            $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? '/steelinox', '/');
            header('Location: ' . $baseUrl . '/');
            exit;
        }

        // Sanitización preventiva del parámetro de ruta (aunque no se usa en la vista)
        if ($id !== null) {
            $id = htmlspecialchars(trim($id), ENT_QUOTES, 'UTF-8');
        }

        $viewPath = APP_PATH . '/Views/panel.php';

        if (file_exists($viewPath)) {
            require_once $viewPath;
        } else {
            echo "Error: No se encuentra la vista del panel principal.";
        }
    }
}