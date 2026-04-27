<?php
// app/Policies/CommentPolicy.php

/**
 * COMMENT POLICY (POLÍTICA DE COMENTARIOS)
 * ====================
 * Fachada semántica sobre AccessMatrix para las operaciones de comentarios.
 * Cada método traduce una acción de negocio concreta a una consulta al
 * diccionario central de permisos, pasando el contexto necesario para que
 * las reglas dinámicas (funciones anónimas) puedan evaluarse correctamente.
 */
require_once APP_PATH . '/Policies/AccessMatrix.php';

class CommentPolicy {

    /**
     * PERMISO DE VISUALIZACIÓN
     * Un cliente solo puede ver comentarios si el documento está marcado como visible.
     * Admin y comercial siempre pueden verlos.
     */
    public static function canView($role, $isVisibleToClient) {
        return AccessMatrix::check('comment', 'view', $role, $isVisibleToClient);
    }
    
    /**
     * PERMISO DE CREACIÓN A NIVEL DE PROYECTO
     * Cualquier rol puede comentar si el proyecto NO está cerrado.
     * Lee el rol directamente de sesión (ya validada por AuthMiddleware antes).
     */
    public static function canCreateOnProject($projectStatus) {
        return AccessMatrix::check('comment', 'create_on_project', $_SESSION['role'] ?? 'admin', $projectStatus);
    }
    
    /**
     * PERMISO DE CREACIÓN A NIVEL DE DOCUMENTO
     * Evalúa simultáneamente el estado del proyecto y la visibilidad del documento.
     * El cliente necesita que ambas condiciones se cumplan para poder comentar.
     */
    public static function canCreateOnDocument($role, $projectStatus, $isVisibleToClient) {
        return AccessMatrix::check('comment', 'create_on_document', $role, [
            'status'     => $projectStatus, 
            'is_visible' => $isVisibleToClient
        ]);
    }

    /**
     * PERMISO DE EDICIÓN
     * El admin puede editar cualquier comentario (si el proyecto no está cerrado).
     * Comercial y cliente solo pueden editar los suyos propios (author_id === user_id).
     */
    public static function canEdit($role, $projectStatus, $authorId, $userId) {
        return AccessMatrix::check('comment', 'edit', $role, [
            'status'    => $projectStatus, 
            'author_id' => $authorId, 
            'user_id'   => $userId
        ]);
    }

    /**
     * PERMISO DE BORRADO LÓGICO
     * Solo admin y comercial pueden eliminar comentarios. Cliente nunca.
     */
    public static function canDelete($role) {
        return AccessMatrix::check('comment', 'delete', $role);
    }
}