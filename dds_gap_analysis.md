# Análisis de Brechas: DDS vs Implementación Actual

Comparación entre lo que define el [README_SteelInox_Proyectos.md](file:///c:/xampp/htdocs/steelinox/README_SteelInox_Proyectos.md) (DDS técnico) y lo que está implementado actualmente en el código.

---

## ✅ Lo que YA está implementado correctamente

| Funcionalidad | Estado | Archivos clave |
|---|---|---|
| Autenticación (Login/Logout) | ✅ Completo | `AuthController.php`, `auth.js` |
| Rate limiting en login (5 intentos / 15 min) | ✅ Completo | `AuthController.php` |
| Recuperación de sesión (cookie PHP viva) | ✅ Completo | `app.js` → `/api/me` |
| Password Reset con token + email | ✅ Completo | `PasswordResetController.php`, `MailService.php` |
| Protección CSRF | ✅ Completo | `AuthController.php`, `api.js` |
| Timeout por inactividad (30 min) | ✅ Completo | `AuthMiddleware.php` |
| CRUD de Clientes | ✅ Completo | `ClientController.php`, `Client.php` |
| CRUD de Usuarios (cliente) | ✅ Completo | `UserController.php`, `User.php` |
| Creación de Proyectos (estado forzado a "Propuesta") | ✅ Completo | `ProjectController.php`, `client_detail_admin.js` |
| Edición de Proyectos (sin tocar estado) | ✅ Completo | `ProjectController.php` |
| Cambio de Estado con log en `project_status_logs` | ✅ Completo | `Project.php → updateStatus()` |
| Asignación múltiple de Comerciales | ✅ Completo | `ProjectController.php`, tabla `project_user` |
| Segmentación por rol (deny by default) | ✅ Completo | Escudos en todos los controllers |
| Subida de documentos (storage privado) | ✅ Completo | `DocumentController.php`, `storage/documents/` |
| Validación MIME real (no extensión) | ✅ Completo | `DocumentController.php` |
| Checksum SHA-256 en cada subida | ✅ Completo | `DocumentController.php` |
| Descarga autenticada de documentos | ✅ Completo | `DocumentController.php → download()` |
| Filtrado `is_visible_to_client` | ✅ Completo | `Document.php → getListByProject()` |
| Versionado de documentos (v1 al subir) | ✅ Parcial | `Document.php → uploadNewDocument()` |
| Badges de estado unificados | ✅ Completo | `app.css`, `app.js`, `dashboard.js` |
| Regex de validación (CLI-XXX, PRJ-AAAA-XXX) | ✅ Completo | Frontend + Backend |
| Variables de entorno (`.env`) | ✅ Completo | `DotEnvLoader.php`, `.gitignore` |

---

## 🔴 Lo que FALTA por implementar (Brechas críticas)

### 1. Sistema de Aprobaciones (Sección 8 del DDS)
**Impacto: ALTO** — Es un pilar del flujo de negocio.

> El DDS dice: *"El cliente entra al proyecto, visualiza la propuesta vigente, hace clic en Aprobar, con doble confirmación."*

**Estado actual**: No existe ningún endpoint, modelo, ni botón de aprobación. El `project_detail.js` (vista cliente) tiene un botón condicional `btn-client-action` pero no tiene lógica real.

**Lo que falta**:
- Endpoint `POST /api/projects/{id}/approve`
- Lógica en backend: registrar quién aprobó, cuándo, generar notificación
- Botón de "Aprobar Propuesta" en la vista de proyecto del cliente con doble confirmación
- El admin también puede aprobar (el comercial NO)

---

### 2. Sistema de Comentarios (Sección 9 del DDS)
**Impacto: ALTO** — Es comunicación operativa dentro del proyecto.

> El DDS dice: *"Los comentarios están ligados a un documento o versión concreta. Solo se pueden añadir si el proyecto no está cerrado."*

**Estado actual**: La pestaña "Comentarios" en `project_detail_admin.js` es 100% mock/HTML estático con datos falsos (Elena Valdés, avatares de pravatar.cc). No existe:
- Ningún endpoint de API para comentarios (`/api/projects/{id}/comments`)
- Ningún modelo `Comment.php` (aunque la tabla `comments` ya existe en el schema)
- Ninguna lógica de CRUD de comentarios
- Ningún bloqueo de comentarios en estado "Cerrado"

---

### 3. Versionado de Documentos — Subir nueva versión (Sección 6 del DDS)
**Impacto: MEDIO-ALTO** — Subir funciona, pero actualizar no.

> El DDS dice: *"Cuando se sube una nueva versión, la anterior pasa automáticamente a estado archivado."*

**Estado actual**: Solo existe `uploadNewDocument()` que crea un documento NUEVO con su primera versión (v1). **No existe un método para subir una versión posterior** de un documento existente (que archive la anterior y cree una v2, v3, etc.).

**Lo que falta**:
- Endpoint `POST /api/projects/{projectId}/documents/{documentId}/versions`
- Método `uploadNewVersion()` en `Document.php`
- UI para distinguir entre "Subir documento nuevo" y "Actualizar versión"
- Historial de versiones visible en la UI

---

### 4. Notificaciones Automáticas por Email (Sección 10 del DDS)
**Impacto: MEDIO** — El sistema de email existe (Brevo) pero no se disparan notificaciones.

> El DDS dice: emails automáticos ante: nueva propuesta, cambio de estado, aprobación, nuevo comentario, alta de usuario.

**Estado actual**: `MailService.php` funciona (se usa para password reset), pero **ninguno de los eventos del negocio dispara emails**. La tabla `notifications_queue` existe en el schema pero está vacía y sin código asociado.

**Lo que falta**:
- Servicio de notificaciones que encole y envíe emails
- Integración en: `changeStatus()`, futuro `approve()`, futuro `addComment()`, `UserController::store()`
- Cola con reintentos (la tabla ya tiene campos `status`, `attempts`, `error_log`)

---

### 5. Auditoría y Trazabilidad (Sección 11 del DDS)
**Impacto: MEDIO** — La tabla existe, el frontend tiene una pestaña, pero no se registra nada.

> El DDS dice: *"Todo queda registrado. Login, logout, login fallido, CRUD, cambios de estado, subida/descarga de documentos, comentarios, aprobaciones."*

**Estado actual**: 
- La tabla `audit_logs` existe en la BD con la estructura correcta
- Hay un `TODO` explícito en `AuthController.php:166` para registrar logins fallidos
- La ruta `/audit-log` existe en el frontend (sidebar)
- **Pero no hay ningún modelo `AuditLog.php` ni se inserta ni un solo registro**
- La pestaña "Histórico" en `project_detail_admin.js` es también mock

**Lo que falta**:
- Modelo `AuditLog.php` con método `log($data)`
- Insertar registros en: login/logout, CRUD de entidades, cambios de estado, subida/descarga de documentos
- Controller + endpoint para consultar logs (`GET /api/audit-logs`)
- Módulo frontend `audit_log.js` para la vista en el sidebar

---

### 6. Actualización automática de `approved_at` y `closed_at` (Ya planificado)
**Impacto: BAJO** — Ya lo hemos diagnosticado en el implementation plan previo.

`Project.php → updateStatus()` no actualiza estas columnas al cambiar de estado.

---

### 7. Bloqueo de proyecto cerrado (Sección 4 del DDS)
**Impacto: MEDIO** — Solo parcialmente implementado.

> El DDS dice: *"Mientras un proyecto está cerrado, está completamente bloqueado: sin edición estructural ni nuevos comentarios."*

**Estado actual**: El backend NO valida si el proyecto está cerrado antes de permitir:
- `update()` → Se podría editar un proyecto cerrado
- Subir documentos → Se podría subir a un proyecto cerrado
- Futuros comentarios → No hay chequeo

**Lo que falta**:
- Guard/check `if ($projectDetails['status'] === 'cerrado')` en `update()`, `store()` de documentos, y futuros comentarios.

---

### 8. Reapertura de proyecto con motivo obligatorio (Sección 4 del DDS)
**Impacto: BAJO** — El cambio de estado funciona, pero no hay lógica especial para reapertura.

> El DDS dice: *"La reapertura de un proyecto cerrado requiere registrar el motivo."*

**Estado actual**: El `changeStatus()` acepta un `reason` opcional, pero no lo **fuerza como obligatorio** cuando la transición es de `cerrado → otro estado`.

---

## 📊 Resumen visual de progreso

| Sección DDS | Progreso |
|---|---|
| §1 Plataforma | ✅ 100% |
| §2 Roles y permisos | ✅ ~90% (falta guard en cerrado) |
| §3 Proyectos estructura | ✅ 100% |
| §4 Estados y flujo | ✅ ~75% (falta bloqueo cerrado, reapertura con motivo, approved_at/closed_at) |
| §5 Documentación | ✅ ~85% (falta access_mode enforcement view vs download) |
| §6 Versionado | ⚠️ ~30% (solo v1, no subir versiones posteriores) |
| §7 Propuestas/Presupuestos | ⚠️ ~20% (campos existen, no hay flujo de aprobación) |
| §8 Aprobaciones | 🔴 0% |
| §9 Comentarios | 🔴 0% (solo mocks) |
| §10 Notificaciones | 🔴 ~5% (MailService existe pero sin integración) |
| §11 Auditoría | 🔴 ~5% (tabla existe pero sin registros) |
| §12 Permisos por rol | ✅ ~85% |

---

## 🎯 Prioridad sugerida de implementación

1. **Comentarios** (§9) — Alto valor de uso diario para cliente y equipo
2. **Aprobaciones** (§8) — Pilar del flujo de negocio
3. **Versionado de documentos** (§6) — Necesario para el ciclo de vida documental
4. **Auditoría** (§11) — Requisito estructural según el DDS
5. **Bloqueo de proyecto cerrado** (§4/§7) — Integridad de datos
6. **Notificaciones** (§10) — Mejora comunicación pero no bloquea funcionalidad
7. **approved_at / closed_at** (§4) — Quick win ya planificado
