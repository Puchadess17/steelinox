<?php
// app/Policies/DocumentPolicy.php

/**
 * DOCUMENT POLICY (POLÍTICA DE DOCUMENTOS)
 * ====================
 * Fachada semántica sobre AccessMatrix para las operaciones de documentos.
 * Centraliza la lógica de autorización documental: quién puede subir,
 * editar metadatos, acceder, descargar o visualizar inline un archivo.
 * Esta política es clave para la seguridad: cualquier petición de acceso
 * a un binario pasa por aquí antes de que DocumentController lo sirva.
 */
require_once APP_PATH . '/Policies/AccessMatrix.php';

class DocumentPolicy
{
    /**
     * PERMISO DE SUBIDA
     * Admin y comercial pueden subir documentos si el proyecto no está cerrado.
     * Lee el rol de sesión directamente (ya validada por AuthMiddleware).
     */
    public static function canUploadToProject($projectStatus) {
        return AccessMatrix::check('document', 'upload_to_project', $_SESSION['role'] ?? 'admin', $projectStatus);
    }

    /**
     * PERMISO DE EDICIÓN DE METADATOS
     * Solo admin y comercial pueden modificar título, tipo o modo de acceso.
     */
    public static function canEditMetadata($role) {
        return AccessMatrix::check('document', 'edit_metadata', $role);
    }

    /**
     * PERMISO DE ACCESO AL DOCUMENTO
     * El cliente solo puede acceder si is_visible_to_client = 1.
     * Admin y comercial siempre tienen acceso.
     */
    public static function canAccessDocument($role, $isVisibleToClient) {
        return AccessMatrix::check('document', 'access', $role, $isVisibleToClient);
    }

    /**
     * PERMISO DE DESCARGA
     * El cliente puede descargar solo si access_mode ∈ {'download', 'both'}.
     */
    public static function canDownload($role, $accessMode) {
        return AccessMatrix::check('document', 'download', $role, $accessMode);
    }

    /**
     * PERMISO DE VISUALIZACIÓN INLINE
     * El cliente puede ver el documento en el visor embebido solo si
     * access_mode ∈ {'view', 'both'}. Nunca se expone la URL real del archivo.
     */
    public static function canViewInline($role, $accessMode) {
        return AccessMatrix::check('document', 'view_inline', $role, $accessMode);
    }
}