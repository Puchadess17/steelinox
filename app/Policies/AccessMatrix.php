<?php
// app/Policies/AccessMatrix.php

/**
 * MATRIZ CENTRAL DE CONTROL DE ACCESO
 * ====================
 * Define todas las reglas de autorización del sistema en un único diccionario.
 */
class AccessMatrix {
    
    private static function getMatrix() {
        return [
            // ======================
            // RECURSO: PROYECTOS
            // ======================
            'project' => [
                'create' => [
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => false,
                ],
                'edit' => [
                    'admin'     => fn($status) => $status !== 'cerrado',
                    'comercial' => fn($status) => $status !== 'cerrado',
                    'cliente'   => false,
                ],
                'delete' => [
                    'admin'     => fn($status) => $status === 'cerrado',
                    'comercial' => fn($status) => $status === 'cerrado', 
                    'cliente'   => false,
                ],
                'manage_users' => [
                    'admin'     => fn($status) => $status !== 'cerrado',
                    'comercial' => false, // Comercial no asigna a otros comerciales
                    'cliente'   => false,
                ],
                'remove_users' => [
                    'admin'     => fn($status) => $status !== 'cerrado',
                    'comercial' => false,
                    'cliente'   => false,
                ],
                'approve' => [
                    'admin'     => fn($status) => $status === 'propuesta',
                    'comercial' => false,
                    'cliente'   => fn($status) => $status === 'propuesta',
                ],
                'change_status' => [
                    'admin'     => true, 
                    'comercial' => true, 
                    'cliente'   => false,
                ],
                'view_available_users' => [
                    'admin'     => true,
                    'comercial' => false,
                    'cliente'   => false,
                ]
            ],

            // ======================
            // RECURSO: CLIENTES
            // ======================
            'client' => [
                'manage' => [ 
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => false,
                ],
                'delete' => [
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => false,
                ]
            ],

            // =====================
            // RECURSO: USUARIOS / STAFF
            // =====================
            'user' => [
                'manage_commercials' => [
                    'admin'     => true,
                    'comercial' => false,
                    'cliente'   => false,
                ],
                'manage_client_users' => [
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => false,
                ],
                'delete' => [
                    'admin'     => true,
                    'comercial' => true, 
                    'cliente'   => false,
                ]
            ],

            // =====================
            // RECURSO: DOCUMENTOS
            // =====================
            'document' => [
                'upload_to_project' => [ 
                    'admin'     => fn($status) => $status !== 'cerrado',
                    'comercial' => fn($status) => $status !== 'cerrado',
                    'cliente'   => false,
                ],
                'access' => [
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => fn($isVisible) => (bool)$isVisible,
                ],
                'download' => [
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => fn($accessMode) => in_array($accessMode, ['download', 'both']),
                ],
                'view_inline' => [ 
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => fn($accessMode) => in_array($accessMode, ['view', 'both']),
                ],
                'edit_metadata' => [
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => false,
                ],
                'delete' => [ 
                    'admin'     => fn($status) => $status !== 'cerrado',
                    'comercial' => fn($status) => $status !== 'cerrado',
                    'cliente'   => false,
                ]
            ],

            // =====================
            // RECURSO: COMENTARIOS
            // =====================
            'comment' => [
                'view' => [
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => fn($isVisible) => (bool)$isVisible,
                ],
                'create_on_project' => [
                    'admin'     => fn($status) => $status !== 'cerrado',
                    'comercial' => fn($status) => $status !== 'cerrado',
                    'cliente'   => fn($status) => $status !== 'cerrado',
                ],
                'create_on_document' => [
                    // Se evalúa que el documento sea visible Y que el proyecto NO esté cerrado
                    'admin'     => fn($context) => $context['status'] !== 'cerrado',
                    'comercial' => fn($context) => $context['status'] !== 'cerrado',
                    'cliente'   => fn($context) => $context['status'] !== 'cerrado' && (bool)$context['is_visible'],
                ],
                'edit' => [
                    'admin'     => fn($context) => $context['status'] !== 'cerrado',
                    'comercial' => fn($context) => $context['status'] !== 'cerrado' && $context['author_id'] === $context['user_id'],
                    'cliente'   => fn($context) => $context['status'] !== 'cerrado' && $context['author_id'] === $context['user_id'],
                ],
                'delete' => [
                    'admin'     => true,
                    'comercial' => true, 
                    'cliente'   => false 
                ]
            ],

            // =====================
            // RECURSO: LOGS Y AUDITORÍA
            // =====================
            'audit' => [
                'view_project' => [
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => false,
                ],
                'view_client' => [
                    'admin'     => true,
                    'comercial' => true,
                    'cliente'   => false,
                ],
                'view_global' => [
                    'admin'     => true,
                    'comercial' => false,
                    'cliente'   => false,
                ],
                'view_filters' => [
                    'admin'     => true,
                    'comercial' => false,
                    'cliente'   => false,
                ]
            ]
        ];
    }

    /**
     * MOTOR DE EVALUACIÓN
     * Consulta la matriz y resuelve si el rol tiene acceso.
     */
    public static function check($resource, $action, $role, $context = null) {
        $matrix = self::getMatrix();

        // 1. Fail-Safe: Si la ruta no existe en la matriz, bloqueamos por seguridad
        if (!isset($matrix[$resource][$action][$role])) {
            return false;
        }

        $rule = $matrix[$resource][$action][$role];

        // 2. Si la regla es una función anónima (evalúa el estado o contexto)
        if (is_callable($rule)) {
            return $rule($context);
        }

        // 3. Si es un permiso estático directo (true/false)
        return (bool) $rule;
    }
    // Ejemplo: AccessMatrix::check('project', 'edit', 'comercial', 'cerrado') // false
}