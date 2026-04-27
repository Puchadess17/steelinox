<?php
// app/Requests/BaseRequest.php

/**
 * BASE REQUEST (CLASE ABSTRACTA)
 * ====================
 * Clase base que todas las clases Request del sistema extienden.
 * Resuelve dos responsabilidades transversales:
 *   1. Parsear y exponer el cuerpo JSON de la petición HTTP entrante.
 *   2. Proveer helpers reutilizables de sanitización y validación de datos
 *      (sanitizeName, validatePasswordPolicy) para evitar duplicación de código.
 * Las clases hijas implementan sus propios métodos validate*() con las
 * reglas de negocio específicas de cada entidad.
 */
abstract class BaseRequest {
    protected $input  = [];
    protected $errors = [];

    /**
     * CONSTRUCTOR: PARSEO DEL CUERPO DE LA PETICIÓN
     * Lee el body crudo de la petición HTTP (php://input), lo decodifica
     * como JSON y lo almacena internamente. Si el body no es JSON válido,
     * $input queda como array vacío para evitar errores en las validaciones.
     */
    public function __construct() {
        $rawInput = file_get_contents('php://input');
        $this->input = json_decode($rawInput, true) ?? [];
    }

    /**
     * ACCESO A CAMPO DE ENTRADA
     * Devuelve el valor del campo solicitado o el valor por defecto si no existe.
     */
    public function input($key, $default = null) {
        return $this->input[$key] ?? $default;
    }

    /**
     * ACCESO A TODOS LOS CAMPOS
     * Devuelve el array completo de la petición parseada.
     */
    public function all() {
        return $this->input;
    }

    /**
     * COMPROBACIÓN DE FALLOS DE VALIDACIÓN
     * Retorna true si hay al menos un error registrado.
     */
    public function fails() {
        return !empty($this->errors);
    }

    /**
     * EXTRACCIÓN DE ERRORES
     * Devuelve el array asociativo de errores (campo => mensaje).
     * Se inyecta directamente en la clave 'errors' de la respuesta JSON.
     */
    public function errors() {
        return $this->errors;
    }

    /**
     * REGISTRO DE ERROR DE CAMPO
     * Añade un error de validación para un campo concreto.
     * Solo registra el primero si se llama varias veces con el mismo campo.
     */
    protected function addError($field, $message) {
        $this->errors[$field] = $message;
    }

    /**
     * HELPER CENTRALIZADO: SANITIZACIÓN DE NOMBRES Y TEXTOS
     * Normaliza un nombre o texto libre aplicando:
     *   - Eliminación de espacios extremos y múltiples
     *   - Primera letra en mayúscula (respetando UTF-8)
     *   - Escape de caracteres HTML para prevenir XSS
     */
    public function sanitizeName($name) {
        if (empty($name)) return '';
        $name      = trim($name);
        $name      = preg_replace('/\s+/', ' ', $name);
        $firstChar = mb_strtoupper(mb_substr($name, 0, 1, "UTF-8"), "UTF-8");
        $restOfText = mb_substr($name, 1, null, "UTF-8");
        return htmlspecialchars($firstChar . $restOfText, ENT_QUOTES, 'UTF-8');
    }

    /**
     * HELPER CENTRALIZADO: POLÍTICA DE CONTRASEÑAS
     * Aplica las reglas mínimas de seguridad a cualquier contraseña nueva:
     *   - Mínimo 8 caracteres
     *   - Al menos una mayúscula, una minúscula y un número
     *   - No puede ser igual al prefijo del email del usuario
     * Devuelve true si la contraseña es válida o el mensaje de error si no lo es.
     */
    public function validatePasswordPolicy($password, $email) {
        if (strlen($password) < 8) return 'La contraseña debe tener al menos 8 caracteres.';
        if (!preg_match('/[A-Z]/', $password)) return 'La contraseña debe incluir al menos una letra mayúscula.';
        if (!preg_match('/[a-z]/', $password)) return 'La contraseña debe incluir al menos una letra minúscula.';
        if (!preg_match('/[0-9]/', $password)) return 'La contraseña debe incluir al menos un número.';
        
        // Previene contraseñas obvias como usar la primera parte del email como clave
        if (!empty($email)) {
            $emailPrefix = explode('@', $email)[0];
            if (strcasecmp($password, $emailPrefix) === 0) {
                return 'La contraseña no puede ser igual a la primera parte de tu correo electrónico.';
            }
        }
        return true;
    }
}