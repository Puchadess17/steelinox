# Steel Inox — Arquitectura del Frontend SPA

> Documento técnico de referencia para entender **cómo y por qué** funciona el frontend.  
> Versión `v1.1` · Actualizado con la implementación actual en producción local.

---

## 1. Filosofía de diseño

El frontend de Steel Inox **no usa ningún framework** (ni React, ni Vue, ni Angular). Es una **SPA (Single Page Application) construida a mano** sobre JavaScript ES6 puro, con las siguientes restricciones de diseño deliberadas:

| Decisión | Motivo |
|---|---|
| **Sin framework de componentes** | El proyecto es una extranet privada de tamaño controlado. Evitar la complejidad de un bundler (Webpack, Vite) o un framework reduce el tiempo de arranque en XAMPP local. |
| **Tailwind CSS vía CDN** | Acceso rápido a utilidades sin proceso de build. En producción debería pasar por CLI. |
| **PHP renderiza el shell** | El HTML inicial (header, sidebar, `#main-content`) lo produce PHP. El JS se encarga solo del contenido dinámico. |
| **sessionStorage para sesión** | El usuario logeado se guarda en `sessionStorage` (se pierde al cerrar pestaña). Si falta, se verifica contra `GET /api/me` antes de redirigir al login. |
| **API interna JSON** | Todo el acceso a datos pasa por `fetch` a endpoints bajo `/api/*`. No hay forms HTML que hagan POST al servidor. |

---

## 2. Mapa de archivos JS

```
public/assets/js/
│
├── api.js           ← Capa HTTP: API.get/post/put/delete + SIToast
├── auth.js          ← Gestión de sesión: Auth.getUser(), Auth.setUser()
├── app.js           ← SIApp: entrada principal, utilidades globales, modales
├── router.js        ← SIRouter: mapa de rutas, navegación SPA, breadcrumb
├── reset_password.js ← Página independiente de reset de contraseña (sin SPA)
│
└── modules/
    ├── templates.js             ← SITemplates: fragmentos HTML reutilizables (forms, modales)
    ├── dashboard.js             ← Vista principal: Admin / Comercial / Cliente
    ├── project_detail_admin.js  ← Vista de detalle de proyecto (el módulo más grande)
    ├── client_detail_admin.js   ← Vista de detalle de cliente
    ├── client_form_admin.js     ← Formulario alta/edición de cliente
    ├── client_user_form_admin.js ← Formulario alta/edición de usuario cliente
    ├── client_users_admin.js    ← Listado de usuarios cliente
    ├── commercials_admin.js     ← Listado de comerciales
    ├── commercial_form_admin.js ← Formulario alta/edición de comercial
    ├── audit.js                 ← Log de auditoría
    └── settings.js              ← Ajustes de perfil del usuario
```

---

## 3. Flujo de arranque (Boot sequence)

```
PHP → index.php (shell HTML)
         │
         ▼
  <script> app.js </script>  →  SIApp.init()
         │
         ├─ 1. Auth.getUser()             ← Lee sessionStorage
         │        │ (vacío)
         │        └─ fetch GET /api/me    ← Recupera sesión PHP
         │
         ├─ 2. API.fetchCsrfToken()       ← GET /api/csrf-token
         │
         ├─ 3. Aplicar si-font-size       ← localStorage
         │
         ├─ 4. SIApp.buildHeader()        ← Inyecta el header top
         │      SIApp.buildSidebar()      ← Inyecta sidebar según rol
         │
         └─ 5. SIRouter.init('main-content')
                    │
                    ├─ defineRoutes()     ← Registra todas las rutas
                    ├─ handleRoute()      ← Lee la URL actual
                    └─ SIModules[mod][method]()  ← Ejecuta el módulo
```

---

## 4. El Router (`router.js`)

El router es **client-side** pero compatible con recargas de página, porque el servidor (PHP/Apache) devuelve el mismo HTML para cualquier URL de la SPA.

### 4.1 Cómo se determina la vista

```
URL del navegador → getViewFromUrl() → nombre de vista → handleRoute(view)
                                                              │
                                                  ┌───────────┴───────────┐
                                                  │  Buscar en this.routes │
                                                  └───────────┬───────────┘
                                                              │
                                              ┌───────────────┴──────────────────┐
                                              │  Verificar rol (roles[])          │
                                              └───────────────┬──────────────────┘
                                                              │
                                              SIModules[mod][method]()  ← Ejecutar
```

### 4.2 Mapa de rutas actual

| Vista (nombre interno) | URL de navegador | Módulo JS | Roles |
|---|---|---|---|
| `dashboard` | `/steelinox/panel` | `dashboard.loadDashboardAuto` | todos |
| `clients` | `/steelinox/clients` | `dashboard.loadClientsList` | admin, comercial |
| `project-detail` | `/steelinox/project/{id}` | `projectDetailAdmin.loadProjectDetailSPA` | todos |
| `client-detail` | `/steelinox/client/{id}` | `clientDetailAdmin.loadClientDetailSPA` | admin, comercial |
| `client-new` | `/steelinox/client/new` | `clientFormAdmin.loadCreateSPA` | admin, comercial |
| `client-edit` | `/steelinox/client/edit/{id}` | `clientFormAdmin.loadEditSPA` | admin, comercial |
| `commercials` | `/steelinox/commercials` | `commercialsAdmin.loadList` | admin |
| `commercial-detail` | `/steelinox/commercial/{id}` | `commercialsAdmin.loadDetailSPA` | admin |
| `commercial-new` | `/steelinox/commercial/new` | `commercialFormAdmin.loadCreateSPA` | admin |
| `commercial-edit` | `/steelinox/commercial/edit/{id}` | `commercialFormAdmin.loadEditSPA` | admin |
| `users` | `/steelinox/users` | `clientUsersAdmin.loadList` | admin, comercial, cliente |
| `user-new` | `/steelinox/user/new` | `clientUserFormAdmin.loadCreateSPA` | admin, comercial |
| `user-edit` | `/steelinox/user/edit/{id}` | `clientUserFormAdmin.loadEditSPA` | admin, comercial |
| `audit-log` | `/steelinox/audit-log` | `audit.initAuditLog` | admin |
| `settings` | `/steelinox/settings` | `settings.init` | todos |

### 4.3 Navegación programática

```js
// Navegar a una vista por nombre
SIRouter.navigate('dashboard');

// Navegar a una URL completa (ej: detalle de proyecto)
SIRouter.navigate('/steelinox/project/42');
```

---

## 5. La capa de API (`api.js`)

Toda comunicación con el backend pasa por el objeto `API`. Nunca se hacen `fetch` directos fuera de este archivo (salvo el boot inicial en `app.js`).

### 5.1 Métodos disponibles

```js
API.get('/projects/search?page=1')          // GET
API.post('/projects', { name: '...', ... }) // POST + CSRF
API.put('/projects/42', { status: '...' })  // PUT + CSRF
API.delete('/projects/42')                  // DELETE + CSRF
API.put('/me', { name: '...' }, { silent: true }) // silent=true suprime toast de error
```

### 5.2 Manejo de errores automático

- **Errores 4xx/5xx**: Por defecto muestra un toast rojo automáticamente.
- **`{ silent: true }`**: Suprime ese toast (para cuando el módulo ya maneja el error visualmente).
- La API **siempre devuelve** `{ success, message, data, errors }`.

### 5.3 CSRF

Antes de cualquier mutación (POST/PUT/DELETE), el cliente almacena el token recibido de `GET /api/csrf-token` y lo envía como header `X-CSRF-Token` en cada petición.

---

## 6. Utilidades globales (`app.js → SIApp`)

`SIApp` es el **objeto global de utilidades** de toda la app. Lo usan todos los módulos.

### 6.1 Formato de datos

| Método | Descripción |
|---|---|
| `SIApp.formatDate(str)` | `"26 mar. 2026"` |
| `SIApp.formatDateTime(str)` | `"26 mar. 2026 · 14:30"` |
| `SIApp.formatCurrency(num)` | `"12.345 €"` |
| `SIApp.formatNumber(num)` | `"12.345"` |
| `SIApp.formatFileSize(bytes)` | `"1.2 MB"` |
| `SIApp.timeAgo(str)` | `"Hace 3 días"` |

### 6.2 Componentes visuales

| Método | Descripción |
|---|---|
| `SIApp.statusBadge(status)` | Badge coloreado de estado del proyecto |
| `SIApp.activeBadge(isActive)` | Badge verde/rojo Activo/Inactivo |
| `SIApp.refBadge(text)` | Badge gris para referencias (PRJ-xxx, CLI-xxx) |
| `SIApp.avatarInitials(name, size, font)` | Avatar circular con iniciales y color determinista |
| `SIApp.renderPaginationControls(el, pag, onPage, onLimit)` | Paginador completo con goto y per-page |

### 6.3 Interacción y formularios

| Método | Descripción |
|---|---|
| `SIApp.confirm(title, msg, btnText)` | Modal de confirmación promisificado → `true/false` |
| `SIApp.prompt(title, msg, placeholder, btn)` | Modal con textarea → `string` o `null` |
| `SIApp.modal.open(id)` / `.close(id)` | Abrir/cerrar modales por ID |
| `SIApp.showToast(title, msg, type)` | Notificación tipo `success/error/warning/info` |
| `SIApp.setBtnLoading(btnId, bool, text)` | Estado de carga en botones (spinner) |
| `SIApp.getValidatedFormData(formId)` | Valida y extrae datos de un `<form>` |
| `SIApp.validateField(el, regex, msg)` | Validación visual inline de un campo |
| `SIApp.validatePasswordRequirements(el)` | Validador visual de requisitos de contraseña |
| `SIApp.togglePasswordVisibility(btn)` | Mostrar/ocultar contraseña |
| `SIApp.escapeHtml(str)` | Escapar HTML en templates |

### 6.4 Sesión y preferencias

| Método | Descripción |
|---|---|
| `SIApp.user` | Objeto del usuario en sesión (cacheado desde `Auth.getUser()`) |
| `SIApp.toggleTheme()` | Alternar dark/light mode |
| `SIApp.setTitle(title)` | Actualiza el `<title>` del documento |

---

## 7. Plantillas reutilizables (`templates.js → SITemplates`)

Para evitar duplicar HTML de formularios entre módulos, existen fragmentos centralizados:

| Fragmento | Descripción | Usado en |
|---|---|---|
| `SITemplates.fragments.projectFields(data, isEdit)` | Campos de formulario de proyecto | `dashboard.js` |
| `SITemplates.fragments.clientFields(data, isEdit)` | Campos de formulario de cliente | `client_form_admin.js` |
| `SITemplates.fragments.userFields(data, options)` | Campos de formulario de usuario/comercial | `client_user_form_admin.js`, `commercial_form_admin.js` |
| `SITemplates.modal(options)` | Wrapper de modal estandarizado | Varios módulos |

---

## 8. Patrón de módulo estándar

Todos los módulos siguen el mismo patrón de objeto literal:

```js
SIModules.miModulo = {
    // 1. Referencia cómoda al contenedor de contenido
    get container() {
        return document.getElementById('main-content');
    },

    // 2. Punto de entrada desde el router
    async init() {
        // a. Llamar a la API
        const result = await API.get('/alguna/ruta');
        if (!result.success) return;
        
        // b. Renderizar HTML en el contenedor
        this.container.innerHTML = this._template(result.data);
        
        // c. Registrar eventos dinámicos (si los hay)
        this._initEvents();
    },

    // 3. Template HTML (función pura sin efectos secundarios)
    _template(data) {
        return `<div>...</div>`;
    },

    // 4. Acciones del usuario
    async save() { ... },
    async delete(id) { ... },
};
```

---

## 9. Dashboard y renderizado compartido

El `dashboard.js` contiene los **tres dashboards** (Admin, Comercial, Cliente) en un único módulo. Comparten el motor de renderizado mediante el método `_renderProjectsCommon(data, pagination, type)`, que genera tanto la vista de tabla (escritorio) como las tarjetas móviles.

### 9.1 Flujo de carga Admin/Comercial

```
loadAdminDashboard()          (renderiza el shell con contenedores vacíos)
    └─ _reloadAdminTable()    (fetch a /projects/search con filtros/paginación)
           └─ _renderProjectsCommon(data, pag, 'admin')
                  ├─ _renderProjectRow(p, user)   (fila de tabla)
                  └─ _renderClientCards(data)      (tarjetas móvil)
```

### 9.2 Estado del filtro

Los filtros (status, search, sort, page) se guardan como propiedades del módulo (`this.currentAdminFilter`, etc.), **no en la URL**. Esto permite recargar solo la tabla sin destruir los inputs de búsqueda.

---

## 10. Sesión y seguridad

```
Login exitoso
    └─ AuthController::login() → sessionStorage.setItem('si_user', json)

Recarga de página / nueva pestaña
    └─ sessionStorage vacío → fetch GET /api/me
           ├─ 200 OK  → restaurar sesión, continuar boot
           └─ 401      → redirigir a /steelinox/

Logout
    └─ POST /api/logout → sessionStorage.clear() → redirect /
```

> **Nota de seguridad**: El `sessionStorage` es solo un caché de conveniencia para evitar un round-trip en cada navegación. La **autorización real** siempre la valida el backend (PHP session + middleware + AccessMatrix).

---

## 11. Dark Mode

- Se almacena en `localStorage('si-theme')` como `'dark'` o `'light'`.
- Al cargar, se aplica la clase `dark` al elemento `<html>`.
- El toggle es `SIApp.toggleTheme()` desde el botón en Settings y en el sidebar.
- Tailwind está configurado con `darkMode: 'class'`.

---

## 12. Preferencias de usuario (localStorage)

| Clave | Valor | Descripción |
|---|---|---|
| `si-theme` | `'dark'` / `'light'` | Tema de color |
| `si-font-size` | `'16px'` / `'18px'` / `'20px'` | Tamaño base de letra |
| `si-pref-notify-doc` | `'1'` / `'0'` | Preferencia de notificación (local) |
| `si-pref-notify-phase` | `'1'` / `'0'` | Preferencia de notificación (local) |
| `si-pref-notify-comm` | `'1'` / `'0'` | Preferencia de notificación (local) |

> Las preferencias de notificación son **solo locales** (del navegador). El backend siempre envía los emails según las reglas del DDS; estas preferencias son informativos/UX.

---

## 13. Convenciones de código

| Convención | Descripción |
|---|---|
| `_método()` | Métodos privados (internos al módulo, no llamados desde fuera) |
| `SIApp.*` | Utilidades globales (accesibles desde cualquier módulo) |
| `SIRouter.*` | Navegación global |
| `SIModules.*` | Módulos de vista (1 por sección funcional) |
| `SITemplates.*` | Fragmentos HTML reutilizables |
| `API.*` | Toda la comunicación HTTP |
| `Auth.*` | Sesión del usuario |
| `id="si-*"` | IDs de elementos del sistema (paginador, toasts, modales) |
