<?php
// app/Requests/CommentRequest.php
require_once APP_PATH . '/Requests/BaseRequest.php';

class CommentRequest extends BaseRequest {
    
    public function validateStore() {
        $body = $this->input('body');
        if (empty($body) || empty(trim($body))) {
            $this->addError('body', 'El comentario no puede estar vacío.');
        }
        return !$this->fails();
    }

    public function sanitizeBody($text) {
        if (empty($text)) return '';
        $text = trim($text);
        $text = preg_replace('/\s+/', ' ', $text);
        $firstChar = mb_substr($text, 0, 1, "UTF-8");
        $restOfText = mb_substr($text, 1, null, "UTF-8");
        $text = mb_strtoupper($firstChar, "UTF-8") . $restOfText;
        return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    }
}