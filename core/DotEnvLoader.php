<?php
// core/DotEnvLoader.php

/**
 * DOTENV LOADER
 * ====================
 * Analizador y cargador de variables de entorno. Su misión es leer el
 * archivo .env en la raíz del proyecto y cargar las credenciales seguras
 * (base de datos, claves de API, etc.) en el entorno de ejecución de PHP.
 */
class DotEnvLoader
{
    /**
     * MÉTODO DE CARGA PRINCIPAL
     * Abre el archivo especificado, lo lee línea a línea omitiendo
     * comentarios o líneas en blanco, y registra las claves y valores.
     *
     * @param string $path Ruta absoluta al archivo .env
     */
    public static function load($path)
    {
        // Validación de existencia del archivo
        if (!file_exists($path)) {
            return false;
        }

        /**
         * LECTURA EFICIENTE DE ARCHIVO
         * Utiliza file() para cargar todas las líneas en un array.
         * Aplica flags para eliminar saltos de línea e ignorar líneas vacías.
         */
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            
            // Omite las líneas que comienzan con '#' (comentarios estándar de .env)
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            /**
             * EXTRACCIÓN KEY=VALUE
             * Busca el delimitador '='. Utiliza explode con límite de 2 para
             * garantizar que los valores que contengan '=' internamente no se rompan.
             */
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);

                // Limpia comillas simples o dobles que rodeen el valor (ej: DB_PASS="1234")
                $value = trim($value, '"\'');

                /**
                 * INYECCIÓN EN EL ENTORNO
                 * Registra la variable en tres niveles diferentes de PHP para
                 * maximizar la compatibilidad con distintas configuraciones de servidor.
                 */
                if (!empty($name)) {
                    putenv(sprintf('%s=%s', $name, $value)); // Nivel sistema operativo
                    $_ENV[$name] = $value;                   // Array superglobal de entorno
                    $_SERVER[$name] = $value;                // Array superglobal del servidor
                }
            }
        }
        return true;
    }
}