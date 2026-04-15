<?php
// app/Helpers/PaginationHelper.php

/**
 * PAGINATION HELPER
 * ====================
 * Utilidad estática para la gestión centralizada de la paginación.
 * Sanitiza los parámetros de entrada y estandariza la estructura
 * de los metadatos de navegación devueltos al Frontend.
 */
class PaginationHelper {
    
    /**
     * EXTRACCIÓN Y SANITIZACIÓN DE PARÁMETROS
     * Obtiene y valida la página actual y el límite de resultados desde 
     * la petición GET. Calcula el desplazamiento (offset) exacto requerido 
     * por las sentencias SQL en la base de datos.
     */
    public static function getParams() {
        $page = isset($_GET['page']) && is_numeric($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 15;
        
        /**
         * RESTRICCIÓN DE LÍMITES (PREVENCIÓN DE OVERFLOW)
         * Bloquea la manipulación maliciosa de la URL evitando consultas 
         * desproporcionadas a la base de datos. Establece un valor por defecto 
         * seguro si el parámetro entrante no coincide con los valores permitidos.
         */
        $allowedLimits = [15, 30, 50];
        if (!in_array($limit, $allowedLimits)) {
            $limit = 15;
        }
        
        $offset = ($page - 1) * $limit;
        
        return [$page, $limit, $offset];
    }

    /**
     * FORMATEO DE RESPUESTA
     * Construye el array de metadatos requerido por la capa de presentación,
     * calculando automáticamente el total de páginas y definiendo banderas
     * booleanas para habilitar o deshabilitar los controles de navegación.
     */
    public static function format($total, $limit, $page) {
        $totalPages = (int) ceil($total / $limit);
        
        return [
            'total_results'     => $total,
            'total_pages'       => $totalPages,
            'current_page'      => $page,
            'per_page'          => $limit,
            'has_next_page'     => $page < $totalPages,
            'has_previous_page' => $page > 1,
            'next_page'         => $page < $totalPages ? $page + 1 : null,
            'previous_page'     => $page > 1 ? $page - 1 : null
        ];
    }
}