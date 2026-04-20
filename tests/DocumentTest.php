<?php
// tests/DocumentTest.php

use PHPUnit\Framework\TestCase;

class DocumentTest extends TestCase {

    public function test_cliente_no_puede_acceder_a_documento_oculto() {
        $isVisibleToClient = 0;
        
        $this->assertFalse(DocumentPolicy::canAccessDocument('cliente', $isVisibleToClient));
        $this->assertTrue(DocumentPolicy::canAccessDocument('admin', $isVisibleToClient));
        $this->assertTrue(DocumentPolicy::canAccessDocument('comercial', $isVisibleToClient));
    }

    public function test_cliente_accede_a_documento_publico() {
        $isVisibleToClient = 1;
        
        $this->assertTrue(DocumentPolicy::canAccessDocument('cliente', $isVisibleToClient));
    }

    public function test_restriccion_de_descarga_fisica() {
        // Si el modo es solo 'view', el cliente NO puede descargar (attachment)
        $this->assertFalse(DocumentPolicy::canDownload('cliente', 'view'));
        
        // Admin y comerciales siempre pueden descargar
        $this->assertTrue(DocumentPolicy::canDownload('admin', 'view'));
        
        // Si el modo es 'download' o 'both', el cliente sí puede descargar
        $this->assertTrue(DocumentPolicy::canDownload('cliente', 'download'));
        $this->assertTrue(DocumentPolicy::canDownload('cliente', 'both'));
    }

    public function test_restriccion_de_visualizacion_inline() {
        // Si el modo es solo 'download', el cliente NO puede ver online (inline)
        $this->assertFalse(DocumentPolicy::canViewInline('cliente', 'download'));
        
        // Si el modo es 'view' o 'both', sí puede
        $this->assertTrue(DocumentPolicy::canViewInline('cliente', 'view'));
        $this->assertTrue(DocumentPolicy::canViewInline('cliente', 'both'));
    }

    public function test_nadie_puede_subir_versiones_a_proyectos_cerrados() {
        $this->assertFalse(DocumentPolicy::canUploadToProject('cerrado'));
        $this->assertTrue(DocumentPolicy::canUploadToProject('ejecucion'));
        $this->assertTrue(DocumentPolicy::canUploadToProject('propuesta'));
    }
}