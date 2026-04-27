<?php
// app/Requests/CommentRequest.php

/**
 * COMMENT REQUEST (VALIDACIÓN DE COMENTARIOS)
 * ====================
 * Valida y sanitiza los datos de entrada para las operaciones de comentarios.
 * La validación principal es simple: el cuerpo del comentario no puede estar vacío.
 * La sanitización aplica normalización de espacios, capitalización y escape HTML.
 */
require_once APP_PATH . '/Requests/BaseRequest.php';

class CommentRequest extends BaseRequest {

    /**
     * VALIDACIÓN DE CUERPO DEL COMENTARIO
     * Rechaza comentarios vacíos o que solo contengan espacios en blanco.
     */
    public function validateStore() {
        $body = $this->input('body');
        if (empty($body) || empty(trim($body))) {
            $this->addError('body', 'El comentario no puede estar vacío.');
        }
        return !$this->fails();
    }

    /**
     * SANITIZACIÓN DEL CUERPO
     * Normaliza el texto del comentario antes de persistirlo:
     *   - Elimina espacios extremos y múltiples consecutivos
     *   - Capitaliza la primera letra (respetando UTF-8)
     *   - Aplica htmlspecialchars para prevenir XSS en la capa de presentación
     */
    public function sanitizeBody($text) {
        if (empty($text)) return '';
        $text      = trim($text);
        $text      = preg_replace('/\s+/', ' ', $text);
        // Capitalizar la primera letra sin convertir el resto a minúsculas
        $firstChar = mb_substr($text, 0, 1, "UTF-8");
        $restOfText = mb_substr($text, 1, null, "UTF-8");
        $text      = mb_strtoupper($firstChar, "UTF-8") . $restOfText;
        return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    }
}