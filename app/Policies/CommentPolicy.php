<?php
// app/Policies/CommentPolicy.php
require_once APP_PATH . '/Policies/AccessMatrix.php';

class CommentPolicy {
    public static function canView($role, $isVisibleToClient) {
        return AccessMatrix::check('comment', 'view', $role, $isVisibleToClient);
    }
    
    public static function canCreateOnProject($projectStatus) {
        return AccessMatrix::check('comment', 'create_on_project', $_SESSION['role'] ?? 'admin', $projectStatus);
    }
    
    public static function canCreateOnDocument($role, $projectStatus, $isVisibleToClient) {
        return AccessMatrix::check('comment', 'create_on_document', $role, [
            'status' => $projectStatus, 
            'is_visible' => $isVisibleToClient
        ]);
    }

    public static function canEdit($role, $projectStatus, $authorId, $userId) {
        return AccessMatrix::check('comment', 'edit', $role, [
            'status'    => $projectStatus, 
            'author_id' => $authorId, 
            'user_id'   => $userId
        ]);
    }

    public static function canDelete($role) {
        return AccessMatrix::check('comment', 'delete', $role);
    }
}