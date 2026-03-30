<?php
// core/Database.php

require_once ROOT_PATH . '/config/database.php';

class Database {
    private static $instance = null;
    private $pdo;

    // Constructor privado para evitar que se instancie libremente
    private function __construct() {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHAR;
        
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Excepciones si hay error SQL
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Devuelve arrays asociativos
            PDO::ATTR_EMULATE_PREPARES   => false,                  // Fuerza sentencias preparadas reales por seguridad
        ];

        try {
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (\PDOException $e) {
            // En producción no voy a mostrar el error exacto, pero en local si
            die("Error crítico: No se pudo conectar a la base de datos. " . $e->getMessage());
        }
    }

    // Método para obtener la instancia única de la conexión
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    // Método para extraer el objeto PDO y hacer las consultas
    public function getConnection() {
        return $this->pdo;
    }
}