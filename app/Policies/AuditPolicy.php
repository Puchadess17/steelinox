<?php
// app/Policies/AuditPolicy.php
require_once APP_PATH . '/Policies/AccessMatrix.php';

class AuditPolicy {
    public static function canViewProjectAudit($role) {
        return AccessMatrix::check('audit', 'view_project', $role);
    }
    public static function canViewClientAudit($role) {
        return AccessMatrix::check('audit', 'view_client', $role);
    }
    public static function canViewGlobalLogs($role) {
        return AccessMatrix::check('audit', 'view_global', $role);
    }
    public static function canViewFiltersData($role) {
        return AccessMatrix::check('audit', 'view_filters', $role);
    }
}