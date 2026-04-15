<?php
// config/database.php

/**
 * ====================
 * CONFIGURACIÓN DE BASE DE DATOS
 * ====================
 * Archivo central de credenciales. Transforma las variables de entorno 
 * (cargadas previamente desde el .env) en constantes globales inmutables 
 * que serán consumidas por la clase Singleton de conexión PDO.
 */

/**
 * MAPEO DE CONSTANTES (CON FALLBACKS)
 * Extrae los valores del entorno de ejecución. Si alguna variable crítica no
 * está definida, asume un valor por defecto vacío para evitar advertencias 
 * fatales, delegando el manejo del error a la capa de conexión PDO.
 */
define('DB_HOST', getenv('DB_HOST') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: '');
define('DB_USER', getenv('DB_USER') ?: '');

/**
 * GESTIÓN DE CONTRASEÑA VACÍA
 * Utiliza una comprobación estricta (!== false) para permitir contraseñas 
 * explícitamente vacías (como ocurre en nuestro caso utilizando XAMPP).
 */
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

/**
 * CODIFICACIÓN DE CARACTERES
 * Fuerza el uso de utf8mb4 por defecto. A diferencia de utf8 estándar en MySQL, 
 * mb4 (multi-byte 4) soporta el conjunto completo de caracteres Unicode, 
 * incluyendo emojis y alfabetos complejos sin truncar datos.
 */
define('DB_CHAR', getenv('DB_CHAR') ?: 'utf8mb4');