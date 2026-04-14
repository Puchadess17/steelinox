/**
 * Steel Inox Extranet — Audit Module
 * Visualización de logs globales del sistema con filtrado avanzado y UI Premium.
 */
window.SIModules.audit = {
    filters: {
        actor_user_id: '',
        action_key: '',
        entity_type: '',
        date_start: '',
        date_end: ''
    },

    // Paginación
    currentPage: 1,
    itemsPerPage: 15,

    // Instancias de Flatpickr para resetear
    fpStart: null,
    fpEnd: null,

    // Datos para filtrado interno de dropdowns
    dropdown_data: {
        actor: [],
        action: [],
        entity: []
    },

    /** Punto de entrada desde el router */
    async initAuditLog() {
        const container = SIRouter.contentContainer;

        // Renderizar estructura básica (Skeleton)
        container.innerHTML = this._skeletonTemplate();

        // Inicializar Flatpickr
        this._initDatePickers();

        // Cargar datos iniciales y filtros
        await Promise.all([
            this.loadFiltersData(),
            this.loadLogs()
        ]);

        // Manejar cierre de dropdowns al hacer clic fuera
        this._initOutsideClick();
    },

    /** Inicializa Flatpickr en los inputs de fecha */
    _initDatePickers() {
        const config = {
            locale: "es",
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d M, Y",
            allowInput: true,
            disableMobile: "true",
            onChange: (selectedDates, dateStr, instance) => {
                const id = instance.element.id;
                if (id === 'filter-start') this.filters.date_start = dateStr;
                if (id === 'filter-end') this.filters.date_end = dateStr;
                this._updateFilterButtonVisibility();
            }
        };

        this.fpStart = flatpickr("#filter-start", config);
        this.fpEnd = flatpickr("#filter-end", config);
    },

    async loadFiltersData() {
        const res = await API.get('/audit/filters');
        if (res.success && res.data) {
            const { actions, entities, actors } = res.data;

            // Poblar dropdowns personalizados
            const actorsData = actors.map(a => ({
                value: a.id,
                label: `${a.name}${a.deleted_at ? ' [ELIMINADO]' : ''}`
            }));
            this.dropdown_data.actor = actorsData;
            this._populateCustomDropdown('actor', actorsData, 'Todos los actores');

            const actionsData = actions.map(a => ({
                value: a,
                label: this._humanizeAction(a)
            }));
            this.dropdown_data.action = actionsData;
            this._populateCustomDropdown('action', actionsData, 'Todas las acciones');

            const entitiesData = entities.map(e => ({
                value: e,
                label: this._humanizeEntity(e)
            }));
            this.dropdown_data.entity = entitiesData;
            this._populateCustomDropdown('entity', entitiesData, 'Todas las entidades');
        }
    },

    async loadLogs() {
        const listContainer = document.getElementById('audit-list');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20">
                    <div class="si-spinner mb-4"></div>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Sincronizando registros...</p>
                </div>
            `;
        }

        // Construir query string de filtros
        const params = new URLSearchParams();
        Object.keys(this.filters).forEach(key => {
            if (this.filters[key]) params.append(key, this.filters[key]);
        });

        params.append('page', this.currentPage);
        params.append('limit', this.itemsPerPage);

        const res = await API.get(`/audit?${params.toString()}`);

        if (res.success && res.data) {
            const logsList = Array.isArray(res.data) ? res.data : (res.data.list || res.data);
            this._renderLogs(logsList, res.pagination);
        } else {
            if (listContainer) listContainer.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Error: ${res.message}</div>`;
        }
    },

    _renderLogs(logs, pagination) {
        const listContainer = document.getElementById('audit-list');
        if (!listContainer) return;

        if (logs.length === 0) {
            listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-24 text-center">
                    <div class="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-gray-200 border border-gray-100">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    </div>
                    <h3 class="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">Sin actividad registrada</h3>
                    <p class="text-sm text-gray-400 max-w-xs mx-auto">No hay eventos que coincidan con los filtros seleccionados.</p>
                </div>
            `;
            return;
        }

        const html = `
            <!-- VISTA DESKTOP: Tabla -->
            <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100 bg-gray-50/50">
                            <th class="px-6 py-4">Actor / Rol</th>
                            <th class="px-6 py-4">Acción</th>
                            <th class="px-6 py-4">Entidad</th>
                            <th class="px-6 py-4">IP & Origen</th>
                            <th class="px-6 py-4">Fecha Evento</th>
                            <th class="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        ${logs.map(log => this._logRowTemplate(log)).join('')}
                    </tbody>
                </table>
            </div>

            <!-- VISTA MOBILE: Tarjetas -->
            <div class="md:hidden divide-y divide-gray-100">
                ${logs.map(log => this._logCardTemplate(log)).join('')}
            </div>
            <div id="audit-pagination" class="px-6 pb-6"></div>
        `;
        listContainer.innerHTML = html;

        if (pagination) {
            const paginationContainer = document.getElementById('audit-pagination');
            if (paginationContainer) {
                SIApp.renderPaginationControls(
                    paginationContainer,
                    pagination,
                    (newPage) => {
                        this.currentPage = newPage;
                        this.loadLogs();
                    },
                    (newLimit) => {
                        this.itemsPerPage = newLimit;
                        this.currentPage = 1;
                        this.loadLogs();
                    }
                );
            }
        }
    },

    _logCardTemplate(log) {
        const actorName = log.actor_name || 'Sistema';
        const actorRole = log.actor_role || 'system';
        const actionLabel = this._humanizeAction(log.action_key);
        const actionStyles = this._getActionStyles(log.action_key);
        const entityLabel = this._humanizeEntity(log.entity_type);
        const dateStr = SIApp.formatDateTime(log.created_at);
        const timeAgo = SIApp.timeAgo(log.created_at);

        return `
            <div class="p-5 flex flex-col gap-4 bg-white active:bg-gray-50 transition-colors">
                <!-- Header: Actor & Tiempo -->
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="avatar-initials w-9 h-9 text-[10px] shadow-sm ring-2 ring-white">${SIApp._getInitials(actorName)}</div>
                        <div>
                            <p class="text-[13px] font-black text-gray-900">${actorName}</p>
                            <p class="text-[8px] font-black uppercase tracking-widest text-orange-500/70">${actorRole}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-[11px] font-black text-gray-800 tracking-tight">${timeAgo}</p>
                        <p class="text-[9px] text-gray-400 font-medium">${dateStr}</p>
                    </div>
                </div>

                <!-- Body: Acción & Entidad -->
                <div class="flex flex-col gap-2.5">
                    <div class="flex items-center justify-between">
                        <span class="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl ${actionStyles.bg} ${actionStyles.text} border ${actionStyles.border} shadow-sm w-fit">
                            ${actionLabel}
                        </span>
                        ${this._renderEntityLink(log)}
                    </div>
                </div>

                <!-- Footer: IP & Acciones -->
                <div class="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-mono font-bold text-gray-400">${log.ip || '—'}</span>
                    </div>
                    ${log.metadata ? `
                        <button onclick="window.SIModules.audit.toggleMetadata(${log.id}, this)" class="px-4 py-2 bg-gray-50 hover:bg-orange-50 text-[10px] font-black text-gray-400 hover:text-orange-500 rounded-xl transition-all border border-gray-100 flex items-center gap-2">
                            VER DETALLES
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                    ` : ''}
                </div>

                <!-- Metadata Mobile -->
                ${log.metadata ? `
                    <div id="meta-mobile-${log.id}" class="hidden mt-2">
                        <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                             <div class="flex items-center gap-2 mb-3">
                                <span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                <h4 class="text-[9px] font-black text-gray-900 uppercase tracking-widest">Contexto Técnico</h4>
                            </div>
                            <div class="space-y-3">
                                ${Object.entries(log.metadata)
                    .filter(([k]) => k !== 'version_id')
                    .map(([k, v]) => `
                                    <div class="bg-white/50 p-3 rounded-xl border border-white">
                                        <span class="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">${this._humanizeMetadataKey(k)}</span>
                                        <span class="text-xs text-gray-900 font-bold break-all">${this._renderMetadataValue(k, v, log)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    _logRowTemplate(log) {
        const actorName = log.actor_name || 'Sistema';
        const actorRole = log.actor_role || 'system';
        const actionLabel = this._humanizeAction(log.action_key);
        const actionStyles = this._getActionStyles(log.action_key);
        const entityLabel = this._humanizeEntity(log.entity_type);
        const dateStr = SIApp.formatDateTime(log.created_at);
        const timeAgo = SIApp.timeAgo(log.created_at);

        return `
            <tr class="hover:bg-gray-50/50 transition-all group">
                <td class="px-6 py-5">
                    <div class="flex items-center gap-4">
                        <div class="avatar-initials w-10 h-10 text-xs shadow-sm ring-2 ring-white">${SIApp._getInitials(actorName)}</div>
                        <div>
                            <p class="text-sm font-black text-gray-900 line-clamp-1 truncate max-w-[150px]">${actorName}</p>
                            <p class="text-[9px] font-black uppercase tracking-widest text-orange-500/70">${actorRole}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-5">
                    <span class="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl ${actionStyles.bg} ${actionStyles.text} border ${actionStyles.border} shadow-sm">
                        ${actionLabel}
                    </span>
                </td>
                <td class="px-6 py-5">
                    ${this._renderEntityLink(log)}
                </td>
                <td class="px-6 py-5">
                    <div class="flex flex-col gap-0.5">
                        <span class="text-xs font-mono font-bold text-gray-500">${log.ip || '—'}</span>
                        <span class="text-[9px] text-gray-300 line-clamp-1 truncate max-w-[140px]" title="${SIApp.escapeHtml(log.user_agent)}">${log.user_agent || ''}</span>
                    </div>
                </td>
                <td class="px-6 py-5">
                    <div class="flex flex-col text-right sm:text-left">
                        <span class="text-sm font-black text-gray-800 tracking-tight">${timeAgo}</span>
                        <span class="text-[10px] text-gray-400 font-medium">${dateStr}</span>
                    </div>
                </td>
                <td class="px-6 py-5 text-right">
                    ${log.metadata ? `
                        <button onclick="window.SIModules.audit.toggleMetadata(${log.id}, this)" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-2xl transition-all border border-transparent hover:border-orange-100 group/btn" title="Ver detalles JSON">
                            <svg class="w-5 h-5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                        </button>
                    ` : ''}
                </td>
            </tr>
            ${log.metadata ? `
                <tr id="meta-${log.id}" class="hidden bg-[#FAFAFA]">
                    <td colspan="6" class="px-10 py-6">
                        <div class="bg-white border border-gray-100 rounded-[1.5rem] p-6 shadow-sm overflow-hidden">
                            <div class="flex items-center gap-2 mb-4">
                                <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                <h4 class="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Contexto Técnico del Evento</h4>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                ${Object.entries(log.metadata)
                    .filter(([k]) => k !== 'version_id')
                    .map(([k, v]) => `
                                    <div class="bg-gray-50 p-4 rounded-2xl border border-gray-50">
                                        <span class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">${this._humanizeMetadataKey(k)}</span>
                                        <span class="text-sm text-gray-900 font-bold break-all">${this._renderMetadataValue(k, v, log)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </td>
                </tr>
            ` : ''}
        `;
    },

    toggleMetadata(id, btn) {
        const el = document.getElementById(`meta-${id}`);
        const elMobile = document.getElementById(`meta-mobile-${id}`);

        const toggle = (element, button) => {
            if (!element) return;
            const isHidden = element.classList.contains('hidden');
            if (isHidden) {
                element.classList.remove('hidden');
                button.classList.add('bg-orange-50', 'text-orange-600', 'border-orange-100');
                const svg = button.querySelector('svg');
                if (svg) svg.style.transform = 'rotate(180deg)';
            } else {
                element.classList.add('hidden');
                button.classList.remove('bg-orange-50', 'text-orange-600', 'border-orange-100');
                const svg = button.querySelector('svg');
                if (svg) svg.style.transform = 'rotate(0deg)';
            }
        };

        toggle(el, btn);
        toggle(elMobile, btn);
    },

    _skeletonTemplate() {
        return `
            <div class="fade-in max-w-[1600px] mx-auto">
                <!-- CABECERA -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <div class="w-10 h-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                            </div>
                            <h1 class="text-3xl font-black text-gray-900 tracking-tight">Centro de Trazabilidad</h1>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <button onclick="window.SIModules.audit.resetFilters()" class="px-6 py-3 bg-gray-50 border border-gray-100 text-gray-400 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            Limpiar
                        </button>
                        <button onclick="window.SIModules.audit.loadLogs()" class="px-6 py-3 bg-white border border-gray-200 text-gray-700 text-xs font-black uppercase tracking-widest rounded-2xl hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 shadow-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            Refrescar
                        </button>
                    </div>
                </div>

                <!-- FILTROS PREMIUM -->
                <div class="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm mb-10">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                        
                        <!-- Filtro: Actor -->
                        <div class="space-y-2 relative">
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Actor (Quién)</label>
                            <button onclick="window.SIModules.audit.toggleDropdown('drop-actor')" id="btn-drop-actor" class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 flex items-center justify-between hover:bg-white hover:border-orange-200 transition-all group">
                                <span id="label-actor" class="truncate">Todos los actores</span>
                                <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                            </button>
                            <div id="drop-actor" class="hidden absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
                                <div class="p-3 border-b border-gray-50 bg-gray-50/50">
                                    <div class="relative">
                                        <input type="text" 
                                               id="search-actor" 
                                               oninput="window.SIModules.audit.filterDropdown('actor', this.value)"
                                               placeholder="Buscar actor..."
                                               class="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-orange-500 transition-all">
                                        <svg class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    </div>
                                </div>
                                <ul id="list-actor" class="max-h-60 overflow-y-auto custom-scrollbar py-2"></ul>
                            </div>
                        </div>

                        <!-- Filtro: Acción -->
                        <div class="space-y-2 relative">
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Acción (Qué)</label>
                            <button onclick="window.SIModules.audit.toggleDropdown('drop-action')" id="btn-drop-action" class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 flex items-center justify-between hover:bg-white hover:border-orange-200 transition-all group">
                                <span id="label-action" class="truncate">Todas las acciones</span>
                                <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                            </button>
                            <div id="drop-action" class="hidden absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
                                <div class="p-3 border-b border-gray-50 bg-gray-50/50">
                                    <div class="relative">
                                        <input type="text" 
                                               id="search-action" 
                                               oninput="window.SIModules.audit.filterDropdown('action', this.value)"
                                               placeholder="Buscar acción..."
                                               class="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-orange-500 transition-all">
                                        <svg class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    </div>
                                </div>
                                <ul id="list-action" class="max-h-60 overflow-y-auto custom-scrollbar py-2"></ul>
                            </div>
                        </div>

                        <!-- Filtro: Entidad -->
                        <div class="space-y-2 relative">
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Módulo / Entidad</label>
                            <button onclick="window.SIModules.audit.toggleDropdown('drop-entity')" id="btn-drop-entity" class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 flex items-center justify-between hover:bg-white hover:border-orange-200 transition-all group">
                                <span id="label-entity" class="truncate">Todas las entidades</span>
                                <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                            </button>
                            <div id="drop-entity" class="hidden absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
                                <div class="p-3 border-b border-gray-50 bg-gray-50/50">
                                    <div class="relative">
                                        <input type="text" 
                                               id="search-entity" 
                                               oninput="window.SIModules.audit.filterDropdown('entity', this.value)"
                                               placeholder="Buscar entidad..."
                                               class="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-orange-500 transition-all">
                                        <svg class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    </div>
                                </div>
                                <ul id="list-entity" class="max-h-60 overflow-y-auto custom-scrollbar py-2"></ul>
                            </div>
                        </div>

                        <!-- Filtro: Fecha Inicio -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Desde</label>
                            <div class="relative group">
                                <input type="text" id="filter-start" class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white outline-none transition-all placeholder:text-gray-300" placeholder="YYYY-MM-DD">
                                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-orange-400 transition-colors pointer-events-none">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                </div>
                            </div>
                        </div>

                        <!-- Filtro: Fecha Fin -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Hasta</label>
                            <div class="relative group">
                                <input type="text" id="filter-end" class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white outline-none transition-all placeholder:text-gray-300" placeholder="YYYY-MM-DD">
                                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-orange-400 transition-colors pointer-events-none">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- BOTÓN DE ACCIÓN (Solo visible si hay filtros) -->
                    <div id="filter-action-container" class="hidden mt-8 pt-8 border-t border-gray-50 flex justify-center animate-in fade-in slide-in-from-top-4 duration-300">
                        <button onclick="window.SIModules.audit.loadLogs()" class="px-10 py-4 bg-[#1a1b25] hover:bg-[#2a2b35] text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-gray-200 flex items-center gap-3 active:scale-95 group">
                            <svg class="w-4 h-4 text-orange-500 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            Filtrar Resultados
                        </button>
                    </div>
                </div>

                <!-- LISTADO -->
                <div id="audit-list" class="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden mb-20 animate-in fade-in zoom-in-95 duration-500">
                    <!-- Inyectado por _renderLogs() -->
                </div>
            </div>
        `;
    },

    /** Lógica de Dropdowns Personalizados */
    toggleDropdown(id) {
        const el = document.getElementById(id);
        const isOpen = !el.classList.contains('hidden');

        // Cerrar todos primero
        document.querySelectorAll('[id^="drop-"]').forEach(d => d.classList.add('hidden'));
        document.querySelectorAll('[id^="btn-drop-"]').forEach(btn => btn.querySelector('svg').style.transform = 'rotate(0deg)');

        if (!isOpen) {
            el.classList.remove('hidden');
            const btn = document.getElementById(`btn-${id}`);
            if (btn) btn.querySelector('svg').style.transform = 'rotate(180deg)';

            // Focus al buscador correspondiente si existe
            const key = id.replace('drop-', '');
            const searchInput = document.getElementById(`search-${key}`);
            if (searchInput) {
                searchInput.value = ''; // Limpiar al abrir
                this.filterDropdown(key, ''); // Reset list
                setTimeout(() => searchInput.focus(), 50);
            }
        }
    },

    filterDropdown(key, val) {
        const term = val.toLowerCase().trim();
        const items = this.dropdown_data[key];
        const defaultLabels = {
            actor: 'Todos los actores',
            action: 'Todas las acciones',
            entity: 'Todas las entidades'
        };

        const filtered = term
            ? items.filter(i => i.label.toLowerCase().includes(term))
            : items;

        this._populateCustomDropdown(key, filtered, defaultLabels[key], true);
    },

    resetFilters() {
        // 1. Resetear objeto de filtros y paginación
        this.filters = {
            actor_user_id: '',
            action_key: '',
            entity_type: '',
            date_start: '',
            date_end: ''
        };
        this.currentPage = 1;

        // 2. Resetear labels visuales
        document.getElementById('label-actor').textContent = 'Todos los actores';
        document.getElementById('label-action').textContent = 'Todas las acciones';
        document.getElementById('label-entity').textContent = 'Todas las entidades';

        // 3. Limpiar Flatpickr
        if (this.fpStart) this.fpStart.clear();
        if (this.fpEnd) this.fpEnd.clear();

        // 4. Actualizar visibilidad
        this._updateFilterButtonVisibility();

        // 5. Recargar logs
        this.loadLogs();

        SIApp.showToast('Filtros limpiados', 'Se han restablecido todos los criterios de búsqueda.', 'info');
    },

    selectOption(filterKey, value, label) {
        this.filters[filterKey === 'actor' ? 'actor_user_id' : (filterKey === 'action' ? 'action_key' : 'entity_type')] = value;
        this.currentPage = 1; // Forzar a la primera página al cambiar filtro
        document.getElementById(`label-${filterKey}`).textContent = label;
        document.getElementById(`drop-${filterKey}`).classList.add('hidden');
        document.getElementById(`btn-drop-${filterKey}`).querySelector('svg').style.transform = 'rotate(0deg)';

        this._updateFilterButtonVisibility();
    },

    _updateFilterButtonVisibility() {
        const hasFilters = Object.values(this.filters).some(v => v !== '');
        const container = document.getElementById('filter-action-container');
        if (container) {
            if (hasFilters) {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }
    },

    _populateCustomDropdown(key, items, defaultLabel, isFiltering = false) {
        const list = document.getElementById(`list-${key}`);
        if (!list) return;

        let html = `
            <li onclick="window.SIModules.audit.selectOption('${key}', '', '${defaultLabel}')" 
                class="px-5 py-3 text-sm font-bold text-gray-400 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors border-b border-gray-50">
                ${defaultLabel}
            </li>
        `;

        if (items.length === 0) {
            html += `<li class="px-5 py-4 text-xs font-bold text-gray-300 text-center italic">Sin resultados</li>`;
        } else {
            html += items.map(item => `
                <li onclick="window.SIModules.audit.selectOption('${key}', '${item.value}', '${SIApp.escapeHtml(item.label)}')" 
                    class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">
                    ${SIApp.escapeHtml(item.label)}
                </li>
            `).join('');
        }

        list.innerHTML = html;
    },

    _initOutsideClick() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.relative')) {
                document.querySelectorAll('[id^="drop-"]').forEach(d => d.classList.add('hidden'));
                document.querySelectorAll('[id^="btn-drop-"]').forEach(btn => {
                    const svg = btn.querySelector('svg');
                    if (svg) svg.style.transform = 'rotate(0deg)';
                });
            }
        });
    },

    _humanizeAction(key) {
        const map = {
            // --- Autenticación y Seguridad ---
            'login_exitoso': 'Inicio de sesión',
            'login_fallido': 'Error de login',
            'logout': 'Cierre de sesión',
            'ip_bloqueada': 'Bloqueo de IP',
            'sesion_expirada': 'Sesión caducada',
            'recuperacion_clave_solicitada': 'Solicitud recuperación',
            'clave_actualizada': 'Contraseña cambiada',
            'recuperacion_clave_fallida': 'Email recuperación inválido',

            // --- Clientes ---
            'cliente_creado': 'Creación de cliente',
            'cliente_actualizado': 'Edición de cliente',
            'cliente_desactivado': 'Cliente desactivado',
            'cliente_reactivado': 'Cliente reactivado',
            'cliente_eliminado': 'Cliente eliminado',

            // --- Proyectos ---
            'proyecto_creado': 'Creación de proyecto',
            'proyecto_actualizado': 'Edición de proyecto',
            'proyecto_cambio_estado': 'Cambio de estado',
            'proyecto_reabierto': 'Proyecto reabierto',
            'proyecto_comercial_asignado': 'Comercial asignado',
            'proyecto_comercial_removido': 'Comercial desasignado',

            // --- Documentos ---
            'documento_subido': 'Documento subido',
            'documento_nueva_version': 'Nueva versión subida',
            'documento_descargado': 'Documento descargado',
            'documento_visualizado': 'Documento visualizado',

            // --- Usuarios (Clientes y Comerciales) ---
            'usuario_creado': 'Creación de usuario',
            'usuario_actualizado': 'Edición de usuario',
            'usuario_desactivado': 'Usuario desactivado',
            'usuario_reactivado': 'Usuario reactivado',
            'usuario_borrado': 'Usuario eliminado',
            'usuario_eliminado': 'Usuario eliminado', // Por si acaso usamos ambos términos

            // --- Comentarios ---
            'comentario_creado': 'Nuevo comentario'
        };

        // Si existe en el mapa lo devuelve.
        // Si no, quita los guiones bajos por espacios y pone la primera en mayúscula (Plan de contingencia)
        if (map[key]) return map[key];

        const fallback = key.replace(/_/g, ' ');
        return fallback.charAt(0).toUpperCase() + fallback.slice(1);
    },

    _humanizeEntity(type) {
        const map = {
            'user': 'Usuario',
            'project': 'Proyecto',
            'document': 'Documento',
            'client': 'Cliente',
            'system': 'Sistema'
        };
        return map[type] || type;
    },

    _getActionStyles(key) {
        if (key.includes('failed') || key.includes('lockout') || key.includes('invalid')) {
            return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' };
        }
        if (key.includes('create') || key.includes('upload') || key.includes('success')) {
            return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
        }
        if (key.includes('update')) {
            return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' };
        }
        return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' };
    },

    _humanizeMetadataKey(key) {
        const map = {
            // --- Generales ---
            'role': 'Rol',
            'email': 'Email',
            'nombre': 'Nombre',
            'referencia': 'Referencia',
            'cliente': 'Cliente',
            'estado': 'Estado',
            'cambios': 'Cambios realizados',

            // --- Seguridad y Sesión ---
            'ip': 'Dirección IP',
            'email_intentado': 'Email introducido',
            'email_attempted': 'Email introducido', // Legacy
            'segundos_inactivo': 'Segundos de inactividad',

            // --- Proyectos ---
            'estado_anterior': 'Estado anterior',
            'old_status': 'Estado anterior', // Legacy
            'estado_nuevo': 'Estado nuevo',
            'new_status': 'Estado nuevo', // Legacy
            'motivo': 'Motivo / Justificación',
            'reason': 'Motivo / Justificación', // Legacy
            'usuario_asignado_id': 'ID Comercial Asignado',
            'usuario_removido_id': 'ID Comercial Retirado',

            // --- Usuarios y Clientes ---
            'es_activo': '¿Está activo?',
            'client_id': 'ID de la Empresa',

            // --- Documentos ---
            'documento_id': 'ID del Documento',
            'document_id': 'ID del Documento', // Legacy
            'nombre_archivo': 'Nombre del archivo',
            'file_name': 'Nombre del archivo', // Legacy
            'tamaño_archivo': 'Tamaño (Bytes)',
            'file_size': 'Tamaño (Bytes)', // Legacy
            'mime_type': 'Tipo de archivo (MIME)',
            'auto_versionado': 'Auto-versionado',
            'auto_versioned': 'Auto-versionado', // Legacy
            'numero_version': 'Número de versión',
            'version_number': 'Número de versión', // Legacy
            'es_version_especifica': 'Descarga de versión específica',
            'is_specific_version': 'Descarga de versión específica', // Legacy
            'version_id': 'ID de la Versión',

            // --- Comentarios ---
            'body_snippet': 'Extracto del comentario'
        };

        // Si la encuentra en el diccionario, la devuelve.
        if (map[key]) return map[key];

        // Plan de contingencia: quitar guiones bajos y capitalizar primera letra
        const fallback = key.replace(/_/g, ' ');
        return fallback.charAt(0).toUpperCase() + fallback.slice(1);
    },

    _renderMetadataValue(key, value, log) {
        if (typeof value === 'object') return JSON.stringify(value);

        const style = "text-gray-900 group-hover:text-orange-500 transition-colors no-underline font-bold";

        // Manejo de IDs técnicos
        if (key === 'client_id') {
            return `<a href="/steelinox/client/${value}" class="${style}">#${value}</a>`;
        }

        if (key === 'project_id') {
            return `<a href="/steelinox/project/${value}" class="${style}">#${value}</a>`;
        }

        if (key === 'document_id') {
            const pid = log.metadata?.project_id || log.project_id || log.entity_id;
            return `<a href="/steelinox/project/${pid}" class="${style}">#${value}</a>`;
        }

        // Manejo de nombres (Strings)
        if (key === 'name' || key === 'title') {
            if (log.entity_type === 'project') {
                return `<a href="/steelinox/project/${log.entity_id}" class="${style}">${SIApp.escapeHtml(value)}</a>`;
            }
            if (log.entity_type === 'client') {
                return `<a href="/steelinox/client/${log.entity_id}" class="${style}">${SIApp.escapeHtml(value)}</a>`;
            }
        }

        if (key === 'file_name' && log.entity_type === 'document') {
            const pid = log.metadata?.project_id || log.project_id;
            if (pid) {
                return `<a href="/steelinox/project/${pid}" class="${style}">${SIApp.escapeHtml(value)}</a>`;
            }
        }

        return value;
    },

    _renderEntityLink(log) {
        const entityLabel = this._humanizeEntity(log.entity_type);
        const style = "group/link inline-flex items-center gap-2 transition-colors no-underline";
        const textStyle = "text-sm font-bold text-gray-600 group-hover/link:text-orange-500 transition-colors";

        let href = null;
        let route = null;

        if (log.entity_type === 'project') {
            href = `/steelinox/project/${log.entity_id}`;
            route = 'project-detail';
        } else if (log.entity_type === 'client') {
            href = `/steelinox/client/${log.entity_id}`;
            route = 'client-detail';
        } else if (log.entity_type === 'document') {
            const pid = log.project_id || log.metadata?.project_id;
            if (pid) {
                href = `/steelinox/project/${pid}`;
                route = 'project-detail';
            }
        }

        const badge = log.entity_id ? `<span class="bg-gray-100 px-2 py-0.5 rounded-lg text-[10px] font-black font-mono text-gray-400 group-hover/link:bg-orange-50 group-hover/link:text-orange-500 transition-colors">#${log.entity_id}</span>` : '';

        if (href) {
            return `
                <a href="${href}" class="${style}">
                    <span class="${textStyle}">${entityLabel}</span>
                    ${badge}
                </a>
            `;
        }

        return `
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-gray-600">${entityLabel}</span>
                ${badge}
            </div>
        `;
    }
};
