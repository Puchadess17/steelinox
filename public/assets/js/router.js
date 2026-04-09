/**
 * Steel Inox Extranet — SPA Router (Query Param based)
 * Maneja la navegación sin usar # ni romper el backend.
 * Depende de: auth.js (Auth)
 */
const SIRouter = {
    routes: {},
    currentView: null,
    contentContainer: null,

    init(containerId = 'main-content') {
        this.contentContainer = document.getElementById(containerId);

        if (!this.contentContainer) {
            console.error('Router: container no encontrado:', containerId);
            return;
        }

        this.defineRoutes();

        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-route]') || e.target.closest('a[href^="/steelinox/"]');
            if (!link) return;

            const href = link.getAttribute('href');

            // Ignorar links externos, de descarga, o con target
            if (!href || href.startsWith('#') || link.hasAttribute('download') || link.getAttribute('target') === '_blank') return;

            // Solo interceptar rutas internas de la SPA
            if (!href.startsWith('/steelinox/')) return;

            // No interceptar rutas de API
            if (href.startsWith('/steelinox/api/')) return;

            e.preventDefault();

            // Determinar la vista: si la URL contiene patrones de detalle/nuevo/edición, manejamos SPA
            const spaPatterns = ['/project/', '/client/', '/commercial/', '/user/'];
            const isSpaPath = spaPatterns.some(p => href.includes(p));

            if (isSpaPath) {
                window.history.pushState(null, '', href);
                this.handleRoute(this.getViewFromUrl());
            } else {
                // Para rutas normales, usar data-route si existe, sino calcular desde href
                const route = link.getAttribute('data-route');
                if (route) {
                    this.navigate(route);
                } else {
                    // Calcular la ruta desde el href
                    window.history.pushState(null, '', href);
                    this.handleRoute(this.getViewFromUrl());
                }
            }
        });

        // NUEVO: Al darle al botón de "Atrás" en el navegador, leemos la ruta limpia
        window.addEventListener('popstate', () => {
            this.handleRoute(this.getViewFromUrl());
        });

        // NUEVO: Obtener vista inicial leyendo la URL real
        this.handleRoute(this.getViewFromUrl());
    },

    getViewFromUrl() {
        const path = window.location.pathname;
        const basePath = '/steelinox/';
        let cleanPath = path.replace(basePath, '').replace(/^\/|\/$/g, '');

        if (cleanPath === 'panel' || cleanPath === '') {
            return 'dashboard';
        }

        // --- LA MAGIA NUEVA ---
        // Si la URL empieza por "project/", le decimos al router que cargue la vista 'project-detail'
        if (cleanPath.startsWith('project/')) {
            const user = Auth.getUser();
            if (user && user.role === 'cliente') {
                return 'project-detail-cliente';
            }
            return 'project-detail';
        }

        // Si la URL empieza por "client/", le decimos al router que cargue la vista correspondiente
        if (cleanPath.startsWith('client/')) {
            if (cleanPath === 'client/new') return 'client-new';
            if (cleanPath.startsWith('client/edit/')) return 'client-edit';
            return 'client-detail';
        }

        // Si la URL empieza por "commercial/", le decimos al router que cargue la vista correspondiente
        if (cleanPath.startsWith('commercial/')) {
            if (cleanPath === 'commercial/new') return 'commercial-new';
            if (cleanPath.startsWith('commercial/edit/')) return 'commercial-edit';
            return 'commercial-detail';
        }

        // Si la URL empieza por "user/", cargamos la vista correspondiente para usuarios cliente
        if (cleanPath.startsWith('user/')) {
            if (cleanPath === 'user/new') return 'user-new';
            if (cleanPath.startsWith('user/edit/')) return 'user-edit';
            return 'users';
        }

        return cleanPath;
    },

    /** Mapa de rutas: nombre de la vista → { module, method, roles, title } */
    defineRoutes() {
        this.routes = {
            'dashboard': { module: 'dashboard', method: 'loadDashboardAuto', roles: ['admin', 'comercial', 'cliente'], title: 'Panel General' },
            'clients': { module: 'dashboard', method: 'loadClientsList', roles: ['admin', 'comercial'], title: 'Clientes' },
            'project-detail': { module: 'projectDetailAdmin', method: 'loadProjectDetailSPA', roles: ['admin', 'comercial'], title: 'Detalle del Proyecto' },
            'project-detail-cliente': { module: 'projects', method: 'loadProjectDetail', roles: ['cliente'], title: 'Detalle del Proyecto' },
            'client-detail': { module: 'clientDetailAdmin', method: 'loadClientDetailSPA', roles: ['admin', 'comercial'], title: 'Detalle del Cliente' },
            'client-new': { module: 'clientFormAdmin', method: 'loadCreateSPA', roles: ['admin', 'comercial'], title: 'Nuevo Cliente' },
            'client-edit': { module: 'clientFormAdmin', method: 'loadEditSPA', roles: ['admin', 'comercial'], title: 'Editar Cliente' },

            'commercials': { module: 'commercialsAdmin', method: 'loadList', roles: ['admin'], title: 'Comerciales' },
            'commercial-detail': { module: 'commercialsAdmin', method: 'loadDetailSPA', roles: ['admin'], title: 'Detalle Comercial' },
            'commercial-new': { module: 'commercialFormAdmin', method: 'loadCreateSPA', roles: ['admin'], title: 'Nuevo Comercial' },
            'commercial-edit': { module: 'commercialFormAdmin', method: 'loadEditSPA', roles: ['admin'], title: 'Editar Comercial' },

            'users': { module: 'clientUsersAdmin', method: 'loadList', roles: ['admin', 'comercial'], title: 'Usuarios Cliente' },
            'user-new': { module: 'clientUserFormAdmin', method: 'loadCreateSPA', roles: ['admin', 'comercial'], title: 'Nuevo Usuario Cliente' },
            'user-edit': { module: 'clientUserFormAdmin', method: 'loadEditSPA', roles: ['admin', 'comercial'], title: 'Editar Usuario Cliente' },

            'audit-log': { module: 'audit', method: 'initAuditLog', roles: ['admin'], title: 'Registro de Actividad' },
            'settings': { module: 'settings', method: 'dummyMethod', roles: ['admin', 'comercial', 'cliente'], title: 'Ajustes' },
            'projects-new': { module: 'projects', method: 'dummyMethod', roles: ['admin', 'comercial'], title: 'Nuevo Proyecto' }
        };
    },

    /** Manejar cambio de ruta */
    async handleRoute(view) {
        const user = Auth.getUser();

        if (!user) {
            window.location.href = '/steelinox/';
            return;
        }

        // Buscar ruta
        const route = this.routes[view];

        if (!route) {
            this.show404();
            return;
        }

        // Verificar permisos
        if (!route.roles.includes(user.role)) {
            this.showForbidden();
            return;
        }

        // Actualizar sidebar
        this.updateSidebar(view);

        // Actualizar breadcrumb
        this.updateBreadcrumb(route.title);

        // Ejecutar módulo
        this.currentView = view;
        if (route.module && window.SIModules && window.SIModules[route.module]) {
            const mod = window.SIModules[route.module];
            if (typeof mod[route.method] === 'function') {
                // Mostrar loading
                this.showLoading();
                await mod[route.method]();
            }
        } else if (route.method === 'dummyMethod') {
            this.contentContainer.innerHTML = `<div class="si-empty py-20 text-gray-500">Módulo <b>${route.title}</b> en construcción.</div>`;
        }
    },

    /** Mostrar spinner de carga */
    showLoading() {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = `
                <div class="flex items-center justify-center py-20">
                    <div class="si-spinner"></div>
                </div>
            `;
        }
    },

    /** Actualizar sidebar activa */
    updateSidebar(view) {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
            let route = item.dataset.route;
            // Para el dashboard manejamos también la vista panel
            if (route === view || (view === 'dashboard' && route === 'dashboard') || (view.startsWith('project-detail') && route === 'dashboard') || (view === 'client-detail' && route === 'clients') || (view.startsWith('user-') && route === 'users')) {
                item.classList.add('active');
            }
        });
    },

    /** Actualizar breadcrumb */
    updateBreadcrumb(title) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = `
            <a href="javascript:void(0)" onclick="SIRouter.navigate('dashboard')" class="text-gray-400 hover:text-orange-500 transition-colors">Inicio</a>
            <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            <span class="text-gray-700 font-medium">${title || 'Página'}</span>
        `;
    },

    /** Navegar programáticamente */
    navigate(view) {
        const basePath = '/steelinox/';

        // Si alguien pasa una URL completa (ej: '/steelinox/client/1'), manejarla directamente
        if (view.startsWith(basePath)) {
            window.history.pushState(null, '', view);
            this.handleRoute(this.getViewFromUrl());
            return;
        }

        // Si la vista es dashboard, la URL amigable es 'panel'
        let urlPath = view === 'dashboard' ? 'panel' : view;

        // MAPEO: Convertir nombres de vista (guiones) a paths de URL (barras) 
        // para que coincidan con web.php en caso de refresco de página.
        const viewToPathMap = {
            'client-new': 'client/new',
            'client-edit': 'client/edit',
            'commercial-new': 'commercial/new',
            'commercial-edit': 'commercial/edit',
            'user-new': 'user/new',
            'user-edit': 'user/edit'
        };

        if (viewToPathMap[view]) {
            urlPath = viewToPathMap[view];
        }

        const finalUrl = basePath + urlPath;

        // Cambiamos la URL en el navegador SIN recargar la página
        window.history.pushState(null, '', finalUrl);
        this.handleRoute(view);
    },

    /** 404 */
    show404() {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = this._errorTemplate(
                404,
                'Página no encontrada',
                'Lo sentimos, la sección que intentas cargar no existe o ha sido movida.'
            );
        }
    },

    /** 403 */
    showForbidden() {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = this._errorTemplate(
                403,
                'Acceso Denegado',
                'No tienes los permisos suficientes para ver el contenido de esta sección.'
            );
        }
    },

    /** Template de error SPA */
    _errorTemplate(code, title, message) {
        return `
            <div class="flex flex-col items-center justify-center py-20 px-4 fade-in">
                <!-- Icono/Ilustración -->
                <div class="relative mb-8 text-orange-500/10">
                    <span class="text-9xl font-black select-none opacity-20">${code}</span>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="w-16 h-16 bg-white border-2 border-orange-500 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/10">
                            <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Textos -->
                <div class="text-center max-w-sm">
                    <h2 class="text-2xl font-bold text-gray-900 mb-3">${title}</h2>
                    <p class="text-gray-500 text-sm leading-relaxed mb-8">
                        ${message}
                    </p>

                    <!-- Botón Home -->
                    <button 
                        onclick="SIRouter.navigate('dashboard')" 
                        class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-orange-500/25 active:transform active:scale-[0.98]"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                        Volver al Dashboard
                    </button>
                    <p class="mt-6 text-xs text-gray-400">
                        Error detectado en el cliente. Si persiste, contacta con soporte.
                    </p>
                </div>
            </div>
        `;
    },
};

// Registro global de módulos JS
window.SIModules = window.SIModules || {};

