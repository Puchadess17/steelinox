/**
 * Steel Inox — Commercials Admin Module
 * Gestión de equipo comercial para Administradores.
 */
window.SIModules = window.SIModules || {};

SIModules.commercialsAdmin = {

    get container() {
        return document.getElementById('main-content');
    },

    // Datos en memoria para configuración y filtros
    currentFilter: 'all',
    currentSearch: '',
    currentSortCol: 'name',
    currentSortDir: 'asc',
    currentPage: 1,
    itemsPerPage: 15,

    /** 1. CARGAR LISTADO GLOBAL */
    async loadList() {
        this.container.innerHTML = `
            <div class="fade-in">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <h1 class="text-3xl sm:text-4xl font-extrabold text-[#1a1b25] tracking-tight">Directorio de Comerciales</h1>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="SIRouter.navigate('commercial-new')" class="flex items-center gap-2 bg-[#1a1b25] hover:bg-gray-800 text-white text-sm font-bold px-5 py-2.5 rounded-[1rem] transition-all hover:shadow-lg hover:-translate-y-0.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            Nuevo Comercial
                        </button>
                    </div>
                </div>

                <!-- KPI Grid Premium -->
                <div id="commercial-kpis-container" class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                    <!-- KPIs dinámicos -->
                </div>

                <!-- Buscador y Tabs -->
                <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 w-full max-w-full">
                    <div class="w-full xl:w-auto">
                        <div class="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar -mx-1 px-1">
                            <button class="tab-client tab-comerciales ${this.currentFilter === 'all' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="all" onclick="SIModules.commercialsAdmin._filter('all', this)">Todos</button>
                            <button class="tab-client tab-comerciales ${this.currentFilter === 'activo' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="activo" onclick="SIModules.commercialsAdmin._filter('activo', this)">Activos</button>
                            <button class="tab-client tab-comerciales ${this.currentFilter === 'inactivo' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="inactivo" onclick="SIModules.commercialsAdmin._filter('inactivo', this)">Inactivos</button>
                        </div>
                    </div>

                    <div class="relative w-full xl:w-96 flex-shrink-0 group">
                        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input type="text" oninput="SIModules.commercialsAdmin._search(this.value)" value="${this.currentSearch}" placeholder="Buscar por nombre o email..." class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all shadow-sm">
                    </div>
                </div>


                <!-- Lista de Comerciales -->
                <div id="commercials-table-container"></div>
                <div id="commercials-pagination" class="mt-6"></div>
            </div>
        `;

        await this._reloadListTable();
    },

    /** Recarga solo los datos de la tabla sin destruir el input */
    async _reloadListTable() {
        try {
            let url = `/commercials?page=${this.currentPage}&limit=${this.itemsPerPage}`;
            if (this.currentFilter !== 'all') url += `&status=${this.currentFilter}`;
            if (this.currentSearch) url += `&search=${encodeURIComponent(this.currentSearch)}`;
            if (this.currentSortCol) url += `&sort_by=${this.currentSortCol}&sort_dir=${this.currentSortDir}`;

            const result = await API.get(url);
            const tableContainer = document.getElementById('commercials-table-container');
            const kpisContainer = document.getElementById('commercial-kpis-container');

            if (!result.success) {
                if (tableContainer) tableContainer.innerHTML = `<div class="p-10 text-center text-red-500">${result.message}</div>`;
                return;
            }

            const rawData = result.data;
            const commercialsList = rawData.list || [];
            const kpis = rawData.kpis || { total: 0, activos: 0, inactivos: 0 };
            const pagination = result.pagination;

            // Calculate dynamic mock KPIs
            const totalProyectosActivos = commercialsList.reduce((acc, c) => acc + (parseInt(c.active_projects) || 0), 0);
            const cargaMedia = kpis.activos > 0 ? (totalProyectosActivos / kpis.activos).toFixed(1) : '0';

            if (kpisContainer) {
                kpisContainer.innerHTML = `
                    ${this._renderKpiCard('Comerciales Totales', kpis.total, 'Red comercial completa', '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>')}
                    ${this._renderKpiCard('Proyectos en Curso', totalProyectosActivos, 'Carga media: ' + cargaMedia + ' proy/com', '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>')}
                    ${this._renderKpiCard('Comerciales Activos', kpis.activos, 'Cuentas con acceso', '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>')}
                `;
            }

            this._renderTable(commercialsList, pagination);

        } catch (error) {
            console.error('Error reloading commercials:', error);
        }
    },

    /** 2. RENDERIZAR TABLA */
    _renderTable(data, pagination) {
        const container = document.getElementById('commercials-table-container');
        const paginationContainer = document.getElementById('commercials-pagination');
        if (!container) return;

        const user = Auth.getUser();

        if (data.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    </div>
                    <p class="text-sm font-bold text-gray-900">No se encontraron comerciales</p>
                    <p class="text-xs text-gray-400 mt-1">Ningún usuario coincide con tu búsqueda.</p>
                </div>
            `;
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        const colors = [
            'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700',
            'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700',
            'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
            'bg-cyan-100 text-cyan-700'
        ];

        const desktopRows = data.map(u => {
            const initials = SIApp._getInitials(u.name);
            const statusBadge = SIApp.activeBadge(u.is_active);
            const colorClass = colors[(u.id || u.name.length) % colors.length];

            const lastAccessText = u.last_login_at
                ? `<span class="text-sm font-medium text-gray-500">${SIApp.timeAgo(u.last_login_at)}</span>`
                : '<span class="text-sm font-medium text-gray-400">Sin acceso</span>';

            return `
                <tr class="hover:bg-orange-50/20 transition-colors group">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full ${colorClass} flex items-center justify-center text-[11px] font-black border border-white shadow-sm overflow-hidden">
                                ${initials}
                            </div>
                            <div class="min-w-0">
                                <a href="/steelinox/commercial/${u.id}" class="text-[14px] font-black text-[#1a1b25] hover:text-orange-600 transition-colors block leading-tight truncate">${SIApp.escapeHtml(u.name)}</a>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center text-[10px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-[6px] tracking-widest">${SIApp.escapeHtml(u.email)}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        <span class="inline-flex items-center justify-center min-w-[24px] px-2 py-1 rounded-full border border-orange-100 bg-orange-50 text-orange-500 text-[13px] font-black">${u.active_projects || 0}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        ${statusBadge}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                        ${lastAccessText}
                    </td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                            <a href="/steelinox/commercial/${u.id}" class="p-2 text-gray-400 hover:text-orange-500 transition-all hover:scale-110" title="Ver Detalles">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </a>
                            <a href="/steelinox/commercial/edit/${u.id}" class="p-2 text-gray-400 hover:text-blue-500 transition-all hover:scale-110" title="Editar">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </a>
                            ${user && user.role === 'admin' ? `
                            <button onclick="SIModules.commercialsAdmin._confirmDelete(${u.id})" class="p-2 text-gray-400 hover:text-red-500 transition-all hover:scale-110" title="Eliminar">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const mobileCards = data.map(u => {
            const initials = SIApp._getInitials(u.name);
            const statusBadge = SIApp.activeBadge(u.is_active);
            const lastAccessText = u.last_login_at ? SIApp.timeAgo(u.last_login_at) : 'Nunca';
            const colorClass = colors[(u.id || u.name.length) % colors.length];

            return `
            <div class="bg-white border-l-[3.5px] border-l-orange-500 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-[1.2rem] overflow-hidden flex flex-col transition-all hover:shadow-lg block group relative">
                <div class="px-6 py-5">
                    <div class="flex items-start justify-between mb-4 gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-12 h-12 rounded-full ${colorClass} flex items-center justify-center text-sm font-black tracking-widest shrink-0 border border-white">
                                ${initials}
                            </div>
                            <div class="min-w-0">
                                <a href="/steelinox/commercial/${u.id}" class="text-[17px] font-extrabold text-[#1a1b25] leading-tight group-hover:text-orange-600 transition-colors no-underline block truncate">${SIApp.escapeHtml(u.name)}</a>
                                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mt-1 truncate">${SIApp.escapeHtml(u.email)}</span>
                            </div>
                        </div>
                        <div class="shrink-0 mt-0.5">
                            ${statusBadge}
                        </div>
                    </div>

                    <div class="w-full h-px bg-gray-50/80 my-4"></div>

                    <div class="flex items-center gap-3 text-[11px] font-semibold text-gray-500 mb-1 ml-1">
                        <svg class="w-4 h-4 text-gray-400 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        Última conexión: ${lastAccessText}
                    </div>
                </div>

                <div class="mt-auto px-6 pb-6 pt-1 flex justify-center gap-2">
                    <a href="/steelinox/commercial/${u.id}" class="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 rounded-full text-[11px] font-bold transition-colors shadow-sm flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        Ver
                    </a>
                    <a href="/steelinox/commercial/edit/${u.id}" class="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-full text-[11px] font-bold transition-colors shadow-sm flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        Editar
                    </a>
                    ${user && user.role === 'admin' ? `
                    <button onclick="SIModules.commercialsAdmin._confirmDelete(${u.id})" class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-full text-[11px] font-bold transition-colors shadow-sm flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Eliminar
                    </button>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');



        container.innerHTML = `
            <div class="hidden lg:block bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-6">
                <table class="w-full si-table">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100">
                            <th class="px-6 py-4 text-left group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.commercialsAdmin._sort('name')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Comercial ${this._getSortIcon('name')}</span>
                            </th>
                            <th class="px-6 py-4 text-left group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.commercialsAdmin._sort('email')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block flex items-center">Email Corporativo ${this._getSortIcon('email')}</span>
                            </th>
                            <th class="px-6 py-4 text-center group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.commercialsAdmin._sort('active_projects')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Proyectos ${this._getSortIcon('active_projects')}</span>
                            </th>
<th class="px-6 py-4 text-center select-none">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Estado</span>
                            </th>
                            <th class="px-6 py-4 text-left group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.commercialsAdmin._sort('last_login_at')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Última Conexión ${this._getSortIcon('last_login_at')}</span>
                            </th>
                            <th class="px-6 py-4 text-right w-32">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Acciones</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50/50">
                        ${desktopRows}
                    </tbody>
                </table>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 mb-6">
                ${mobileCards}
            </div>
        `;

        if (pagination && paginationContainer) {
            SIApp.renderPaginationControls(
                paginationContainer,
                pagination,
                (newPage) => {
                    this._goToPage(newPage);
                },
                (newLimit) => {
                    this.itemsPerPage = newLimit;
                    this.currentPage = 1;
                    this._reloadListTable();
                }
            );
        }
    },

    async _goToPage(page) {
        this.currentPage = page;
        await this._reloadListTable();
    },

    /** 3. CARGAR DETALLE COMERCIAL */
    async loadDetailSPA() {
        // Extraer ID de la URL /steelinox/commercial/{id}
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 1];

        if (!id || isNaN(id)) {
            SIRouter.show404();
            return;
        }

        try {
            const result = await API.get(`/commercials/${id}`);
            if (!result.success) {
                this.container.innerHTML = `<div class="p-10 text-center text-red-500">${result.message}</div>`;
                return;
            }

            const { info, projects } = result.data;
            const initials = SIApp._getInitials(info.name);

            this.container.innerHTML = `
                <div class="fade-in max-w-6xl mx-auto">
                    <!-- Header Detalle -->
                    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                        <div class="flex items-center gap-5">
                            <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#1a1b25] text-white flex items-center justify-center text-xl md:text-2xl font-black shadow-xl">
                                ${initials}
                            </div>
                            <div>
                                <div class="flex items-center gap-3 mb-1">
                                    <h1 class="text-2xl md:text-3xl font-extrabold text-[#1a1b25] tracking-tight">${SIApp.escapeHtml(info.name)}</h1>
                                    ${SIApp.activeBadge(info.is_active)}
                                </div>
                                <p class="text-sm text-gray-500 font-medium">${SIApp.escapeHtml(info.email)} · Miembro desde ${SIApp.formatDate(info.created_at)}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <a href="/steelinox/commercial/edit/${info.id}" class="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all no-underline">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                Editar Cuenta
                            </a>
                            <button onclick="SIModules.commercialsAdmin._confirmDelete(${info.id})" class="flex items-center justify-center w-10 h-10 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <!-- Sidebar: Estadísticas -->
                        <div class="lg:col-span-1 space-y-6">
                            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Métricas de Rendimiento</h3>
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm font-bold text-gray-500">Proyectos Totales</span>
                                        <span class="text-base font-black text-[#1a1b25]">${projects.length}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm font-bold text-gray-500">Proyectos Activos</span>
                                        <span class="text-base font-black text-orange-500">${projects.filter(p => p.status !== 'cerrado').length}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm font-bold text-gray-500">Última actividad</span>
                                        <span class="text-sm font-black text-[#1a1b25]">${info.last_login_at ? SIApp.timeAgo(info.last_login_at) : 'Sin datos'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Lista de Proyectos -->
                        <div class="lg:col-span-2">
                            <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                                <div class="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
                                    <h2 class="text-sm font-bold text-[#1a1b25]">Cartera de Proyectos</h2>
                                </div>
                                <div id="commercial-projects-list">
                                    ${this._renderProjectRows(projects)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error detail:', error);
            this.container.innerHTML = `<div class="p-10 text-center text-red-500">Error al cargar la ficha técnica.</div>`;
        }
    },

    /** Helper para renderizar los proyectos en la ficha */
    _renderProjectRows(projects) {
        if (projects.length === 0) {
            return `<div class="p-10 text-center text-gray-400 text-sm">No tiene proyectos asignados actualmente.</div>`;
        }

        const rows = projects.map(p => `
            <div class="flex items-center justify-between p-4 hover:bg-gray-50 transition-all border-b border-gray-50 last:border-0 group">
                <div class="flex-1 min-w-0 pr-4">
                    <a href="/steelinox/project/${p.id}" class="text-[14px] font-black text-[#1a1b25] hover:text-orange-500 transition-colors block truncate">${SIApp.escapeHtml(p.name)}</a>
                    <p class="text-[11px] font-bold text-gray-400 mt-0.5">${SIApp.escapeHtml(p.client_name)} · Ref: ${SIApp.escapeHtml(p.reference)}</p>
                </div>
                <div class="flex items-center gap-6 shrink-0">
                    <span class="text-xs font-black text-[#1a1b25]">${SIApp.formatCurrency(p.budget_amount)}</span>
                    ${SIApp.statusBadge(p.status)}
                    <svg class="w-4 h-4 text-gray-200 transform group-hover:translate-x-1 group-hover:text-orange-500 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                </div>
            </div>
        `).join('');

        return `<div class="flex flex-col">${rows}</div>`;
    },

    /** KPIs Visuales */
    _renderKpiCard(title, value, subtitle, iconHtml) {
        return `
            <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow relative overflow-hidden group">
                <div class="flex items-start justify-between relative z-10">
                    <div>
                        <span class="block text-sm font-semibold text-gray-400 mb-2 truncate">${title}</span>
                        <p class="text-4xl font-black text-[#1a1b25] tracking-tight mb-2">${value}</p>
                        <p class="text-xs font-bold text-gray-500 opacity-60">${subtitle}</p>
                    </div>
                    <div class="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 shadow-sm border border-orange-100 group-hover:scale-110 transition-transform duration-500">
                        ${iconHtml}
                    </div>
                </div>
                <!-- Decoración sutil de fondo -->
                <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            </div>
        `;
    },

    _filter(status, btn) {
        const activeClasses = ['active', 'bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20'];
        document.querySelectorAll('.tab-comerciales').forEach(t => t.classList.remove(...activeClasses));

        if (btn) btn.classList.add(...activeClasses);

        this.currentFilter = status;
        this.currentPage = 1;
        this._reloadListTable();
    },

    _sort(col) {
        // Columnas permitidas para ordenar en Comerciales
        const allowedCols = ['name', 'email', 'active_projects', 'last_login_at'];
        if (!allowedCols.includes(col)) return;

        if (this.currentSortCol === col) {
            // Ciclo de 3 estados: asc -> desc -> sin ordenar (null)
            if (this.currentSortDir === 'asc') {
                this.currentSortDir = 'desc';
            } else {
                this.currentSortCol = null;
                this.currentSortDir = null;
            }
        } else {
            // Nueva columna: empieza en ascendente
            this.currentSortCol = col;
            this.currentSortDir = 'asc';
        }

        this.currentPage = 1;
        this._reloadListTable();
    },

    _getSortIcon(col) {
        if (this.currentSortCol !== col) return '<span class="ml-1 opacity-20 group-hover:opacity-100 transition-opacity">↕</span>';
        return this.currentSortDir === 'asc' ? '<span class="ml-1 text-orange-500">↑</span>' : '<span class="ml-1 text-orange-500">↓</span>';
    },

    _search(val) {
        this.currentSearch = val.trim().toLowerCase();

        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.currentPage = 1;
            this._reloadListTable();
        }, 400);
    },

    async _confirmDelete(id) {
        const ok = await SIApp.confirm('¿Eliminar comercial?', 'Esta acción es irreversible. El usuario perderá el acceso a todos sus proyectos de forma permanente.');
        if (ok) {
            const res = await API.delete(`/commercials/${id}`);
            if (res.success) {
                SIApp.showToast('Eliminado', 'El comercial ha sido eliminado correctamente.', 'success');
                SIRouter.navigate('commercials');
            } else {
                SIApp.showToast('Error', res.message, 'error');
            }
        }
    }
};

// Exportar para que router lo encuentre
window.SIModules.commercialsAdmin = SIModules.commercialsAdmin;
