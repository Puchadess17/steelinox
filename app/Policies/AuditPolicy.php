<?php
// app/Policies/AuditPolicy.php

/**
 * AUDIT POLICY (POLÍTICA DE AUDITORÍA)
 * ====================
 * Fachada semántica sobre AccessMatrix para el acceso al registro de auditoría.
 * Los logs son inmutables y de solo lectura. El cliente no tiene acceso en ningún caso.
 * El comercial puede consultar los logs de sus proyectos y clientes,
 * pero no el log global del sistema (exclusivo del administrador).
 */
require_once APP_PATH . '/Policies/AccessMatrix.php';

class AuditPolicy {

    /**
     * PERMISO DE CONSULTA DE LOG DE PROYECTO
     * Admin y comercial pueden ver la línea temporal de un proyecto concreto.
     */
    public static function canViewProjectAudit($role) {
        return AccessMatrix::check('audit', 'view_project', $role);
    }

    /**
     * PERMISO DE CONSULTA DE LOG DE CLIENTE
     * Admin y comercial pueden ver la actividad registrada para una empresa cliente.
     */
    public static function canViewClientAudit($role) {
        return AccessMatrix::check('audit', 'view_client', $role);
    }

    /**
     * PERMISO DE CONSULTA DEL LOG GLOBAL
     * Exclusivo del administrador. Muestra toda la actividad del sistema.
     */
    public static function canViewGlobalLogs($role) {
        return AccessMatrix::check('audit', 'view_global', $role);
    }

    /**
     * PERMISO DE CONSULTA DE FILTROS DE AUDITORÍA
     * Exclusivo del administrador. Permite poblar los selectores del visor de logs.
     */
    public static function canViewFiltersData($role) {
        return AccessMatrix::check('audit', 'view_filters', $role);
    }
}