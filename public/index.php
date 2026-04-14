<?php
// public/index.php

/**
 * ====================
 * FRONT CONTROLLER
 * ====================
 * Todas las peticiones HTTP (vistas o API) son redirigidas aquí por el servidor
 * web. Inicializa el entorno, define las constantes globales de los directorios
 * y despacha la petición al Router.
 */

/**
 * CONFIGURACIÓN DE ERRORES
 * Comentados para seguridad en produccion
 */

/** ini_set('display_errors', 1);
* ini_set('display_startup_errors', 1);
* error_reporting(E_ALL);
*/

/**
 * DEFINICIÓN DE RUTAS ABSOLUTAS (CONSTANTES GLOBALES)
 * Para evitar el uso frágil de rutas relativas (../../).
 * Seguridad aislando carpetas sensibles fuera del alcance público del servidor web.
 */

define('ROOT_PATH', dirname(__DIR__)); 
define('APP_PATH', ROOT_PATH . '/app');
define('CORE_PATH', ROOT_PATH . '/core');
define('STORAGE_PATH', ROOT_PATH . '/storage'); 

/**
 * INICIALIZACIÓN DEL ENTORNO SEGURIZADO
 * Variables de entorno desde el archivo .env, para así no hardcodear credenciales
 * o configuraciones sensibles.
 */
require_once CORE_PATH . '/DotEnvLoader.php';
DotEnvLoader::load(ROOT_PATH . '/.env');

/**
 * CARGA DEL MOTOR DE ENRUTAMIENTO
 * Se encarga de procesar la URL
 */
require_once CORE_PATH . '/Router.php';

/**
 * CAPTURA Y SANITIZACIÓN DE LA URL
 * Atrapar el parámetro 'url' generado por el .htaccess.
 * rtrim() elimina las barras diagonales finales (ej: '/api/users/' pasa a '/api/users')
 * para evitar duplicidades en la resolución de rutas. Si no hay URL, asumimos la raíz '/'.
 */
$url = isset($_GET['url']) ? rtrim($_GET['url'], '/') : '/';

// Instancia del motor principal
$router = new Router();

/**
 * REGISTRO DE RUTAS DISPONIBLES
 * Cargar archivo de configuración web.php, el cual utilizará la instancia 
 * $router recién creada para registrar todos los endpoints (GET, POST, PUT, DELETE) 
 * que la app sabe responder.
 */
require_once ROOT_PATH . '/routes/web.php';

/**
 * DESPACHO DE LA PETICIÓN
 * Se le entrega la URL capturada al Router. Este buscará una coincidencia en su 
 * diccionario de rutas, extraerá los parámetros dinámicos (ej: IDs), instanciará 
 * el Controlador correspondiente y ejecutará su método.
 */
$router->dispatch($url);