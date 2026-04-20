<?php
// tests/ProjectStateTest.php

use PHPUnit\Framework\TestCase;

class ProjectStateTest extends TestCase {

    public function test_proyecto_cerrado_es_solo_lectura_para_todos() {
        // Ningún rol puede editar un proyecto cerrado
        $this->assertFalse(ProjectPolicy::canEdit('admin', 'cerrado'));
        $this->assertFalse(ProjectPolicy::canEdit('comercial', 'cerrado'));
        $this->assertFalse(ProjectPolicy::canEdit('cliente', 'cerrado'));
        
        // No se pueden asignar usuarios a un proyecto cerrado
        $this->assertFalse(ProjectPolicy::canManageUsers('admin', 'cerrado'));
    }

    public function test_solo_admin_puede_remover_usuarios_de_proyectos_activos() {
        $this->assertTrue(ProjectPolicy::canRemoveUsers('admin', 'ejecucion'));
        $this->assertFalse(ProjectPolicy::canRemoveUsers('comercial', 'ejecucion'));
        $this->assertFalse(ProjectPolicy::canRemoveUsers('cliente', 'ejecucion'));
    }

    public function test_clientes_no_pueden_aprobar_proyectos_fuera_de_fase_propuesta() {
        // Cliente intentando aprobar algo que ya está en ejecución o cerrado
        $this->assertFalse(ProjectPolicy::canApprove('cliente', 'ejecucion'));
        $this->assertFalse(ProjectPolicy::canApprove('cliente', 'cerrado'));
        
        // Cliente aprobando una propuesta válida
        $this->assertTrue(ProjectPolicy::canApprove('cliente', 'propuesta'));
    }

    public function test_comerciales_no_tienen_poder_de_aprobacion() {
        $this->assertFalse(ProjectPolicy::canApprove('comercial', 'propuesta'));
    }
}