# 🎨 Steel Inox — Roadmap Frontend
> **Responsable:** Desarrollador Frontend  
> **Stack:** JavaScript ES6+ · HTML5 · Tailwind CSS · FlyonUI · SPA Router propio  
> **Última revisión:** 2026-04-20

---

## Estado actual del frontend

El frontend tiene una **SPA funcional y bien estructurada** para los roles `admin` y `comercial`. El router JS propio con History API funciona correctamente, los módulos están separados por sección y el diseño visual es sólido. El **gap principal y más urgente** es que el rol `cliente` no tiene ninguna vista dedicada — cuando un cliente inicia sesión, no tiene una interfaz adecuada.

---

## 🔴 FASE 0 — Panel del cliente (GAP MÁS URGENTE del MVP)

Esta es la tarea más importante de todo el proyecto a nivel frontend. Sin esto, el MVP no está completo.

### Preparación

- [ ] **[CLI-00] Revisar qué recibe el cliente al hacer login**  
  Comprobar qué retorna `GET /api/me` para un usuario con rol `cliente`.  
  Verificar que `SIApp.init()` y `SIApp.buildSidebar()` manejan el caso `role === 'cliente'`.  
  Archivo: `public/assets/js/app.js`

### Sidebar y navegación del cliente

- [ ] **[CLI-01] Construir sidebar específico para el rol `cliente`**  
  En `SIApp.buildSidebar()` (archivo `app.js`), añadir la rama `cliente` con los items:
  - Mis Proyectos
  - (Opcional) Ajustes / Cambiar contraseña
  
  El cliente **no debe ver** las secciones: Clientes, Comerciales, Usuarios, Auditoría.

### Vista: Listado de proyectos del cliente

- [ ] **[CLI-02] Crear módulo `public/assets/js/modules/client_panel.js`**  
  Vista inicial del cliente: listado de sus proyectos.  
  Datos disponibles en: `GET /api/projects/search` (ya filtra por `client_id` en el backend).  
  Mostrar por proyecto: nombre, referencia, estado (con badge de color), fecha de creación.  
  Sin botones de edición, sin acceso a gestión.

### Vista: Detalle de proyecto (cliente)

- [ ] **[CLI-03] Vista de detalle del proyecto para el cliente**  
  Ruta: `/project/{id}` (ya existe en el router, pero no tiene vista para el cliente).  
  Datos disponibles en: `GET /api/projects/{id}`.  
  Debe mostrar:
  - [ ] Cabecera con nombre, referencia y estado del proyecto.
  - [ ] Resumen/descripción si existe.
  - [ ] Sección de documentos (solo los marcados como `is_visible_to_client = 1`).
  - [ ] Sección de comentarios.
  - [ ] Sección de histórico de estados (línea de tiempo visual).
  - [ ] Botón de aprobación (visible solo en estado `propuesta` con documentos de ese tipo).

### Vista: Visor de documentos (cliente)

- [ ] **[CLI-04] Integrar visor de documentos en el panel cliente**  
  Reutilizar o adaptar la lógica de visualización y descarga que ya existe en `project_detail_admin.js`.  
  El endpoint es: `GET /api/projects/{id}/documents/{docId}/view` o `.../download`.  
  El backend ya controla los permisos — el frontend solo debe llamar correctamente.  
  Para PDF: usar `<iframe>` o `<embed>` en un modal. Para imágenes: `<img>` autenticada (blob URL via fetch + `URL.createObjectURL`).

### Vista: Comentarios (cliente)

- [ ] **[CLI-05] Sección de comentarios para el cliente**  
  Listar comentarios: `GET /api/projects/{id}/documents/{docId}/comments`.  
  Publicar comentario: `POST /api/projects/{id}/documents/{docId}/comments`.  
  Mostrar formulario de nuevo comentario con textarea y botón enviar.  
  El backend ya bloquea comentarios si el proyecto está cerrado — mostrar mensaje informativo en ese caso.  
  **No mostrar botón de eliminar** (esa acción en el DDS es para admin/comercial).

### Vista: Flujo de aprobación (cliente)

- [ ] **[CLI-06] Botón y flujo de aprobación en la vista del cliente**  
  Mostrar el botón "Aprobar propuesta" solo cuando:
  - El estado del proyecto es `propuesta`.
  - Hay al menos un documento de tipo `propuesta` o `presupuesto` visible.
  
  Flujo UX:
  1. Click en "Aprobar propuesta" → modal de confirmación → llamar a `POST /api/projects/{id}/approve/request`.
  2. Modal se transforma en formulario de código de 6 dígitos con campo de entrada y mensaje "Introduce el código enviado a tu email".
  3. Enviar código → `POST /api/projects/{id}/approve/confirm` → si OK, mostrar mensaje de éxito y refrescar estado.
  4. Si el código es incorrecto, mostrar error inline sin cerrar el modal.
  5. Si el token expira (respuesta 422), mostrar mensaje y ocultar el formulario de código (permitir reenviar).

---

## 🟠 FASE 1 — Mejoras en vistas de admin/comercial

- [ ] **[ADM-01] Vista de logs de auditoría para el comercial**  
  El módulo `audit.js` existe para el admin. Para el comercial, mostrar una versión acotada: solo los logs de sus proyectos.  
  El backend filtra automáticamente si el usuario es comercial en `GET /api/projects/{id}/audit`.  
  Añadir una sección "Actividad" en el sidebar del comercial con un listado filtrado.

- [ ] **[ADM-02] Filtro por empresa/cliente en la vista de proyectos del comercial**  
  En el módulo `projects.js` (o `dashboard.js`), añadir un filtro de empresa disponible para el comercial.  
  El endpoint `GET /api/projects/search` acepta `client_id` como parámetro GET.  
  Mostrar un `<select>` con las empresas disponibles del comercial (endpoint: `GET /api/clients`).

- [ ] **[ADM-03] Mensajes claros cuando el proyecto está cerrado**  
  En la vista de detalle de proyecto (`project_detail_admin.js`), si el estado es `cerrado`:
  - Deshabilitar visualmente el formulario de comentarios con un mensaje.
  - Deshabilitar los botones de subida de documentos.
  - Resaltar visualmente el estado "Cerrado" de forma clara.

- [ ] **[ADM-04] Edición de comentarios (cuando el backend lo habilite)**  
  El backend añadirá `PUT /api/projects/{id}/documents/{docId}/comments/{commentId}`.  
  Añadir botón "Editar" en cada comentario (solo visible para el autor o admin).  
  Al pulsar, convertir el texto del comentario en un textarea editable inline.

- [ ] **[ADM-05] Revertir versión vigente de documento (cuando el backend lo habilite)**  
  El backend añadirá `PUT .../versions/{versionId}/set-current`.  
  En el histórico de versiones de un documento (`DocumentController::versions`), añadir botón "Establecer como vigente" en las versiones antiguas.

---

## 🟡 FASE 2 — UX y detalles de interfaz

- [ ] **[UX-01] Estado visual claro en proyectos cerrados**  
  El badge de estado "Cerrado" debería tener un estilo diferenciado (gris/bloqueado) vs. los demás estados.  
  Añadir un icono de candado o tooltip explicativo.

- [ ] **[UX-02] Feedback cuando el email de aprobación tarda en llegar**  
  En el flujo de aprobación, tras `requestApproval`, mostrar un contador de tiempo restante (10 min) en el modal de código.  
  Añadir botón "Reenviar código" habilitado solo cuando haya pasado cierto tiempo.

- [ ] **[UX-03] Confirmación antes de acciones destructivas**  
  Verificar que todas las acciones irreversibles tienen un modal de confirmación:
  - Eliminar proyecto.
  - Eliminar documento.
  - Eliminar usuario.
  - Eliminar comentario.
  - Desactivar cliente.

- [ ] **[UX-04] Paginación en listado de comentarios**  
  El backend devuelve paginación en los comentarios. Si el frontend no la consume, se muestra solo la primera página.  
  Añadir botón "Cargar más" o paginación clásica en el listado de comentarios.

- [ ] **[UX-05] Indicador de estado de la cola de notificaciones**  
  En el panel de admin, mostrar un pequeño indicador del número de notificaciones pendientes en la cola.  
  Datos disponibles con una query simple (el backend puede añadir un endpoint).

- [ ] **[UX-06] Tooltip/info del `access_mode` al subir documentos**  
  Al subir o editar un documento, el selector de "Modo de acceso" (`ver`, `descargar`, `ambos`) no tiene descripción.  
  Añadir un tooltip o texto de ayuda que explique qué significa cada opción.

---

## 🟢 FASE 3 — Rendimiento y preparación para producción

- [ ] **[PERF-01] Evaluar eliminación de Tailwind CDN**  
  Actualmente se carga `cdn.tailwindcss.com` en cada visita, lo que supone procesar el CSS en el cliente (~350KB).  
  Para producción, compilar Tailwind con la CLI de Tailwind o Vite:
  ```bash
  npm install tailwindcss
  npx tailwindcss -i ./input.css -o ./public/assets/css/tailwind.min.css --minify
  ```
  Actualizar `panel.php` para referenciar el CSS compilado en lugar del CDN.

- [ ] **[PERF-02] Minificar y empaquetar los archivos JS**  
  El módulo más grande (`project_detail_admin.js`) pesa ~227 KB sin minificar.  
  Usar `esbuild` o `rollup` para crear un bundle unificado minificado:
  ```bash
  npx esbuild public/assets/js/modules/project_detail_admin.js --bundle --minify --outfile=public/assets/js/dist/project_detail_admin.min.js
  ```
  O alternativamente, crear un `vite.config.js` para gestionar todos los assets.

- [ ] **[PERF-03] Lazy loading de módulos JS**  
  El panel carga todos los módulos JS al inicio (`panel.php`), aunque el usuario solo visite una sección.  
  Considerar cargar módulos de forma dinámica (`import()`) cuando el router navega a esa sección.

- [ ] **[PERF-04] Actualizar el `Content-Security-Policy` tras compilar Tailwind**  
  Una vez que Tailwind y FlyonUI estén compilados localmente, se pueden eliminar del CSP:
  - Eliminar `https://cdn.tailwindcss.com` de `script-src`.
  - Eliminar `https://cdn.jsdelivr.net` si FlyonUI se sirve localmente.
  - Eliminar `'unsafe-eval'` si Tailwind CDN ya no se usa.
  Archivo: `public/index.php`.

- [ ] **[PERF-05] Añadir atributo `loading="lazy"` en imágenes no críticas**  
  Por ejemplo, el logo de Unanime en el footer. Verificar que los favicons no tienen `lazy`.

---

## ⚪ FASE 4 — Accesibilidad y SEO

- [ ] **[ACC-01] Revisión de `aria-label` en botones de icono**  
  Los botones que solo tienen un SVG sin texto visible (logout, tema, hamburger) necesitan `aria-label` descriptivo.

- [ ] **[ACC-02] Gestión de foco en modales**  
  Cuando se abre un modal, el foco debe moverse al primer elemento interactivo dentro.  
  Cuando se cierra, debe volver al elemento que lo abrió.

- [ ] **[ACC-03] SEO básico en `panel.php` y `login.php`**  
  Verificar que la etiqueta `<title>` es dinámica según la sección activa (actualizar en el router JS con `document.title`).

---

## 📊 Resumen de tareas

| Fase | Tareas | Prioridad |
|------|--------|-----------|
| FASE 0 — Panel del cliente | 7 | 🔴 Crítica |
| FASE 1 — Mejoras admin/comercial | 5 | 🟠 Alta |
| FASE 2 — UX y detalles | 6 | 🟡 Media |
| FASE 3 — Rendimiento/producción | 5 | 🟢 Pre-producción |
| FASE 4 — Accesibilidad/SEO | 3 | ⚪ Post-MVP |
| **TOTAL** | **26** | |

---

## 📌 Endpoints de API disponibles para usar

> El backend los tiene implementados y funcionando. Solo hay que consumirlos correctamente.

| Endpoint | Método | Para qué sirve |
|---|---|---|
| `/api/me` | GET | Datos del usuario en sesión. Usar para saber el `role`. |
| `/api/projects/search` | GET | Listado de proyectos (filtrado automático por rol). |
| `/api/projects/{id}` | GET | Detalle completo de un proyecto. |
| `/api/projects/{id}/documents` | GET | Documentos de un proyecto (filtrados por visibilidad). |
| `/api/projects/{id}/documents/{docId}/view` | GET | Servir el documento para visualización inline. |
| `/api/projects/{id}/documents/{docId}/download` | GET | Descarga autenticada del documento. |
| `/api/projects/{id}/documents/{docId}/versions` | GET | Histórico de versiones de un documento. |
| `/api/projects/{id}/documents/{docId}/comments` | GET | Comentarios de un documento. |
| `/api/projects/{id}/documents/{docId}/comments` | POST | Crear nuevo comentario. |
| `/api/projects/{id}/approve/request` | POST | Iniciar aprobación (genera y envía código por email). |
| `/api/projects/{id}/approve/confirm` | POST | Confirmar aprobación con el código recibido. |
| `/api/projects/{id}/audit` | GET | Histórico de actividad del proyecto. |
