<?php
// public/index.php

// Errores
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Rutas absolutas
define('ROOT_PATH', dirname(__DIR__)); // Carpeta /steel-inox
define('APP_PATH', ROOT_PATH . '/app');
define('CORE_PATH', ROOT_PATH . '/core');
define('STORAGE_PATH', ROOT_PATH . '/storage'); // Fuera de public

// Cargar Router
require_once CORE_PATH . '/Router.php';

// Capturar la URL (limpiando barras finales + si está vacia, asumo raiz '/')
$url = isset($_GET['url']) ? rtrim($_GET['url'], '/') : '/';

// Inicializar Router
$router = new Router();

// Cargar el archivo donde defino rutas
require_once ROOT_PATH . '/routes/web.php';

// Despachar la petición
$router->dispatch($url);