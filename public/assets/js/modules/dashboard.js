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
        this.currentAdminFilter = this.currentAdminFilter || 'all';
        this.currentAdminSearch = this.currentAdminSearch || '';
        this.currentAdminPage = this.currentAdminPage || 1;
        this.adminItemsPerPage = this.adminItemsPerPage || 10;
        this.currentAdminSort = this.currentAdminSort || { field: 'created_at', dir: 'desc' };

        // Renderizar estructura base si no existe o si es necesario refrescar todo
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <h1 class="text-3xl sm:text-4xl font-extrabold text-[#1a1b25] tracking-tight">Panel Administrador</h1>
                            <span class="inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#fdf2d0] text-[#a17a22] uppercase tracking-wider">SUPER-ADMIN</span>
                        </div>
                    </div>
                </div>

                <div id="admin-kpis-container" class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
                    <!-- KPIs se cargarán dinámicamente -->
                </div>

                <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8 w-full max-w-full">
                    <div class="w-full xl:w-auto">
                        <div class="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar -mx-1 px-1">
                            <button class="tab-client tab-admin ${this.currentAdminFilter === 'all' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="all" onclick="SIModules.dashboard._filterAdmin('all', this)">Todos</button>
                            <button class="tab-client tab-admin ${this.currentAdminFilter === 'propuesta' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="propuesta" onclick="SIModules.dashboard._filterAdmin('propuesta', this)">Pendientes</button>
                            <button class="tab-client tab-admin ${this.currentAdminFilter === 'aprobado' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="aprobado" onclick="SIModules.dashboard._filterAdmin('aprobado', this)">Aprobados</button>
                            <button class="tab-client tab-admin ${this.currentAdminFilter === 'ejecucion' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="ejecucion" onclick="SIModules.dashboard._filterAdmin('ejecucion', this)">En Ejecución</button>
                            <button class="tab-client tab-admin ${this.currentAdminFilter === 'cerrado' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="cerrado" onclick="SIModules.dashboard._filterAdmin('cerrado', this)">Cerrados</button>
                        </div>
                    </div>

                    <div class="relative w-full xl:w-80 flex-shrink-0 group">
                        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" oninput="SIModules.dashboard._searchAdmin(this.value)" value="${this.currentAdminSearch}" placeholder="Buscar cliente, nombre o ref..." class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all shadow-sm">
                    </div>
                </div>

                <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div id="admin-table-container" class="select-none bg-gray-50/20 min-h-[200px]">
                        <!-- La tabla se inyectará aquí -->
                    </div>
                </div>
                <div id="admin-table-pagination" class="mt-6 px-4 pb-4"></div>
            </div>
        `;

        // Cargar datos iniciales
        await this._reloadAdminTable();
    },

    /** Recarga solo los datos de la tabla admin sin destruir el input */
    async _reloadAdminTable() {
        let url = `/projects/search?page=${this.currentAdminPage}&limit=${this.adminItemsPerPage}`;
        if (this.currentAdminFilter !== 'all') url += `&status=${this.currentAdminFilter}`;
        if (this.currentAdminSearch) url += `&search=${encodeURIComponent(this.currentAdminSearch)}`;
        if (this.currentAdminSort.field) url += `&sort_by=${this.currentAdminSort.field}&sort_dir=${this.currentAdminSort.dir}`;

        const result = await API.get(url);
        const tableContainer = document.getElementById('admin-table-container');
        const kpisContainer = document.getElementById('admin-kpis-container');

        if (!result.success) {
            if (tableContainer) tableContainer.innerHTML = this._errorState('No se pudieron cargar los datos.');
            return;
        }

        const rawData = result.data;
        const projects = rawData.list || rawData || [];
        const pagination = result.pagination;

        // Calcular e inyectar KPIs
        const kpis = rawData.kpis || {
            total: pagination ? pagination.total_results : projects.length,
            ejecucion: projects.filter(p => p.status === 'ejecucion').length,
            propuesta: projects.filter(p => p.status === 'propuesta').length,
            cerrado: projects.filter(p => p.status === 'cerrado').length,
            aprobado: projects.filter(p => p.status === 'aprobado').length,
        };

        if (kpisContainer) {
            kpisContainer.innerHTML = `
                ${this._kpiCardClient('TOTAL', kpis.total, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.48-.46-8-1.308z" /></svg>', 'purple')}
                ${this._kpiCardClient('ACTIVOS', kpis.ejecucion + kpis.propuesta + kpis.aprobado, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>', 'amber')}
                ${this._kpiCardClient('EN EJECUCIÓN', kpis.ejecucion, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A120.15 120.15 0 0010 1C5.582 1 2 4.582 2 9c0 3.879 2.758 7.102 6.425 7.824a1 1 0 00.957-.492l1.625-2.844A1.9 1.9 0 0110 13.5a1.5 1.5 0 110-3 1.9 1.9 0 01-1.007-.088l1.624-2.842a1 1 0 00.493-.956A119.82 119.82 0 0010 6c1.9 0 3.65.6 5.068 1.624a1 1 0 001.373-.243l1.838-2.757a1 1 0 00-.244-1.374A120.25 120.25 0 0011.3 1.046zM15 13.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clip-rule="evenodd"/></svg>', 'blue')}
                ${this._kpiCardClient('COMPLETADOS', kpis.cerrado, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>', 'emerald')}
            `;
        }


        this.adminProjects = projects;
        this._renderAdminTable(projects, pagination);
    },

    // ═══════════════════════════════════════
    // ADMIN LOGIC (Filtros, Search, Render)
    // ═══════════════════════════════════════

    /** Renderiza la tabla limpia de proyectos administador basándose en data filtrada **/
    _renderAdminTable(data, pagination) {
        const container = document.getElementById('admin-table-container');
        const paginationContainer = document.getElementById('admin-table-pagination');
        if (!container) return;

        const user = Auth.getUser();

        if (data.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <svg class="w-12 h-12 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                    <p class="text-sm font-semibold text-gray-900">No se encontraron resultados</p>
                    <p class="text-xs text-gray-500 mt-1">Prueba a cambiar el filtro o el término de búsqueda.</p>
                </div>
            `;
            return;
        }

        const tbody = data.map(p => `
            <tr class="transition-colors group border-b border-gray-50/80 last:border-0">
                <td class="px-5 py-4 text-sm font-semibold text-gray-600 whitespace-nowrap">
                    ${p.client_id ? `
                        <a href="/steelinox/client/${p.client_id}" class="inline-flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-colors no-underline font-bold text-[13px]">
                            <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            ${SIApp.escapeHtml(p.client_name)}
                        </a>
                    ` : '<span class="text-gray-300 text-xs font-bold">Sin Asignar</span>'}
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                    <a href="/steelinox/project/${p.id}" class="inline-flex items-center gap-1.5 text-sm font-black text-[#1a1b25] hover:text-indigo-600 transition-colors no-underline">
                        <svg class="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        ${SIApp.escapeHtml(p.name)}
                    </a>
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center text-[11px] font-bold text-gray-500 bg-gray-100/80 px-2.5 py-1 rounded-[6px] tracking-wide">${SIApp.escapeHtml(p.reference)}</span>
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                    ${SIApp.statusBadge(p.status)}
                </td>
                <td class="px-5 py-4 text-xs font-semibold text-gray-400 whitespace-nowrap tracking-wide">
                    ${SIApp.formatDate(p.created_at)}
                </td>
                <td class="px-5 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href="/steelinox/project/${p.id}" class="p-1.5 text-gray-400 hover:text-indigo-500 transition-all hover:scale-110 rounded-lg hover:bg-indigo-50" title="Ver Proyecto">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </a>
                        ${user && user.role !== 'cliente' ? `
                        <button onclick="event.stopPropagation(); SIModules.dashboard._confirmDeleteProject(${p.id}, '${SIApp.escapeHtml(p.name)}')" class="p-1.5 text-gray-400 hover:text-red-500 transition-all hover:scale-110 rounded-lg hover:bg-red-50" title="Eliminar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        this.currentAdminSort = this.currentAdminSort || { field: 'created_at', dir: 'desc' };

        const sortIcon = (field) => {
            if (this.currentAdminSort.field !== field) return '<span class="ml-1 opacity-20 group-hover:opacity-100 transition-opacity">↕</span>';
            return this.currentAdminSort.dir === 'asc' ? '<span class="ml-1 text-orange-500">↑</span>' : '<span class="ml-1 text-orange-500">↓</span>';
        };

        container.innerHTML = `
            <!-- VISTA MÓVIL: Grid de Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 p-4 lg:p-0">
                ${this._renderClientCards(data)}
            </div>

            <!-- VISTA DESKTOP: Tabla Extensa -->
            <div class="hidden lg:block si-table-wrapper">
                <table class="w-full si-table text-center">
                    <thead>
                        <tr class="bg-gray-50/50">
                            <th class="px-5 py-3.5 group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortAdminProjects('client_name')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Cliente ${sortIcon('client_name')}</span>
                            </th>
                            <th class="px-5 py-3.5 group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortAdminProjects('name')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Proyecto ${sortIcon('name')}</span>
                            </th>
                            <th class="px-5 py-3.5 group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortAdminProjects('reference')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Referencia ${sortIcon('reference')}</span>
                            </th>
                            <th class="px-5 py-3.5">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Estado</span>
                            </th>
                            <th class="px-5 py-3.5 group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortAdminProjects('created_at')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center font-bold">Creado ${sortIcon('created_at')}</span>
                            </th>
                            <th class="px-5 py-3.5 text-right w-28 border-l border-gray-100/50">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-right">Acciones</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50/80">
                        ${tbody}
                    </tbody>
                </table>
            </div>
        `;

        if (pagination && paginationContainer) {
            SIApp.renderPaginationControls(
                paginationContainer,
                pagination,
                (newPage) => {
                    this._goToAdminPage(newPage);
                },
                (newLimit) => {
                    this.adminItemsPerPage = newLimit;
                    this.currentAdminPage = 1;
                    this._reloadAdminTable();
                }
            );
        }
    },

    /** Filtro de tabs en panel administrador */
    _filterAdmin(status, btn) {
        document.querySelectorAll('.tab-admin').forEach(t => t.classList.remove('active', 'bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20'));
        btn.classList.add('active', 'bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20');
        this.currentAdminFilter = status;
        this.currentAdminPage = 1;
        this._reloadAdminTable();
    },

    async _goToAdminPage(page) {
        this.currentAdminPage = page;
        await this._reloadAdminTable();
    },

    /** Filtro de buscador en tiempo real administrador */
    _searchAdmin(query = null) {
        if (query !== null) {
            query = query.trim();
            this.currentAdminSearch = query.toLowerCase();
        }

        if (this.searchTimeoutAdmin) clearTimeout(this.searchTimeoutAdmin);
        this.searchTimeoutAdmin = setTimeout(() => {
            this.currentAdminPage = 1;
            this._reloadAdminTable();
        }, 400);
    },

    /** Lógica de ordenación para administrador */
    _sortAdminProjects(field) {
        if (this.currentAdminSort.field === field) {
            this.currentAdminSort.dir = this.currentAdminSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentAdminSort = { field: field, dir: 'asc' };
        }
        this._reloadAdminTable();
    },

    // ═══════════════════════════════════════
    // COMMERCIAL DASHBOARD
    // ═══════════════════════════════════════

    async loadCommercialDashboard() {
        this.currentCommercialFilter = this.currentCommercialFilter || 'all';
        this.currentCommercialSearch = this.currentCommercialSearch || '';
        this.currentCommercialPage = this.currentCommercialPage || 1;
        this.commercialItemsPerPage = this.commercialItemsPerPage || 10;
        this.currentCommercialSort = this.currentCommercialSort || { field: 'created_at', dir: 'desc' };

        this.container.innerHTML = `
            <div class="fade-in">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <h1 class="text-3xl sm:text-4xl font-extrabold text-[#1a1b25] tracking-tight">Panel de Proyectos</h1>
                            <span class="inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-orange-100 text-orange-600 uppercase tracking-wider">MIS PROYECTOS</span>
                        </div>
                    </div>
                </div>

                <!-- KPI Grid Premium -->
                <div id="commercial-kpis-container" class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
                    <!-- KPIs dinámicos -->
                </div>

                <!-- Tabs y Búsqueda Interactiva -->
                <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8 w-full max-w-full">
                    <!-- Fila de Tabs -->
                    <div class="w-full xl:w-auto">
                        <div class="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar -mx-1 px-1">
                            <button class="tab-commercial tab-client ${this.currentCommercialFilter === 'all' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="all" onclick="SIModules.dashboard._filterCommercial('all', this)">Todos</button>
                            <button class="tab-commercial tab-client ${this.currentCommercialFilter === 'propuesta' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="propuesta" onclick="SIModules.dashboard._filterCommercial('propuesta', this)">Pendientes</button>
                            <button class="tab-commercial tab-client ${this.currentCommercialFilter === 'aprobado' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="aprobado" onclick="SIModules.dashboard._filterCommercial('aprobado', this)">Aprobados</button>
                            <button class="tab-commercial tab-client ${this.currentCommercialFilter === 'ejecucion' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="ejecucion" onclick="SIModules.dashboard._filterCommercial('ejecucion', this)">En Ejecución</button>
                            <button class="tab-commercial tab-client ${this.currentCommercialFilter === 'cerrado' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="cerrado" onclick="SIModules.dashboard._filterCommercial('cerrado', this)">Cerrados</button>
                        </div>
                    </div>

                    <!-- Buscador -->
                    <div class="relative w-full xl:w-80 flex-shrink-0 group">
                        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" oninput="SIModules.dashboard._searchCommercial(this.value)" value="${this.currentCommercialSearch}" placeholder="Buscar por nombre o ref..." class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all shadow-sm">
                    </div>
                </div>

                <!-- Content Grid (Tabla Principal) -->
                <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div class="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-center sm:text-left">
                        <h2 class="text-base font-bold text-[#1a1b25]">Listado de Mis Proyectos</h2>
                    </div>
                    <!-- Contenedor adaptativo -->
                    <div id="commercial-table-container" class="select-none bg-gray-50/20 min-h-[200px]">
                        <!-- Renderizado dinámico -->
                    </div>
                    <div id="commercial-table-pagination" class="mt-6 px-4 pb-4"></div>
                </div>
            </div>
        `;

        await this._reloadCommercialTable();
    },

    async _reloadCommercialTable() {
        let url = `/projects/search?page=${this.currentCommercialPage}&limit=${this.commercialItemsPerPage}`;
        if (this.currentCommercialFilter !== 'all') url += `&status=${this.currentCommercialFilter}`;
        if (this.currentCommercialSearch) url += `&search=${encodeURIComponent(this.currentCommercialSearch)}`;
        if (this.currentCommercialSort.field) url += `&sort_by=${this.currentCommercialSort.field}&sort_dir=${this.currentCommercialSort.dir}`;

        const result = await API.get(url);
        if (!result.success) return;

        const rawData = result.data;
        const projects = rawData.list || rawData || [];
        const pagination = result.pagination;

        const kpisContainer = document.getElementById('commercial-kpis-container');
        const kpis = rawData.kpis || {
            total: pagination ? pagination.total_results : projects.length,
            ejecucion: projects.filter(p => p.status === 'ejecucion').length,
            propuesta: projects.filter(p => p.status === 'propuesta').length,
            cerrado: projects.filter(p => p.status === 'cerrado').length,
            aprobado: projects.filter(p => p.status === 'aprobado').length,
        };

        if (kpisContainer) {
            kpisContainer.innerHTML = `
                ${this._kpiCardClient('TOTAL', kpis.total, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.48-.46-8-1.308z" /></svg>', 'purple')}
                ${this._kpiCardClient('ACTIVOS', kpis.ejecucion + kpis.propuesta + kpis.aprobado, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>', 'amber')}
                ${this._kpiCardClient('EN EJECUCIÓN', kpis.ejecucion, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A120.15 120.15 0 0010 1C5.582 1 2 4.582 2 9c0 3.879 2.758 7.102 6.425 7.824a1 1 0 00.957-.492l1.625-2.844A1.9 1.9 0 0110 13.5a1.5 1.5 0 110-3 1.9 1.9 0 01-1.007-.088l1.624-2.842a1 1 0 00.493-.956A119.82 119.82 0 0010 6c1.9 0 3.65.6 5.068 1.624a1 1 0 001.373-.243l1.838-2.757a1 1 0 00-.244-1.374A120.25 120.25 0 0011.3 1.046zM15 13.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clip-rule="evenodd"/></svg>', 'blue')}
                ${this._kpiCardClient('COMPLETADOS', kpis.cerrado, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>', 'emerald')}
            `;
        }

        this._renderCommercialTable(projects, pagination);
    },

    // ═══════════════════════════════════════
    // COMMERCIAL LOGIC (Filtros, Search, Render)
    // ═══════════════════════════════════════

    /** Renderiza la tabla de proyectos para el comercial */
    _renderCommercialTable(data, pagination) {
        const container = document.getElementById('commercial-table-container');
        const paginationContainer = document.getElementById('commercial-table-pagination');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <svg class="w-12 h-12 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                    <p class="text-sm font-semibold text-gray-900">No se encontraron proyectos asignados</p>
                    <p class="text-xs text-gray-500 mt-1">Prueba a cambiar el filtro o el término de búsqueda.</p>
                </div>
            `;
            return;
        }

        const tbody = data.map(p => `
            <tr class="hover:bg-orange-50/30 transition-colors group cursor-pointer" onclick="SIRouter.navigate('/steelinox/project/${p.id}')">
                <td class="px-5 py-4 text-sm font-semibold text-gray-600 whitespace-nowrap">
                    ${SIApp.escapeHtml(p.client_name || '-')}
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                    <span class="text-sm font-black text-[#1a1b25] group-hover:text-orange-600 transition-colors block">${SIApp.escapeHtml(p.name)}</span>
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center text-[11px] font-bold text-gray-500 bg-gray-100/80 px-2.5 py-1 rounded-[6px] tracking-wide">${SIApp.escapeHtml(p.reference)}</span>
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                    ${SIApp.statusBadge(p.status)}
                </td>
                <td class="px-5 py-4 text-xs font-semibold text-gray-400 whitespace-nowrap tracking-wide">
                    ${SIApp.formatDate(p.created_at)}
                </td>
                <td class="px-5 py-4 text-right whitespace-nowrap flex items-center justify-end gap-2">
                    <svg class="w-4 h-4 text-gray-300 inline-block opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    ${Auth.getUser() && Auth.getUser().role !== 'cliente' ? `
                    <button onclick="event.stopPropagation(); SIModules.dashboard._confirmDeleteProject(${p.id}, '${SIApp.escapeHtml(p.name)}')" class="p-1 text-gray-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100" title="Eliminar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        this.currentCommercialSort = this.currentCommercialSort || { field: 'created_at', dir: 'desc' };

        const sortIcon = (field) => {
            if (this.currentCommercialSort.field !== field) return '<span class="ml-1 opacity-20 group-hover:opacity-100 transition-opacity">↕</span>';
            return this.currentCommercialSort.dir === 'asc' ? '<span class="ml-1 text-orange-500">↑</span>' : '<span class="ml-1 text-orange-500">↓</span>';
        };

        container.innerHTML = `
            <!-- VISTA MÓVIL: Grid de Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 p-4 lg:p-0">
                ${this._renderClientCards(data)}
            </div>

            <!-- VISTA DESKTOP: Tabla Extensa Premium -->
            <div class="hidden lg:block si-table-wrapper">
                <table class="w-full si-table text-center">
                    <thead>
                        <tr class="bg-gray-50/50">
                            <th class="px-5 py-3.5 group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortCommercialProjects('client_name')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Cliente ${sortIcon('client_name')}</span>
                            </th>
                            <th class="px-5 py-3.5 group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortCommercialProjects('name')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Proyecto ${sortIcon('name')}</span>
                            </th>
                            <th class="px-5 py-3.5 group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortCommercialProjects('reference')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Referencia ${sortIcon('reference')}</span>
                            </th>
                            <th class="px-5 py-3.5">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Estado</span>
                            </th>
                            <th class="px-5 py-3.5 group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortCommercialProjects('created_at')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Creado ${sortIcon('created_at')}</span>
                            </th>
                            <th class="px-5 py-3.5 text-right w-12 border-l border-gray-100/50"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50/80">
                        ${tbody}
                    </tbody>
                </table>
            </div>
        `;

        if (pagination && paginationContainer) {
            SIApp.renderPaginationControls(
                paginationContainer,
                pagination,
                (newPage) => {
                    this._goToCommercialPage(newPage);
                },
                (newLimit) => {
                    this.commercialItemsPerPage = newLimit;
                    this.currentCommercialPage = 1;
                    this._reloadCommercialTable();
                }
            );
        }
    },

    /** Filtro comercial */
    _filterCommercial(status, btn) {
        document.querySelectorAll('.tab-commercial').forEach(t => t.classList.remove('active', 'bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20'));
        btn.classList.add('active', 'bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20');
        this.currentCommercialFilter = status;
        this.currentCommercialPage = 1;
        this._reloadCommercialTable();
    },

    async _goToCommercialPage(page) {
        this.currentCommercialPage = page;
        await this._reloadCommercialTable();
    },

    /** Buscador comercial */
    _searchCommercial(query) {
        this.currentCommercialSearch = query.trim().toLowerCase();

        if (this.searchTimeoutComm) clearTimeout(this.searchTimeoutComm);
        this.searchTimeoutComm = setTimeout(() => {
            this.currentCommercialPage = 1;
            this._reloadCommercialTable();
        }, 400);
    },

    /** Lógica de ordenación para comercial */
    _sortCommercialProjects(field) {
        if (this.currentCommercialSort.field === field) {
            this.currentCommercialSort.dir = this.currentCommercialSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentCommercialSort = { field: field, dir: 'asc' };
        }
        this._reloadCommercialTable();
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
                        <div class="flex items-center gap-3 mb-2">
                            <h1 class="text-3xl sm:text-4xl font-extrabold text-[#1a1b25] tracking-tight">Mis Proyectos</h1>
                            <span class="inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#fdf2d0] text-[#a17a22] uppercase tracking-wider">${SIApp.escapeHtml(companyName)}</span>
                        </div>
                    </div>
                </div>

                <!-- KPI Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
                    ${this._kpiCardClient('TOTAL', kpis.total, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.48-.46-8-1.308z" /></svg>', 'purple')}
                    ${this._kpiCardClient('PENDIENTES', kpis.pending, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>', 'amber')}
                    ${this._kpiCardClient('COMPLETADOS', kpis.completed, '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>', 'emerald')}
                    ${this._kpiCardClient('ACTUALIZADO', latestDate ? SIApp.timeAgo(latestDate) : '-', '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>', 'blue')}
                </div>

                <!-- Tabs y Búsqueda -->
                <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8 w-full max-w-full">
                    <!-- Fila de Tabs con scroll horizontal nativo -->
                    <div class="w-full xl:w-auto">
                        <div class="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar -mx-1 px-1">
                            <button class="tab-client active whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="all" onclick="SIModules.dashboard._filterClient('all', this)">Todos</button>
                            <button class="tab-client whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="ejecucion" onclick="SIModules.dashboard._filterClient('ejecucion', this)">En Proceso</button>
                            <button class="tab-client whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="propuesta" onclick="SIModules.dashboard._filterClient('propuesta', this)">Pendientes</button>
                            <button class="tab-client whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="cerrado" onclick="SIModules.dashboard._filterClient('cerrado', this)">Finalizados</button>
                        </div>
                    </div>

                    <!-- Buscador que ocupa el 100% en móvil y se ajusta en desktop -->
                    <div class="relative w-full xl:w-80 flex-shrink-0 group">
                        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" oninput="SIModules.dashboard._searchClient(this.value)" placeholder="Buscar..." class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all shadow-sm">
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
        query = query.trim();
        if (query.length > 0 && query.length < 3) return;
        this._clientSearch = query.toLowerCase();

        if (this.searchTimeoutClientVal) clearTimeout(this.searchTimeoutClientVal);
        this.searchTimeoutClientVal = setTimeout(() => {
            this._applyClientFilters();
        }, 300);
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

        const user = Auth.getUser();

        // Diseño del status badge exacto a la imagen
        const getCustomBadge = (status) => {
            const labels = {
                propuesta: 'Propuesta',
                aprobado: 'Aprobado',
                ejecucion: 'Ejecución',
                cerrado: 'Cerrado',
            };
            const styles = {
                propuesta: 'badge-propuesta',
                aprobado: 'badge-aprobado',
                ejecucion: 'badge-ejecucion',
                cerrado: 'badge-cerrado',
            };
            const label = labels[status] || status;
            const style = styles[status] || 'bg-gray-600 text-white';

            return `<span class="si-badge ${style}">${label}</span>`;
        };

        return projects.map(p => `
            <a href="/steelinox/project/${p.id}" class="bg-white border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden card-hover flex flex-col cursor-pointer transition-all hover:shadow-lg block group">
                
                <!-- Cabecera Oscura / Imagen Placeholder -->
                <div class="h-36 sm:h-40 bg-[#1e1e24] relative flex items-center justify-center overflow-hidden">
                    <!-- Status Badge absolute top-right -->
                    <div class="absolute top-4 right-4 z-10 flex space-x-2">
                        ${getCustomBadge(p.status)}
                    </div>
                    ${user && user.role !== 'cliente' ? `
                    <div class="absolute top-4 left-4 z-20">
                        <button onclick="event.stopPropagation(); SIModules.dashboard._confirmDeleteProject(${p.id}, '${SIApp.escapeHtml(p.name)}')" class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md transition-colors" title="Eliminar Proyecto">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                    ` : ''}
                    
                    <!-- Decoración / Placeholder Logo -->
                    <div class="absolute inset-0 bg-gradient-to-br from-[#26262e] to-[#121216] opacity-80"></div>
                    <div class="relative z-10 flex items-center gap-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <img src="/steelinox/public/logo-header.svg" class="w-16 h-16 object-contain brightness-0 invert" alt="">
                    </div>
                </div>

                <!-- Contenido Info -->
                <div class="p-5 sm:p-6 flex-1 flex flex-col bg-white">
                    <span class="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 leading-none block">REF: ${SIApp.escapeHtml(p.reference)}</span>
                    <h3 class="text-base sm:text-lg font-black text-[#1a1b25] leading-snug mb-4 group-hover:text-orange-600 transition-colors">${SIApp.escapeHtml(p.name)}</h3>
                    
                    <div class="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-gray-400 mb-6">
                        <svg class="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        Actualizado ${SIApp.timeAgo(p.created_at) || SIApp.formatDate(p.created_at)}
                    </div>

                    <!-- Botón Acción (Separator Line) -->
                    <div class="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center transition-opacity">
                        <span class="text-xs sm:text-sm font-black text-[#a9753c] group-hover:text-orange-600 transition-colors tracking-wide">
                            Ver detalles del proyecto
                        </span>
                        <svg class="w-4 h-4 text-[#a9753c] group-hover:text-orange-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </div>
                </div>
            </a>
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

    /** KPI Card para Client (Coincidiendo con UI proporcionada) */
    _kpiCardClient(label, value, icon, colorTheme = 'gray') {
        const colorMap = {
            purple: { bg: 'bg-[#f0efff]', text: 'text-[#6e56cf]' },
            amber: { bg: 'bg-[#fef9eb]', text: 'text-[#cb8e24]' },
            emerald: { bg: 'bg-[#ecfdf4]', text: 'text-[#44c173]' },
            blue: { bg: 'bg-blue-50', text: 'text-blue-500' },
            gray: { bg: 'bg-gray-50', text: 'text-gray-500' },
        };
        const c = colorMap[colorTheme] || colorMap.gray;

        return `
            <div class="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-4 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <div class="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0 ${c.bg} rounded-full flex items-center justify-center">
                    <span class="${c.text} scale-90 sm:scale-110">${icon}</span>
                </div>
                <div class="min-w-0 flex-1">
                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">${label}</span>
                    <p class="text-base sm:text-2xl font-bold text-[#1a1b25] leading-tight truncate">${value}</p>
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

    /** KPI Stat Card Flat (Estilo Mockup para Clientes) */
    _kpiStatFlat(label, value, subtext, iconSvg) {
        return `
            <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow relative overflow-hidden group">
                <div class="flex items-start justify-between relative z-10">
                    <div>
                        <span class="block text-sm font-semibold text-gray-400 mb-2 truncate">${label}</span>
                        <p class="text-4xl font-black text-[#1a1b25] tracking-tight mb-2">${value}</p>
                        <p class="text-xs font-bold text-gray-500 opacity-60">${subtext}</p>
                    </div>
                    <div class="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 shadow-sm border border-orange-100 group-hover:scale-110 transition-transform duration-500">
                        ${iconSvg}
                    </div>
                </div>
                <!-- Decoración sutil de fondo -->
                <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            </div>
        `;
    },

    // ═══════════════════════════════════════
    // CLIENTS LIST DASHBOARD (ADMIN/COMERCIAL)
    // ═══════════════════════════════════════

    async loadClientsList() {
        const user = Auth.getUser();
        if (!user || user.role === 'cliente') {
            SIRouter.showForbidden();
            return;
        }

        this.currentClientFilter = this.currentClientFilter || 'all';
        this.currentClientSearch = this.currentClientSearch || '';
        this.currentClientPage = this.currentClientPage || 1;
        this.clientsPerPage = this.clientsPerPage || 15;
        this.currentClientSort = this.currentClientSort || { field: 'name', dir: 'asc' };

        this.container.innerHTML = `
            <div class="fade-in">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <h1 class="text-3xl sm:text-4xl font-extrabold text-[#1a1b25] tracking-tight">Directorio de Clientes</h1>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="SIRouter.navigate('client-new')" class="flex items-center gap-2 bg-[#1a1b25] hover:bg-gray-800 text-white text-sm font-bold px-5 py-2.5 rounded-[1rem] transition-all hover:shadow-lg hover:-translate-y-0.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            Nuevo Cliente
                        </button>
                    </div>
                </div>

                <div id="clients-kpis-container" class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                    <!-- KPIs dinámicos -->
                </div>

                <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 w-full max-w-full">
                    <div class="w-full xl:w-auto">
                        <div class="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar -mx-1 px-1">
                            <button class="tab-client tab-admin-client ${this.currentClientFilter === 'all' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="all" onclick="SIModules.dashboard._filterClientsAdmin('all', this)">Todos</button>
                            <button class="tab-client tab-admin-client ${this.currentClientFilter === 'activo' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="activo" onclick="SIModules.dashboard._filterClientsAdmin('activo', this)">Activos</button>
                            <button class="tab-client tab-admin-client ${this.currentClientFilter === 'inactivo' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="inactivo" onclick="SIModules.dashboard._filterClientsAdmin('inactivo', this)">Inactivos</button>
                        </div>
                    </div>

                    <div class="relative w-full xl:w-96 flex-shrink-0 group">
                        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" oninput="SIModules.dashboard._searchClients(this.value)" value="${this.currentClientSearch}" placeholder="Buscar por nombre o Referencia..." class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all shadow-sm">
                    </div>
                </div>

                <div id="clients-table-container">
                    <!-- Renderizado dinámico aquí -->
                </div>

                <div id="clients-pagination-container"></div>
            </div>
        `;

        await this._reloadClientsTable();
    },

    async _reloadClientsTable() {
        let url = `/clients?page=${this.currentClientPage}&limit=${this.clientsPerPage}`;
        if (this.currentClientFilter !== 'all') url += `&status=${this.currentClientFilter}`;
        if (this.currentClientSearch) url += `&search=${encodeURIComponent(this.currentClientSearch)}`;
        if (this.currentClientSort.field) url += `&sort_by=${this.currentClientSort.field}&sort_dir=${this.currentClientSort.dir}`;

        const result = await API.get(url);
        if (!result.success) return;

        const clients = result.data?.list || [];
        const kpis = result.data?.kpis || { total: 0, newThisMonth: 0, totalProjects: 0, totalUsers: 0 };
        const pagination = result.pagination;

        const kpisContainer = document.getElementById('clients-kpis-container');
        if (kpisContainer) {
            kpisContainer.innerHTML = `
                ${this._kpiStatFlat('Clientes Totales', pagination.total_results, `+${kpis.newThisMonth} registrados este mes`, '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>')}
                ${this._kpiStatFlat('Proyectos Totales', kpis.totalProjects, `Vinculados a tu cartera`, '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>')}
                ${this._kpiStatFlat('Usuarios Totales', kpis.totalUsers, 'Cuentas de cliente activas', '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>')}
            `;
        }

        this._renderClientsTable(clients, pagination);
    },

    _renderClientsTable(pagedData, pagination) {
        const container = document.getElementById('clients-table-container');
        if (!container) return;
        const user = Auth.getUser();

        if (pagedData.length === 0) {
            container.innerHTML = `
                <div class="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
                    <p class="text-sm font-semibold text-gray-900">No se encontraron clientes</p>
                    <p class="text-xs text-gray-400 mt-1">Intenta ajustar los filtros o el término de búsqueda.</p>
                </div>
            `;
            // Limpiar paginación si no hay datos
            const pagContainer = document.getElementById('clients-pagination-container');
            if (pagContainer) pagContainer.innerHTML = '';
            return;
        }

        this.currentClientSort = this.currentClientSort || { field: 'name', dir: 'asc' };

        // --- RENDERIZADO DE FILAS (Tbody) ---
        const tbody = pagedData.map(c => {
            const initials = SIApp._getInitials(c.name);
            return `
                <tr class="hover:bg-orange-50/20 transition-colors group">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-gray-50 text-[#1a1b25] flex items-center justify-center text-[11px] font-black border border-gray-100 shadow-sm overflow-hidden">
                                ${initials}
                            </div>
                            <div class="min-w-0">
                                <a href="/steelinox/client/${c.id}" class="text-[14px] font-black text-[#1a1b25] hover:text-orange-600 transition-colors block leading-tight truncate">${SIApp.escapeHtml(c.name)}</a>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center text-[10px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-[6px] tracking-widest">${SIApp.escapeHtml(c.reference || 'CLI-TEMP')}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        <span class="inline-flex items-center justify-center min-w-[24px] px-2 py-1 rounded-full border border-orange-100 bg-orange-50 text-orange-500 text-[13px] font-black">${c.projects_count || '0'}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        <span class="inline-flex items-center justify-center min-w-[24px] px-2 py-1 rounded-full border border-gray-100 bg-gray-50 text-gray-500 text-[13px] font-black">${c.users_count || '0'}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                        ${SIApp.formatDate(c.created_at) || '-'}
                    </td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                            <a href="/steelinox/client/${c.id}" class="p-2 text-gray-400 hover:text-orange-500 transition-all hover:scale-110" title="Ver Detalles">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </a>
                            <a href="/steelinox/client/edit/${c.id}" class="p-2 text-gray-400 hover:text-blue-500 transition-all hover:scale-110" title="Editar">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </a>
                            ${user && user.role !== 'cliente' ? `
                            <button onclick="SIModules.dashboard._confirmDeleteClient(${c.id}, '${SIApp.escapeHtml(c.name)}')" class="p-2 text-gray-400 hover:text-red-500 transition-all hover:scale-110" title="Eliminar">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // --- HELPER PARA CABECERA ORDENABLE ---
        const sortIcon = (field) => {
            if (this.currentClientSort.field !== field) return '<span class="ml-1 opacity-20 group-hover:opacity-100 transition-opacity">↕</span>';
            return this.currentClientSort.dir === 'asc' ? '<span class="ml-1 text-orange-500">↑</span>' : '<span class="ml-1 text-orange-500">↓</span>';
        };

        container.innerHTML = `
            <!-- VISTA DESKTOP: Tabla Premium -->
            <div class="hidden lg:block bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-6">
                <table class="w-full si-table">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100">
                            <th class="px-6 py-4 text-left group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortClients('name')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Nombre de Empresa ${sortIcon('name')}</span>
                            </th>
                            <th class="px-6 py-4 text-left group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortClients('reference')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Referencia ${sortIcon('reference')}</span>
                            </th>
                            <th class="px-6 py-4 text-center group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortClients('projects_count')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Proyectos ${sortIcon('projects_count')}</span>
                            </th>
                            <th class="px-6 py-4 text-center group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortClients('users_count')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Usuarios ${sortIcon('users_count')}</span>
                            </th>
                            <th class="px-6 py-4 text-left group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.dashboard._sortClients('created_at')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Última Actividad ${sortIcon('created_at')}</span>
                            </th>
                            <th class="px-6 py-4 text-right w-32">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Acciones</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50/50">
                        ${tbody}
                    </tbody>
                </table>
            </div>

            <!-- VISTA MÓVIL: Cards (Se mantiene diseño anterior para mobile) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 mb-6">
                ${pagedData.map(c => this._renderClientCardAdminMobile(c)).join('')}
            </div>
        `;

        // Renderizar la botonera compartida
        const pagContainer = document.getElementById('clients-pagination-container');
        if (pagContainer) {
            SIApp.renderPaginationControls(
                pagContainer,
                pagination,
                (page) => { this.currentClientPage = page; this.loadClientsList(); },
                (limit) => { this.clientsPerPage = limit; this.currentClientPage = 1; this.loadClientsList(); }
            );
        }
    },

    /** Helper para pintar los circulitos de estado */
    _renderStatusToggle(isActive, id) {
        const active = isActive == 1 || isActive === true;
        return `
            <div class="flex items-center gap-2">
                <div class="w-10 h-5 rounded-full relative transition-colors duration-300 p-1 flex items-center ${active ? 'bg-orange-500' : 'bg-gray-200'}">
                    <div class="w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${active ? 'translate-x-4.5' : 'translate-x-0'}"></div>
                </div>
                <span class="text-xs font-bold ${active ? 'text-gray-900' : 'text-gray-400'}">${active ? 'Activo' : 'Inactivo'}</span>
            </div>
        `;
    },



    /** Card Mobile para el Listado de Clientes */
    _renderClientCardAdminMobile(c) {
        const initials = SIApp._getInitials(c.name);
        // El status en azul para activo (similar al mock) y gris para inactivo
        const statusBadge = window.SIApp ? SIApp.activeBadge(c.is_active) : '';
        const user = Auth.getUser();

        return `
            <div class="bg-white border-l-[3.5px] border-l-orange-500 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-[1.2rem] overflow-hidden flex flex-col transition-all hover:shadow-lg block group relative">
                <div class="px-6 py-5">
                    <!-- Top Info: Avatar, Name, Badge -->
                    <div class="flex items-start justify-between mb-4 gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-sm font-black tracking-widest shrink-0 border border-orange-100">
                                ${initials}
                            </div>
                            <div>
                                <a href="/steelinox/client/${c.id}" class="text-[17px] font-extrabold text-[#1a1b25] leading-tight group-hover:text-orange-600 transition-colors no-underline block">${SIApp.escapeHtml(c.name)}</a>
                                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mt-1">${SIApp.escapeHtml(c.reference || 'Sin Referencia')}</span>
                            </div>
                        </div>
                        <div class="shrink-0 mt-0.5">
                            ${statusBadge}
                        </div>
                    </div>

                    <div class="w-full h-px bg-gray-50/80 my-4"></div>

                    <!-- Details List -->
                    <div class="flex items-center gap-3 text-[11px] font-semibold text-gray-500 mb-1 ml-1">
                        <svg class="w-4 h-4 text-gray-400 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        Creado el ${SIApp.formatDate(c.created_at) || '-'}
                    </div>
                </div>

                <!-- Footer buttons -->
                <div class="mt-auto px-6 pb-6 pt-1 flex justify-center gap-2">
                    <a href="/steelinox/client/${c.id}" class="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 rounded-full text-[11px] font-bold transition-colors shadow-sm flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Ver
                    </a>
                    <a href="/steelinox/client/edit/${c.id}" class="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-full text-[11px] font-bold transition-colors shadow-sm flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        Editar
                    </a>
                    ${user && user.role !== 'cliente' ? `
                    <button onclick="SIModules.dashboard._confirmDeleteClient(${c.id}, '${SIApp.escapeHtml(c.name)}')" class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-full text-[11px] font-bold transition-colors shadow-sm flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Eliminar
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /** Filtros para la vista de listado de clientes */
    _filterClientsAdmin(status, btnElement) {
        const activeClasses = ['active', 'bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20'];
        document.querySelectorAll('.tab-admin-client').forEach(t => t.classList.remove(...activeClasses));

        if (btnElement) btnElement.classList.add(...activeClasses);

        this.currentClientFilter = status;
        this.currentClientPage = 1;
        this.loadClientsList();
    },

    /** Al buscar, reiniciamos a la página 1 y recargamos */
    _searchClients(query) {
        this.currentClientSearch = query.trim().toLowerCase();

        if (this.searchTimeoutClients) clearTimeout(this.searchTimeoutClients);
        this.searchTimeoutClients = setTimeout(() => {
            this.currentClientPage = 1;
            this._reloadClientsTable();
            this.loadClientsList();
        }, 400); // Pequeño debounce para no saturar la API
    },

    /** Handler para cambio de orden en columnas */
    _sortClients(field) {
        // Validación de seguridad para los campos permitidos
        const allowedFields = ['name', 'reference', 'projects_count', 'users_count', 'created_at'];
        if (!allowedFields.includes(field)) return;

        // Iniciar el objeto de ordenación vacío si no existe
        this.currentClientSort = this.currentClientSort || { field: null, dir: null };

        if (this.currentClientSort.field === field) {
            // Ciclo de 3 estados: asc -> desc -> sin ordenar (null)
            if (this.currentClientSort.dir === 'asc') {
                this.currentClientSort.dir = 'desc';
            } else {
                this.currentClientSort.field = null;
                this.currentClientSort.dir = null;
            }
        } else {
            // Si hacemos clic en una columna nueva, empieza en ascendente
            this.currentClientSort.field = field;
            this.currentClientSort.dir = 'asc';
        }

        this.currentClientPage = 1;
        this.loadClientsList();
    },

    // ═══════════════════════════════════════
    // PROJECTS LIST VIEW (FULL LIST)
    // ═══════════════════════════════════════

    async loadProjectsList() {
        const user = Auth.getUser();
        if (!user) return;

        this.currentProjListPage = this.currentProjListPage || 1;
        this.projListPerPage = this.projListPerPage || 15;
        this.currentProjListFilter = this.currentProjListFilter || 'all';
        this.currentProjListSearch = this.currentProjListSearch || '';

        this.container.innerHTML = `
            <div class="fade-in">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <h1 class="text-3xl sm:text-4xl font-extrabold text-[#1a1b25] tracking-tight">Proyectos</h1>
                    ${user.role !== 'cliente' ? `
                        <button onclick="SIRouter.navigate('clients'); toastr.info('Selecciona un cliente para crear un nuevo proyecto.');" class="flex items-center gap-2 bg-[#1a1b25] hover:bg-gray-800 text-white text-sm font-bold px-5 py-2.5 rounded-[1rem] transition-all hover:shadow-lg hover:-translate-y-0.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            Nuevo Proyecto
                        </button>
                    ` : ''}
                </div>

                <!-- Filtros y Búsqueda -->
                <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8 w-full max-w-full">
                    <div class="w-full xl:w-auto">
                        <div class="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar -mx-1 px-1">
                            <button class="tab-client tab-proj-list ${this.currentProjListFilter === 'all' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="all" onclick="SIModules.dashboard._filterProjectsList('all', this)">Todos</button>
                            <button class="tab-client tab-proj-list ${this.currentProjListFilter === 'propuesta' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="propuesta" onclick="SIModules.dashboard._filterProjectsList('propuesta', this)">Pendientes</button>
                            <button class="tab-client tab-proj-list ${this.currentProjListFilter === 'aprobado' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="aprobado" onclick="SIModules.dashboard._filterProjectsList('aprobado', this)">Aprobados</button>
                            <button class="tab-client tab-proj-list ${this.currentProjListFilter === 'ejecucion' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="ejecucion" onclick="SIModules.dashboard._filterProjectsList('ejecucion', this)">En Ejecución</button>
                            <button class="tab-client tab-proj-list ${this.currentProjListFilter === 'cerrado' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="cerrado" onclick="SIModules.dashboard._filterProjectsList('cerrado', this)">Cerrados</button>
                        </div>
                    </div>

                    <div class="relative w-full xl:w-96 flex-shrink-0 group">
                        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" oninput="SIModules.dashboard._searchProjectsList(this.value)" value="${this.currentProjListSearch}" placeholder="Buscar por nombre o referencia..." class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all shadow-sm">
                    </div>
                </div>

                <div id="projects-list-table-container"></div>
                <div id="projects-list-pagination-container"></div>
            </div>
        `;

        await this._reloadProjectsListTable();
    },

    async _reloadProjectsListTable() {
        let url = `/projects/search?page=${this.currentProjListPage}&limit=${this.projListPerPage}`;
        if (this.currentProjListFilter !== 'all') url += `&status=${this.currentProjListFilter}`;
        if (this.currentProjListSearch) url += `&search=${encodeURIComponent(this.currentProjListSearch)}`;

        const result = await API.get(url);
        if (!result.success) return;

        const projects = result.data?.list || [];
        const pagination = result.pagination;
        this._renderProjectsListTable(projects, pagination);
    },

    _renderProjectsListTable(data, pagination) {
        const container = document.getElementById('projects-list-table-container');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `
                <div class="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
                    <p class="text-sm font-semibold text-gray-900">No se encontraron proyectos</p>
                    <p class="text-xs text-gray-400 mt-1">Intenta ajustar los filtros.</p>
                </div>
            `;
            const pagContainer = document.getElementById('projects-list-pagination-container');
            if (pagContainer) pagContainer.innerHTML = '';
            return;
        }

        const tbody = data.map(p => `
            <tr class="hover:bg-orange-50/20 transition-colors group cursor-pointer" onclick="SIRouter.navigate('/steelinox/project/${p.id}')">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-black text-[#1a1b25] group-hover:text-orange-600 transition-colors">${SIApp.escapeHtml(p.name)}</div>
                    <div class="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">${SIApp.escapeHtml(p.reference)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${SIApp.escapeHtml(p.client_name || 'Sin cliente')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${SIApp.statusBadge(p.status)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    ${SIApp.formatDate(p.created_at)}
                </td>
                <td class="px-6 py-4 text-right">
                    <svg class="w-4 h-4 text-gray-300 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-6">
                <table class="w-full si-table">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100">
                            <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Proyecto</th>
                            <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                            <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                            <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                            <th class="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50/50">
                        ${tbody}
                    </tbody>
                </table>
            </div>
        `;

        const pagContainer = document.getElementById('projects-list-pagination-container');
        if (pagContainer) {
            SIApp.renderPaginationControls(
                pagContainer,
                pagination,
                (page) => { this.currentProjListPage = page; this.loadProjectsList(); },
                (limit) => { this.projListPerPage = limit; this.currentProjListPage = 1; this.loadProjectsList(); }
            );
        }
    },

    _filterProjectsList(status, btn) {
        const activeClasses = ['active', 'bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20'];
        document.querySelectorAll('.tab-proj-list').forEach(t => t.classList.remove(...activeClasses));

        if (btn) btn.classList.add(...activeClasses);

        this.currentProjListFilter = status;
        this.currentProjListPage = 1;
        this._reloadProjectsListTable();
    },

    _searchProjectsList(query) {
        this.currentProjListSearch = query.trim().toLowerCase();

        if (this.projSearchTimeout) clearTimeout(this.projSearchTimeout);
        this.projSearchTimeout = setTimeout(() => {
            this.currentProjListPage = 1;
            this._reloadProjectsListTable();
        }, 400);
    },

    async _confirmDeleteClient(id, name) {
        const ok = await SIApp.confirm('¿Eliminar cliente?', `¿Seguro que deseas eliminar a "${name}"? Todas sus cuentas de usuario también perderán el acceso.`);
        if (ok) {
            try {
                const res = await API.delete(`/clients/${id}`);
                if (res.success) {
                    SIApp.showToast('Eliminado', 'El cliente ha sido eliminado correctamente.', 'success');
                    await this._reloadClientsTable();
                } else {
                    SIApp.showToast('Error', res.message, 'error');
                }
            } catch (e) {
                SIApp.showToast('Error', 'No se pudo eliminar el cliente.', 'error');
            }
        }
    },

    async _confirmDeleteProject(id, name) {
        const ok = await SIApp.confirm('¿Eliminar proyecto?', `¿Seguro que deseas eliminar el proyecto "${name}"?`);
        if (ok) {
            try {
                const res = await API.delete(`/projects/${id}`);
                if (res.success) {
                    SIApp.showToast('Eliminado', 'El proyecto ha sido eliminado correctamente.', 'success');
                    if (document.getElementById('commercial-table-container')) {
                        await this._reloadCommercialTable();
                    }
                    if (document.getElementById('projects-list-table-container')) {
                        await this._reloadProjectsListTable();
                    }
                } else {
                    SIApp.showToast('Error', res.message, 'error');
                }
            } catch (e) {
                SIApp.showToast('Error', 'No se pudo eliminar el proyecto.', 'error');
            }
        }
    }
};
