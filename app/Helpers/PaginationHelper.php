<?php
// app/Helpers/PaginationHelper.php

class PaginationHelper {
    
    /**
     * Extrae y sanitiza la página actual y el límite permitido (15, 30, 50).
     * Retorna un array con: [Página actual, Límite, Offset para la BBDD]
     */
    public static function getParams() {
        $page = isset($_GET['page']) && is_numeric($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 15;
        
        // Bloqueamos que el usuario pueda enviar "limit=10000" hackeando la URL
        $allowedLimits = [15, 30, 50];
        if (!in_array($limit, $allowedLimits)) {
            $limit = 15; // Por defecto siempre caemos en 15 si manipulan el dato
        }
        
        $offset = ($page - 1) * $limit;
        
        return [$page, $limit, $offset];
    }

    /**
     * Formatea los datos de salida de la paginación al estándar del front-end.
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