<?php
// app/Policies/ProjectPolicy.php

class ProjectPolicy
{
    public static function canCreate($role) {
        return in_array($role, ['admin', 'comercial']);
    }

    public static function canEdit($role, $projectStatus) {
        if ($role === 'cliente') return false;
        if ($projectStatus === 'cerrado') return false; // Un proyecto cerrado es de solo lectura
        return true;
    }

    public static function canChangeStatus($role) {
        return in_array($role, ['admin', 'comercial']);
    }

    public static function canApprove($role, $projectStatus) {
        if ($role === 'comercial') return false; // Comerciales bloqueados para aprobar
        if ($projectStatus !== 'propuesta') return false; // Solo se aprueban propuestas
        return true;
    }

    public static function canManageUsers($role, $projectStatus) {
        if ($role === 'cliente') return false;
        if ($projectStatus === 'cerrado') return false;
        return true;
    }

    public static function canRemoveUsers($role, $projectStatus) {
        if ($role !== 'admin') return false; // Solo el admin quita comerciales asignados
        if ($projectStatus === 'cerrado') return false;
        return true;
    }

    public static function canViewAvailableUsers($role) {
        return in_array($role, ['admin', 'comercial']);
    }
}