<?php
// tests/AuthorizationTest.php

use PHPUnit\Framework\TestCase;

class AuthorizationTest extends TestCase {

    public function test_solo_admin_puede_borrar_clientes() {
        $this->assertTrue(ClientPolicy::canDelete('admin'));
        $this->assertTrue(ClientPolicy::canDelete('comercial'));
        $this->assertFalse(ClientPolicy::canDelete('cliente'));
    }

    public function test_clientes_no_pueden_gestionar_comerciales() {
        $this->assertFalse(UserPolicy::canManageCommercials('cliente'));
        $this->assertFalse(UserPolicy::canManageCommercials('comercial'));
        $this->assertTrue(UserPolicy::canManageCommercials('admin'));
    }

    public function test_clientes_no_pueden_crear_proyectos() {
        $this->assertFalse(ProjectPolicy::canCreate('cliente'));
        $this->assertTrue(ProjectPolicy::canCreate('admin'));
        $this->assertTrue(ProjectPolicy::canCreate('comercial'));
    }
}