<?php
// app/Policies/UserPolicy.php

/**
 * USER POLICY (POLÍTICA DE USUARIOS)
 * ====================
 * Fachada semántica sobre AccessMatrix para operaciones sobre usuarios.
 * Distingue dos tipos de gestión: usuarios cliente (accesible a admin y
 * comercial) y comerciales (exclusivamente para el administrador).
 */
require_once APP_PATH . '/Policies/AccessMatrix.php';

class UserPolicy
{
    /**
     * PERMISO DE GESTIÓN DE USUARIOS CLIENTE
     * Admin y comercial pueden crear, editar y eliminar cuentas de clientes.
     * El comercial solo puede operar sobre clientes de su ámbito (filtrado en Modelo).
     */
    public static function canManageClientUsers($role) {
        return AccessMatrix::check('user', 'manage_client_users', $role);
    }

    /**
     * PERMISO DE GESTIÓN DE COMERCIALES
     * Acción exclusiva del administrador. El comercial no puede crear ni modificar
     * otras cuentas de comercial (DDS §3.2).
     */
    public static function canManageCommercials($role) {
        return AccessMatrix::check('user', 'manage_commercials', $role);
    }
}