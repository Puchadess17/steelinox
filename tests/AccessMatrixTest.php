<?php
// tests/AccessMatrixTest.php

/**
 * SUITE: ACCESS MATRIX (Tests de Integración de Seguridad)
 * ====================
 * Script de test manual (sin PHPUnit) que verifica directamente la tabla
 * central de permisos (AccessMatrix::check). Cubre todos los recursos
 * y acciones definidos en el DDS §3.2:
 *   - Fail-safe: recursos y acciones no definidos deben ser denegados
 * 
 * Diseñado para ejecutarse desde CLI:
 *   php tests/AccessMatrixTest.php
 *
 * Retorna exit(1) si algún test falla, compatible con pipelines CI/CD.
 */

define('APP_PATH', realpath(__DIR__ . '/../app'));
require_once APP_PATH . '/Policies/AccessMatrix.php';

$testsPassed = 0;
$testsFailed = 0;

function assertAccess($resource, $action, $role, $context, $expected, $description) {
    global $testsPassed, $testsFailed;
    $result = AccessMatrix::check($resource, $action, $role, $context);
    
    if ($result === $expected) {
        echo "✅ [PASS] " . $description . "\n";
        $testsPassed++;
    } else {
        $expStr = $expected ? 'PERMITIDO' : 'DENEGADO';
        $resStr = $result ? 'PERMITIDO' : 'DENEGADO';
        echo "❌ [FAIL] " . $description . " -> Se esperaba $expStr pero fue $resStr.\n";
        $testsFailed++;
    }
}

echo "============================================\n";
echo "EJECUTANDO TESTS DE SEGURIDAD (ACCESS MATRIX)\n";
echo "============================================\n\n";

// FAIL-SAFE (Rutas no definidas)
assertAccess('recurso_inventado', 'borrar', 'admin', null, false, 'Fail-safe: Bloqueo automático en recurso inexistente');
assertAccess('project', 'accion_inventada', 'admin', null, false, 'Fail-safe: Bloqueo automático en acción inexistente');

// PROYECTOS (Edición y Borrado)
assertAccess('project', 'edit', 'admin', 'propuesta', true, 'Proyecto: Admin puede editar proyecto en propuesta');
assertAccess('project', 'edit', 'admin', 'cerrado', false, 'Proyecto: Admin NO puede editar proyecto cerrado');
assertAccess('project', 'edit', 'cliente', 'propuesta', false, 'Proyecto: Cliente NO puede editar estructura nunca');
assertAccess('project', 'delete', 'admin', 'cerrado', true, 'Proyecto: Admin puede borrar proyecto cerrado');
assertAccess('project', 'delete', 'comercial', 'ejecucion', false, 'Proyecto: Comercial NO puede borrar proyecto en ejecución');

// APROBACIONES (DDS §3.2)
assertAccess('project', 'approve', 'admin', 'propuesta', true, 'Aprobación: Admin puede aprobar si es propuesta');
assertAccess('project', 'approve', 'cliente', 'propuesta', true, 'Aprobación: Cliente puede aprobar si es propuesta');
assertAccess('project', 'approve', 'comercial', 'propuesta', false, 'Aprobación: Comercial NO puede aprobar nunca');
assertAccess('project', 'approve', 'cliente', 'ejecucion', false, 'Aprobación: Cliente NO puede aprobar un proyecto que ya no es propuesta');

// DOCUMENTOS (Visibilidad y Descarga)
assertAccess('document', 'access', 'cliente', 1, true, 'Documento: Cliente accede a documento marcado como visible');
assertAccess('document', 'access', 'cliente', 0, false, 'Documento: Cliente NO accede a documento confidencial');
assertAccess('document', 'download', 'cliente', 'download', true, 'Documento: Cliente puede descargar si access_mode es download');
assertAccess('document', 'download', 'cliente', 'view', false, 'Documento: Cliente NO puede descargar si access_mode es solo view');

// COMENTARIOS (Lógica Combinada)
assertAccess('comment', 'create_on_document', 'cliente', ['status' => 'propuesta', 'is_visible' => 1], true, 'Comentarios: Cliente comenta en documento visible de proyecto abierto');
assertAccess('comment', 'create_on_document', 'cliente', ['status' => 'cerrado', 'is_visible' => 1], false, 'Comentarios: Cliente NO comenta si el proyecto está cerrado (aunque sea visible)');
assertAccess('comment', 'create_on_document', 'cliente', ['status' => 'propuesta', 'is_visible' => 0], false, 'Comentarios: Cliente NO comenta en documento confidencial (aunque el proyecto esté abierto)');
assertAccess('comment', 'delete', 'comercial', null, true, 'Comentarios: Comercial tiene permiso para borrar (logicamente) sus comentarios');
assertAccess('comment', 'delete', 'cliente', null, false, 'Comentarios: Cliente NO tiene permiso de borrado');

echo "\n============================================\n";
echo "RESULTADOS: $testsPassed correctos, $testsFailed fallidos.\n";
echo "============================================\n";

if ($testsFailed > 0) {
    exit(1); // Falla el script para pipelines CI/CD
}
exit(0);