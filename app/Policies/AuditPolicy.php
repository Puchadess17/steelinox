<?php
// app/Policies/AuditPolicy.php

class AuditPolicy
{
    public static function canViewProjectAudit($role) {
        return in_array($role, ['admin', 'comercial']);
    }

    public static function canViewClientAudit($role) {
        return in_array($role, ['admin', 'comercial']);
    }

    public static function canViewGlobalLogs($role) {
        return $role === 'admin';
    }

    public static function canViewFiltersData($role) {
        return $role === 'admin';
    }
}