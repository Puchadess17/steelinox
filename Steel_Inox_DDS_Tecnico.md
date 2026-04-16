# Steel Inox — DDS Técnico Completo
> **Plataforma extranet de proyectos de interiorismo**  
> Documento de Diseño Detallado (DDS) · Especificación funcional y técnica de nivel producción  
> Versión `v1.0` — Base consolidada a partir del briefing comercial y decisiones funcionales cerradas en sesión

---

| Atributo | Valor |
|---|---|
| **Proyecto** | Extranet privada para gestión documental y operativa de proyectos |
| **Stack objetivo** | PHP 8.4 nativo · MVC · MySQL · HTML · CSS · JavaScript asíncrono |
| **Propósito del DDS** | Documento maestro para arquitectura, reglas de negocio, modelo de datos, seguridad, módulos, endpoints, permisos, flujos, despliegue local y criterios de aceptación del MVP |

---

## Índice

1. [Resumen ejecutivo y alcance](#1-resumen-ejecutivo-y-alcance)
2. [Objetivos y principios de solución](#2-objetivos-y-principios-de-solución)
3. [Actores, roles y permisos](#3-actores-roles-y-permisos)
4. [Reglas de negocio](#4-reglas-de-negocio)
5. [Arquitectura técnica](#5-arquitectura-técnica)
6. [Modelo de datos](#6-modelo-de-datos)
7. [Módulos funcionales](#7-módulos-funcionales)
8. [Gestión documental y seguridad](#8-gestión-documental-y-seguridad)
9. [API interna asíncrona](#9-api-interna-asíncrona)
10. [Notificaciones](#10-notificaciones)
11. [Logging, auditoría y trazabilidad](#11-logging-auditoría-y-trazabilidad)
12. [Backoffice y paneles por rol](#12-backoffice-y-paneles-por-rol)
13. [Requisitos no funcionales](#13-requisitos-no-funcionales)
14. [Entorno local XAMPP](#14-entorno-local-xampp)
15. [Estrategia de desarrollo, testing y despliegue](#15-estrategia-de-desarrollo-testing-y-despliegue)
16. [Backlog MVP y roadmap](#16-backlog-mvp-y-roadmap)
17. [Riesgos y mitigaciones](#17-riesgos-y-mitigaciones)
18. [Criterios de aceptación](#18-criterios-de-aceptación)
- [Anexo A — Recomendación de índices SQL](#anexo-a--recomendación-de-índices-sql)
- [Anexo B — Decisiones cerradas de negocio](#anexo-b--decisiones-cerradas-de-negocio)

---

## 1. Resumen ejecutivo y alcance

La plataforma es una **extranet privada** para clientes y equipo interno, enfocada en:

- Gestión de proyectos de interiorismo
- Control de versiones de propuestas
- Comentarios asociados a documentación
- Aprobaciones dentro de la propia plataforma
- Trazabilidad completa de la actividad

> **No es** un CRM genérico ni un portal público. Es un entorno cerrado con acceso autenticado, visibilidad segmentada por pertenencia al proyecto y protección documental reforzada.

### 1.1 Alcance incluido en el MVP

| Área | Descripción |
|---|---|
| **Autenticación y sesiones** | Login, logout, recuperación básica de contraseña y expiración de sesión |
| **Gestión de roles** | Administrador, comercial y cliente |
| **Gestión de clientes y usuarios cliente** | CRUD interno, asignación a cliente, activación/desactivación lógica |
| **Gestión de proyectos** | CRUD, relación con cliente, asignación múltiple de comerciales, estado, presupuesto (campo + documento), referencia, fechas y metadatos base |
| **Gestión documental** | Subida, versionado, archivo histórico, documento vigente, visor protegido y descarga autenticada |
| **Comentarios** | Ligados a propuesta o documento, con notificación por email y registro en log |
| **Aprobaciones** | Confirmación doble por parte del cliente o administrador + notificaciones |
| **Búsqueda y filtros** | Por cliente, proyecto, referencia y estado según rol |
| **Auditoría** | Registro detallado de todas las acciones relevantes |
| **API interna async** | Endpoints JSON para operaciones asíncronas de UI y backoffice |

### 1.2 Fuera de alcance del MVP

- Integraciones con ERP/CRM externos
- Workflow de firma electrónica avanzada o firma legal certificada
- Dashboard analítico avanzado de negocio
- Multidioma completo
- Aplicación móvil nativa
- Compartición externa temporal de documentación con terceros no autenticados

---

## 2. Objetivos y principios de solución

| Principio | Descripción |
|---|---|
| **Seguridad por defecto** | Toda funcionalidad parte del principio *deny by default*; un usuario solo accede a lo que le corresponde por rol y pertenencia |
| **Trazabilidad total** | Cualquier alta, edición, comentario, visualización sensible, aprobación o cambio de estado deja huella |
| **Simplicidad de uso** | El cliente ve un listado claro de sus proyectos y entra a un detalle limpio con documentos, comentarios y aprobación |
| **Escalabilidad razonable** | PHP nativo con MVC y API interna para permitir evolución modular sin atar la solución a un CMS |
| **Versionado explícito** | La plataforma distingue siempre entre documento vigente e histórico archivado |
| **Borrado lógico** | Las entidades no se eliminan físicamente salvo procedimientos administrativos excepcionales |

---

## 3. Actores, roles y permisos

### 3.1 Roles del sistema

| Rol | Objetivo | Ámbito | Restricciones |
|---|---|---|---|
| **Administrador** | Gobierno global del sistema | Todos los clientes, usuarios, proyectos, documentos y logs | Sin restricción funcional salvo políticas internas |
| **Comercial** | Gestión operativa de su cartera | Solo proyectos asignados y sus clientes/usuarios asociados | No ve proyectos ajenos |
| **Cliente** | Consulta, comentario y validación | Solo proyectos de su empresa | Sin permisos de administración ni gestión de usuarios |

### 3.2 Matriz resumida de permisos

| Entidad / acción | Administrador | Comercial | Cliente | Observaciones |
|---|---|---|---|---|
| Clientes | CRUD | CRUD de los suyos | No | Sin borrado físico |
| Usuarios cliente | CRUD | CRUD de los suyos | No | Sin subroles internos |
| Comerciales | CRUD | No | No | Solo administrador |
| Proyectos | CRUD | CRUD de los suyos | Lectura | Cliente sin edición estructural |
| Estados del proyecto | Sí | Sí | No | Cliente solo aprueba; no cambia estados operativos |
| Aprobación de propuesta | Sí | No | Sí | Doble confirmación |
| Documentos | CRUD | CRUD de los suyos | Lectura según visibilidad | Visualización o descarga autenticada |
| Comentarios | Sí | Sí | Sí | Según proyecto y estado distinto de cerrado |
| Logs | Consulta | Consulta acotada | No | Definir alcance en UI |
| Reapertura de proyecto | Sí | Sí | No | Registrar motivo de reapertura |

---

## 4. Reglas de negocio

### 4.1 Estructura organizativa

- Un cliente puede tener **múltiples usuarios cliente**.
- Todos los usuarios cliente tienen **exactamente el mismo rol y privilegios**.
- Los usuarios cliente son creados y gestionados únicamente por administrador o comercial.
- Un cliente puede tener **múltiples proyectos**.
- Un proyecto puede estar asignado a **múltiples comerciales**, sin comercial principal.

### 4.2 Estados del proyecto

| Estado | Descripción | Quién puede establecerlo | Notas |
|---|---|---|---|
| **Propuesta** | Proyecto en fase de presentación/revisión de material | Administrador o comercial | Cliente puede comentar y aprobar |
| **Aprobado** | Propuesta validada dentro de la plataforma | Administrador; aprobación desencadenada por cliente o administrador | Se notifica a administración y comerciales |
| **Ejecución** | Proyecto en fase operativa o productiva | Administrador o comercial | Cliente mantiene capacidad de comentario |
| **Cerrado** | Proyecto finalizado y bloqueado | Administrador o comercial | Visible, no editable ni comentable; puede reabrirse |

### 4.3 Reglas de transición

```
Propuesta → Aprobado → Ejecución → Cerrado
                                       ↕ (reapertura con motivo registrado)
```

- Se permite **reapertura** de un proyecto cerrado por administrador o comercial, registrando motivo.
- **No se permite** edición estructural ni nuevos comentarios mientras el proyecto permanezca en estado cerrado.
- La aprobación se realiza desde la plataforma mediante botón y **doble verificación**.
- Cada aprobación genera evento de log y envío de notificaciones por email.
- Las propuestas y presupuestos pueden tener múltiples versiones; una sola versión estará marcada como **vigente**.

### 4.4 Comentarios

- Los comentarios se asocian a un **documento o propuesta concreta**, no al proyecto en abstracto.
- Visibles para todos los participantes autorizados del proyecto.
- No existen comentarios internos ocultos en el MVP.
- Cliente, comercial y administrador pueden comentar mientras el proyecto **no esté cerrado**.
- Cada comentario dispara email y registro en auditoría.

### 4.5 Borrado lógico

- Clientes, usuarios, proyectos, documentos y comentarios seguirán estrategia de borrado lógico o desactivación.
- No se eliminarán relaciones históricas ni registros de auditoría.
- Los documentos sustituidos por nuevas versiones no se destruyen; pasan a estado **archivado**.

---

## 5. Arquitectura técnica

Arquitectura MVC ligera en **PHP nativo 8.4** con separación clara entre capa de presentación, controladores, servicios de dominio y persistencia. La interfaz empleará HTML server-rendered para vistas principales y JavaScript asíncrono para acciones dinámicas.

### 5.1 Capas

| Capa | Responsabilidad | Tecnologías | Salida |
|---|---|---|---|
| **Presentación** | Renderizado de vistas, formularios, tablas, visor de documentos y componentes de interacción | PHP templates, HTML5, CSS3, JS ES6 | HTML + JSON |
| **Aplicación** | Control de flujos, validación, autorización, orchestration de casos de uso | Controladores MVC, middleware, services | DTOs / respuestas |
| **Dominio** | Reglas de negocio, transiciones de estado, versionado, auditoría | Servicios de dominio, value objects, policies | Entidades coherentes |
| **Infraestructura** | Persistencia, sesiones, archivos, correo, logging | PDO/MySQL, filesystem privado, mailer, logs | Datos persistidos |

### 5.2 Estructura de carpetas propuesta

```
/app
  /Controllers
  /Models
  /Services
  /Policies
  /Requests
  /Views
  /Helpers
/config
/core
/public
  /assets
  /uploads-public       ← solo recursos públicos mínimos
/storage
  /documents            ← fuera del web root si es posible
  /logs
  /cache
/routes
/tests
```

### 5.3 Patrones recomendados

- **Front controller** único en `/public/index.php`
- **Router** propio simple con soporte GET, POST, PUT/PATCH y DELETE vía method spoofing o fetch
- **Middleware** de autenticación, autorización y CSRF
- **Servicios de dominio** para aprobación, versionado, documentos, comentarios y auditoría
- **Repositorios** o modelos por agregado principal con PDO preparado
- **Plantillas parciales** reutilizables para layout, tablas, estados, modales y avisos
- **API interna JSON** bajo prefijo `/api` para operaciones async

---

## 6. Modelo de datos

### 6.1 Entidades principales

| Entidad | Descripción | Relaciones clave |
|---|---|---|
| `users` | Usuarios del sistema de cualquier rol | Pertenece opcionalmente a cliente; puede estar asignado a proyectos |
| `clients` | Empresa o cuenta cliente | Tiene muchos usuarios y muchos proyectos |
| `projects` | Proyecto de interiorismo | Pertenece a un cliente y tiene muchos comerciales y documentos |
| `project_user` | Tabla pivote de asignación comercial a proyecto | Relaciona usuarios rol comercial con proyectos |
| `documents` | Archivo versionado asociado a proyecto | Puede ser propuesta, presupuesto, plano, imagen, vídeo, etc. |
| `document_versions` | Versiones concretas de un documento lógico | Define vigente/archivado |
| `comments` | Mensajes ligados a documento o versión | Pertenece a proyecto y autor |
| `project_status_logs` | Histórico de cambios de estado | Trazabilidad del flujo |
| `audit_logs` | Registro general de acciones | Cobertura de seguridad y trazabilidad |
| `notifications_queue` | Cola o registro de notificaciones emitidas | Control operativo y reintentos |

### 6.2 Esquema de campos mínimos

#### `users`

| Campo | Tipo |
|---|---|
| `id` | BIGINT PK |
| `client_id` | BIGINT NULL |
| `role` | ENUM `admin/comercial/cliente` |
| `name` | VARCHAR(150) |
| `email` | VARCHAR(190) UNIQUE |
| `password_hash` | VARCHAR(255) |
| `is_active` | TINYINT |
| `last_login_at` | DATETIME NULL |
| `created_at` | DATETIME |
| `updated_at` | DATETIME |
| `deleted_at` | DATETIME NULL |

#### `clients`

| Campo | Tipo |
|---|---|
| `id` | BIGINT PK |
| `name` | VARCHAR(180) |
| `reference` | VARCHAR(80) NULL |
| `is_active` | TINYINT |
| `created_by` | BIGINT |
| `created_at` | DATETIME |
| `updated_at` | DATETIME |
| `deleted_at` | DATETIME NULL |

#### `projects`

| Campo | Tipo |
|---|---|
| `id` | BIGINT PK |
| `client_id` | BIGINT |
| `name` | VARCHAR(180) |
| `reference` | VARCHAR(80) |
| `status` | ENUM `propuesta/aprobado/ejecucion/cerrado` |
| `budget_amount` | DECIMAL(12,2) NULL |
| `description` | TEXT NULL |
| `surface` | VARCHAR(80) NULL |
| `project_type` | VARCHAR(120) NULL |
| `created_by` | BIGINT |
| `approved_at` | DATETIME NULL |
| `closed_at` | DATETIME NULL |
| `created_at` | DATETIME |
| `updated_at` | DATETIME |
| `deleted_at` | DATETIME NULL |

#### `documents`

| Campo | Tipo |
|---|---|
| `id` | BIGINT PK |
| `project_id` | BIGINT |
| `type` | ENUM `propuesta/presupuesto/pdf/imagen/video/plano/documento_tecnico/materiales/otros` |
| `title` | VARCHAR(180) |
| `is_visible_to_client` | TINYINT |
| `access_mode` | ENUM `view/download/both` |
| `current_version_id` | BIGINT NULL |
| `created_by` | BIGINT |
| `created_at` | DATETIME |
| `updated_at` | DATETIME |
| `deleted_at` | DATETIME NULL |

#### `document_versions`

| Campo | Tipo |
|---|---|
| `id` | BIGINT PK |
| `document_id` | BIGINT |
| `version_number` | INT |
| `file_name` | VARCHAR(255) |
| `storage_path` | VARCHAR(255) |
| `mime_type` | VARCHAR(120) |
| `file_size` | BIGINT |
| `checksum_sha256` | CHAR(64) |
| `is_current` | TINYINT |
| `uploaded_by` | BIGINT |
| `uploaded_at` | DATETIME |
| `archived_at` | DATETIME NULL |

#### `comments`

| Campo | Tipo |
|---|---|
| `id` | BIGINT PK |
| `project_id` | BIGINT |
| `document_id` | BIGINT |
| `document_version_id` | BIGINT NULL |
| `author_user_id` | BIGINT |
| `body` | TEXT |
| `created_at` | DATETIME |
| `updated_at` | DATETIME NULL |
| `deleted_at` | DATETIME NULL |

### 6.3 Relaciones críticas

```
clients 1:N users
clients 1:N projects
projects N:M users (comerciales) → project_user
projects 1:N documents
documents 1:N document_versions
projects 1:N comments → comments N:1 document
projects 1:N project_status_logs
users 1:N audit_logs
```

---

## 7. Módulos funcionales

### 7.1 Autenticación y sesión

- Login por email y contraseña con hash robusto (`password_hash` / `password_verify`)
- Protección CSRF en formularios y renovación de sesión tras login
- Control de **timeout por inactividad**
- Política de bloqueo blando o rate limiting ante intentos fallidos
- Reset de contraseña: en MVP puede implementarse reemisión controlada por administradores

### 7.2 Gestión de clientes

- Listado con búsqueda por nombre o referencia
- Alta y edición por administrador y comercial (dentro de su ámbito)
- Desactivación lógica sin pérdida histórica
- Ficha con usuarios y proyectos asociados

### 7.3 Gestión de usuarios cliente

- Creación por administrador o comercial
- Asignación obligatoria a un cliente existente
- Activación/desactivación lógica
- Histórico de acceso y último login visible para roles internos

### 7.4 Gestión de proyectos

- Alta de proyecto con cliente, nombre, referencia, estado inicial `propuesta` y presupuesto opcional
- Asignación múltiple de comerciales
- Ficha de proyecto con pestañas: **resumen · documentos · comentarios · histórico**
- Bloqueo de edición y comentarios si estado `cerrado`

### 7.5 Propuestas y presupuestos

- Representados como **tipos documentales versionables**
- Una sola versión vigente + n versiones históricas archivadas
- Aprobación con doble confirmación y notificación automática
- Presupuesto también presente como campo estructurado en la ficha de proyecto

### 7.6 Comentarios

- Comentarios asociados a documento o versión
- Listado cronológico con autor, fecha y cuerpo
- Alta asíncrona sin recarga completa
- Bloqueo automático si el proyecto está cerrado

### 7.7 Búsqueda y filtros

| Rol | Capacidades |
|---|---|
| **Administrador** | Filtro por cliente y proyecto; búsqueda por nombre, referencia y estado |
| **Comercial** | Mismo patrón, limitado a sus proyectos |
| **Cliente** | Listado simple de sus proyectos y acceso a detalle |

### 7.8 Auditoría y actividad

- Visor interno de actividad por proyecto, usuario o rango de fechas
- Eventos de seguridad, negocio y acceso documental
- Capacidad de filtrar por tipo de acción

---

## 8. Gestión documental y seguridad

### 8.1 Tipos documentales recomendados

| Tipo | Visor recomendado | Visible al cliente | Notas |
|---|---|---|---|
| **Propuesta** | PDF / visor embebido | Sí | Versionable y aprobable |
| **Presupuesto** | PDF / visor embebido | Sí | Además se replica importe en campo estructurado |
| **Imagen / render** | Visor imagen protegido | Sí | Evitar URL pública directa |
| **Vídeo** | Streaming autenticado o visor embebido protegido | Sí | Revisar formatos compatibles |
| **Plano técnico** | Descarga autenticada | Opcional | Puede marcarse solo descarga |
| **Documento técnico** | Descarga autenticada | Opcional | Ej. DWG, ZIP, DOCX |
| **Materiales / acabados** | PDF o imagen | Sí | Según formato |

### 8.2 Estrategia de almacenamiento

- Guardar archivos **fuera del directorio público** del servidor siempre que la topología lo permita
- Persistir solo metadatos y rutas internas en base de datos
- Servir archivos mediante un **controlador PHP** que valide sesión, rol, pertenencia al proyecto y permiso concreto
- `Content-Disposition: inline` para archivos visualizables; `attachment` para solo descargables
- Aplicar cabeceras anti-cache en documentación sensible
- Registrar en `audit_logs` cualquier visualización o descarga

### 8.3 Protección anti-URL directa

- No exponer paths reales de almacenamiento en HTML ni en respuestas JSON
- Usar identificadores internos: `/documents/view/{versionId}`
- Revalidar permisos en **cada petición**, sin confiar en la UI
- *(Futuro)* URLs firmadas temporales para streaming o previsualización puntual

### 8.4 Versionado documental

- Un documento lógico puede tener **múltiples versiones**
- Una versión marcada como vigente (`is_current = 1`); las demás quedan archivadas
- El histórico permanece visible a roles autorizados
- La sustitución de documento nunca sobrescribe la evidencia histórica; se conserva checksum y metadatos

---

## 9. API interna asíncrona

> La API no está orientada a terceros; sirve a la propia interfaz de usuario. Comparte autenticación de sesión y autorización con la aplicación web.

| Endpoint | Método | Descripción | Roles |
|---|---|---|---|
| `/api/projects/search` | GET | Búsqueda y filtrado de proyectos | admin, comercial |
| `/api/projects/{id}/comments` | GET | Lista de comentarios del proyecto/documento | admin, comercial, cliente |
| `/api/projects/{id}/comments` | POST | Alta de comentario | admin, comercial, cliente |
| `/api/projects/{id}/approve` | POST | Aprobación con doble confirmación | admin, cliente |
| `/api/projects/{id}/status` | PATCH | Cambio de estado | admin, comercial |
| `/api/documents/upload` | POST | Subida de documento/versiones | admin, comercial |
| `/api/documents/{id}/versions` | GET | Histórico de versiones | admin, comercial, cliente (según acceso) |
| `/api/documents/{versionId}/view` | GET | Servir archivo inline autenticado | según autorización |
| `/api/documents/{versionId}/download` | GET | Descarga autenticada | según autorización |
| `/api/users/client` | POST | Alta de usuario cliente | admin, comercial |
| `/api/audit/search` | GET | Consulta de logs | admin, comercial acotado |

### 9.1 Convenciones

- Respuestas JSON uniformes: `{ success, message, data, errors }`
- **Validación server-side obligatoria** aunque exista validación cliente
- Códigos HTTP coherentes: `200`, `201`, `400`, `401`, `403`, `404`, `422`, `500`
- CSRF para peticiones mutables + cabecera `X-Requested-With` en fetch
- Normalización de errores para facilitar la capa front

---

## 10. Notificaciones

| Evento | Destinatarios | Canal | Observaciones |
|---|---|---|---|
| Nueva propuesta / nueva versión | Comerciales asignados y administradores | Email | Opcionalmente incluir enlace directo al proyecto |
| Cambio de estado | Comerciales asignados, administradores y (si aplica) cliente | Email | Plantillas diferenciadas por estado |
| Aprobación de propuesta | Comerciales asignados y administradores | Email | Disparo inmediato tras doble confirmación |
| Nuevo comentario | Participantes autorizados del proyecto | Email | **No notificar al autor de su propio comentario** |
| Alta de usuario cliente | Usuario creado | Email | Con acceso inicial y recomendaciones de seguridad |

### 10.1 Recomendaciones de implementación

- Centralizar plantillas de email en vistas o builders dedicados
- Registrar el resultado de envío en `notifications_queue` o `audit_logs`
- Permitir **reintento** si el envío falla
- Separar notificación operativa de notificación de seguridad

---

## 11. Logging, auditoría y trazabilidad

> La auditoría es un **requisito estructural**, no opcional. Debe contemplarse desde el diseño del dominio para no perder información crítica.

| Categoría | Eventos mínimos | Observaciones |
|---|---|---|
| **Autenticación** | login, logout, login fallido, timeout | Guardar IP y user agent si la política lo permite |
| **Administración** | alta/edición/desactivación de clientes y usuarios | Registrar actor, entidad afectada y diff resumido |
| **Proyecto** | alta, edición, cambio de estado, reapertura | Guardar estado anterior y nuevo |
| **Documento** | subida, nueva versión, visualización, descarga | Incluir `document_id` / `version_id` |
| **Comentarios** | alta, edición lógica, borrado lógico | Registrar texto anterior si se edita |
| **Aprobación** | inicio de acción y confirmación final | Guardar usuario aprobador y timestamp |

### 11.1 Modelo sugerido de `audit_logs`

```
actor_user_id   → BIGINT
actor_role      → VARCHAR
action_key      → VARCHAR        (ej: project.status_changed, document.viewed)
entity_type     → VARCHAR        (ej: project, document, comment)
entity_id       → BIGINT
project_id      → BIGINT NULL
metadata_json   → JSON           (before/after, version_id, file_name, etc.)
ip              → VARCHAR
user_agent      → VARCHAR
created_at      → DATETIME
```

> Los logs **no deben poder editarse** desde la aplicación.

---

## 12. Backoffice y paneles por rol

### 12.1 Panel cliente

- Listado simple de proyectos de su empresa
- Vista detalle de proyecto con resumen, documentos, histórico y comentarios
- Acción de **aprobar propuesta** cuando exista una versión vigente aprobable
- Sin capacidades de CRUD administrativo

### 12.2 Panel comercial

- Listado de sus proyectos con búsqueda y filtros por cliente / proyecto / estado / referencia
- CRUD de clientes y usuarios cliente dentro de su ámbito
- CRUD de proyectos asignados, documentos y comentarios
- Consulta del histórico y reapertura de proyectos cerrados

### 12.3 Panel administrador

- Vista global del sistema
- CRUD de comerciales, clientes, usuarios cliente y proyectos
- Consulta de logs, eventos, actividad y notificaciones
- Capacidad de gobernanza sobre cualquier documento y flujo

---

## 13. Requisitos no funcionales

| Categoría | Requisito | Objetivo |
|---|---|---|
| **Rendimiento** | Búsqueda y carga de listados paginados | Tiempo de respuesta < 2 s en operaciones comunes |
| **Seguridad** | Autenticación, autorización, CSRF, validación estricta | Reducir exposición y acceso indebido |
| **Mantenibilidad** | Código modular, naming consistente, servicios reutilizables | Facilitar evolución |
| **Escalabilidad** | Capacidad de crecer en número de proyectos y documentos | Sin rediseño integral del core |
| **Disponibilidad** | Logs y manejo de errores robustos | Diagnóstico rápido |
| **Usabilidad** | Interfaz clara por rol | Reducir fricción del cliente |
| **Compatibilidad** | Entorno XAMPP local y despliegue Linux/Apache | Homogeneidad de desarrollo |

---

## 14. Entorno local XAMPP

### 14.1 Requisitos

- PHP 8.4 configurado en Apache del entorno local
- MySQL/MariaDB accesible desde phpMyAdmin
- Módulos PHP activos: `pdo_mysql`, `mbstring`, `fileinfo`, `openssl`, `intl`, `gd` (si se procesan imágenes)
- VirtualHost local opcional para no depender de subcarpetas

### 14.2 Estructura de despliegue local recomendada

- Proyecto ubicado en `htdocs/steel-inox/` o mediante VirtualHost apuntando a `/public`
- `storage/documents` fuera de `/public` si es posible; si no, proteger con `.htaccess` y servir siempre por controlador
- Archivo `.env` o config local **no versionado** para credenciales sensibles

### 14.3 Script SQL

El paquete técnico debe incluir un script de creación de:

- Esquema completo con índices
- Datos semilla mínimos: un administrador, un comercial, un cliente demo, un proyecto demo
- Tablas de auditoría y notificaciones

---

## 15. Estrategia de desarrollo, testing y despliegue

### 15.1 Fases recomendadas

| Fase | Contenido |
|---|---|
| **Fase 1 — Core** | Bootstrap MVC, autenticación, roles, base de datos, layout |
| **Fase 2 — Backoffice** | Clientes, usuarios y proyectos |
| **Fase 3 — Documental** | Subida protegida, versionado, visor/descarga |
| **Fase 4 — Colaboración** | Comentarios, aprobaciones, notificaciones |
| **Fase 5 — Auditoría y hardening** | Logs completos, validaciones, permisos finos, QA |

### 15.2 Testing mínimo

- Pruebas de **autorización** por rol y pertenencia a proyecto
- Pruebas de **transiciones de estado**
- Pruebas de **visualización/descarga** de documentos con acceso permitido y denegado
- Pruebas de **versionado** y documento vigente
- Pruebas de **comentarios y notificaciones**
- Pruebas de **reapertura y bloqueo** en estado cerrado

### 15.3 Checklist de hardening

- [ ] Prepared statements en toda consulta SQL
- [ ] Escape de salida en vistas
- [ ] Control de subida de archivos por MIME, extensión, tamaño y checksum
- [ ] Regeneración de `session_id` tras login
- [ ] Cabeceras de seguridad básicas
- [ ] Política de errores no verbosa en producción

---

## 16. Backlog MVP y roadmap

### 16.1 Backlog MVP por módulos

| Módulo | Entregables | Prioridad |
|---|---|---|
| **Core** | Router, base controller, base model, config, autenticación, sesiones | 🔴 Alta |
| **Clientes y usuarios** | CRUD, filtros, activación/desactivación | 🔴 Alta |
| **Proyectos** | CRUD, asignación múltiple de comerciales, estados, presupuesto campo | 🔴 Alta |
| **Documentos** | Tipos, subida, versionado, visor/descarga protegidos | 🔴 Alta |
| **Comentarios** | Alta/listado async, permisos y notificaciones | 🔴 Alta |
| **Aprobación** | Botón, doble confirmación, cambio de estado, emails, log | 🔴 Alta |
| **Auditoría** | Registro y consulta interna | 🔴 Alta |

### 16.2 Roadmap futuro

- Dashboard de actividad y conversión por comercial
- Integración con herramientas corporativas
- Compartición temporal de documentos con token seguro
- Motor de plantillas documentales
- Etiquetado avanzado y búsquedas full-text

---

## 17. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Exposición de documentos sensibles | 🔴 Muy alto | Almacenamiento privado + serving autenticado + logs |
| Descontrol de permisos por alcance comercial | 🔴 Alto | Policies centralizadas y tests por rol |
| Pérdida de trazabilidad | 🔴 Alto | Auditoría transversal obligatoria |
| Crecimiento desordenado del modelo | 🟡 Medio | Diseño de entidades y servicios desde el inicio |
| UI lenta con muchos documentos | 🟡 Medio | Paginación, lazy loading, miniaturas y consultas indexadas |
| Fallo en notificaciones | 🟡 Medio | Registro de envíos y reintentos |

---

## 18. Criterios de aceptación

- [ ] Un administrador puede crear clientes, comerciales, usuarios cliente y proyectos sin acceso a proyectos ajenos por parte de un comercial.
- [ ] Un comercial solo puede ver y operar sobre proyectos asignados a él.
- [ ] Un cliente solo puede acceder a proyectos de su empresa.
- [ ] Un proyecto admite múltiples documentos y múltiples versiones, mostrando siempre una vigente.
- [ ] Los PDFs, imágenes y vídeos marcados como visualizables se sirven **sin URL pública directa**.
- [ ] Los documentos técnicos no visualizables se descargan solo tras validación de sesión y autorización.
- [ ] El cliente puede comentar y aprobar en los estados permitidos (proyecto no cerrado).
- [ ] Todo cambio relevante genera log auditable.
- [ ] Los proyectos cerrados no admiten edición ni comentarios, pero pueden reabrirse por roles internos.
- [ ] El sistema puede arrancar en entorno local XAMPP con base de datos importada desde script SQL.

---

## Anexo A — Recomendación de índices SQL

```sql
-- users
users(email)
users(client_id, role, is_active)

-- projects
projects(client_id, status)
projects(reference)
projects(created_at)

-- project_user
project_user(project_id, user_id)
project_user(user_id, project_id)

-- documents
documents(project_id, type, deleted_at)

-- document_versions
document_versions(document_id, is_current)
document_versions(uploaded_at)

-- comments
comments(project_id, created_at)
comments(document_id, created_at)

-- audit_logs
audit_logs(project_id, created_at)
audit_logs(actor_user_id, created_at)
audit_logs(action_key)
```

---

## Anexo B — Decisiones cerradas de negocio

| Decisión | Detalle |
|---|---|
| Sin subroles dentro del cliente | Todos los usuarios cliente tienen los mismos privilegios |
| Creación de usuarios cliente | Solo por administrador o comercial |
| Equivalencia de comerciales | Un proyecto puede tener varios; todos son equivalentes sin principal |
| Visibilidad del cliente | El cliente ve todo lo relativo a su proyecto |
| Presupuesto dual | Gestionado como campo estructurado **y** como documento versionable |
| Comentarios en estados intermedios | Cliente puede comentar también en `Aprobado` y `Ejecución` |
| Proyecto cerrado | Sigue visible y puede reabrirse con motivo registrado |
| Borrado lógico | Recomendado para todas las entidades; nunca borrado físico de histórico |

---

*Documento de especificación para desarrollo interno — Steel Inox · v1.0*
