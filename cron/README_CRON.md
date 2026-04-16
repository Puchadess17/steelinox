# Configuración del Cron - Steel Inox

Este documento detalla los pasos necesarios para configurar la ejecución automática del worker de correos en diferentes entornos de servidor.

## 1. Configuración en Servidores Linux (Crontab)

Esta es la forma estándar y más robusta cuando la aplicación está alojada en un VPS con Ubuntu, Debian, CentOS o distribuciones similares.

1.  Acceder al servidor mediante SSH.
2.  Abrir el editor de tareas programadas del usuario que ejecuta el servidor web (normalmente `www-data` o el usuario principal) mediante el comando:
    ```bash
    crontab -e
    ```
3.  Añadir la siguiente línea al final del archivo. **Nota importante:** En cron es vital utilizar siempre rutas absolutas tanto para el ejecutable de PHP como para el script.
    ```bash
    * * * * * /usr/bin/php /var/www/html/steelinox/cron/worker.php >> /var/www/html/steelinox/storage/logs/cron.log 2>&1
    ```

### Desglose de la instrucción:
* `* * * * *`: Indica al sistema que debe ejecutar el comando cada minuto de cada hora de cada día.
* `/usr/bin/php`: Representa la ruta al ejecutable de PHP (puede variar a `/usr/local/bin/php` según el servidor; se puede verificar con `which php`).
* `/var/www/.../worker.php`: Indica la ruta absoluta al script del worker.
* `>> .../cron.log 2>&1`: Redirige cualquier salida o error crítico al sistema de logs configurado, evitando la pérdida de información de depuración.

---

## 2. Configuración en Servidores Windows (Programador de Tareas)

En entornos de producción o desarrollo basados en Windows, se debe utilizar el **Programador de Tareas (Task Scheduler)**. Para asegurar una ejecución en segundo plano sin ventanas de consola visibles, se recomiendan los siguientes pasos:

1.  Abrir el menú Inicio, buscar y ejecutar el **Programador de Tareas**.
2.  En el panel derecho, seleccionar **"Crear Tarea..."** (evitar la opción de tarea básica).
3.  **Pestaña General:**
    * **Nombre:** Steelinox Mail Worker
    * Activar: "Ejecutar tanto si el usuario ha iniciado sesión como si no".
    * Activar: "Oculta" (Hidden).
4.  **Pestaña Desencadenadores (Triggers):**
    * Hacer clic en **Nuevo**.
    * **Iniciar la tarea:** Según la programación (On a schedule).
    * Seleccionar: **Diariamente**.
    * En ajustes avanzados, activar **"Repetir la tarea cada:"** y escribir `1 minuto`.
    * **Duración:** Indefinidamente.
5.  **Pestaña Acciones (Actions):**
    * Hacer clic en **Nueva**.
    * **Acción:** Iniciar un programa.
    * **Programa/script:** Buscar la ruta al ejecutable `php.exe` (ej. `C:\xampp\php\php.exe`).
    * **Añadir argumentos:** Ingresar la ruta absoluta al worker (ej. `C:\xampp\htdocs\steelinox\cron\worker.php`).
6.  Guardar la tarea (el sistema solicitará las credenciales de administrador de Windows).