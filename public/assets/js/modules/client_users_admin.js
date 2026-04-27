/**
 * STEEL INOX EXTRANET — CLIENT USERS ADMIN MODULE
 * Listado paginado de usuarios de tipo 'cliente' para Admin y Comercial.
 * Incluye filtrado por estado, búsqueda full-text con debounce y ordenación.
 *
 * @api GET    /api/users?page&limit&status&search&sort_by&sort_dir
 *             → { list: User[], kpis: { total, activos, empresas_cubiertas }, pagination }
 * @api DELETE /api/users/:id  → null
 *
 * Depende de: api.js (API, SIToast), app.js (SIApp), auth.js (Auth), router.js (SIRouter)
 */
window.SIModules = window.SIModules || {};

SIModules.clientUsersAdmin = {

    get container() {
        return document.getElementById('main-content');
    },

    // ESTADO INTERNO DEL LISTADO
    // Mantiene filtros, búsqueda, ordenación y paginación entre recargas
    // para que el estado no se pierda cuando el usuario cambia de página.
    currentFilter: 'all',
    currentSearch: '',
    currentSortCol: 'name',
    currentSortDir: 'asc',
    currentPage: 1,
    itemsPerPage: 15,

    /**
     * LISTADO DE USUARIOS CLIENTE
     * Construye el HTML estático de la página (KPIs, filtros, buscador, tabla)
     * y delega la carga de datos en _reloadListTable().
     * El botón "Nuevo Usuario" solo se muestra para Admin y Comercial.
     */
    /** 1. CARGAR LISTADO GLOBAL */
    async loadList() {
        const user = Auth.getUser();
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <h1 class="text-3xl sm:text-4xl font-extrabold text-[#000000] tracking-tight">Usuarios Cliente</h1>
                        </div>
                    </div>
                    ${user && user.role !== 'cliente' ? `
                    <div class="flex items-center gap-2">
                        <button onclick="SIRouter.navigate('user-new')" class="flex items-center gap-2 bg-[#000000] hover:bg-gray-800 text-white text-sm font-bold px-5 py-2.5 rounded-[1rem] transition-all hover:shadow-lg hover:-translate-y-0.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            Nuevo Usuario
                        </button>
                    </div>
                    ` : ''}
                </div>

                <div id="users-kpis-container" class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                    <!-- KPIs dinámicos -->
                </div>

                <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 w-full max-w-full">
                    <div class="w-full xl:w-auto">
                        <div class="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar -mx-1 px-1">
                            <button class="tab-client tab-users ${this.currentFilter === 'all' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="all" onclick="SIModules.clientUsersAdmin._filter('all', this)">Todos</button>
                            <button class="tab-client tab-users ${this.currentFilter === 'activo' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="activo" onclick="SIModules.clientUsersAdmin._filter('activo', this)">Activos</button>
                            <button class="tab-client tab-users ${this.currentFilter === 'inactivo' ? 'active bg-orange-500 text-white shadow-md shadow-orange-500/20' : ''} whitespace-nowrap px-4 py-2 lg:px-6 lg:py-2.5 text-xs lg:text-sm font-bold rounded-full transition-all" data-filter="inactivo" onclick="SIModules.clientUsersAdmin._filter('inactivo', this)">Inactivos</button>
                        </div>
                    </div>

                    <div class="relative w-full xl:w-96 flex-shrink-0 group">
                        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input type="text" oninput="SIModules.clientUsersAdmin._search(this.value)" value="${this.currentSearch}" placeholder="Buscar por nombre, email o empresa..." class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all shadow-sm">
                    </div>
                </div>

                <div id="users-table-container"></div>
                <div id="users-pagination" class="mt-6"></div>
            </div>
        `;

        await this._reloadListTable();
    },

    /**
     * RECARGA DE TABLA SIN DESTRUIR EL INPUT
     * Construye la URL con todos los filtros activos y consulta la API.
     * Actualiza solo los contenedores de KPIs, tabla y paginación.
     * @api GET /api/users?page&limit&status&search&sort_by&sort_dir
     *          → { list: User[], kpis: { total, activos, empresas_cubiertas }, pagination }
     */
    async _reloadListTable() {
        try {
            let url = `/users?page=${this.currentPage}&limit=${this.itemsPerPage}`;
            if (this.currentFilter !== 'all') url += `&status=${this.currentFilter}`;
            if (this.currentSearch) url += `&search=${encodeURIComponent(this.currentSearch)}`;
            if (this.currentSortCol) url += `&sort_by=${this.currentSortCol}&sort_dir=${this.currentSortDir}`;

            const result = await API.get(url);
            const tableContainer = document.getElementById('users-table-container');
            const kpisContainer = document.getElementById('users-kpis-container');

            if (!result.success) {
                if (tableContainer) tableContainer.innerHTML = `<div class="p-10 text-center text-red-500">${result.message}</div>`;
                return;
            }

            const rawData = result.data;
            const usersList = rawData.list || [];
            const kpis = rawData.kpis || { total: 0, activos: 0, empresas_cubiertas: 0 };
            const pagination = result.pagination;

            if (kpisContainer) {
                kpisContainer.innerHTML = `
                    ${this._renderKpiCard('Usuarios Totales', kpis.total, 'Accesos creados en el sistema', '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4" stroke-width="1.5"></circle><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M22 21v-2a4 4 0 00-3-3.87"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 3.13a4 4 0 010 7.75"></path></svg>')}
                    ${this._renderKpiCard('Usuarios Activos', kpis.activos, 'Con acceso habilitado', '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4" stroke-width="1.5"></circle><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11l2 2 4-4"></path></svg>')}
                    ${this._renderKpiCard('Empresas Cubiertas', kpis.empresas_cubiertas || 0, 'Clientes con al menos 1 usuario', '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>')}
                `;
            }

            this._renderTable(usersList, pagination);

        } catch (error) {
            console.error('Error reloading client users:', error);
        }
    },

    /**
     * RENDERIZADO DE TABLA Y TARJETAS
     * Genera las filas de la tabla desktop y las tarjetas móvil.
     * Los botones de acción (editar/eliminar) solo se muestran para staff.
     * @param {User[]} data - Lista de usuarios de la página actual
     * @param {Object} pagination - Metadatos de paginación del backend
     */
    /** 2. RENDERIZAR TABLA */
    _renderTable(data, pagination) {
        const container = document.getElementById('users-table-container');
        const paginationContainer = document.getElementById('users-pagination');
        if (!container) return;


        if (data.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    </div>
                    <p class="text-sm font-bold text-gray-900">No se encontraron usuarios</p>
                    <p class="text-xs text-gray-400 mt-1">Ningún usuario coincide con tu búsqueda.</p>
                </div>
            `;
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        const user = Auth.getUser();
        const desktopRows = data.map(u => {
            const statusBadge = SIApp.activeBadge(u.is_active);
            const avatarHtml = SIApp.avatarInitials(u.name);
            const lastAccessText = u.last_login_at
                ? `<span class="text-sm font-medium text-gray-500">${SIApp.timeAgo(u.last_login_at)}</span>`
                : '<span class="text-sm font-medium text-gray-400">Sin acceso</span>';

            return `
                <tr class="transition-colors group hover:bg-gray-50/50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-3">
                            ${avatarHtml}
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5">
                                    <svg class="w-3.5 h-3.5 text-orange-500 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                    <p class="text-sm font-black text-[#000000] leading-tight truncate">${SIApp.escapeHtml(u.name)}</p>
                                </div>
                                <p class="text-xs text-gray-400 mt-0.5">${SIApp.escapeHtml(u.email)}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        <a href="/steelinox/client/${u.client_id}" class="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 hover:text-emerald-600 transition-colors">
                            <svg class="w-3.5 h-3.5 text-orange-500 opacity-70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                            ${SIApp.escapeHtml(u.company_name || '—')}
                        </a>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        ${statusBadge}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${lastAccessText}
                    </td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            ${user && user.role !== 'cliente' ? `
                            <a href="/steelinox/user/edit/${u.id}" class="p-1.5 text-gray-400 hover:text-blue-500 transition-all hover:scale-110 rounded-lg hover:bg-blue-50" title="Editar">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </a>
                            <button onclick="SIModules.clientUsersAdmin._confirmDelete(${u.id}, '${SIApp.escapeHtml(u.name)}')" class="p-1.5 text-gray-400 hover:text-red-500 transition-all hover:scale-110 rounded-lg hover:bg-red-50" title="Eliminar">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const mobileCards = data.map(u => {
            const statusBadge = SIApp.activeBadge(u.is_active);
            const lastAccessText = u.last_login_at ? SIApp.timeAgo(u.last_login_at) : 'Nunca';
            const avatarHtml = SIApp.avatarInitials(u.name, 'w-11 h-11', 'text-sm');

            return `
            <div class="bg-white border-l-[3.5px] border-l-orange-500 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-[1.2rem] overflow-hidden flex flex-col transition-all hover:shadow-lg">
                <div class="px-5 py-4">
                    <div class="flex items-start justify-between mb-3 gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            ${avatarHtml}
                            <div class="min-w-0">
                                <p class="text-[15px] font-extrabold text-[#000000] leading-tight truncate">${SIApp.escapeHtml(u.name)}</p>
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mt-0.5 truncate">${SIApp.escapeHtml(u.email)}</p>
                            </div>
                        </div>
                        <div class="shrink-0 mt-0.5">
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 text-[11px] font-semibold text-gray-500 mb-3">
                        <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        ${SIApp.escapeHtml(u.company_name || '—')}
                    </div>
                    <div class="flex items-center gap-2 text-[11px] text-gray-400">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Último acceso: ${lastAccessText}
                    </div>
                </div>
                <div class="mt-auto px-5 pb-4 pt-4 flex justify-between items-center border-t border-gray-50">
                    <a href="/steelinox/user/edit/${u.id}" class="flex items-center gap-2 group/btn no-underline">
                        <span class="text-[11px] font-black text-[#000000] group-hover:text-orange-600 transition-colors tracking-wide">
                            Ver detalles
                        </span>
                        <svg class="w-3.5 h-3.5 text-[#000000] group-hover:text-orange-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </a>
                    
                    ${user && user.role !== 'cliente' ? `
                    <button onclick="SIModules.clientUsersAdmin._confirmDelete(${u.id}, '${SIApp.escapeHtml(u.name)}')" 
                            class="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
                            title="Eliminar Usuario">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
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
                        <tr class="bg-gray-50">
                            <th class="px-6 py-4 text-left group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.clientUsersAdmin._sort('name')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Usuario ${this._getSortIcon('name')}</span>
                            </th>
                            <th class="px-6 py-4 text-center group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.clientUsersAdmin._sort('company_name')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Empresa ${this._getSortIcon('company_name')}</span>
                            </th>
                            <th class="px-6 py-4 text-center select-none">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center">Estado</span>
                            </th>
                            <th class="px-6 py-4 text-left group cursor-pointer select-none transition-colors hover:bg-gray-100/50" onclick="SIModules.clientUsersAdmin._sort('last_login_at')">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Último Acceso ${this._getSortIcon('last_login_at')}</span>
                            </th>
                            ${user && user.role !== 'cliente' ? `
                            <th class="px-6 py-4 text-right w-32">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Acciones</span>
                            </th>
                            ` : ''}
                        </tr>
                    </thead>
                    <tbody class="">
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

    /**
     * TARJETA KPI
     * Genera el HTML de una métrica con icono, valor numérico y subtítulo.
     * @param {string} title    - Etiqueta de la métrica
     * @param {number} value    - Valor a mostrar en grande
     * @param {string} subtitle - Descripción adicional
     * @param {string} iconHtml - SVG inline del icono
     * @returns {string} HTML de la tarjeta
     */
    _renderKpiCard(title, value, subtitle, iconHtml) {
        return `
            <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow relative overflow-hidden group">
                <div class="flex items-start justify-between relative z-10">
                    <div>
                        <span class="block text-sm font-semibold text-gray-400 mb-2 truncate">${title}</span>
                        <p class="text-4xl font-black text-[#000000] tracking-tight mb-2">${value}</p>
                        <p class="text-xs font-bold text-gray-500 opacity-60">${subtitle}</p>
                    </div>
                    <div class="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 shadow-sm border border-orange-100 group-hover:scale-110 transition-transform duration-500">
                        ${iconHtml}
                    </div>
                </div>
                <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            </div>
        `;
    },

    /**
     * FILTRADO POR ESTADO
     * Cambia el filtro activo y recarga la tabla desde la página 1.
     * @param {string} status     - 'all' | 'activo' | 'inactivo'
     * @param {HTMLElement} btn   - Botón del tab que activó el filtro
     */
    _filter(status, btn) {
        const activeClasses = ['active', 'bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20'];
        document.querySelectorAll('.tab-users').forEach(t => t.classList.remove(...activeClasses));

        if (btn) btn.classList.add(...activeClasses);

        this.currentFilter = status;
        this.currentPage = 1;
        this._reloadListTable();
    },

    /**
     * ORDENACIÓN DE COLUMNA
     * Cicla entre: asc → desc → sin ordenar (null).
     * Solo acepta columnas en la whitelist interna.
     * @param {string} col - Nombre de la columna ('name' | 'company_name' | 'last_login_at')
     */
    _sort(col) {
        // Columnas permitidas para ordenar
        const allowedCols = ['name', 'company_name', 'last_login_at'];
        if (!allowedCols.includes(col)) return;

        if (this.currentSortCol === col) {
            // Ciclo de 3 estados: asc -> desc -> sin ordenar (null)
            if (this.currentSortDir === 'asc') {
                this.currentSortDir = 'desc';
            } else {
                // Al tercer clic, limpiamos la ordenación
                this.currentSortCol = null;
                this.currentSortDir = null;
            }
        } else {
            // Si hacemos clic en una columna nueva, empieza en ascendente
            this.currentSortCol = col;
            this.currentSortDir = 'asc';
        }

        // Volvemos a la página 1 y recargamos
        this.currentPage = 1;
        this._reloadListTable();
    },

    _getSortIcon(col) {
        if (this.currentSortCol !== col) return '<span class="ml-1 opacity-20 group-hover:opacity-100 transition-opacity">↕</span>';
        return this.currentSortDir === 'asc' ? '<span class="ml-1 text-orange-500">↑</span>' : '<span class="ml-1 text-orange-500">↓</span>';
    },

    /**
     * BÚSQUEDA CON DEBOUNCE
     * Espera 400 ms tras el último keystroke antes de relanzar la consulta.
     * Busca por nombre, email o nombre de empresa.
     * @param {string} val - Valor del input de búsqueda
     */
    _search(val) {
        this.currentSearch = val.trim().toLowerCase();

        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.currentPage = 1;
            this._reloadListTable();
        }, 400);
    },

    /**
     * CONFIRMACIÓN Y ELIMINACIÓN DE USUARIO
     * Muestra un diálogo de confirmación antes de ejecutar la petición DELETE.
     * Tras el éxito recarga el listado completo.
     * @api DELETE /api/users/:id → null
     * @param {number} id   - ID del usuario a eliminar
     * @param {string} name - Nombre del usuario (para el mensaje de confirmación)
     */
    async _confirmDelete(id, name) {
        const ok = await SIApp.confirm('¿Eliminar usuario?', `¿Seguro que deseas eliminar a "${name}"? El usuario perderá el acceso permanentemente.`);
        if (ok) {
            try {
                const res = await API.delete(`/users/${id}`);
                if (res.success) {
                    SIApp.showToast('Eliminado', 'El usuario ha sido eliminado correctamente.', 'success');
                    await this.loadList();
                } else {
                    SIApp.showToast('Error', res.message, 'error');
                }
            } catch (e) {
                SIApp.showToast('Error', 'No se pudo eliminar el usuario.', 'error');
            }
        }
    }
};

window.SIModules.clientUsersAdmin = SIModules.clientUsersAdmin;
