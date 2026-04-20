<?php
// app/Requests/BaseRequest.php

abstract class BaseRequest {
    protected $input = [];
    protected $errors = [];

    public function __construct() {
        $rawInput = file_get_contents('php://input');
        $this->input = json_decode($rawInput, true) ?? [];
    }

    public function input($key, $default = null) {
        return $this->input[$key] ?? $default;
    }

    public function all() {
        return $this->input;
    }

    public function fails() {
        return !empty($this->errors);
    }

    public function errors() {
        return $this->errors;
    }

    protected function addError($field, $message) {
        $this->errors[$field] = $message;
    }

    /** * HELPER CENTRALIZADO: Sanitización de nombres y textos
     */
    public function sanitizeName($name) {
        if (empty($name)) return '';
        $name = trim($name);
        $name = preg_replace('/\s+/', ' ', $name);
        $firstChar = mb_strtoupper(mb_substr($name, 0, 1, "UTF-8"), "UTF-8");
        $restOfText = mb_substr($name, 1, null, "UTF-8");
        return htmlspecialchars($firstChar . $restOfText, ENT_QUOTES, 'UTF-8');
    }

    /** * HELPER CENTRALIZADO: Política de contraseñas
     */
    public function validatePasswordPolicy($password, $email) {
        if (strlen($password) < 8) return 'La contraseña debe tener al menos 8 caracteres.';
        if (!preg_match('/[A-Z]/', $password)) return 'La contraseña debe incluir al menos una letra mayúscula.';
        if (!preg_match('/[a-z]/', $password)) return 'La contraseña debe incluir al menos una letra minúscula.';
        if (!preg_match('/[0-9]/', $password)) return 'La contraseña debe incluir al menos un número.';
        
        if (!empty($email)) {
            $emailPrefix = explode('@', $email)[0];
            if (strcasecmp($password, $emailPrefix) === 0) {
                return 'La contraseña no puede ser igual a la primera parte de tu correo electrónico.';
            }
        }
        return true;
    }
}