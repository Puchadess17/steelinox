<?php
// app/Policies/ClientPolicy.php

/**
 * CLIENT POLICY (POLÍTICA DE CLIENTES)
 * ====================
 * Fachada semántica sobre AccessMatrix para operaciones sobre empresas cliente.
 * Admin y comercial pueden gestionar clientes (CRUD). El rol cliente nunca.
 */
require_once APP_PATH . '/Policies/AccessMatrix.php';

class ClientPolicy {

    /**
     * PERMISO DE GESTIÓN (CRUD GENERAL)
     * Admin y comercial tienen acceso. El comercial está limitado
     * a los clientes dentro de su ámbito (filtrado en el Modelo).
     */
    public static function canManage($role) {
        return AccessMatrix::check('client', 'manage', $role);
    }

    /**
     * PERMISO DE BORRADO LÓGICO
     * Admin y comercial pueden eliminar lógicamente un cliente
     * (requiere que esté previamente desactivado, comprobado en el Controlador).
     */
    public static function canDelete($role) {
        return AccessMatrix::check('client', 'delete', $role);
    }
}