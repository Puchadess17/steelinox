<?php
// app/Policies/ProjectPolicy.php
require_once APP_PATH . '/Policies/AccessMatrix.php';

class ProjectPolicy
{
    public static function canCreate($role) {
        return AccessMatrix::check('project', 'create', $role);
    }
    public static function canEdit($role, $projectStatus) {
        return AccessMatrix::check('project', 'edit', $role, $projectStatus);
    }
    public static function canChangeStatus($role) {
        return AccessMatrix::check('project', 'change_status', $role);
    }
    public static function canApprove($role, $projectStatus) {
        return AccessMatrix::check('project', 'approve', $role, $projectStatus);
    }
    public static function canManageUsers($role, $projectStatus) {
        return AccessMatrix::check('project', 'manage_users', $role, $projectStatus);
    }
    public static function canRemoveUsers($role, $projectStatus) {
        return AccessMatrix::check('project', 'remove_users', $role, $projectStatus);
    }
    public static function canViewAvailableUsers($role) {
        return AccessMatrix::check('project', 'view_available_users', $role);
    }
    public static function canDelete($role, $projectStatus) {
        return AccessMatrix::check('project', 'delete', $role, $projectStatus);
    }
}