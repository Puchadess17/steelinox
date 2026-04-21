<?php
// app/Policies/UserPolicy.php
require_once APP_PATH . '/Policies/AccessMatrix.php';

class UserPolicy
{
    public static function canManageClientUsers($role) {
        return AccessMatrix::check('user', 'manage_client_users', $role);
    }
    public static function canManageCommercials($role) {
        return AccessMatrix::check('user', 'manage_commercials', $role);
    }
}