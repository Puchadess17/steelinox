<?php
// app/Policies/ProjectPolicy.php

/**
 * PROJECT POLICY (POLÍTICA DE PROYECTOS)
 * ====================
 * Fachada semántica sobre AccessMatrix para las operaciones de proyectos.
 * Centraliza todas las comprobaciones de autorización antes de que el
 * ProjectController ejecute cualquier acción sobre un proyecto.
 * Muchas reglas son dinámicas: dependen del estado actual del proyecto.
 */
require_once APP_PATH . '/Policies/AccessMatrix.php';

class ProjectPolicy
{
    /**
     * PERMISO DE CREACIÓN
     * Admin y comercial pueden crear proyectos. El cliente nunca.
     */
    public static function canCreate($role) {
        return AccessMatrix::check('project', 'create', $role);
    }

    /**
     * PERMISO DE EDICIÓN
     * Ningún rol puede editar un proyecto en estado 'cerrado'.
     */
    public static function canEdit($role, $projectStatus) {
        return AccessMatrix::check('project', 'edit', $role, $projectStatus);
    }

    /**
     * PERMISO DE CAMBIO DE ESTADO
     * Admin y comercial pueden cambiar el estado en cualquier momento.
     * El cliente nunca puede cambiar el estado (solo puede aprobar).
     */
    public static function canChangeStatus($role) {
        return AccessMatrix::check('project', 'change_status', $role);
    }

    /**
     * PERMISO DE APROBACIÓN
     * Solo admin y cliente pueden aprobar, y únicamente cuando el proyecto
     * está en estado 'propuesta'. El comercial no puede aprobar.
     */
    public static function canApprove($role, $projectStatus) {
        return AccessMatrix::check('project', 'approve', $role, $projectStatus);
    }

    /**
     * PERMISO DE ASIGNACIÓN DE COMERCIALES
     * Solo el admin puede asignar comerciales a un proyecto no cerrado.
     */
    public static function canManageUsers($role, $projectStatus) {
        return AccessMatrix::check('project', 'manage_users', $role, $projectStatus);
    }

    /**
     * PERMISO DE DESASIGNACIÓN DE COMERCIALES
     * Solo el admin puede quitar comerciales de un proyecto no cerrado.
     */
    public static function canRemoveUsers($role, $projectStatus) {
        return AccessMatrix::check('project', 'remove_users', $role, $projectStatus);
    }

    /**
     * PERMISO DE CONSULTA DE USUARIOS DISPONIBLES
     * Solo el admin puede ver la lista de comerciales disponibles para asignar.
     */
    public static function canViewAvailableUsers($role) {
        return AccessMatrix::check('project', 'view_available_users', $role);
    }

    /**
     * PERMISO DE BORRADO LÓGICO
     * Solo se puede borrar un proyecto cuando está en estado 'cerrado'.
     */
    public static function canDelete($role, $projectStatus) {
        return AccessMatrix::check('project', 'delete', $role, $projectStatus);
    }
}