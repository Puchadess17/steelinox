<?php
// app/Policies/ClientPolicy.php

class ClientPolicy
{
    public static function canManage($role) {
        // Solo administradores y comerciales pueden hacer CRUD de clientes y usuarios
        return in_array($role, ['admin', 'comercial']);
    }
    
    public static function canDelete($role) {
        return in_array($role, ['admin', 'comercial']);
    }
}