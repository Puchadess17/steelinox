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
        
        // Soporte para "method spoofing" (formularios HTML que envían un campo oculto _method)
        if ($requestMethod === 'POST' && isset($_POST['_method'])) {
            $requestMethod = strtoupper($_POST['_method']);
        }

        $url = '/' . trim($url, '/');

        foreach ($this->routes as $route) {
            if ($route['method'] === $requestMethod && $route['uri'] === $url) {
                // Separamos el string "Controlador@metodo"
                $actionParts = explode('@', $route['action']);
                $controllerName = $actionParts[0];
                $methodName = $actionParts[1];

                $controllerFile = APP_PATH . '/Controllers/' . $controllerName . '.php';

                if (file_exists($controllerFile)) {
                    require_once $controllerFile;
                    $controller = new $controllerName();
                    
                    if (method_exists($controller, $methodName)) {
                        // Ejecutamos el método del controlador y salimos del router
                        return $controller->$methodName();
                    }
                }
            }
        }

        // Si el bucle termina y no hay coincidencia, devolvemos un 404
        http_response_code(404);
        require APP_PATH . '/Views/error.php';
        return;
    }
}