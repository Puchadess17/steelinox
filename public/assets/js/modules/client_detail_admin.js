/**
 * Steel Inox Extranet — Client Detail View (Admin/Commercial)
 * Handles the logic for the individual client page.
 */

window.SIModules = window.SIModules || {};

SIModules.clientDetailAdmin = {
    clientId: null,
    client: null,
    users: [],
    projects: [],
    projectsLimit: 4,
    stats: null,
    userContext: null,
    activeTab: 'resumen',

    async loadClientDetailSPA() {
        console.log("[ClientDetailAdmin] Loading SPA view...");

        // Extraer ID de forma robusta: /steelinox/client/123 -> 123
        const path = window.location.pathname;
        const match = path.match(/\/client\/(\d+)/i);
        const clientId = match ? match[1] : null;

        console.log("[ClientDetailAdmin] Extracted Client ID:", clientId);

        if (!clientId) {
            console.error("[ClientDetailAdmin] ID no encontrado en la URL:", path);
            SIRouter.show404();
            return;
        }

        const container = document.getElementById('main-content');
        if (!container) return;

        container.innerHTML = `
            <!-- Breadcrumb y Acciones -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 fade-in">
                <nav class="flex text-sm text-gray-500 gap-2" aria-label="Breadcrumb">
                    <a data-route="clients" href="/steelinox/clients" class="hover:text-orange-500 transition-colors font-medium">Clientes</a>
                    <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    <span id="breadcrumb-client-name" class="text-gray-900 font-bold">Cargando...</span>
                </nav>
            </div>

            <!-- Header Cliente -->
            <div class="bg-white border border-gray-100 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 mb-0 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-8 items-start sm:items-center relative overflow-hidden fade-in" style="animation-delay: 0.1s">
                <div class="absolute top-0 right-0 w-64 h-64 bg-orange-50 dark:bg-orange-500/10 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div class="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-[1.5rem] bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-500/20 dark:to-orange-500/5 border-4 border-white dark:border-zinc-800 shadow-sm flex items-center justify-center shrink-0 relative z-10" id="client-avatar">
                   <svg class="w-7 h-7 sm:w-10 sm:h-10 text-orange-600 dark:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>

                <div class="flex-1 relative z-10 min-w-0">
                    <h1 id="client-name" class="text-xl sm:text-3xl font-extrabold text-[#000000] dark:text-zinc-100 tracking-tight break-words mb-2">Cargando detalles...</h1>
                    <div class="flex flex-wrap items-center gap-2">
                        <span id="client-status" class="hidden inline-flex"></span>
                        <span id="client-ref" class="px-2 sm:px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-[10px] sm:text-xs font-bold rounded-lg tracking-wider border border-gray-200/50 dark:border-zinc-700/50 hidden inline-flex items-center"></span>
                    </div>
                </div>

                <div class="relative sm:absolute sm:top-6 sm:right-6 z-20 w-full sm:w-auto">
                    <a href="/steelinox/client/edit/${clientId}" class="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 sm:py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:text-indigo-500 hover:border-indigo-500 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-95 w-full sm:w-auto group">
                        <svg class="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        Editar Cliente
                    </a>
                </div>
            </div>

            <!-- TABS -->
            <div class="border-b border-gray-200 mb-8 overflow-x-auto hide-scrollbar">
                <nav class="flex gap-8" aria-label="Tabs">
                    <button onclick="SIModules.clientDetailAdmin.switchTab('resumen', this)" class="client-tab-btn active border-orange-500 text-orange-600 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Resumen</button>
                    <button onclick="SIModules.clientDetailAdmin.switchTab('historial', this)" class="client-tab-btn border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Histórico</button>
                </nav>
            </div>

            <!-- TAB CONTENT -->
            <div id="client-detail-content" class="fade-in">
                <div class="py-20 flex flex-col items-center justify-center text-gray-400">
                    <div class="si-spinner mb-4"></div>
                    <p class="text-sm font-medium">Cargando información del cliente...</p>
                </div>
            </div>

            <!-- MODALS CONTAINER -->
            <div id="client-modals-container"></div>
        `;

        console.log("[ClientDetailAdmin] Skeleton injected. Initializing data...");
        await this.init(clientId, window.SIApp ? window.SIApp.user : null);
    },

    async init(clientId, user) {
        this.clientId = clientId;
        this.userContext = user;

        if (!this.clientId) {
            window.location.href = '/steelinox/clients';
            return;
        }

        this.projectsLimit = 4;
        this.activeTab = 'resumen';
        await this.loadClientData();
    },

    /** Fetch detail data from API */
    async loadClientData() {
        try {
            console.log("[ClientDetailAdmin] Calling API for client:", this.clientId);
            const response = await API.get('/clients/' + this.clientId);
            console.log("[ClientDetailAdmin] API Response:", response);

            if (!response.success || !response.data) {
                throw new Error(response.message || 'Error al cargar el cliente.');
            }

            const d = response.data;
            console.log("[ClientDetailAdmin] Mapping data:", d);

            this.client = d.info || {};
            if (this.client && this.client.name) {
                SIApp.setTitle(`${this.client.name}`);
            }
            this.users = d.users || [];
            this.projects = d.projects || [];
            this.stats = d.kpis || {};

            console.log("[ClientDetailAdmin] Rendering components...");
            this.renderHeader();
            this.renderModals();
            this.renderTabContent();
            console.log("[ClientDetailAdmin] Load complete.");

        } catch (error) {
            console.error('[ClientDetailAdmin] Error:', error);
            const detailContent = document.getElementById('client-detail-content');
            if (detailContent) {
                detailContent.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-20 text-center">
                        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        </div>
                        <p class="text-gray-900 font-bold mb-1">No se pudo cargar la información</p>
                        <p class="text-sm text-gray-400">${error.message}</p>
                        <button onclick="location.reload()" class="mt-6 px-6 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20">Reintentar</button>
                    </div>
                `;
            }
        }
    },

    /** Update Title, Reference, Status and Breadcrumb */
    renderHeader() {
        const nameEl = document.getElementById('client-name');
        const refEl = document.getElementById('client-ref');
        const statusEl = document.getElementById('client-status');
        const breadcrumbEl = document.getElementById('breadcrumb-client-name');

        if (this.client && this.client.name) {
            if (nameEl) nameEl.textContent = this.client.name;
            if (breadcrumbEl) breadcrumbEl.textContent = this.client.name;
        }

        if (refEl && this.client) {
            refEl.textContent = `REF: ${this.client.reference || 'SIN REF'}`;
            refEl.classList.remove('hidden');
        }

        if (statusEl && this.client) {
            const isActive = this.client.is_active == 1 || this.client.is_active === true;
            const statusBadge = (window.SIApp ? SIApp.activeBadge(isActive) : '');

            statusEl.innerHTML = statusBadge;
            statusEl.classList.remove('hidden');
        }
    },

    /** Switch active tab */
    switchTab(tabId, btn) {
        document.querySelectorAll('.client-tab-btn').forEach(t => {
            t.classList.remove('active', 'border-orange-500', 'text-orange-600');
            t.classList.add('border-transparent', 'text-gray-400');
        });
        btn.classList.add('active', 'border-orange-500', 'text-orange-600');
        btn.classList.remove('border-transparent', 'text-gray-400');
        this.activeTab = tabId;
        this.renderTabContent();
    },

    /** Render the active tab content */
    renderTabContent() {
        const container = document.getElementById('client-detail-content');
        if (!container) return;
        switch (this.activeTab) {
            case 'resumen': container.innerHTML = this._renderResumen(); break;
            case 'historial': container.innerHTML = this._renderHistorial(); break;
            default: container.innerHTML = '<p class="text-center py-20 text-gray-400">Próximamente...</p>';
        }
        if (this.activeTab === 'resumen') {
            this.renderProjectsList();
        }
    },

    /** TAB: RESUMEN */
    _renderResumen() {
        return `
            <div class="space-y-10">
                <!-- KPI SECTION -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${this._renderKPIDash()}
                </div>

                <!-- USUARIOS ASOCIADOS -->
                <section>
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                        <div class="flex items-center gap-2">
                             <div class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                             </div>
                             <h2 class="text-lg sm:text-xl font-extrabold text-gray-900">Usuarios Cliente Asociados</h2>
                        </div>
                        <button onclick="ClientDetailAdmin.openUserModal()" class="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-white hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 shadow-sm bg-gray-50/50 w-full sm:w-auto justify-center sm:justify-start">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                            Añadir Usuario
                        </button>
                    </div>
                    <!-- Desktop: Table -->
                    <div class="hidden sm:block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <table class="w-full text-left">
                            <thead class="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th class="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest">Nombre y Email</th>
                                    <th class="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest text-center">Estado</th>
                                    <th class="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest">Último Acceso</th>
                                    <th class="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                ${this.users && this.users.length > 0
                ? this.users.map(u => this._renderUserRow(u)).join('')
                : '<tr><td colspan="4" class="py-10 text-center text-gray-400 italic">No hay usuarios vinculados</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    <!-- Mobile: Cards -->
                    <div class="sm:hidden space-y-3">
                        ${this.users && this.users.length > 0
                ? this.users.map(u => this._renderUserCard(u)).join('')
                : '<div class="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 italic shadow-sm">No hay usuarios vinculados</div>'}
                    </div>
                </section>

                <!-- PROYECTOS VINCULADOS -->
                <section class="mb-10">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                        <div class="flex items-center gap-2">
                             <div class="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                             </div>
                             <h2 class="text-lg sm:text-xl font-extrabold text-gray-900">Proyectos Vinculados</h2>
                        </div>
                        <div class="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <button onclick="ClientDetailAdmin.openProjectModal()" class="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-white hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 shadow-sm bg-gray-50/50">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                Añadir Proyecto
                            </button>
                        </div>
                    </div>
                    <!-- Desktop: Table -->
                    <div id="projects-desktop-container" class="hidden sm:block si-table-wrapper border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                        <!-- Filled via renderProjectsList -->
                    </div>
                    <!-- Mobile: Cards -->
                    <div id="projects-mobile-container" class="sm:hidden space-y-3">
                        <!-- Filled via renderProjectsList -->
                    </div>
                    
                    <div id="projects-load-more-container"></div>
                
                    <div onclick="ClientDetailAdmin.openProjectModal()" class="mt-6 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 group cursor-pointer hover:border-orange-300 transition-all hover:bg-orange-50/30">
                            <div class="w-12 h-12 bg-white rounded-full border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 group-hover:text-orange-500 group-hover:scale-110 transition-transform">
                                <svg class="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-600 group-hover:text-gray-900">Nuevo Proyecto</p>
                                <p class="text-[11px] text-gray-400">Vincular nuevo trabajo a este cliente</p>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        `;
    },

    /** TAB: HISTÓRICO (Dinámico) */
    _renderHistorial() {
        setTimeout(() => this.loadClientTimeline(), 50);
        return `
            <div class="space-y-6 pb-6 w-full max-w-full">
                <!-- Header -->
                <div class="pt-2 px-1">
                    <h3 class="text-[11px] font-black text-[#E57B23] uppercase tracking-[0.2em] mb-2">${SIApp.escapeHtml(this.client?.name || 'CLIENTE')}</h3>
                    <h1 class="text-3xl font-black text-[#000000] tracking-tight">Historial de Actividad</h1>
                    <p class="text-sm text-gray-400 mt-2 font-medium">Cronología completa de eventos del cliente y sus proyectos</p>
                </div>

                <!-- Timeline Container -->
                <div class="relative pl-4 sm:pl-8 space-y-10 mt-6" id="client-historial-timeline">
                    <div class="absolute top-0 bottom-0 left-[43px] w-0.5 bg-gray-100 hidden sm:block"></div>
                    <div class="flex flex-col items-center justify-center py-20 text-gray-300">
                        <div class="si-spinner mb-4"></div>
                        <p class="text-sm font-bold uppercase tracking-widest">Sincronizando historial...</p>
                    </div>
                </div>
            </div>
        `;
    },

    async loadClientTimeline() {
        const triggerId = this.clientId;
        try {
            const res = await API.get('/clients/' + triggerId + '/audit');
            const container = document.getElementById('client-historial-timeline');
            if (!container || this.clientId !== triggerId) return;

            if (!res.success) {
                container.innerHTML = `<div class="text-center text-red-500 py-10 font-bold">${res.message}</div>`;
                return;
            }

            const logs = res.data || [];

            if (logs.length === 0) {
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-20 text-gray-300">
                        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <p class="text-sm font-bold uppercase tracking-widest">Sin actividad registrada</p>
                    </div>
                `;
                return;
            }

            // Remove vertical line for rendering
            container.innerHTML = '<div class="absolute top-0 bottom-0 left-[43px] w-0.5 bg-gray-100 hidden sm:block"></div>';
            logs.forEach(log => {
                container.insertAdjacentHTML('beforeend', this._buildClientHistoryNode(log));
            });

        } catch (err) {
            console.error('[ClientDetailAdmin] Timeline error:', err);
            const container = document.getElementById('client-historial-timeline');
            if (container) container.innerHTML = `<div class="text-center text-red-500 py-10">Error al cargar el historial: ${err.message}</div>`;
        }
    },

    _buildClientHistoryNode(log) {
        let title = '';
        let content = '';
        let type = 'edit';
        let actionTitle = 'ACCIÓN';
        let isAttachment = false;

        const timeFormat = window.SIApp ? SIApp.timeAgo(log.created_at) + ' · ' + SIApp.formatDate(log.created_at) : log.created_at;
        const actor = log.actor_name || 'Sistema';

        switch (log.action_key) {
            // ── CLIENTE ──────────────────────────────────────────────
            case 'cliente_creado':
                type = 'status';
                actionTitle = 'CLIENTE CREADO';
                title = 'Alta del Cliente en el Sistema';
                content = `El cliente fue registrado por primera vez en la plataforma.`;
                break;
            case 'cliente_actualizado':
            case 'cliente_actualizadod':
                type = 'edit';
                actionTitle = 'DATOS ACTUALIZADOS';
                title = 'Ficha del Cliente Modificada';
                content = 'Se han actualizado los datos del cliente.';
                if (log.metadata?.changes) {
                    content += '<br><span class="text-xs text-gray-400 mt-1 block">Campos modificados registrados.</span>';
                }
                break;
            case 'client_activate':
                type = 'status';
                actionTitle = 'CLIENTE ACTIVADO';
                title = 'El Cliente fue Activado';
                content = 'La cuenta del cliente está activa y operativa.';
                break;
            case 'cliente_desactivado':
                type = 'status';
                actionTitle = 'CLIENTE DESACTIVADO';
                title = 'El Cliente fue Desactivado';
                content = 'La cuenta ha sido suspendida temporalmente.';
                break;

            // ── USUARIO ──────────────────────────────────────────────
            case 'usuario_creado':
                type = 'user';
                actionTitle = 'NUEVO USUARIO';
                title = log.metadata?.name || log.metadata?.email || 'Usuario Creado';
                content = `Alta de usuario para el cliente.<br><span class="text-[10px] font-black text-blue-400 uppercase tracking-tighter mt-1 block">${log.metadata?.email || ''}</span>`;
                break;
            case 'usuario_actualizado':
            case 'usuario_actualizadod':
                type = 'user';
                actionTitle = 'USUARIO EDITADO';
                title = log.metadata?.name || 'Datos de Usuario Actualizados';
                content = 'Se han modificado los datos de credenciales del usuario.';
                break;
            case 'user_activate':
                type = 'user';
                actionTitle = 'USUARIO ACTIVADO';
                title = log.metadata?.name || 'Usuario Activado';
                content = 'El acceso del usuario a la plataforma fue habilitado.';
                break;
            case 'usuario_desactivado':
                type = 'user';
                actionTitle = 'USUARIO DESACTIVADO';
                title = log.metadata?.name || 'Usuario Desactivado';
                content = 'El acceso del usuario fue bloqueado.';
                break;
            case 'usuario_eliminado':
                type = 'edit';
                actionTitle = 'USUARIO ELIMINADO';
                title = log.metadata?.name || 'Usuario Removido';
                content = `El usuario fue eliminado permanentemente del sistema.`;
                break;

            // ── PROYECTO ─────────────────────────────────────────────
            case 'proyecto_creado':
                type = 'project';
                actionTitle = 'NUEVO PROYECTO';
                title = log.metadata?.name || 'Proyecto Creado';
                content = `Nuevo proyecto vinculado al cliente.<br><span class="text-[10px] font-black text-orange-400 uppercase tracking-tighter mt-1 block">${log.metadata?.reference || ''}</span>`;
                break;
            case 'proyecto_actualizado':
                type = 'project';
                actionTitle = 'PROYECTO EDITADO';
                title = log.metadata?.name || 'Datos de Proyecto Actualizados';
                content = 'Se han modificado los detalles del proyecto.';
                break;
            case 'proyecto_cambio_estado':
            case 'proyecto_cambio_estadod':
                type = 'project';
                actionTitle = 'ESTADO DE PROYECTO';
                title = log.project_name ? `Proyecto: ${log.project_name}` : (log.metadata?.name || 'Cambio de Estado');
                content = `Cambio de estado: De <strong class="uppercase text-gray-400">${log.metadata?.previous_status || log.metadata?.old_status || log.metadata?.estado_anterior || '-'}</strong> a <strong class="uppercase text-orange-500">${log.metadata?.new_status || log.metadata?.estado_nuevo || '-'}</strong>`;
                if (log.metadata?.reason || log.metadata?.motivo) {
                    content += `<br><span class="text-[11px] italic text-gray-500 mt-1 block">"${SIApp.escapeHtml(log.metadata.reason || log.metadata.motivo)}"</span>`;
                }
                if (log.project_ref) {
                    content += `<br><span class="text-[10px] font-black text-orange-400 uppercase tracking-tighter mt-1 block">${log.project_ref}</span>`;
                }
                break;
            case 'proyecto_reabierto':
                type = 'project';
                actionTitle = 'PROYECTO REABIERTO';
                title = log.project_name ? `Proyecto: ${log.project_name}` : (log.metadata?.name || 'Proyecto Reabierto');
                content = `El proyecto ha sido reabierto: de <strong class="uppercase text-gray-400">${log.metadata?.previous_status || log.metadata?.estado_anterior || 'CERRADO'}</strong> a <strong class="uppercase text-orange-500">${log.metadata?.new_status || log.metadata?.estado_nuevo || '-'}</strong>`;
                if (log.metadata?.reason || log.metadata?.motivo) {
                    content += `<br><span class="text-[11px] italic text-gray-500 mt-1 block">"${SIApp.escapeHtml(log.metadata.reason || log.metadata.motivo)}"</span>`;
                }
                break;
            case 'proyecto_comercial_asignado':
                type = 'commercial';
                actionTitle = 'COMERCIAL ASIGNADO';
                title = log.metadata?.user_name || 'Comercial Asignado al Proyecto';
                content = `Comercial asignado para gestionar el proyecto.`;
                break;
            case 'proyecto_comercial_removido':
                type = 'commercial';
                actionTitle = 'COMERCIAL REMOVIDO';
                title = log.metadata?.user_name || 'Comercial Removido del Proyecto';
                content = `El comercial fue desasignado del proyecto.`;
                break;

            // ── DOCUMENTO ────────────────────────────────────────────
            case 'documento_subido':
                type = 'document';
                actionTitle = 'NUEVO DOCUMENTO';
                title = log.metadata?.title || log.metadata?.file_name || 'Documento Subido';
                isAttachment = true;
                content = `Archivo subido al proyecto <strong>${log.project_name || 'Subordinado'}</strong>.<br><span class="text-[10px] font-black text-blue-400 uppercase tracking-tighter mt-1 block">${log.metadata?.category || 'General'}</span>`;
                break;
            case 'documento_nueva_version':
                type = 'document';
                actionTitle = 'NUEVA VERSIÓN';
                title = log.metadata?.title || log.metadata?.file_name || 'Versión de Documento';
                isAttachment = true;
                content = `Nueva versión del documento subida.<br><span class="text-[10px] font-black text-blue-400 uppercase tracking-tighter mt-1 block">VERSIÓN ${log.metadata?.version_number || '-'}</span>`;
                break;
            case 'documento_descargado':
                type = 'document';
                actionTitle = 'DESCARGA';
                title = log.metadata?.file_name || log.metadata?.title || 'Documento Descargado';
                isAttachment = true;
                content = `El documento fue descargado.<br><span class="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mt-1 block">VERSIÓN ${log.metadata?.version_number || 'ACTUAL'}</span>`;
                break;
            case 'documento_visualizado':
                type = 'document';
                actionTitle = 'CONSULTA';
                title = log.metadata?.file_name || log.metadata?.title || 'Documento Consultado';
                isAttachment = true;
                content = `El documento fue visualizado en el portal.<br><span class="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mt-1 block">VERSIÓN ${log.metadata?.version_number || 'ACTUAL'}</span>`;
                break;
            case 'document_deleted':
                type = 'edit';
                actionTitle = 'DOCUMENTO ELIMINADO';
                title = log.metadata?.title || log.metadata?.file_name || 'Documento Removido';
                content = `El archivo fue eliminado del expediente.`;
                break;
            case 'comentario_creado':
                type = 'chat';
                actionTitle = 'COMENTARIO';
                title = log.project_name ? `Comentario en ${log.project_name}` : 'Comentario';
                content = `"${SIApp.escapeHtml(log.metadata?.comment || log.metadata?.text || '')}"`;
                break;

            // ── DEFAULT ──────────────────────────────────────────────
            default:
                actionTitle = log.action_key?.replace(/_/g, ' ').toUpperCase() || 'EVENTO';
                title = log.metadata?.title || log.metadata?.file_name || log.metadata?.name || 'Actividad Registrada';
                let defaultContent = [];
                if (log.metadata && typeof log.metadata === 'object') {
                    for (const [k, v] of Object.entries(log.metadata)) {
                        if (typeof v !== 'object' && v !== null && v !== '') {
                            const valStr = String(v).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                            defaultContent.push(`<span class="block text-[11px] text-gray-600 mt-1"><strong class="uppercase text-[9px] text-gray-400 tracking-wider mr-1">${k.replace(/_/g, ' ')}:</strong> ${valStr}</span>`);
                        }
                    }
                }
                content = defaultContent.length > 0 ? defaultContent.join('') : `<span class="text-[11px] text-gray-400 italic">Sin metadata adicional (${log.action_key}).</span>`;
                break;
        }

        const icons = {
            status: { color: 'bg-[#E57B23]', icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>' },
            document: { color: 'bg-[#0284c7]', icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            project: { color: 'bg-amber-500', icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>' },
            user: { color: 'bg-violet-500', icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>' },
            commercial: { color: 'bg-orange-600', icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>' },
            chat: { color: 'bg-gray-100', icon: '<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clip-rule="evenodd"/></svg>' },
            edit: { color: 'bg-amber-100', icon: '<svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>' },
        };
        const node = icons[type] || icons.edit;

        let contentHtml = '';
        if (isAttachment) {
            contentHtml = `
                <div class="mt-3 p-5 bg-[#f8faff] border border-[#e0e7ff] rounded-2xl flex items-center gap-4 shadow-sm w-full lg:w-3/4 xl:w-2/3">
                    <div class="w-12 h-12 bg-white border border-[#c7d2fe] rounded-xl shadow-sm flex items-center justify-center text-[#4338ca] shrink-0">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/></svg>
                    </div>
                    <div class="flex-1 min-w-0 pr-4">
                        <p class="text-[15px] font-black text-[#1e1b4b] leading-tight mb-1 truncate">${title}</p>
                        <p class="text-xs text-gray-500">${content}</p>
                    </div>
                </div>
            `;
        } else if (type === 'chat') {
            contentHtml = `
                <div class="mt-2.5">
                    <div class="inline-block px-6 py-4 bg-[#f8f9fa] rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm relative w-full lg:w-2/3">
                        <p class="text-[14px] text-gray-700 font-medium leading-relaxed italic">${content}</p>
                    </div>
                </div>
            `;
        } else {
            contentHtml = `
                <div class="mt-2 text-sm w-full lg:w-3/4">
                    <h5 class="text-[14px] font-black text-gray-900 leading-tight">${title}</h5>
                    <p class="text-[12px] text-gray-500 mt-1 font-medium leading-relaxed">${content}</p>
                </div>
            `;
        }

        return `
            <div class="relative flex items-start gap-4 sm:gap-5 group fade-in w-full">
                <!-- Desktop Actor Name -->
                <div class="hidden sm:flex w-24 lg:w-32 flex-col items-end pt-1 shrink-0">
                    <span class="text-[10px] lg:text-[11px] font-black text-[#000000] uppercase tracking-tight text-right leading-tight pr-1" title="${actor}">${actor}</span>
                </div>
                <!-- Icon -->
                <div class="relative z-10 w-10 h-10 sm:w-11 sm:h-11 ${node.color} rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform flex-shrink-0 ring-4 ring-white mt-1 sm:mt-0">
                    ${node.icon}
                </div>
                <!-- Content -->
                <div class="flex-1 min-w-0 pb-5 sm:pb-3 border-b border-gray-50/50">
                    <div class="mb-2 sm:mb-1 flex flex-wrap items-center gap-2">
                        <span class="text-[9px] font-black tracking-widest uppercase text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">${actionTitle}</span>
                        <span class="text-[9px] lg:text-[10px] text-gray-400 font-medium">${timeFormat}</span>
                    </div>
                    <!-- Mobile Actor -->
                    <div class="sm:hidden mb-2 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        <span class="text-[10px] font-black uppercase tracking-tight text-gray-900">${actor}</span>
                    </div>
                    ${contentHtml}
                </div>
            </div>
        `;
    },

    /** Render modals into a persistent container so they survive tab switching */
    renderModals() {
        const modalsEl = document.getElementById('client-modals-container');
        if (!modalsEl) return;

        modalsEl.innerHTML = `
            ${SITemplates.modal({
            id: 'user-modal',
            title: 'Usuario Cliente',
            contentHtml: SITemplates.fragments.userFields({}, { type: 'user' }),
            saveBtnLabel: 'Guardar Usuario',
            saveActionLabel: 'ClientDetailAdmin.saveUser()'
        })}

            ${SITemplates.modal({
            id: 'project-modal',
            title: 'Crear Nuevo Proyecto',
            contentHtml: SITemplates.fragments.projectFields({}, false),
            saveBtnLabel: 'Crear Proyecto',
            saveActionLabel: 'ClientDetailAdmin.saveProject()',
            maxWidth: 'max-w-xl'
        })}
        `;
    },

    renderProjectsList() {
        const desktopContainer = document.getElementById('projects-desktop-container');
        const mobileContainer = document.getElementById('projects-mobile-container');
        const loadMoreContainer = document.getElementById('projects-load-more-container');

        if (!desktopContainer || !mobileContainer) return;

        const pArr = this.projects || [];
        const visibleProjects = pArr.slice(0, this.projectsLimit);
        const hasMore = pArr.length > this.projectsLimit;

        desktopContainer.innerHTML = `
            <table class="w-full si-table">
                <thead>
                    <tr class="bg-gray-50/50">
                        <th class="px-5 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Proyecto</th>
                        <th class="px-5 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Referencia</th>
                        <th class="px-5 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Presupuesto</th>
                        <th class="px-5 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                        <th class="px-5 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Creado</th>
                        <th class="px-5 py-3.5 w-12"></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50/80">
                    ${visibleProjects.length > 0
                ? visibleProjects.map(p => this._renderProjectRow(p)).join('')
                : '<tr><td colspan="6" class="py-10 text-center text-gray-400 italic">No hay proyectos para este cliente</td></tr>'}
                </tbody>
            </table>
        `;

        mobileContainer.innerHTML = visibleProjects.length > 0
            ? visibleProjects.map(p => this._renderProjectCard(p)).join('')
            : '<div class="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 italic shadow-sm">No hay proyectos para este cliente</div>';

        if (loadMoreContainer) {
            loadMoreContainer.innerHTML = hasMore
                ? `
                    <div class="mt-4 flex justify-center fade-in">
                        <button onclick="ClientDetailAdmin.loadMoreProjects()" class="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors bg-orange-50 hover:bg-orange-100 rounded-full px-4 py-1.5 flex items-center gap-1">
                            Cargar más
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                    </div>
                ` : '';
        }
    },

    loadMoreProjects() {
        this.projectsLimit += 4;
        this.renderProjectsList();
    },

    _renderKPIDash() {
        const s = this.stats || {};
        const currency = (val) => (window.SIApp && SIApp.formatCurrency) ? SIApp.formatCurrency(val) : val;
        const number = (val) => (window.SIApp && SIApp.formatNumber) ? SIApp.formatNumber(val) : val;

        return `
            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-5">
                <div class="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Proyectos Totales</span>
                    <p class="text-2xl font-black text-gray-900">${number(s.total_projects || 0)}</p>
                </div>
            </div>

            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-5">
                <div class="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Usuarios con Acceso</span>
                    <p class="text-2xl font-black text-gray-900">${number(s.active_users || 0)}</p>
                </div>
            </div>

            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-5">
                <div class="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Proyectos Activos</span>
                    <p class="text-2xl font-black text-gray-900">${number(s.active_projects || 0)}</p>
                </div>
            </div>

            <div class="bg-[#fcfaff] dark:bg-purple-500/5 border border-[#f3ebff] dark:border-purple-500/10 rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-all">
                <div class="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-[#8a5cf5] dark:text-purple-400 uppercase tracking-widest leading-none mb-1">Facturación Total</span>
                    <p class="text-2xl font-black text-gray-900 dark:text-zinc-100">${currency(s.annual_revenue || 0)}</p>
                </div>
            </div>
        `;
    },

    _renderUserRow(u) {
        const lastAccess = u.last_login_at ? (SIApp.formatDate ? SIApp.formatDate(u.last_login_at) : u.last_login_at) : 'Sin acceso';
        const avatarHtml = SIApp.avatarInitials(u.name);

        return `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        ${avatarHtml}
                        <div>
                            <p class="text-sm font-bold text-gray-900 leading-tight">${u.name}</p>
                            <p class="text-xs text-gray-400">${u.email}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    ${window.SIApp ? SIApp.activeBadge(u.is_active) : ''}
                </td>
                <td class="px-6 py-4">
                    <p class="text-xs font-bold text-gray-500">${lastAccess}</p>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick='ClientDetailAdmin.openUserModal(${JSON.stringify(u)})' class="p-2 text-gray-300 hover:text-indigo-500 hover:bg-gray-50 rounded-lg transition-all transform hover:scale-110 active:scale-95 hover:rotate-12" title="Editar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                        <button onclick="ClientDetailAdmin.deleteUser(${u.id})" class="p-2 text-gray-300 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-all transform hover:scale-110 active:scale-95" title="Eliminar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </div>
                </td>
            </tr>
        `;
    },

    _renderProjectRow(p) {
        const format = (val) => (window.SIApp && SIApp.formatCurrency) ? SIApp.formatCurrency(val) : val;
        const formatDate = (val) => (window.SIApp && SIApp.formatDate) ? SIApp.formatDate(val) : val;
        const badge = (val) => (window.SIApp && SIApp.statusBadge) ? SIApp.statusBadge(val) : val;

        return `
        <tr class="hover:bg-orange-50/30 transition-colors group">
            <td class="px-5 py-4 whitespace-nowrap text-center">
                <a href="/steelinox/project/${p.id}" 
                   class="text-sm font-black text-[#000000] group-hover:text-orange-600 transition-colors no-underline inline-block">
                    ${p.name}
                </a>
            </td>
            
            <td class="px-5 py-4 whitespace-nowrap">
                <div class="flex justify-center">
                    <span class="inline-flex items-center text-[11px] font-bold text-gray-500 bg-gray-100/80 px-2.5 py-1 rounded-[6px] tracking-wide">
                        ${p.reference}
                    </span>
                </div>
            </td>
            
            <td class="px-5 py-4 text-sm font-black text-gray-600 whitespace-nowrap text-center">
                ${format(p.budget_amount || 0)}
            </td>
            
            <td class="px-5 py-4 whitespace-nowrap">
                <div class="flex justify-center">
                    ${badge(p.status)}
                </div>
            </td>
            
            <td class="px-5 py-4 text-xs font-semibold text-gray-400 whitespace-nowrap tracking-wide uppercase text-center">
                ${formatDate(p.created_at)}
            </td>
            
            <td class="px-5 py-4 text-center whitespace-nowrap w-12">
                <a href="/steelinox/project/${p.id}" class="inline-block p-1.5 transition-all text-gray-200 group-hover:text-blue-500 transform group-hover:scale-110 group-hover:translate-x-1">
                    <svg class="w-5 h-5 inline-block opacity-0 group-hover:opacity-100 transition-all duration-300" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
                    </svg>
                </a>
            </td>
        </tr>
    `;
    },

    /** Mobile card for a user */
    _renderUserCard(u) {
        const lastAccess = u.last_login_at ? (SIApp.formatDate ? SIApp.formatDate(u.last_login_at) : u.last_login_at) : 'Sin acceso';
        const avatarHtml = SIApp.avatarInitials(u.name, 'w-10 h-10', 'text-[10px]');

        return `
            <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3 min-w-0">
                        ${avatarHtml}
                        <div class="min-w-0">
                            <p class="text-sm font-bold text-gray-900 leading-tight truncate">${u.name}</p>
                            <p class="text-xs text-gray-400 truncate">${u.email}</p>
                        </div>
                    </div>
                    ${window.SIApp ? SIApp.activeBadge(u.is_active) : ''}
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-gray-50">
                    <button onclick='ClientDetailAdmin.openUserModal(${JSON.stringify(u)})' class="flex items-center gap-2 group/btn no-underline">
                        <span class="text-[11px] font-black text-[#000000] group-hover:text-orange-600 transition-colors tracking-wide">
                            Ver detalles
                        </span>
                        <svg class="w-3.5 h-3.5 text-[#000000] group-hover:text-orange-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </button>
                    <div class="flex items-center gap-1">
                        <button onclick="ClientDetailAdmin.deleteUser(${u.id})" class="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all transform hover:scale-110 active:scale-95" title="Eliminar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </div>
                </div>
            </div>
        `;
    },

    /** Mobile card for a project */
    _renderProjectCard(p) {
        const format = (val) => (window.SIApp && SIApp.formatCurrency) ? SIApp.formatCurrency(val) : val;
        const formatDate = (val) => (window.SIApp && SIApp.formatDate) ? SIApp.formatDate(val) : val;
        const badge = (val) => (window.SIApp && SIApp.statusBadge) ? SIApp.statusBadge(val) : val;

        return `
            <a href="/steelinox/project/${p.id}" class="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group">
                <div class="flex items-start justify-between mb-3 gap-2">
                    <div class="min-w-0">
                        <p class="text-sm font-black text-[#000000] group-hover:text-orange-600 transition-colors leading-tight truncate">${p.name}</p>
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${p.reference}</span>
                    </div>
                    ${badge(p.status)}
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-gray-50">
                    <p class="text-sm font-black text-gray-700">${format(p.budget_amount || 0)}</p>
                    <div class="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        ${formatDate(p.created_at)}
                    </div>
                </div>
            </a>
        `;
    },

    _renderTimelineItem(i) {
        const icons = {
            success: '<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>',
            info: '<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>',
        };
        const colors = {
            success: 'bg-emerald-50',
            info: 'bg-blue-50'
        };

        return `
            <div class="relative pl-12">
                <div class="absolute left-0 top-1 w-6 h-6 ${colors[i.type]} rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                    ${icons[i.type]}
                </div>
                <div>
                    <h5 class="text-sm font-black text-gray-900">${i.action}</h5>
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Realizado por <span class="text-gray-900">${i.author}</span> • ${i.time}</p>
                    ${i.note ? `
                        <div class="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-xl italic">
                            <p class="text-xs text-gray-600 leading-relaxed font-medium">"${i.note}"</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    openUserModal(user = null) {
        const modalId = 'user-modal';
        const container = document.querySelector(`#${modalId} .p-6.overflow-y-auto`);
        const titleEl = document.querySelector(`#${modalId} h3`);

        if (container) {
            container.innerHTML = `
                <form id="${modalId}-form" onsubmit="event.preventDefault(); ClientDetailAdmin.saveUser();" class="space-y-4">
                    ${SITemplates.fragments.userFields(user || {}, { type: 'user' })}
                </form>
            `;
        }
        if (titleEl) titleEl.textContent = user ? 'Editar Usuario' : 'Añadir Usuario Cliente';

        SIApp.modal.open(modalId);
    },

    closeUserModal() {
        SIApp.modal.close('user-modal');
    },

    async saveUser() {
        const modalId = 'user-modal';
        const formData = SIApp.getValidatedFormData(`${modalId}-form`);
        if (!formData) return;

        const id = formData.id;
        const isEdit = !!id;

        const payload = {
            client_id: this.clientId,
            name: formData.name,
            email: formData.email,
            is_active: formData.is_active ? 1 : 0
        };

        if (formData.password) payload.password = formData.password;

        SIApp.setBtnLoading(`${modalId}-btn-save`, true, isEdit ? 'Guardando...' : 'Creando...');

        try {
            let res;
            if (isEdit) {
                res = await API.put('/users/' + id, payload);
            } else {
                res = await API.post('/users', payload);
            }

            if (res.success) {
                SIApp.showToast('Éxito', res.message, 'success');
                this.closeUserModal();
                await this.loadClientData();
            } else {
                let errorMsg = res.message || 'Error desconocido';
                if (res.errors) errorMsg += ': ' + Object.values(res.errors).join(', ');
                SIApp.showToast('Error', errorMsg, 'error');
            }
        } catch (e) {
            console.error(e);
            SIApp.showToast('Error', e.message, 'error');
        } finally {
            SIApp.setBtnLoading(`${modalId}-btn-save`, false, isEdit ? 'Guardar Cambios' : 'Crear Usuario');
        }
    },

    async deleteUser(id) {
        if (window.SIApp) {
            const confirmed = await SIApp.confirm('¿Eliminar usuario?', 'Estás seguro de que deseas eliminar a este usuario? Esta acción le impedirá acceder al sistema.');
            if (!confirmed) return;
        }

        try {
            const res = await API.delete('/users/' + id);
            if (res.success) {
                if (window.SIApp && SIApp.showToast) SIApp.showToast('Éxito', res.message, 'success');
                await this.loadClientData();
            } else {
                if (window.SIApp && SIApp.showToast) SIApp.showToast('Error', res.message, 'error');
            }
        } catch (e) {
            console.error(e);
            if (window.SIApp && SIApp.showToast) SIApp.showToast('Error', 'No se pudo eliminar el usuario', 'error');
        }
    },

    openProjectModal() {
        const modalId = 'project-modal';
        const container = document.querySelector(`#${modalId} .p-6.overflow-y-auto`);
        if (container) {
            container.innerHTML = `
                <form id="${modalId}-form" onsubmit="event.preventDefault(); ClientDetailAdmin.saveProject();" class="space-y-4">
                    ${SITemplates.fragments.projectFields({}, false)}
                    <input type="hidden" name="status" value="propuesta">
                </form>
            `;
        }
        SIApp.modal.open(modalId);
    },

    toggleDropdown(id) {
        document.querySelectorAll('.si-custom-dropdown').forEach(d => { if (d.id !== id) d.classList.add('hidden'); });
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden');
    },

    selectCustomStatus(val, label, colorClass, liElement) {
        document.getElementById('project-status').value = val;
        document.getElementById('client-project-status-display').textContent = label;

        const circle = document.getElementById('client-project-status-circle');
        circle.className = 'w-2 h-2 rounded-full ' + colorClass;

        if (liElement) {
            const ul = document.getElementById('client-status-dropdown-menu');
            const lis = ul.querySelectorAll('li');
            lis.forEach(li => {
                li.className = 'px-4 py-2.5 transition-all flex items-center gap-2 hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600';
                const check = li.querySelector('.status-check');
                if (check) check.remove();
            });
            liElement.className = 'px-4 py-2.5 transition-all flex items-center gap-2 bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner';
            liElement.insertAdjacentHTML('beforeend', '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>');
        }

        this.toggleDropdown('client-status-dropdown-menu');
    },

    closeProjectModal() {
        const modal = document.getElementById('project-modal');
        if (modal && modal._closeFn) {
            document.removeEventListener('click', modal._closeFn);
            delete modal._closeFn;
        }
        SIApp.modal.close('project-modal');
    },

    async saveProject() {
        const modalId = 'project-modal';
        const data = SIApp.getValidatedFormData(`${modalId}-form`);
        if (!data) return;

        data.client_id = this.clientId;
        if (!data.status) data.status = 'propuesta';

        SIApp.setBtnLoading(`${modalId}-btn-save`, true, 'Creando...');

        try {
            const res = await API.post('/projects', data);
            if (res.success) {
                SIApp.showToast('Éxito', res.message, 'success');
                this.closeProjectModal();
                await this.loadClientData();
            } else {
                let errorMsg = res.message || 'Error desconocido';
                if (res.errors) errorMsg += ': ' + Object.values(res.errors).join(', ');
                SIApp.showToast('Error', errorMsg, 'error');
            }
        } catch (e) {
            console.error(e);
            SIApp.showToast('Error', e.message, 'error');
        } finally {
            SIApp.setBtnLoading(`${modalId}-btn-save`, false, 'Crear Proyecto');
        }
    }
};

// Global export
window.ClientDetailAdmin = SIModules.clientDetailAdmin;
