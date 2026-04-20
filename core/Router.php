<?php
// core/Router.php

/**
 * ROUTER (ENRUTADOR)
 * ====================
 * El cerebro de la aplicación. Se encarga de mapear las URLs que solicita
 * el cliente con el Controlador y Método correspondientes. Soporta captura
 * de parámetros dinámicos mediante Expresiones Regulares (Regex).
 */
class Router {
    
    /**
     * ALMACÉN DE RUTAS
     * Array que guardará en memoria todas las rutas registradas en web.php
     * antes de que se despache la petición actual.
     */
    protected $routes = [];

    /**
     * REGISTRO PRINCIPAL DE RUTAS
     * Almacena una nueva ruta normalizando el método HTTP a mayúsculas
     * y asegurando que la URI empiece con '/' para evitar inconsistencias.
     */
    public function add($method, $uri, $action) {
        $this->routes[] = [
            'method' => strtoupper($method),
            'uri'    => '/' . trim($uri, '/'),
            'action' => $action
        ];
    }

    /**
     * MÉTODOS ATAJO (HELPERS RESTful)
     * Envoltorios semánticos para hacer el archivo web.php más limpio y
     * legible al definir los endpoints (arquitectura orientada a recursos).
     */
    public function get($uri, $action) {
        $this->add('GET', $uri, $action);
    }

    public function post($uri, $action) {
        $this->add('POST', $uri, $action);
    }

    public function put($uri, $action) {
        $this->add('PUT', $uri, $action);
    }

    public function delete($uri, $action) {
        $this->add('DELETE', $uri, $action);
    }

    /**
     * DESPACHO DE LA PETICIÓN (NÚCLEO DEL ROUTER)
     * Analiza la URL entrante, busca una coincidencia exacta en el almacén
     * de rutas usando expresiones regulares, e invoca el controlador asociado.
     */
    public function dispatch($url) {
        $requestMethod = $_SERVER['REQUEST_METHOD'];
        
        /**
         * METHOD SPOOFING (FALSIFICACIÓN DE MÉTODO)
         * Los formularios HTML nativos solo soportan GET y POST. Si se recibe
         * un campo oculto '_method', se sobreescribe internamente para
         * soportar peticiones PUT o DELETE desde el Frontend.
         */
        if ($requestMethod === 'POST' && isset($_POST['_method'])) {
            $requestMethod = strtoupper($_POST['_method']);
        }

        $url = '/' . trim($url, '/');

        /**
         * BÚSQUEDA Y EXTRACCIÓN CON REGEX
         * Itera sobre las rutas y convierte la URI registrada en un patrón.
         * Si la URL coincide, extrae los parámetros dinámicos.
         */
        foreach ($this->routes as $route) {
            
            // Convierte la ruta (ej: /api/projects/(\d+)) a formato Regex estricto
            $pattern = '#^' . $route['uri'] . '$#';

            if ($route['method'] === $requestMethod && preg_match($pattern, $url, $matches)) {
                
                // Elimina el índice [0] de las coincidencias (que contiene la URL completa)
                // para aislar únicamente los parámetros limpios (ej: el ID).
                array_shift($matches);

                /**
                 * INSTANCIACIÓN Y EJECUCIÓN DINÁMICA
                 * Divide la cadena 'Controlador@metodo'. Instancia el archivo 
                 * del controlador en tiempo de ejecución e inyecta los 
                 * parámetros extraídos de la URL mediante el operador spread (...).
                 */
                $actionParts = explode('@', $route['action']);
                $controllerName = $actionParts[0];
                $methodName = $actionParts[1];

                $controllerFile = APP_PATH . '/Controllers/' . $controllerName . '.php';

                if (file_exists($controllerFile)) {
                    require_once $controllerFile;
                    
                    // Instancia el controlador al vuelo
                    $controller = new $controllerName();
                    
                    if (method_exists($controller, $methodName)) {
                        return $controller->$methodName(...$matches);
                    }
                }
            }
        }

        /**
         * RESPUESTA 404 (FALLBACK INTELIGENTE)
         * Si el bucle finaliza sin encontrar ninguna coincidencia, interrumpe la petición.
         * Discrimina si se debe responder con JSON (para la API) o renderizar la vista de error (HTML).
         */
        http_response_code(404);

        if (strpos($url, '/api/') === 0) {
            // Petición dirigida a la API
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => 'Endpoint de la API no encontrado']);
        } else {
            // Petición de navegación del navegador (Carga la vista dedicada)
            require_once APP_PATH . '/Views/error.php';
        }
        
        return;
    }
}