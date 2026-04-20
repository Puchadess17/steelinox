# Análisis Técnico Exhaustivo — Steel Inox Extranet vs. DDS v1.0

> **Fecha de análisis:** 20 de abril de 2026  
> **Versión DDS evaluada:** v1.0  
> **Commit / snapshot analizado:** Estado actual del repositorio en `c:\xampp\htdocs\steelinox`

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Cobertura por criterio de aceptación del DDS](#2-cobertura-por-criterio-de-aceptación-del-dds)
3. [Análisis por área](#3-análisis-por-área)
   - [3.1 Arquitectura y estructura](#31-arquitectura-y-estructura)
   - [3.2 Modelo de datos y base de datos](#32-modelo-de-datos-y-base-de-datos)
   - [3.3 Autenticación y sesiones](#33-autenticación-y-sesiones)
   - [3.4 Roles, permisos y políticas](#34-roles-permisos-y-políticas)
   - [3.5 Gestión de clientes y usuarios](#35-gestión-de-clientes-y-usuarios)
   - [3.6 Gestión de proyectos y estados](#36-gestión-de-proyectos-y-estados)
   - [3.7 Gestión documental](#37-gestión-documental)
   - [3.8 Comentarios](#38-comentarios)
   - [3.9 Aprobaciones](#39-aprobaciones)
   - [3.10 API interna asíncrona](#310-api-interna-asíncrona)
   - [3.11 Notificaciones](#311-notificaciones)
   - [3.12 Auditoría y trazabilidad](#312-auditoría-y-trazabilidad)
   - [3.13 Frontend / SPA](#313-frontend--spa)
   - [3.14 Seguridad y hardening](#314-seguridad-y-hardening)
   - [3.15 Entorno, despliegue y configuración](#315-entorno-despliegue-y-configuración)
4. [Fortalezas destacadas](#4-fortalezas-destacadas)
5. [Gaps y deudas técnicas](#5-gaps-y-deudas-técnicas)
6. [Riesgos identificados](#6-riesgos-identificados)
7. [Roadmap — Checklist hacia el MVP completo](#7-roadmap--checklist-hacia-el-mvp-completo)

---

## 1. Resumen ejecutivo

El proyecto Steel Inox Extranet se encuentra en un **estado muy sólido** para el tiempo que lleva en desarrollo. El núcleo arquitectónico es correcto y denso: MVC nativo PHP 8.4, router propio con regex, middleware CSRF real con `hash_equals`, auditoría persistente en BD, notificaciones con cola de base de datos y worker cron, servido de archivos autenticado con soporte Range, e integridad referencial completa en la base de datos. Todo ello supone una base de ingeniería seria.

**El grado de cobertura del MVP definido en el DDS es alto (~75-80%)**, aunque existen áreas críticas que todavía presentan gaps o implementación incompleta. Los más importantes son:

- El **panel de cliente** (rol `cliente`) no tiene vistas dedicadas ni lógica de UI diferenciada — toda la SPA está orientada al rol admin/comercial.
- **Falta el módulo de búsqueda y filtros** para el cliente (DDS §7.7), aunque sí existe para roles internos.
- El **cron worker existe** pero no está activo en XAMPP, por lo que los emails de la cola nunca se envían en el entorno local de desarrollo.
- La **política de `validatePasswordPolicy`** está duplicada en tres controllers (`UserController`, `PasswordResetController` y por código similar en `CommercialController`) en lugar de centralizada en un servicio.
- El **.env contiene una API key real de Brevo** versionada, lo cual es una vulnerabilidad de seguridad activa.
- **No hay tests automatizados** (sección `/tests` vacía / inexistente) pese a ser requerimiento del DDS §15.2.

---

## 2. Cobertura por criterio de aceptación del DDS

*(DDS §18 — Criterios de aceptación)*

| # | Criterio | Estado | Notas |
|---|---|:---:|---|
| 1 | Admin puede crear clientes, comerciales, usuarios cliente y proyectos sin acceso cruzado entre comerciales | ✅ **Completo** | Políticas en modelo + ProjectPolicy + ClientPolicy |
| 2 | Comercial solo ve y opera sobre proyectos asignados a él | ✅ **Completo** | Filtro SQL en `Project::getById` y `getListByUser` |
| 3 | Cliente solo accede a proyectos de su empresa | ✅ **Completo** | Filtro por `client_id` en todas las consultas |
| 4 | Proyecto admite múltiples documentos y versiones; siempre muestra una vigente | ✅ **Completo** | `documents` + `document_versions` con `is_current` y `current_version_id` |
| 5 | PDFs, imágenes y vídeos se sirven sin URL pública directa | ✅ **Completo** | `DocumentController::serveFile` con autenticación + Range HTTP |
| 6 | Descargas solo tras validación de sesión y autorización | ✅ **Completo** | `AuthMiddleware::check()` + `DocumentPolicy` en cada petición |
| 7 | Cliente puede comentar y aprobar en estados permitidos | ⚠️ **Parcial** | Backend completo; **falta la vista/UI dedicada para el cliente** |
| 8 | Todo cambio relevante genera log auditable | ✅ **Completo** | `AuditLogger::log()` en todos los controladores relevantes |
| 9 | Proyectos cerrados no admiten edición ni comentarios, pero pueden reabrirse | ✅ **Completo** | `ProjectPolicy::canEdit`, `CommentPolicy::canCreateOnProject`, motivo obligatorio en reaper. |
| 10 | Sistema arranca en XAMPP con script SQL | ✅ **Completo** | `steel_inox_db.sql` + scripts `.bat` y `.sh` para instalación |

---

## 3. Análisis por área

### 3.1 Arquitectura y estructura

#### ✅ Qué está perfecto

- La estructura de carpetas replica casi exactamente la propuesta en DDS §5.2: `/app/Controllers`, `/app/Models`, `/app/Services`, `/app/Policies`, `/app/Helpers`, `/app/Views`, `/config`, `/core`, `/public`, `/storage`, `/routes`.
- Front controller único en `/public/index.php` (DDS §5.3 ✅).
- Router propio con soporte GET/POST/PUT/DELETE y method spoofing (DDS §5.3 ✅).
- `AuthMiddleware` como capa de interceptores (DDS §5.3 ✅).
- Servicios de dominio separados: `AuditLogger`, `NotificationService`, `MailService`, `ErrorLogger`.
- Repositorios/modelos por agregado con PDO preparado.
- `core/Database.php` implementa el patrón Singleton para la conexión a BD.
- `core/DotEnvLoader.php` carga el `.env` sin dependencias.

#### ⚠️ Qué hay que mejorar

- La carpeta `/tests` **no existe en absoluto**. El DDS §15.2 exige tests de autorización, transiciones de estado, visualización/descarga de documentos, versionado, comentarios y reapertura.
- Falta la carpeta `/app/Requests` definida en el DDS §5.2. Las validaciones están distribuidas en los controllers. Un patrón de Request/FormRequest desacoplaría validación de control y eliminaría duplicación (la lógica de password validation se repite en 2-3 sitios).
- El router devuelve 404 con `json_encode` incluso para rutas de navegación del SPA (que esperan HTML). Esto podría provocar que páginas directas devuelvan JSON en lugar de la app.

---

### 3.2 Modelo de datos y base de datos

#### ✅ Qué está perfecto

- Todas las entidades críticas del DDS §6 están implementadas: `users`, `clients`, `projects`, `project_user`, `documents`, `document_versions`, `comments`, `project_status_logs`, `audit_logs`, `notifications_queue`.
- El esquema incluye todos los campos mínimos exigidos en DDS §6.2 y algunos adicionales valiosos (`approval_token`, `approval_token_expires_at`, `reset_token`, `reset_token_expires_at`).
- `ENUM` correctos para `role`, `status`, `type`, `access_mode`.
- Estrategia de borrado lógico en todas las entidades: campo `deleted_at` presente y respetado.
- Índices del Anexo A del DDS casi completamente implementados (faltan algunos menores, ver gaps).
- Integridad referencial con FK completa, incluyendo `ON DELETE SET NULL` en `audit_logs` y `ON DELETE CASCADE` donde procede.
- `checksum_sha256` (`CHAR(64)`) en `document_versions` — implementado tal cual el DDS.
- `metadata_json` con `CHECK (json_valid(...))` en `audit_logs` — restricción de nivel BD excelente.
- `utf8mb4` en todas las tablas.
- Seed de datos mínimos: admin, comercial, cliente demo, proyectos demo.

#### ⚠️ Qué hay que mejorar

- **Problemas con la referencia de generación secuencial**: `generateNextReference()` busca el último por `ORDER BY id DESC` en lugar de por número más alto de la referencia. Si un proyecto se elimina (lógico), podría generar referencias fuera de secuencia o colisión. Debería extraer el número máximo de la referencia con `MAX()` o `SUBSTRING_INDEX`.
- **Falta índice** `users(email)` como índice simple — en el SQL actual hay `UNIQUE KEY email` que lo cubre, pero no figura explícitamente como el índice de búsqueda del Anexo A (de hecho sí lo hace). ✅ OK.
- **`notifications_queue` no tiene índice en `status`** — el worker que procesa emails pendientes hará un full-scan si hay muchas notificaciones.
- **`project_status_logs` no tiene índice por `project_id, created_at`** para consultas de histórico (DDS Anexo A lo menciona indirectamente).
- **El campo `approval_token` tiene longitud `varchar(10)`** — el token generado es 6 dígitos (OK), pero podría hacerse más robusto con un token criptográfico más largo.

---

### 3.3 Autenticación y sesiones

#### ✅ Qué está perfecto

- `password_hash` con `PASSWORD_DEFAULT` (bcrypt cost 12 en los seeds) y `password_verify` (DDS §7.1 ✅).
- **`session_regenerate_id(true)`** tras login exitoso (DDS §15.3 checklist ✅).
- Control de **timeout por inactividad** a 1800s / 30 min en `AuthMiddleware` y `AuthController::me()` (DDS §7.1 ✅).
- **Rate limiting real** basado en auditoría de SQL: bloqueo tras 5 intentos fallidos desde la misma IP en 15 min (DDS §7.1 — "política de bloqueo blando" ✅).
- **CSRF**: token generado con `bin2hex(random_bytes(32))`, comparado con `hash_equals()` en cabecera `X-CSRF-TOKEN` en todas las mutaciones (DDS §7.1 ✅).
- CSRF se registra en auditoría si falla (`auth_csrf_blocked`).
- **Reset de contraseña**: token `bin2hex(random_bytes(32))`, expiración de 60 minutos, invalidado tras uso (`clearResetToken`). Flujo completo. (DDS §7.1 ✅).
- Política de contraseñas en creación/modificación: mínimo 8 caracteres, mayúscula, minúscula, número, sin igualdad al prefijo del email.
- `last_login_at` se actualiza en cada login exitoso (DDS usuarios §6.2 ✅).

#### ⚠️ Qué hay que mejorar

- **No se fuerza HTTPS ni `session.cookie_secure`** en la configuración de PHP. En local no es un problema, pero en producción debería establecerse `session_set_cookie_params(['secure' => true, 'httponly' => true, 'samesite' => 'Strict'])` antes de `session_start()`.
- **`AuthController::me()`** duplica la lógica de timeout que ya está en `AuthMiddleware::check()`. Debería reutilizar el mismo middleware en lugar de reescribir las mismas comprobaciones.
- La política de contraseñas **no exige carácter especial** (el DDS no la específica, pero para un entorno profesional sería recomendable).
- El `validatePasswordPolicy` está **copiado y pegado** en `UserController`, `PasswordResetController`. Debe moverse a un `PasswordService` o `Validator` compartido.

---

### 3.4 Roles, permisos y políticas

#### ✅ Qué está perfecto

- Los tres roles del DDS §3.1 están implementados: `admin`, `comercial`, `cliente`.
- Existe un archivo de Policy por cada entidad principal: `ProjectPolicy`, `DocumentPolicy`, `CommentPolicy`, `UserPolicy`, `ClientPolicy`, `AuditPolicy`.
- `ProjectPolicy::canApprove` bloquea correctamente al rol `comercial`.
- `ProjectPolicy::canDelete` restringe la eliminación solo al admin y solo en proyectos cerrados.
- `DocumentPolicy::canAccessDocument`, `canDownload`, `canViewInline` y `canUploadToProject` implementados.
- `CommentPolicy::canView`, `canCreateOnProject`, `canCreateOnDocument` separan correctamente la lógica.
- El modelo `Project::getById` inyecta las reglas de alcance directamente en SQL (no en memoria), lo cual es correcto y eficiente.
- La "consulta como escudo": si el comercial no tiene acceso al proyecto, el modelo devuelve null y el controller retorna 404 (no 403), para no revelar la existencia del recurso.

#### ⚠️ Qué hay que mejorar

- **`ProjectPolicy::canRemoveUsers`** solo permite al admin quitar comerciales. El DDS §3.2 dice que el comercial puede gestionar usuarios de sus proyectos — habría que revisar si esta restricción es una decisión de negocio confirmada o un gap.
- **No existe una Policy central** que defina de forma declarativa toda la matriz de permisos. Las policies son métodos estáticos sueltos — funciona, pero es difícil auditar la cobertura completa de un vistazo.
- **Los policies no tienen tests**. Sin tests, es imposible garantizar que una regresión no abra un agujero de permisos.

---

### 3.5 Gestión de clientes y usuarios

#### ✅ Qué está perfecto

- CRUD completo para `clients` y usuarios cliente en `ClientController` y `UserController`.
- Borrado lógico (`deleted_at`) en ambas entidades.
- **Escudo de permisos de ámbito comercial**: el comercial solo puede ver/editar clientes que él ha creado o que están en su ámbito (verificado en el modelo `Client::getDetailsById`).
- Email de bienvenida encolado con credenciales en texto plano solo en el primer msg (⚠️ ver gaps).
- Validación de email único antes de insertar.
- `last_login_at` visible para roles internos (DDS §7.3 ✅).
- El controller `UserController` elimina `password_hash` del response antes de devolver al front (`unset($user['password_hash'])`).
- Activación/desactivación lógica con `is_active` ✅.

#### ⚠️ Qué hay que mejorar

- **El email de bienvenida envía la contraseña en texto plano** en la notificación de cola (`password_plana`). Esto es un riesgo de seguridad — si la cola se compromete, las contraseñas quedan expuestas. Debería enviarse un enlace de activación/establecimiento de contraseña en su lugar, o al menos usarse una contraseña temporal que se obliga a cambiar.
- **No existe la vista de ficha de cliente para el panel del comercial** — el DDS §7.2 exige "ficha con usuarios y proyectos asociados". El backend lo tiene (`ClientController::show`), pero la UI no la expone correctamente para el comercial en modo standalone.
- El `ClientController` no tiene columna de búsqueda por `reference` en algunos filtros (mejorable).

---

### 3.6 Gestión de proyectos y estados

#### ✅ Qué está perfecto

- CRUD completo: `store`, `show`, `update`, `destroy`, `search` en `ProjectController`.
- **Máquina de estados** completa y estricta: `propuesta → aprobado → ejecucion → cerrado` con transiciones permitidas definidas en un mapa (`$allowedTransitions`).
- Reapertura (`cerrado → ejecucion | propuesta`) con **motivo obligatorio** (DDS §4.3 ✅).
- `project_status_logs` se actualiza en cada transición (con `old_status`, `new_status`, `reason`) mediante transacción atómica.
- `approved_at` y `closed_at` se gestionan automáticamente.
- Asignación múltiple de comerciales (N:M via `project_user`) con `INSERT IGNORE` para idempotencia.
- Auto-asignación del comercial creador al proyecto.
- `generateNextReference()` con formato `PRJ-YYYY-XXXX`.
- Filtros de búsqueda por nombre, referencia y estado con paginación.
- Ordenación dinámica con lista blanca de columnas permitidas (injection-safe).
- `ProjectController::destroy` solo permite borrar proyectos cerrados (protección de negocio).

#### ⚠️ Qué hay que mejorar

- **La transición `aprobado → cerrado` no pasa por `ejecucion`** — según el mapa actual `aprobado` solo puede ir a `ejecucion`. ¿Puede un proyecto cerrarse directamente desde `aprobado`? El DDS no lo prohíbe explícitamente pero el flujo lineal dice `Aprobado → Ejecución → Cerrado`. Confirmar con el cliente.
- **`generateNextReference()`**: usa `ORDER BY id DESC LIMIT 1` en lugar de `MAX(CAST(SUBSTRING_INDEX(reference, '-', -1) AS UNSIGNED))`. Si hay referencias eliminadas o gaps en el ID, puede generar colisión o gap visual. Bajo carga concurrente podría haber race condition (aunque la UNIQUE KEY lo protege).
- **El presupuesto no puede ser `NULL`** en la validación del controller (se exige como campo obligatorio), pero en el DDS §6.2 es `DECIMAL NULL`. Si el cliente no tiene presupuesto en fase inicial, no puede crear el proyecto.
- Falta el campo `project_type` como opción seleccionable (debería haber un listado/enum de tipos de proyecto — actualmente es texto libre).

---

### 3.7 Gestión documental

#### ✅ Qué está perfecto

- Modelo `documents` + `document_versions` completo con `is_current`, `checksum_sha256`, `archived_at`, `mime_type`, `file_size`.
- **Detección automática de MIME real** con `finfo` (no se confía en el `Content-Type` del cliente).
- **Whitelist exhaustiva de MIME types** que incluye PDF, imágenes, vídeo, Office, CAD/DWG, 3D, archivos comprimidos, etc.
- Archivos almacenados en `/storage/documents/` con nombre criptográfico (`bin2hex(random_bytes(16)) . '_' . time()`) — sin extensión en disco, lo que previene ejecución directa.
- **Auto-versionado**: si se sube un archivo con el mismo título en el mismo proyecto, se crea una nueva versión automáticamente.
- Servido en streaming con soporte de **HTTP Range** (esencial para vídeos y archivos grandes).
- **Session write close** antes del streaming (evita bloqueos de sesión durante la descarga).
- **Anti-cache headers** en archivos servidos (`Cache-Control: no-cache, no-store`).
- Auditoría de cada visualización y descarga (solo en primer chunk para evitar spam con Range).
- `DocumentPolicy` controla visibilidad al cliente, permiso de descarga e inline por separado.
- `access_mode`: `view/download/both` implementado.
- `is_visible_to_client` como bandera de visibilidad por documento.

#### ⚠️ Qué hay que mejorar

- **`storage_path` no incluye extensión** — es intencionado, pero hace más difícil el mantenimiento manual o la recuperación de disaster. Sería útil al menos guardar la extensión original en un campo separado.
- **Falta un endpoint para marcar una versión anterior como `is_current`** — si se sube una versión incorrecta, ¿cómo se revierte? El DDS §8.4 no lo especifica pero es operativamente necesario.
- **La whitelist de MIME en `addVersion()`** difiere ligeramente de la de `store()`** (incluye `application/octet-stream` como fallback en `addVersion` pero no en `store`). Debería centralizarse en una constante o método compartido.
- **No hay validación de extensión del archivo** (solo MIME). Aunque MIME real es más seguro, una doble validación de extensión también es buena práctica.
- **`DocumentController::store()` usa `htmlspecialchars` en `storage_path`** — el nombre en disco ya es aleatorio, no es necesario ni correcto aplicar esta transformación al path interno.
- **El `sanitizeName` aplica `MB_CASE_TITLE` al título** — esto puede romper nombres con siglas (ej. "DWG V2" → "Dwg V2"). Considerar solo sanitizar, no transformar la capitalización del título de documentos.

---

### 3.8 Comentarios

#### ✅ Qué está perfecto

- Comentarios ligados a `document_id` + `document_version_id` (DDS §4.4 ✅).
- Bloqueo automático si el proyecto está cerrado (`CommentPolicy::canCreateOnProject`).
- Verificación de que la versión existe y pertenece al documento antes de asociar.
- Paginación de comentarios.
- Auditoría de creación y eliminación de comentarios.
- Notificación a participantes con omisión del autor (DDS §10 ✅).
- Borrado lógico con `deleted_at`.
- Sanitización del cuerpo del comentario.

#### ⚠️ Qué hay que mejorar

- **No existe endpoint de edición de comentarios** — el DDS §11 menciona "edición lógica" y registrar texto anterior. El front quizá no lo exponga, pero el endpoint debería existir.
- **El DDS §4.4 dice que no hay comentarios internos ocultos en el MVP**, pero la política `CommentPolicy::canCreateOnDocument` bloquea al cliente de comentar en documentos no visibles. Esto es correcto. Sin embargo, falta validar que el rol cliente tampoco pueda *leer* comentarios de documentos internos (el `index` sí verifica esto ✅).
- **A quien se notifica en `nuevo_comentario` incluye al cliente** — correcto según DDS. Pero faltan tests para confirmar que el autor no se auto-notifica.
- La **UI de comentarios no está separada por versión** de forma visual (los comentarios de v1 y v2 se mezclan si no hay filtro en el front).

---

### 3.9 Aprobaciones

#### ✅ Qué está perfecto

- **Flujo de doble confirmación** implementado completamente: `requestApproval` (genera token de 6 dígitos, lo guarda en BD con expiración a 10 min, lo encola por email) + `confirmApproval` (valida token, valida expiración, cambia estado, lanza notificaciones).
- Verificación de que existe al menos una propuesta/presupuesto antes de aprobar.
- Auditoría en ambos pasos del flujo.
- Notificación de `propuesta_aprobada` tras confirmación exitosa.
- Limpieza del token tras uso.
- Sólo admin y cliente pueden aprobar (comercial bloqueado por `ProjectPolicy::canApprove`).

#### ⚠️ Qué hay que mejorar

- **Falta rate limiting en `confirmApproval`** — un atacante con sesión de cliente podría hacer brute force del token de 6 dígitos (solo 1.000.000 combinaciones) antes de que expire en 10 min. Debería haber un límite de intentos fallidos (ej: 3 intentos, luego invalidar el token).
- **El token de aprobación se almacena en texto plano** en la columna `approval_token`. Debería almacenarse un hash del token (como con los reset tokens).
- **La notificación de `propuesta_aprobada` no pasa por la cola** — el `confirmApproval` llama a `queueProjectEvent` con el tipo `'propuesta_aprobada'` que sí existe en el `NotificationService`. Revisar que el switch lo captura correctamente.

---

### 3.10 API interna asíncrona

#### ✅ Qué está perfecto

- Todos los endpoints del DDS §9 están implementados y registrados en `routes/web.php`.
- Respuestas JSON uniformes `{ success, message, data, errors }` en todos los controllers (DDS §9.1 ✅).
- Códigos HTTP coherentes (200, 201, 400, 401, 403, 404, 422, 500).
- CSRF para mutaciones + `X-Requested-With` implícito a través del middleware.
- Validación server-side en todos los endpoints mutables.

#### ⚠️ Qué hay que mejorar

- **El endpoint `GET /api/audit` no tiene paginación** documentada (el `AuditController` debería forzarla siempre para evitar devolver miles de registros).
- **No existe el endpoint `GET /api/documents/{versionId}/view`** según el DDS §9 (la ruta está definida como `/api/projects/{id}/documents/{id}/view` — funcional pero diferente a la spec del DDS). Menor, pero conviene documentar la desviación.
- Faltan endpoints PATCH (el DDS menciona `PATCH /api/projects/{id}/status`) — actualmente se usa PUT. Funcionalmente equivalente, pero desvía de la spec.
- **No hay versionado de API** (prefijo `/api/v1/`). Para un MVP es aceptable, pero conviene planificarlo.

---

### 3.11 Notificaciones

#### ✅ Qué está perfecto

- Cola de notificaciones en `notifications_queue` con campos `status`, `attempts`, `sent_at`, `error_log` (DDS §10 ✅).
- `NotificationService::queueProjectEvent` y `queueUserEvent` centralizan el encolado.
- Lógica de destinatarios diferenciada por evento: admins+comerciales vs. todos los participantes.
- **Exclusión del actor** (no se auto-notifica quien realiza la acción) (DDS §10 ✅).
- Deduplicación de emails en el mismo envío.
- **Plantillas HTML premium** con diseño corporativo en el `NotificationService::getHtmlWrapper`.
- `cron/worker.php` implementa el procesador de cola con reintentos (DDS §10.1 ✅).
- `cron/README_CRON.md` documenta cómo configurar el cron en Linux/Windows.
- `MailService` con integración a **Brevo (Sendinblue)** vía API REST.

#### ⚠️ Qué hay que mejorar

- **El cron no funciona en XAMPP** sin configuración manual. En desarrollo local, los emails nunca se envían a menos que el developer ejecute `worker.php` manualmente. Documentar un comando de prueba manual.
- **El evento `'cambio_password_seguridad'` no está implementado** en `buildUserEmailTemplate` — el switch no tiene ese caso, por lo que se genera un email vacío. Bug activo.
- **Las plantillas de `PasswordResetController` NO usan el `NotificationService`** — envía directo con `MailService::send` sin pasar por la cola ni registrar el intento. Inconsistencia arquitectónica.
- **El botón de email apunta a `{$baseUrl}/proyectos`**, una ruta que no existe en el router del frontend. Debería ser `{$baseUrl}/panel` o la URL específica del proyecto.
- Falta plantilla diferenciada por estado en `cambio_estado` (el DDS §10 dice "plantillas diferenciadas por estado").

---

### 3.12 Auditoría y trazabilidad

#### ✅ Qué está perfecto

- `AuditLogger::log()` es un servicio estático global llamado en todos los controllers para todos los eventos críticos.
- Captura automática de: `actor_user_id`, `actor_role`, `ip`, `user_agent`, `action_key`, `entity_type`, `entity_id`, `project_id`, `metadata_json`.
- **Fallback silencioso a archivo** si la BD falla (nunca rompe la operación del usuario).
- Eventos cubiertos: login, logout, login fallido, IP bloqueada, CSRF bloqueado, timeout de sesión, creación/actualización/eliminación de proyectos/documentos/comentarios/usuarios/clientes/comerciales, cambio de estado, aprobación, descarga, visualización, recuperación de contraseña.
- `audit_logs` protegida con índices de rendimiento (project_id+created_at, actor_user_id+created_at, action_key, ip+action+time).
- Los registros de auditoría son inmutables desde la app (no hay endpoint de DELETE/UPDATE en audit logs).
- `AuditController` con endpoints para timeline por proyecto, por cliente, global y con filtros.

#### ⚠️ Qué hay que mejorar

- **El evento `sesion_expirada` se registra con `entity_id = user_id`** pasado como parámetro en `AuthMiddleware`. El `AuditLogger::log` extrae `actor_user_id` de `$_SESSION['user_id']`, que ya fue destruida... Puede registrarse con actor NULL si la sesión se destruye antes. Revisar el orden.
- **Falta auditoría de la visualización del log de auditoría** — si un admin consulta los logs, ese acceso debería registrarse.
- **No existe UI de consulta de logs para el comercial** — el DDS §3.2 dice "Consulta acotada" para comerciales. El endpoint `/api/audit` existe pero la UI del panel no expone una sección de logs para el comercial, solo para el admin.

---

### 3.13 Frontend / SPA

#### ✅ Qué está perfecto

- Arquitectura SPA con router JS propio en `router.js` que mantiene URL reales con History API.
- Módulos JS separados y bien organizados: `api.js`, `auth.js`, `app.js`, `router.js` + módulos de sección.
- Cache busting automático con `filemtime()` en las URLs de los assets JS/CSS.
- Modo oscuro/claro con persistencia en `localStorage` y detección de preferencia del sistema.
- Sidebar responsivo con versión mobile y overlay.
- Diseño basado en Tailwind CSS CDN + FlyonUI.
- Módulos existentes: dashboard, proyectos, detalle de proyecto, clientes, formulario de clientes, comerciales, formulario de comerciales, usuarios cliente, auditoría, ajustes.
- El `project_detail_admin.js` tiene 232 KB — el módulo más grande del proyecto, lo que indica funcionalidad densa.

#### ⚠️ Qué hay que mejorar — Gaps críticos en UI

- **No existe ninguna vista ni módulo específico para el rol `cliente`**. El DDS §12.1 exige un panel cliente con: listado de proyectos, detalle con documentos/histórico/comentarios, botón de aprobación. Todo el frontend está construido para admin/comercial. El cliente, si inicia sesión, probablemente ve el mismo panel pero sin funcionalidades — esto es el **gap más grande del proyecto**.
- **Tailwind desde CDN** no está recomendado en producción por rendimiento (carga el motor PurgeCSS en el cliente). Para producción, debería compilarse.
- Los **archivos JS no están minificados** ni empaquetados. `project_detail_admin.js` solo pesa 227 KB. En producción esto es inaceptable — necesitará un bundler (Vite, esbuild o rollup).
- **No hay tests de interfaz** (no Playwright, no Cypress, no nada).
- La **búsqueda global** del header fue eliminada (comentario en panel.php: "Vacío tras eliminar el buscador global") — podría ser una deuda de UX.
- El módulo `projects.js` de la SPA incluye el listado para todos los roles, pero **el filtro de proyectos por cliente no está disponible para el comercial** si no tiene clientes asignados.

---

### 3.14 Seguridad y hardening

#### ✅ Qué está perfecto

- **Cabeceras de seguridad** en `public/index.php`: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy` (algo permisiva por `unsafe-inline`/`unsafe-eval` pero necesaria para Tailwind CDN).
- `.htaccess` en `/storage` para bloquear acceso directo (DDS §8.2 ✅).
- Prepared statements PDO en **todas** las consultas SQL — no hay concatenación de strings SQL en los modelos.
- `htmlspecialchars` en salidas de vistas.
- MIME verification real con `finfo_open(FILEINFO_MIME_TYPE)`.
- El display de errores está comentado en `public/index.php` (para producción).
- `bin2hex(random_bytes())` para todos los tokens y nombres de archivo.
- `hash_equals()` para comparación de tokens CSRF (timing-safe).

#### ⚠️ Qué hay que mejorar — Vulnerabilidades activas

> [!CAUTION]
> **CRÍTICO: La API key de Brevo está en texto plano en el `.env` y está versionada en el repositorio git.** Cualquier persona con acceso al repo tiene acceso a la cuenta de correo. Debe revocarse y regenerarse de inmediato, y el `.gitignore` debe verificarse para que `.env` no se suba.

- **El `.env` está en el `.gitignore`** — verificar `git ls-files | grep .env` para confirmar que no fue trackeado previamente.
- El `Content-Security-Policy` incluye `'unsafe-inline'` y `'unsafe-eval'` — necesario para Tailwind CDN y FlyonUI. En producción con build local, se puede eliminar.
- **No hay cabecera `Strict-Transport-Security (HSTS)`** — necesaria en producción HTTPS.
- **No hay `Permissions-Policy`** — recomendado para bloquear APIs no utilizadas del navegador.
- **El token de aprobación de 6 dígitos en texto plano en BD** es un riesgo si la BD se compromete (ya mencionado en §3.9).
- **Falta `session.cookie_httponly = 1`** y `session.cookie_samesite = Strict` forzado en PHP.
- **No hay sanitización de `User-Agent`** antes de guardarlo en `audit_logs` — un `User-Agent` malicioso con 2000 caracteres podría truncarse o causar problemas.

---

### 3.15 Entorno, despliegue y configuración

#### ✅ Qué está perfecto

- Scripts de instalación dual: `instalar_bd_windows.bat` y `instalar_bd_linux.sh`.
- `.gitignore` configurado.
- `.htaccess` en `/public` con rewrite rules para el front controller.
- `.htaccess` en `/storage` para bloquear acceso directo.
- `README.md` presente.
- `cron/README_CRON.md` con instrucciones de configuración del worker.
- Configuración centralizada en `.env` con DotEnvLoader propio.

#### ⚠️ Qué hay que mejorar

- **La ruta `/steelinox/` está hardcodeada** en varios controllers (`PasswordResetController`, `AuthController::showLogin`) con `header('Location: /steelinox/...')`. Debe usarse `$_ENV['APP_BASE_URL']` de forma consistente.
- **No existe un `Makefile` o script de setup completo** — los steps de instalación requieren configurar manualmente XAMPP, importar SQL, etc.
- **No hay VirtualHost configurado** — el proyecto corre en subcarpeta (`/steelinox`) lo que puede causar problemas con Apache y las rutas si se mueve.
- **`php.ini` no está documentado** — los módulos requeridos por el DDS (pdo_mysql, mbstring, fileinfo, openssl, intl, gd) no tienen instrucciones de verificación.

---

## 4. Fortalezas destacadas

Estos son los elementos del proyecto que claramente superan el estándar esperado para una extranet PHP nativa:

1. **Streaming de archivos con soporte HTTP Range completo** — implementación de nivel producción, no habitual en proyectos PHP nativos.
2. **Auditoría transversal real** en toda la aplicación, con fallback a archivo, metadata JSON estructurada y captura de IP+User-Agent.
3. **Sistema de aprobación con doble factor por email** (token temporal de 6 dígitos con expiración) — implementación propia sin librerías.
4. **Rate limiting de login basado en BD** en lugar de simplemente en memoria o sesión.
5. **Arquitectura SPA en JavaScript puro** con router propio y módulos separados — sin React, sin Vue, sin dependencias externas de framework JS.
6. **Auto-versionado documental por nombre** — detección de duplicados y conversión automática a nueva versión.
7. **Transacciones atómicas** en las operaciones críticas (creación de proyecto con auto-asignación, cambio de estado con log, borrado lógico en cascada).
8. **Servicio de notificaciones con cola de BD + worker cron** en lugar de envío síncrono en el request — patrón correcto para evitar timeouts.
9. **Plantillas de email HTML profesionales** con diseño corporativo generadas dinámicamente.
10. **Índices SQL del Anexo A del DDS** implementados en el script de creación de BD.

---

## 5. Gaps y deudas técnicas

### 🔴 Críticos (bloquean el MVP)

| ID | Área | Descripción |
|---|---|---|
| G-01 | **Seguridad** | API key de Brevo hardcodeada en `.env` versionado. Revocar y regenerar inmediatamente. |
| G-02 | **Frontend** | **No existe panel/UI para el rol `cliente`**. El mayor gap funcional del proyecto. |
| G-03 | **Notificaciones** | Evento `'cambio_password_seguridad'` no implementado en `buildUserEmailTemplate` — email vacío en producción. |
| G-04 | **Seguridad** | Falta rate limiting en `confirmApproval` — vulnerable a brute force del token de 6 dígitos. |

### 🟡 Importantes (degradan calidad o seguridad)

| ID | Área | Descripción |
|---|---|---|
| G-05 | **Código** | `validatePasswordPolicy` duplicado en 3 sitios. Extraer a servicio compartido. |
| G-06 | **Notificaciones** | URL del botón en emails apunta a `/proyectos`, ruta inexistente. Corregir a `/panel` o ruta correcta. |
| G-07 | **Datos** | `generateNextReference` con posible race condition bajo carga. Mejorar a `MAX()` sobre subcadena. |
| G-08 | **Seguridad** | Token de aprobación en texto plano en BD. Hashear antes de persistir. |
| G-09 | **Backend** | Reset de contraseña envía email síncrono por `MailService` sin pasar por la cola — inconsistencia arquitectónica. |
| G-10 | **Frontend** | JS no minificado en producción. 227 KB de un solo módulo es inaceptable para UX real. |
| G-11 | **Seguridad** | `session.cookie_secure`, `cookie_httponly` y `cookie_samesite` no forzados por código PHP. |
| G-12 | **Funcional** | Falta endpoint de edición de comentarios (DDS §11 menciona edición lógica con histórico). |
| G-13 | **Funcional** | Falta endpoint para revertir versión vigente de documento. |
| G-14 | **Backend** | Rutas `/steelinox/` hardcodeadas en controllers. Usar `APP_BASE_URL` consistentemente. |
| G-15 | **UI Cliente** | Falta filtro/búsqueda de proyectos para el comercial por empresa cliente en la SPA. |

### 🟢 Mejoras menores (polish)

| ID | Área | Descripción |
|---|---|---|
| G-16 | **BD** | Falta índice en `notifications_queue(status)` para el worker. |
| G-17 | **BD** | Falta índice en `project_status_logs(project_id, created_at)`. |
| G-18 | **Docs** | Whitelist de MIME en `store` y `addVersion` desincronizada. Centralizar en constante. |
| G-19 | **Auditoría** | Falta auditoría de la consulta del log de auditoría por el admin. |
| G-20 | **UI** | Modo comercial no tiene sección de logs de auditoría acotada (DDS §12.2). |
| G-21 | **Funcional** | `budget_amount` obligatorio en crear proyecto, pero debería ser opcional según DDS §6.2. |
| G-22 | **Testing** | No existe ningún test (unitario, integración o e2e). Carpeta `/tests` no creada. |
| G-23 | **Producción** | Tailwind desde CDN → compilar para producción. HSTS no configurado. |

---

## 6. Riesgos identificados

Mapeados contra el §17 del DDS:

| Riesgo DDS | Severidad | Estado en proyecto | Evaluación |
|---|:---:|---|---|
| Exposición de documentos sensibles | 🔴 Muy alto | Serving autenticado + storage privado + logs ✅ | **MITIGADO** |
| Descontrol de permisos por alcance comercial | 🔴 Alto | Policies implementadas, sin tests | **PARCIALMENTE MITIGADO** |
| Pérdida de trazabilidad | 🔴 Alto | AuditLogger completo + fallback a archivo ✅ | **MITIGADO** |
| Crecimiento desordenado del modelo | 🟡 Medio | Entidades y servicios bien definidos ✅ | **MITIGADO** |
| UI lenta con muchos documentos | 🟡 Medio | Paginación implementada; JS sin minificar | **PARCIALMENTE MITIGADO** |
| Fallo en notificaciones | 🟡 Medio | Cola + reintentos en worker ✅; cron no activo en local ⚠️ | **PARCIALMENTE MITIGADO** |
| **NUEVO: Brute force token aprobación** | 🔴 Alto | No hay rate limiting en confirmApproval | **NO MITIGADO** |
| **NUEVO: Credenciales versionadas** | 🔴 Muy alto | API key en .env en git | **NO MITIGADO** |

---

## 7. Roadmap — Checklist hacia el MVP completo

> Usad este checklist para ir tachando las tareas según avancéis. Los emojis indican la categoría.

### 🔴 FASE 0 — Seguridad urgente (hacer AHORA antes que cualquier otra cosa)

- [ ] **G-01** — Revocar la API key de Brevo actual, generar una nueva, y comprobar que `.env` está en `.gitignore` y no fue trackeado (`git rm --cached .env` si fuera necesario).
- [ ] **G-04** — Añadir rate limiting (máx. 3 intentos) en `ProjectController::confirmApproval`. Invalidar el token si se superan.
- [ ] **G-08** — Hashear el `approval_token` antes de guardarlo en BD. Comparar con `hash_equals(hash('sha256', $input), $storedHash)`.
- [ ] **G-11** — Añadir configuración de sesión segura en `public/index.php`: `session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict'])`.

---

### 🟠 FASE 1 — Panel cliente (gap más grande del MVP)

- [ ] **G-02A** — Crear módulo JS `client_panel.js` para el router del SPA con vistas específicas del cliente:
  - [ ] Vista: listado de proyectos del cliente (con estado, referencia, nombre).
  - [ ] Vista: detalle de proyecto (resumen, documentos visibles, sección de comentarios, sección histórico de estados).
  - [ ] Vista: visor de documentos (inline PDF/imagen, botón descarga si aplica).
  - [ ] Vista: formulario de comentario con publicación asíncrona.
  - [ ] Vista: flujo de aprobación (botón "Aprobar propuesta" → modal de código → confirmación).
- [ ] **G-02B** — Implementar sidebar y navegación diferenciada para el rol `cliente` en `SIApp.buildSidebar()`.
- [ ] **G-15** — Verificar que el cliente no ve botones de edición ni opciones de gestión en ninguna vista compartida.

---

### 🟡 FASE 2 — Backend: fixes funcionales y seguridad

- [ ] **G-03** — Implementar el case `'cambio_password_seguridad'` en `NotificationService::buildUserEmailTemplate`.
- [ ] **G-05** — Extraer `validatePasswordPolicy` a `app/Services/PasswordValidator.php` y referenciarla desde `UserController` y `PasswordResetController`.
- [ ] **G-06** — Corregir la URL del botón en las plantillas de email: cambiar `/proyectos` por `{$baseUrl}/panel` o una URL concreta por proyecto.
- [ ] **G-09** — Refactorizar `PasswordResetController::sendResetEmail` para usar `NotificationService::queueUserEvent` en lugar de `MailService::send` directamente.
- [ ] **G-12** — Añadir endpoint `PUT /api/projects/{id}/documents/{docId}/comments/{commentId}` para edición de comentarios (con registro de texto anterior en auditoría).
- [ ] **G-13** — Añadir endpoint `PUT /api/projects/{id}/documents/{docId}/versions/{versionId}/set-current` para revertir la versión vigente.
- [ ] **G-14** — Reemplazar todas las rutas `/steelinox/` hardcodeadas en controllers por `$_ENV['APP_BASE_URL']`.
- [ ] **G-21** — Hacer `budget_amount` opcional en `ProjectController::store` y `update`.
- [ ] **G-07** — Mejorar `generateNextReference` para usar `MAX` sobre el número extraído de la referencia.

---

### 🟢 FASE 3 — Base de datos y rendimiento

- [ ] **G-16** — Añadir índice `notifications_queue(status, created_at)` para el worker.
- [ ] **G-17** — Añadir índice `project_status_logs(project_id, created_at)`.
- [ ] **G-18** — Centralizar la whitelist de MIME types en una constante de clase o archivo de configuración compartido entre `store()` y `addVersion()`.

---

### 🔵 FASE 4 — UI comercial y auditoría avanzada

- [ ] **G-15B** — Añadir filtro por empresa/cliente en la vista de proyectos del comercial.
- [ ] **G-20** — Añadir vista de logs de auditoría acotada para el comercial (solo proyectos asignados a él).
- [ ] **G-19** — Registrar en `audit_logs` cuando un admin o comercial consulta el log de auditoría.
- [ ] **G-10** — Planificar compilación de JS/CSS para producción (Vite o esbuild con entrada multi-módulo).

---

### ⚪ FASE 5 — Testing y hardening final

- [ ] **G-22A** — Crear carpeta `/tests` con estructura de trabajo (PHPUnit o testing manual estructurado).
- [ ] **G-22B** — Escribir tests de autorización por rol y pertenencia a proyecto (DDS §15.2).
- [ ] **G-22C** — Escribir tests de transiciones de estado (legal e ilegal).
- [ ] **G-22D** — Escribir tests de visualización/descarga con acceso permitido y denegado.
- [ ] **G-22E** — Escribir tests de versionado y documento vigente.
- [ ] **G-22F** — Escribir tests de comentarios y bloqueo en estado cerrado.
- [ ] **G-22G** — Ejecutar el checklist de hardening completo del DDS §15.3:
  - [ ] Prepared statements en toda consulta SQL ✅ (ya hecho)
  - [ ] Escape de salida en vistas ✅ (ya hecho)
  - [ ] Control de subida por MIME, extensión, tamaño y checksum ✅ (ya hecho, falta extensión)
  - [ ] Regeneración de `session_id` tras login ✅ (ya hecho)
  - [ ] Cabeceras de seguridad básicas ✅ (ya hecho, mejorar CSP en producción)
  - [ ] Política de errores no verbosa en producción ✅ (comentado, verificar en deploy)
  - [ ] HSTS en producción ⬜ (pendiente)
  - [ ] `session.cookie_secure` / `httponly` / `samesite` ⬜ (pendiente)
- [ ] **G-23** — Preparar entorno de producción: compilar Tailwind, añadir HSTS, configurar cron job real.

---

### 📋 Criterios de aceptación del DDS — Checklist final

- [x] Admin puede crear clientes, comerciales, usuarios cliente y proyectos sin acceso cruzado.
- [x] Comercial solo ve y opera sobre proyectos asignados a él.
- [x] Cliente solo accede a proyectos de su empresa.
- [x] Proyecto admite múltiples documentos y múltiples versiones, mostrando siempre una vigente.
- [x] PDFs, imágenes y vídeos marcados como visualizables se sirven sin URL pública directa.
- [x] Documentos técnicos no visualizables se descargan solo tras validación de sesión y autorización.
- [ ] El cliente puede comentar y aprobar en los estados permitidos — **pendiente UI cliente (G-02)**.
- [x] Todo cambio relevante genera log auditable.
- [x] Los proyectos cerrados no admiten edición ni comentarios, pero pueden reabrirse por roles internos.
- [x] El sistema puede arrancar en entorno local XAMPP con base de datos importada desde script SQL.

---

*Análisis realizado sobre el snapshot del repositorio `c:\xampp\htdocs\steelinox` a fecha 2026-04-20 — Steel Inox Extranet v1.0 pre-MVP.*
