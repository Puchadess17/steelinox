<?php
// app/Policies/UserPolicy.php

class UserPolicy
{
    // Solo admins y comerciales pueden gestionar a los usuarios de los clientes
    public static function canManageClientUsers($role) {
        return in_array($role, ['admin', 'comercial']);
    }

    // Solo los administradores pueden gestionar al equipo comercial (RRHH)
    public static function canManageCommercials($role) {
        return $role === 'admin';
    }
}