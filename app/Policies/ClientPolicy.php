<?php
// app/Policies/ClientPolicy.php
require_once APP_PATH . '/Policies/AccessMatrix.php';

class ClientPolicy {
    public static function canManage($role) {
        return AccessMatrix::check('client', 'manage', $role);
    }
    public static function canDelete($role) {
        return AccessMatrix::check('client', 'delete', $role);
    }
}