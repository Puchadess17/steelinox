<?php
// app/Policies/DocumentPolicy.php
require_once APP_PATH . '/Policies/AccessMatrix.php';

class DocumentPolicy
{
    public static function canUploadToProject($projectStatus) {
        // Asumimos que quien sube es el rol actual en sesión, y la matriz evalúa el estado
        return AccessMatrix::check('document', 'upload_to_project', $_SESSION['role'] ?? 'admin', $projectStatus);
    }
    public static function canEditMetadata($role) {
        return AccessMatrix::check('document', 'edit_metadata', $role);
    }
    public static function canAccessDocument($role, $isVisibleToClient) {
        return AccessMatrix::check('document', 'access', $role, $isVisibleToClient);
    }
    public static function canDownload($role, $accessMode) {
        return AccessMatrix::check('document', 'download', $role, $accessMode);
    }
    public static function canViewInline($role, $accessMode) {
        return AccessMatrix::check('document', 'view_inline', $role, $accessMode);
    }
}