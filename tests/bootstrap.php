<?php
// tests/bootstrap.php

/**
 * BOOTSTRAP DE TESTS
 * ====================
 * Punto de entrada del entorno de pruebas (PHPUnit).
 * Define las constantes de rutas necesarias para que los requires
 * de los tests funcionen igual que en producción, sin depender
 * del servidor web. También arranca una sesión PHP simulada para
 * que los Middleware y Policies no fallen al acceder a $_SESSION.
 */
define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . '/app');
define('CORE_PATH', ROOT_PATH . '/core');

// Cargar clases base y políticas necesarias para los tests
require_once CORE_PATH . '/Database.php';
require_once APP_PATH . '/Policies/ProjectPolicy.php';
require_once APP_PATH . '/Policies/DocumentPolicy.php';
require_once APP_PATH . '/Policies/ClientPolicy.php';
require_once APP_PATH . '/Policies/UserPolicy.php';

// Iniciar sesión simulada para el entorno CLI
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}