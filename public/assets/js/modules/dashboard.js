/**
 * Steel Inox — Dashboard Module
 * 3 dashboards: Admin, Comercial, Cliente.
 * Usa datos de GET /api/projects/search para calcular KPIs client-side.
 * Depende de: api.js, auth.js, app.js
 */
window.SIModules = window.SIModules || {};

SIModules.dashboard = {

    /** Contenedor principal */
    get container() {
        return document.getElementById('main-content');
    },

    /** Resuelve qué dashboard cargar según el rol */
    async loadDashboardAuto() {
        const user = Auth.getUser();
        if (!user) return;

        switch (user.role) {
            case 'admin': return this.loadAdminDashboard();
            case 'comercial': return this.loadCommercialDashboard();
            case 'cliente': return this.loadClientDashboard();
            default: this.container.innerHTML = this._errorState('Rol no reconocido.');
        }
    },

    // ═══════════════════════════════════════
    // ADMIN DASHBOARD
    // ═══════════════════════════════════════

    async loadAdminDashboard() {
        const user = Auth.getUser();
        const result = await API.get('/projects/search');

        // Manejar error
        if (!result.success) {
            this.container.innerHTML = this._errorState('No se pudieron cargar los datos del dashboard.');
            return;
        }

        const projects = Array.isArray(result.data) ? result.data : [];

        // Calcular KPIs
        const kpis = {
            total: projects.length,
            ejecucion: projects.filter(p => p.status === 'ejecucion').length,
            propuesta: projects.filter(p => p.status === 'propuesta').length,
            cerrado: projects.filter(p => p.status === 'cerrado').length,
            aprobado: projects.filter(p => p.status === 'aprobado').length,
        };

        this.container.innerHTML = `
            <div class="fade-in">
                <!-- Header con saludo -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Bienvenido de nuevo, ${SIApp.escapeHtml(user.name)}</h1>
                        <p class="text-sm text-gray-500 mt-1">Aquí tienes un resumen de la actividad reciente en los proyectos de Steel Inox.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                            Filtros
                        </button>
                        <button onclick="SIRouter.navigate('projects-new')" class="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/25">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            Nuevo Proyecto
                        </button>
                    </div>
                </div>

                <!-- KPI Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    ${this._kpiCard('Proyectos Activos', kpis.ejecucion + kpis.propuesta + kpis.aprobado, 'orange', this._icon('grid'))}
                    ${this._kpiCard('Total Proyectos', kpis.total, 'blue', this._icon('folder'))}
                    ${this._kpiCard('En Ejecución', kpis.ejecucion, 'emerald', this._icon('play'))}
                    ${this._kpiCard('Completados', kpis.cerrado, 'gray', this._icon('check'))}
                </div>

                <!-- Content Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Tabla de proyectos -->
                    <div class="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 class="text-base font-semibold text-gray-900">Proyectos Recientes</h2>
                            <span class="text-xs text-gray-400">${kpis.total} proyectos</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full si-table">
                                <thead>
                                    <tr class="bg-gray-50">
                                        <th class="px-4 py-3 text-left">Proyecto</th>
                                        <th class="px-4 py-3 text-left">Referencia</th>
                                        <th class="px-4 py-3 text-left">Cliente</th>
                                        <th class="px-4 py-3 text-left">Estado</th>
                                        <th class="px-4 py-3 text-left">Creado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${projects.length > 0 ? projects.slice(0, 10).map(p => `
                                        <tr class="hover:bg-gray-50 cursor-pointer">
                                            <td class="px-4 py-3">
                                                <p class="text-sm font-medium text-orange-500 hover:text-orange-600">${SIApp.escapeHtml(p.name)}</p>
                                            </td>
                                            <td class="px-4 py-3">
                                                <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${SIApp.escapeHtml(p.reference)}</span>
                                            </td>
                                            <td class="px-4 py-3 text-sm text-gray-600">${SIApp.escapeHtml(p.client_name || '-')}</td>
                                            <td class="px-4 py-3">${SIApp.statusBadge(p.status)}</td>
                                            <td class="px-4 py-3 text-sm text-gray-500">${SIApp.formatDate(p.created_at)}</td>
                                        </tr>
                                    `).join('') : `
                                        <tr><td colspan="5" class="text-center py-8 text-sm text-gray-400">No hay proyectos registrados</td></tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Panel lateral -->
                    <div class="space-y-6">
                        <!-- Resumen rápido por estado -->
                        <div class="bg-white border border-gray-200 rounded-xl p-5">
                            <h2 class="text-base font-semibold text-gray-900 mb-4">Distribución por Estado</h2>
                            <div class="space-y-3">
                                ${this._statusRow('Propuesta', kpis.propuesta, kpis.total, '#F59E0B')}
                                ${this._statusRow('Aprobado', kpis.aprobado, kpis.total, '#10B981')}
                                ${this._statusRow('Ejecución', kpis.ejecucion, kpis.total, '#F97316')}
                                ${this._statusRow('Cerrado', kpis.cerrado, kpis.total, '#6B7280')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ═══════════════════════════════════════
    // COMMERCIAL DASHBOARD
    // ═══════════════════════════════════════

    async loadCommercialDashboard() {
        const user = Auth.getUser();
        const result = await API.get('/projects/search');

        if (!result.success) {
            this.container.innerHTML = this._errorState('No se pudieron cargar tus proyectos.');
            return;
        }

        const projects = Array.isArray(result.data) ? result.data : [];
        const kpis = {
            total: projects.length,
            propuesta: projects.filter(p => p.status === 'propuesta').length,
            ejecucion: projects.filter(p => p.status === 'ejecucion').length,
            aprobado: projects.filter(p => p.status === 'aprobado').length,
        };

        this.container.innerHTML = `
            <div class="fade-in">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <h1 class="text-2xl font-bold text-gray-900">Panel de Proyectos</h1>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">MIS PROYECTOS</span>
                        </div>
                        <p class="text-sm text-gray-500">Gestiona y realiza el seguimiento de tu cartera de proyectos asignada.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            Exportar Lista
                        </button>
                        <button onclick="SIRouter.navigate('projects-new')" class="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/25">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            Nuevo Proyecto
                        </button>
                    </div>
                </div>

                <!-- KPI Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    ${this._kpiCard('Proyectos Totales', kpis.total, 'orange', this._icon('grid'))}
                    ${this._kpiCard('Pendientes Aprobación', String(kpis.propuesta).padStart(2, '0'), 'amber', this._icon('clock'))}
                    ${this._kpiCard('En Producción', kpis.ejecucion, 'emerald', this._icon('play'))}
                    ${this._kpiCard('Acciones Requeridas', String(kpis.propuesta).padStart(2, '0'), 'red', this._icon('alert'))}
                </div>

                <!-- Tabla de proyectos -->
                <div class="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                    <div class="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h2 class="text-base font-semibold text-gray-900">Listado de Proyectos</h2>
                        <div class="flex items-center gap-2">
                            <div class="relative">
                                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                <input type="text" placeholder="Buscar por nombre o ref..." class="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-52">
                            </div>
                            <button class="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                                Filtrar
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full si-table">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="px-4 py-3 text-left">Proyecto</th>
                                    <th class="px-4 py-3 text-left">Referencia</th>
                                    <th class="px-4 py-3 text-left">Cliente</th>
                                    <th class="px-4 py-3 text-left">Estado</th>
                                    <th class="px-4 py-3 text-left">Fecha Inicio</th>
                                    <th class="px-4 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${projects.length > 0 ? projects.map(p => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-4 py-3">
                                            <p class="text-sm font-medium text-gray-800">${SIApp.escapeHtml(p.name)}</p>
                                        </td>
                                        <td class="px-4 py-3">
                                            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${SIApp.escapeHtml(p.reference)}</span>
                                        </td>
                                        <td class="px-4 py-3 text-sm text-gray-600">${SIApp.escapeHtml(p.client_name || '-')}</td>
                                        <td class="px-4 py-3">${SIApp.statusBadge(p.status)}</td>
                                        <td class="px-4 py-3 text-sm text-gray-500">${SIApp.formatDate(p.created_at)}</td>
                                        <td class="px-4 py-3 text-center">
                                            <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('') : `
                                    <tr><td colspan="6" class="text-center py-8 text-sm text-gray-400">No tienes proyectos asignados</td></tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                    <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                        <span>Mostrando ${projects.length} de ${projects.length} proyectos</span>
                        <div class="flex items-center gap-1">
                            <button class="px-3 py-1 border border-gray-200 rounded text-xs hover:bg-gray-50 disabled:opacity-50" disabled>Anterior</button>
                            <button class="px-3 py-1 bg-orange-500 text-white rounded text-xs">1</button>
                            <button class="px-3 py-1 border border-gray-200 rounded text-xs hover:bg-gray-50 disabled:opacity-50" disabled>Siguiente</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ═══════════════════════════════════════
    // CLIENT DASHBOARD
    // ═══════════════════════════════════════

    async loadClientDashboard() {
        const result = await API.get('/projects/search');

        if (!result.success) {
            this.container.innerHTML = this._errorState('No se pudieron cargar tus proyectos.');
            return;
        }

        const projects = Array.isArray(result.data) ? result.data : [];
        const kpis = {
            total: projects.length,
            pending: projects.filter(p => ['propuesta', 'aprobado'].includes(p.status)).length,
            completed: projects.filter(p => p.status === 'cerrado').length,
        };

        // Encontrar la fecha más reciente
        let latestDate = null;
        if (projects.length > 0) {
            const sorted = [...projects].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            latestDate = sorted[0].created_at;
        }

        // Estado de los filtros
        this._clientFilter = 'all';
        this._clientSearch = '';
        this._clientProjects = projects;

        // Nombre de la empresa (si hay proyectos, asumimos que todos son del mismo cliente)
        const companyName = projects.length > 0 && projects[0].client_name
            ? projects[0].client_name
            : 'tu Empresa';

        this.container.innerHTML = `
            <div class="fade-in">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Mis Proyectos</h1>
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-600 uppercase tracking-wide border border-orange-200/50 shadow-sm">${SIApp.escapeHtml(companyName)}</span>
                        </div>
                        <p class="text-sm text-gray-500">Gestiona y supervisa el estado de tus proyectos en curso.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 hidden sm:flex">
                            <button class="p-1.5 bg-white text-gray-800 rounded shadow-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg></button>
                            <button class="p-1.5 text-gray-400 hover:text-gray-600 rounded"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg></button>
                        </div>
                        <button class="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm">
                            Ver Último Reporte
                        </button>
                    </div>
                </div>

                <!-- KPI Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    ${this._kpiCardClient('Total Proyectos', kpis.total, '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>', 'blue')}
                    ${this._kpiCardClient('Pendientes', kpis.pending, '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5l2.5 2.5"/></svg>', 'amber')}
                    ${this._kpiCardClient('Completados', kpis.completed, '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 'emerald')}
                    ${this._kpiCardClient('Última Actualización', latestDate ? SIApp.timeAgo(latestDate) : '-', '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 'orange')}
                </div>

                <!-- Tabs y Búsqueda -->
                <div class="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 py-4 border-b border-gray-100 mb-6 w-full">
                    
                    <!-- Tabs 2x2 MÓVIL / En línea ESCRITORIO -->
                    <div class="grid grid-cols-2 xl:flex xl:flex-row items-center gap-1.5 bg-gray-50/80 p-1.5 rounded-2xl xl:rounded-full border border-gray-100 w-full xl:w-auto">
                        <button class="tab-client flex items-center justify-center active w-full xl:w-auto px-1 xl:px-6 py-2.5 xl:py-2 text-xs xl:text-sm font-semibold shadow-sm rounded-xl xl:rounded-full transition-all duration-200" data-filter="all" onclick="SIModules.dashboard._filterClient('all', this)">Todos</button>
                        <button class="tab-client flex items-center justify-center w-full xl:w-auto px-1 xl:px-6 py-2.5 xl:py-2 text-xs xl:text-sm font-semibold rounded-xl xl:rounded-full transition-all duration-200 hover:bg-gray-200/50" data-filter="ejecucion" onclick="SIModules.dashboard._filterClient('ejecucion', this)">En Proceso</button>
                        <button class="tab-client flex items-center justify-center w-full xl:w-auto px-1 xl:px-6 py-2.5 xl:py-2 text-xs xl:text-sm font-semibold rounded-xl xl:rounded-full transition-all duration-200 hover:bg-gray-200/50 whitespace-normal xl:whitespace-nowrap leading-tight text-center" data-filter="propuesta" onclick="SIModules.dashboard._filterClient('propuesta', this)">Pdtes. Firma</button>
                        <button class="tab-client flex items-center justify-center w-full xl:w-auto px-1 xl:px-6 py-2.5 xl:py-2 text-xs xl:text-sm font-semibold rounded-xl xl:rounded-full transition-all duration-200 hover:bg-gray-200/50" data-filter="cerrado" onclick="SIModules.dashboard._filterClient('cerrado', this)">Finalizados</button>
                    </div>

                    <!-- Buscador -->
                    <div class="relative w-full xl:w-80 group">
                        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" oninput="SIModules.dashboard._searchClient(this.value)" placeholder="Buscar por nombre o ref..." class="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm">
                    </div>
                </div>

                <!-- Grid de proyectos -->
                <div id="projects-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    ${this._renderClientCards(projects)}
                </div>
            </div>
        `;
    },

    /** Cambiar pestaña de estado */
    _filterClient(status, btn) {
        document.querySelectorAll('.tab-client').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        this._clientFilter = status;
        this._applyClientFilters();
    },

    /** Buscar por texto libre */
    _searchClient(query) {
        this._clientSearch = query.toLowerCase();
        this._applyClientFilters();
    },

    /** Aplicar ambos filtros y renderizar */
    _applyClientFilters() {
        const filtered = this._clientProjects.filter(p => {
            const matchStatus = this._clientFilter === 'all' || p.status === this._clientFilter;
            const matchSearch = !this._clientSearch ||
                p.name.toLowerCase().includes(this._clientSearch) ||
                p.reference.toLowerCase().includes(this._clientSearch);
            return matchStatus && matchSearch;
        });

        const grid = document.getElementById('projects-grid');
        if (grid) grid.innerHTML = this._renderClientCards(filtered);
    },

    /** Renderizar cards de proyectos (vista cliente) */
    _renderClientCards(projects) {
        if (projects.length === 0) {
            return `<div class="col-span-full si-empty border border-gray-100 rounded-2xl bg-white"><p class="text-sm">No se han encontrado proyectos que coincidan con la búsqueda.</p></div>`;
        }

        // Diseño del status badge
        const getCustomBadge = (status) => {
            const styles = {
                propuesta: 'bg-amber-100/50 text-amber-700 border-amber-200/70',
                aprobado: 'bg-blue-100/50 text-blue-700 border-blue-200/70',
                ejecucion: 'bg-orange-100/50 text-orange-700 border-orange-200/70',
                cerrado: 'bg-emerald-100/50 text-emerald-700 border-emerald-200/70',
            };
            const labels = {
                propuesta: 'Pendiente Aprobación',
                aprobado: 'Aprobado',
                ejecucion: 'En Proceso',
                cerrado: 'Finalizado',
            };
            const style = styles[status] || 'bg-gray-100/50 text-gray-700 border-gray-200/70';
            return `<span class="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style}">${labels[status] || status}</span>`;
        };

        return projects.map(p => `
            <div class="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden card-hover flex flex-col cursor-pointer transition-shadow hover:shadow-md">
                <div class="p-5 flex-1">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[11px] font-bold text-gray-400 tracking-wide uppercase">REF: ${SIApp.escapeHtml(p.reference)}</span>
                        ${getCustomBadge(p.status)}
                    </div>
                    <!-- Title -->
                    <h3 class="text-lg font-bold text-gray-900 mb-2 leading-tight">${SIApp.escapeHtml(p.name)}</h3>
                    
                    <!-- Icons Row -->
                    <div class="mt-5 flex items-center gap-5 pt-4 border-t border-gray-50/50">
                        <div class="flex items-center gap-1.5 text-xs text-gray-500">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span class="font-medium">Act. ${SIApp.timeAgo(p.created_at) || SIApp.formatDate(p.created_at)}</span>
                        </div>
                        <div class="flex items-center gap-1.5 text-xs text-gray-500">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            <span class="font-medium">0 Documentos</span>
                        </div>
                    </div>
                </div>
                <!-- Action Button -->
                <div class="border-t border-gray-100 p-2">
                    <button class="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                        Ver detalles del proyecto
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    },

    // ═══════════════════════════════════════
    // HELPERS COMUNES
    // ═══════════════════════════════════════

    /** KPI Card con icono para Admin/Comercial (estilo colorido) */
    _kpiCard(label, value, color, icon) {
        const colorMap = {
            orange: { bg: 'bg-orange-100', text: 'text-orange-500' },
            blue: { bg: 'bg-blue-100', text: 'text-blue-500' },
            emerald: { bg: 'bg-emerald-100', text: 'text-emerald-500' },
            amber: { bg: 'bg-amber-100', text: 'text-amber-500' },
            red: { bg: 'bg-red-100', text: 'text-red-500' },
            gray: { bg: 'bg-gray-100', text: 'text-gray-500' },
        };
        const c = colorMap[color] || colorMap.orange;

        return `
            <div class="kpi-card">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">${label}</span>
                    <div class="w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center shadow-sm">
                        <span class="${c.text}">${icon}</span>
                    </div>
                </div>
                <p class="text-3xl font-bold text-gray-900">${value}</p>
            </div>
        `;
    },

    /** KPI Card para Client (con color y animaciones suaves) */
    _kpiCardClient(label, value, icon, colorTheme = 'gray') {
        const colorMap = {
            orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100', hoverInfo: 'group-hover:text-orange-600' },
            blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100', hoverInfo: 'group-hover:text-blue-600' },
            emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-100', hoverInfo: 'group-hover:text-emerald-600' },
            amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100', hoverInfo: 'group-hover:text-amber-600' },
            gray: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-100', hoverInfo: 'group-hover:text-gray-900' },
        };
        const c = colorMap[colorTheme] || colorMap.gray;

        return `
            <div class="group bg-white border border-gray-100/80 shadow-sm rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-gray-200 cursor-default">
                <div class="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 ${c.bg} rounded-xl sm:rounded-[1rem] flex items-center justify-center border ${c.border} transition-transform duration-300 group-hover:scale-110">
                    <span class="${c.text} ${c.hoverInfo} transform scale-75 sm:scale-100">${icon}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <span class="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-0.5 sm:mb-1 uppercase tracking-wider truncate">${label}</span>
                    <p class="text-lg sm:text-2xl font-black text-gray-900 leading-none truncate">${value}</p>
                </div>
            </div>
        `;
    },

    /** Status row con barra de progreso */
    _statusRow(label, count, total, color) {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
            <div class="flex items-center justify-between">
                <div class="flex-1 mr-4">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-sm text-gray-600">${label}</span>
                        <span class="text-sm font-semibold text-gray-800">${count}</span>
                    </div>
                    <div class="si-progress">
                        <div class="si-progress-fill" style="width: ${pct}%; background-color: ${color};"></div>
                    </div>
                </div>
            </div>
        `;
    },

    /** Estado de error */
    _errorState(message) {
        return `
            <div class="si-empty py-20">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="text-lg font-medium text-gray-500">${message}</p>
                <button onclick="location.reload()" class="mt-4 text-orange-500 hover:text-orange-600 text-sm font-medium">Reintentar</button>
            </div>
        `;
    },

    /** Iconos SVG reutilizables */
    _icon(name) {
        const map = {
            grid: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z"/></svg>',
            folder: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>',
            play: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>',
            check: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            clock: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            alert: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        };
        return map[name] || '';
    },
};
