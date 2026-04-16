<?php
// app/Policies/DocumentPolicy.php

class DocumentPolicy
{
    // ¿Se pueden subir archivos o nuevas versiones al proyecto?
    public static function canUploadToProject($projectStatus) {
        if ($projectStatus === 'cerrado') return false;
        return true;
    }

    // ¿Quién puede editar los metadatos (nombre, visibilidad) de un documento?
    public static function canEditMetadata($role) {
        return $role !== 'cliente';
    }

    // ¿Puede el usuario acceder a este documento específico?
    public static function canAccessDocument($role, $isVisibleToClient) {
        if ($role === 'cliente' && (int)$isVisibleToClient === 0) return false;
        return true;
    }

    // ¿Puede el usuario descargar físicamente el archivo?
    public static function canDownload($role, $accessMode) {
        if ($role === 'cliente' && $accessMode === 'view') return false;
        return true;
    }

    // ¿Puede el usuario visualizar el archivo directamente en el navegador?
    public static function canViewInline($role, $accessMode) {
        if ($role === 'cliente' && $accessMode === 'download') return false;
        return true;
    }
}