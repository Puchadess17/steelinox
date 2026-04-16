<?php
// core/Database.php

require_once ROOT_PATH . '/config/database.php';

/**
 * DATABASE (SINGLETON PDO)
 * ====================
 * Gestiona la conexión a la base de datos MySQL mediante PDO.
 * Implementa el patrón de diseño Singleton para garantizar que solo
 * exista una única conexión activa durante toda la ejecución de la petición.
 */
class Database
{

    /**
     * INSTANCIA Y CONEXIÓN
     * Almacena la única instancia de la clase estáticamente y el objeto PDO subyacente.
     */
    private static $instance = null;
    private $pdo;

    /**
     * CONSTRUCTOR PRIVADO
     * Bloquea la creación de múltiples instancias mediante 'new'. Configura el DSN
     * y establece atributos críticos de seguridad y rendimiento en PDO.
     */
    private function __construct()
    {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHAR;

        /**
         * CONFIGURACIÓN PDO
         * - ERRMODE_EXCEPTION: Obliga a lanzar excepciones ante errores SQL.
         * - FETCH_ASSOC: Define el formato de respuesta por defecto como arrays asociativos.
         * - EMULATE_PREPARES: Desactivado para delegar la preparación al motor de MySQL, 
         * bloqueando ataques de inyección SQL.
         */
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        try {
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (\PDOException $e) {
            /**
             * MANEJO DE EXCEPCIÓN CRÍTICA (FALLBACK A ARCHIVO)
             */
            require_once APP_PATH . '/Services/ErrorLogger.php';
            
            // Usamos nuestro servicio pasándole el nombre del archivo específico para la DB
            ErrorLogger::log($e->getMessage(), 'Database::Connection', 'database_errors.log');

            http_response_code(500);

            // Si es una petición API, devolvemos JSON opaco por seguridad
            if (strpos($_SERVER['REQUEST_URI'] ?? '', '/api/') !== false) {
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'success' => false,
                    'message' => 'Servicio temporalmente no disponible (Error interno)',
                    'data'    => null,
                    'errors'  => ['database' => 'Error de conexión a la base de datos.']
                ]);
            } else {
                die("Error 500: Servicio temporalmente no disponible.");
            }
            exit;
        }
    }

    /**
     * PUNTO DE ACCESO GLOBAL (SINGLETON)
     * Si no existe una instancia previa, la inicializa. Si ya existe, 
     * devuelve la que está en memoria, ahorrando recursos del servidor.
     */
    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * EXTRACTOR DE CONEXIÓN
     * Expone el objeto PDO instanciado para ejecutar las consultas
     * directamente desde los Modelos de la aplicación.
     */
    public function getConnection()
    {
        return $this->pdo;
    }
}