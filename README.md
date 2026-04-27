# Steel Inox — Extranet de Gestión de Proyectos

> Proyecto de fin de ciclo desarrollado por dos estudiantes de DAW.
> Una extranet privada para que la empresa Steel Inox gestione sus proyectos, clientes y documentación técnica de forma centralizada y segura.

---

## ¿Qué es esto?

Steel Inox es una **extranet SPA (Single Page Application)** construida con PHP puro en el backend y JavaScript vanilla en el frontend, sin frameworks de terceros. El cliente accede a través de un portal web donde puede consultar el estado de sus proyectos, descargar documentos y dejar comentarios. Los trabajadores internos (admin y comerciales) gestionan todo desde el mismo panel.

La idea surgió como proyecto real para una empresa de acero inoxidable. Lo hemos construido siguiendo un documento de diseño técnico propio (`Steel_Inox_DDS_Tecnico.md`).

---

## Tecnologías usadas

| Capa | Tecnología |
|---|---|
| Servidor | PHP 8.4 + Apache (XAMPP) |
| Base de datos | MariaDB 10.4 (XAMPP) |
| Frontend | JavaScript ES6+ Vanilla, HTML5, CSS3 |
| Email | API de Brevo (transaccional) |
| Autenticación | Sesiones PHP + rate limiting + 2FA OTP |
| Almacenamiento | Sistema de ficheros local (`/storage/documents/`) |
| Tests | PHPUnit |

---

## Arquitectura del proyecto

```
steelinox/
├── app/
│   ├── Controllers/     # Lógica de negocio por recurso (API JSON)
│   ├── Models/          # Capa de acceso a datos (PDO puro)
│   ├── Policies/        # Autorización (AccessMatrix + políticas por recurso)
│   ├── Requests/        # Validación y sanitización de entrada
│   ├── Services/        # AuditLogger, ErrorLogger, MailService, NotificationService
│   ├── Helpers/         # PaginationHelper
│   └── Views/           # Shell HTML de la SPA (una sola vista)
├── core/
│   ├── Database.php     # Singleton PDO con reconexión automática
│   ├── DotEnvLoader.php # Cargador de variables de entorno (.env)
│   └── Router.php       # Router propio con soporte de parámetros dinámicos
├── cron/
│   ├── worker.php       # Worker de cola de notificaciones por email
│   └── README_CRON.md   # Instrucciones de configuración del cron
├── public/
│   ├── index.php        # Punto de entrada único (front controller)
│   ├── assets/          # JS, CSS e imágenes del frontend
│   └── .htaccess        # Reescritura de URLs para la SPA
├── routes/
│   └── web.php          # Definición de todas las rutas de la API
├── storage/
│   ├── documents/       # Archivos subidos (nombres opacos, sin extensión pública)
│   └── logs/            # Logs de errores y salida del cron
├── tests/               # Tests unitarios PHPUnit
├── steel_inox_db.sql    # Script completo de la base de datos
├── instalar_bd_windows.bat
├── instalar_bd_linux.sh
└── .env                 # Variables de entorno (NO subir al repo)
```

El backend expone una **API JSON REST** consumida por el frontend JavaScript. El único punto de entrada HTML es `public/index.php`, que sirve la shell de la SPA para cualquier ruta no-API. El router se encarga de distinguir entre peticiones de página y peticiones de datos.

---

## Instalación en local (XAMPP)

### 1. Requisitos previos

- **XAMPP** instalado con **Apache** y **MySQL** funcionando
- **PHP 8.1 o superior** (incluido con XAMPP)
- **Composer** instalado globalmente (solo para dependencias de tests)
- La carpeta del proyecto debe estar en `C:\xampp\htdocs\steelinox\`

> ⚠️ **El nombre de la carpeta importa.** La variable `APP_BASE_URL` en `.env` apunta a `/steelinox`. Si pones el proyecto en otra carpeta, tendrás que cambiarla.

### 2. Configurar el `.env`

Copia o edita el archivo `.env` en la raíz del proyecto. Las variables que necesitas revisar:

```env
# Base de datos
DB_HOST=localhost
DB_NAME=steel_inox_db
DB_USER=root
DB_PASS=              # En XAMPP por defecto está vacía

# URL base de la aplicación (sin barra final)
APP_BASE_URL=/steelinox

# Límite de subida de documentos
MAX_FILE_SIZE_MB=100

# API de Brevo para envío de emails (opcional en local)
BREVO_API_KEY=tu_api_key_aqui
MAIL_SENDER_EMAIL=tucorreo@ejemplo.com
MAIL_SENDER_NAME="Soporte Steel Inox"
```

> Si no tienes cuenta en Brevo, el sistema funcionará igual en local; simplemente las notificaciones por email quedarán en la tabla `notifications_queue` sin enviarse hasta que el worker las procese.

### 3. Instalar la base de datos

**En Windows** — Doble clic en:
```
instalar_bd_windows.bat
```

**En Linux / Mac** — Desde la terminal:
```bash
chmod +x instalar_bd_linux.sh
./instalar_bd_linux.sh
```

Ambos scripts crean la base de datos `steel_inox_db`, importan el esquema completo desde `steel_inox_db.sql` e insertan los datos iniciales (usuario administrador incluido).

> Si prefieres hacerlo manualmente, abre phpMyAdmin, crea una base de datos llamada `steel_inox_db` con cotejamiento `utf8mb4_unicode_ci` e importa el archivo `steel_inox_db.sql`.

### 4. Configurar Apache para la SPA

La aplicación usa un único `.htaccess` en la raíz y otro en `public/` para redirigir todas las peticiones al front controller. Con XAMPP por defecto esto debería funcionar directamente, pero asegúrate de que el módulo `mod_rewrite` está activado:

1. Abre `C:\xampp\apache\conf\httpd.conf`
2. Busca la línea `#LoadModule rewrite_module` y quítale el `#`
3. Busca el bloque `<Directory "C:/xampp/htdocs">` y cambia `AllowOverride None` por `AllowOverride All`
4. Reinicia Apache desde el panel de XAMPP

### 5. Instalar dependencias de Composer (solo para tests)

```bash
composer install
```

### 6. Acceder a la aplicación

Abre el navegador y ve a:
```
http://localhost/steelinox
```

**Credenciales de administrador por defecto:**
| Campo | Valor |
|---|---|
| Email | `admin@steelinox.com` |
| Contraseña | `Admin1234!` |

> Cambia la contraseña nada más entrar.

---

## Roles del sistema

| Rol | Descripción |
|---|---|
| **admin** | Acceso total. Gestiona clientes, comerciales, proyectos y auditoría. |
| **comercial** | Ve y gestiona solo sus proyectos y clientes asignados. |
| **cliente** | Acceso de solo lectura a sus proyectos. Puede comentar en documentos visibles. |

La matriz de permisos completa está en `app/Policies/AccessMatrix.php`.

---

## Flujos principales

### Aprobación de propuestas (2FA)
Las propuestas no se pueden aprobar con un simple clic. El flujo es:
1. El comercial/admin pulsa "Solicitar aprobación"
2. El sistema genera un código OTP de 6 dígitos, lo hashea con `password_hash` y guarda el hash en BD
3. El código en texto plano se envía por email al usuario
4. El usuario introduce el código en el modal — máximo 3 intentos, caduca en 10 minutos
5. Si es correcto, el proyecto pasa a estado `aprobado` y se registra en auditoría con IP, rol y método

### Versionado de documentos
Si se sube un archivo con el mismo título que uno ya existente en el proyecto, el sistema lo detecta y crea una nueva versión automáticamente en lugar de duplicar el documento. El historial de versiones es accesible y cada una tiene su propio checksum SHA-256.

### Subida y descarga de archivos
Los archivos se guardan con nombre opaco (`hex_aleatorio_timestamp`) en `storage/documents/`, fuera del directorio público. Las descargas se sirven a través de PHP con control de acceso y soporte de **Range requests (HTTP 206)** para streaming de vídeo.

---

## Worker de notificaciones (Cron)

El sistema de emails usa una **cola asíncrona**: los eventos (alta de usuario, cambio de estado, nuevo comentario, código OTP...) se insertan en la tabla `notifications_queue` y un worker los procesa en segundo plano.

El script del worker es `cron/worker.php`. Procesa hasta 50 correos por ejecución con reintentos automáticos (máximo 3 intentos por correo).

### Configurar el cron en XAMPP / Windows

Abre el **Programador de Tareas de Windows** y crea una tarea con estas opciones:

- **General:** "Ejecutar tanto si el usuario ha iniciado sesión como si no" + "Oculta"
- **Desencadenador:** Diariamente → repetir cada **1 minuto** de forma indefinida
- **Acción:**
  - Programa: `C:\xampp\php\php.exe`
  - Argumentos: `C:\xampp\htdocs\steelinox\cron\worker.php`

O ejecutarlo manualmente en cualquier momento:
```bash
C:\xampp\php\php.exe C:\xampp\htdocs\steelinox\cron\worker.php
```

### Configurar el cron en Linux (producción)

```bash
crontab -e
```
Añadir:
```
* * * * * /usr/bin/php /var/www/html/steelinox/cron/worker.php >> /var/www/html/steelinox/storage/logs/cron.log 2>&1
```

> Instrucciones detalladas en `cron/README_CRON.md`.

---

## Tests

Usamos **PHPUnit** para los tests unitarios:

```bash
# Ejecutar todos los tests
./vendor/bin/phpunit

# Con salida detallada
./vendor/bin/phpunit --testdox
```

Los tests se encuentran en la carpeta `tests/`.

---

## Seguridad (resumen)

- **Autenticación:** Sesiones PHP con regeneración de ID tras login para prevenir session fixation
- **Rate limiting:** Bloqueo de login tras 5 intentos fallidos en 15 minutos (registrado en auditoría)
- **Autorización:** Modelo "deny by default" — toda acción requiere permiso explícito en `AccessMatrix`
- **Inputs:** Sanitización con `htmlspecialchars` + validación en clases `Request` dedicadas
- **Contraseñas:** `password_hash()` con `PASSWORD_DEFAULT` (bcrypt)
- **Archivos:** Verificación de MIME real con `finfo` (no solo la extensión) + nombres opacos en disco
- **SQL:** PDO con prepared statements en todas las consultas — sin concatenación de strings
- **Auditoría:** Log inmutable de todas las acciones críticas con IP, user-agent y actor

---

## Estructura de la API

Todas las rutas están definidas en `routes/web.php`. Patrón de respuesta uniforme:

```json
{
  "success": true | false,
  "message": "Descripción legible",
  "data": { ... } | null,
  "errors": { "campo": "mensaje" } | null,
  "pagination": { "total": 0, "page": 1, "limit": 15, "pages": 1 }
}
```

| Recurso | Prefijo |
|---|---|
| Autenticación | `/api/auth/...` |
| Proyectos | `/api/projects/...` |
| Clientes | `/api/clients/...` |
| Documentos | `/api/projects/{id}/documents/...` |
| Comentarios | `/api/projects/{pid}/documents/{did}/comments/...` |
| Usuarios cliente | `/api/users/...` |
| Comerciales | `/api/commercials/...` |
| Auditoría | `/api/audit/...` |
| Perfil propio | `/api/me/...` |

---

## Créditos

Desarrollado como Proyecto DDS de Steel Inox por:

- **José Luis Puchades** — Backend completo (PHP, base de datos, arquitectura, seguridad)
- **Joan Rodrigo** — Frontend completo (JavaScript, CSS, interfaz de usuario)

---
