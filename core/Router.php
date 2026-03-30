<?php
// core/Router.php

class Router {
    protected $routes = [];

    // Método principal para registrar una ruta
    public function add($method, $uri, $action) {
        $this->routes[] = [
            'method' => strtoupper($method),
            'uri'    => '/' . trim($uri, '/'),
            'action' => $action
        ];
    }

    // Métodos atajo para limpiar el código al definir rutas
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

    // Despachar la URL al controlador correcto
    public function dispatch($url) {
        $requestMethod = $_SERVER['REQUEST_METHOD'];
        
        // "method spoofing"
        if ($requestMethod === 'POST' && isset($_POST['_method'])) {
            $requestMethod = strtoupper($_POST['_method']);
        }

        $url = '/' . trim($url, '/');

        foreach ($this->routes as $route) {
            // URI guardada en un patrón de expresión regular
            // Ej: /api/projects/(\d+) se convierte en #^/api/projects/(\d+)$#
            $pattern = '#^' . $route['uri'] . '$#';

            // preg_match en lugar de === p --> URL encaja con el patrón
            if ($route['method'] === $requestMethod && preg_match($pattern, $url, $matches)) {
                
                // Eliminar primer elemento de $matches (que es la URL completa)
                // para quedarnos con los parámetros capturados (ej: el ID '1')
                array_shift($matches);

                $actionParts = explode('@', $route['action']);
                $controllerName = $actionParts[0];
                $methodName = $actionParts[1];

                $controllerFile = APP_PATH . '/Controllers/' . $controllerName . '.php';

                if (file_exists($controllerFile)) {
                    require_once $controllerFile;
                    $controller = new $controllerName();
                    
                    if (method_exists($controller, $methodName)) {
                        // Ejecuto método pasándole los parámetros extraídos dinámicamente
                        // El operador ... (spread) convierte el array en argumentos separados
                        return $controller->$methodName(...$matches);
                    }
                }
            }
        }

        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Ruta no encontrada']);
        return;
    }
}