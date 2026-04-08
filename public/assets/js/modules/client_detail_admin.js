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
            <div class="bg-white border border-gray-100 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 mb-8 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-8 items-start sm:items-center relative overflow-hidden fade-in" style="animation-delay: 0.1s">
                <div class="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div class="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-[1.5rem] bg-gradient-to-br from-orange-100 to-orange-50 border-4 border-white shadow-sm flex items-center justify-center shrink-0 relative z-10" id="client-avatar">
                   <svg class="w-7 h-7 sm:w-10 sm:h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>

                <div class="flex-1 relative z-10 min-w-0">
                    <h1 id="client-name" class="text-xl sm:text-3xl font-extrabold text-[#1a1b25] tracking-tight break-words mb-2">Cargando detalles...</h1>
                    <div class="flex flex-wrap items-center gap-2">
                        <span id="client-status" class="hidden inline-flex"></span>
                        <span id="client-ref" class="px-2 sm:px-3 py-1 bg-gray-100 text-gray-500 text-[10px] sm:text-xs font-bold rounded-lg tracking-wider border border-gray-200/50 hidden inline-flex items-center"></span>
                    </div>
                </div>

                <div class="relative sm:absolute sm:top-6 sm:right-6 z-20 w-full sm:w-auto">
                    <a data-route="client-edit" href="/steelinox/client/edit/${clientId}" class="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 sm:py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:text-orange-500 hover:border-orange-500 shadow-sm transition-all hover:shadow-md w-full sm:w-auto">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        Editar Cliente
                    </a>
                </div>
            </div>

            <!-- Contenedor Dinámico: Info, KPIs, Proyectos y Usuarios -->
            <div id="client-detail-content" class="fade-in" style="animation-delay: 0.2s">
                <div class="py-20 flex flex-col items-center justify-center text-gray-400">
                    <div class="si-spinner mb-4"></div>
                    <p class="text-sm font-medium">Cargando información del cliente...</p>
                </div>
            </div>
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
            this.users = d.users || [];
            this.projects = d.projects || [];
            this.stats = d.kpis || {};

            console.log("[ClientDetailAdmin] Rendering components...");
            this.renderHeader();
            this.renderContent();
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

    /** Render main sections */
    renderContent() {
        const container = document.getElementById('client-detail-content');
        if (!container) return;

        container.innerHTML = `
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
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
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
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
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

                <!-- HISTORIAL Y NOTAS -->
                <section>
                    <div class="flex items-center gap-2 mb-6 mt-6">
                         <div class="w-8 h-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                         </div>
                         <h2 class="text-xl font-extrabold text-gray-900">Historial y Notas</h2>
                    </div>
                    <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <div class="space-y-8 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50">
                            ${this._renderTimelineItem({
                    type: 'success',
                    author: 'Alberto Sánchez',
                    action: 'Cliente actualizado satisfactoriamente',
                    time: '15 de Mayo, 2026 • 10:24 AM',
                    note: 'Se han actualizado los datos de contacto y la dirección fiscal tras el traslado de oficinas.'
                })}
                            ${this._renderTimelineItem({
                    type: 'info',
                    author: 'Sistema',
                    action: 'Nuevo proyecto asignado: PRJ-2026-018',
                    time: '01 de Marzo, 2026 • 09:00 AM',
                    note: null
                })}
                        </div>
                        <div class="mt-8 pt-6 border-t border-gray-50 text-center">
                            <button class="text-xs font-bold text-orange-500 hover:text-orange-600 uppercase tracking-widest">Ver historial completo de auditoría</button>
                        </div>
                    </div>
                </section>
            </div>

            <!-- MODAL USUARIO -->
            <div id="user-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-md shadow-2xl transform scale-95 transition-transform flex flex-col max-h-[90vh]">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 id="user-modal-title" class="text-xl font-extrabold text-gray-900">Añadir Usuario</h3>
                        <button onclick="ClientDetailAdmin.closeUserModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto">
                        <form id="user-form" onsubmit="event.preventDefault(); ClientDetailAdmin.saveUser();" class="space-y-4">
                            <input type="hidden" id="user-id" name="user_id">
                            
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nombre</label>
                                <input type="text" id="user-name" name="name" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Ej: Juan Pérez">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Email</label>
                                <input type="email" id="user-email" name="email" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="ejemplo@empresa.com">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Contraseña</label>
                                <input type="password" id="user-password" name="password" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Dejar en blanco para no cambiar (si edita)">
                                <p class="text-[10px] text-gray-400 mt-1 font-medium">Requerida para nuevos usuarios.</p>
                            </div>

                            <div class="flex items-center gap-2 mt-2">
                                <input type="checkbox" id="user-is-active" name="is_active" class="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500">
                                <label for="user-is-active" class="text-sm font-bold text-gray-700">Usuario Activo</label>
                            </div>
                        </form>
                    </div>
                    <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl sm:rounded-b-[2rem] flex justify-end gap-3">
                         <button onclick="ClientDetailAdmin.closeUserModal()" type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancelar</button>
                         <button onclick="ClientDetailAdmin.saveUser()" type="button" class="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 border border-transparent rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center gap-2">
                             <svg class="w-4 h-4 hidden" id="user-save-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                             Guardar Usuario
                         </button>
                    </div>
                </div>
            </div>

            <!-- MODAL PROYECTO -->
            <div id="project-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-xl shadow-2xl transform scale-95 transition-transform flex flex-col max-h-[90vh]">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <h3 class="text-xl font-extrabold text-gray-900">Crear Nuevo Proyecto</h3>
                        <button onclick="ClientDetailAdmin.closeProjectModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto">
                        <form id="project-form" onsubmit="event.preventDefault(); ClientDetailAdmin.saveProject();" class="space-y-4">
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nombre <span class="text-red-500">*</span></label>
                                    <input type="text" id="project-name" name="name" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Ej: Nave Industrial">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Referencia <span class="text-red-500">*</span></label>
                                    <input type="text" id="project-ref" name="reference" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Ej: PRJ-2026-001">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Presupuesto (€)</label>
                                    <input type="number" step="50" id="project-budget" name="budget_amount" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Ej: 150000">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Superficie Obra (m²)</label>
                                    <input type="number" step="1" id="project-surface" name="surface" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Ej: 1200">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Tipo de Proyecto</label>
                                    <input type="text" id="project-type" name="project_type" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Ej: Estructura, Revestimiento">
                                </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Estado</label>
                                <div class="relative">
                                    <input type="hidden" id="project-status" name="status" value="propuesta">
                                    <div class="w-full px-4 py-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl font-medium text-sm flex items-center gap-2 cursor-not-allowed">
                                        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                                        <span>Propuesta</span>
                                        <svg class="w-3.5 h-3.5 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                    </div>
                                    <p class="text-[10px] text-gray-400 mt-1 font-medium italic">Los nuevos proyectos se inician siempre como propuesta.</p>
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Descripción corta</label>
                                <textarea id="project-desc" name="description" rows="2" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Notas sobre el nuevo proyecto..."></textarea>
                            </div>

                        </form>
                    </div>
                    <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl sm:rounded-b-[2rem] flex justify-end gap-3 shrink-0">
                         <button onclick="ClientDetailAdmin.closeProjectModal()" type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancelar</button>
                         <button onclick="ClientDetailAdmin.saveProject()" type="button" class="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 border border-transparent rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center gap-2">
                             <svg class="w-4 h-4 hidden" id="project-save-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                             Crear Proyecto
                         </button>
                    </div>
                </div>
            </div>
        `;

        // Render inner dynamic lists
        this.renderProjectsList();
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
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
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

            <div class="bg-[#fcfaff] border border-[#f3ebff] rounded-2xl p-6 shadow-sm flex items-center gap-5">
                <div class="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-[#8a5cf5] uppercase tracking-widest leading-none mb-1">Facturación Total</span>
                    <p class="text-2xl font-black text-gray-900">${currency(s.annual_revenue || 0)}</p>
                </div>
            </div>
        `;
    },

    _renderUserRow(u) {
        const initials = (window.SIApp && SIApp._getInitials) ? SIApp._getInitials(u.name) : '??';
        const lastAccess = u.last_login_at ? (SIApp.formatDate ? SIApp.formatDate(u.last_login_at) : u.last_login_at) : 'Sin acceso';

        // Paleta de colores para avatares
        const colors = [
            'bg-blue-100 text-blue-700',
            'bg-emerald-100 text-emerald-700',
            'bg-purple-100 text-purple-700',
            'bg-amber-100 text-amber-700',
            'bg-rose-100 text-rose-700',
            'bg-indigo-100 text-indigo-700',
            'bg-cyan-100 text-cyan-700'
        ];
        // Seleccionar color basado en el ID o nombre para que sea consistente
        const colorClass = colors[(u.id || u.name.length) % colors.length];

        return `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 ${colorClass} rounded-full flex items-center justify-center text-[10px] font-black border border-white shadow-sm">${initials}</div>
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
                        <button onclick='ClientDetailAdmin.openUserModal(${JSON.stringify(u)})' class="p-2 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Editar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                        <button onclick="ClientDetailAdmin.deleteUser(${u.id})" class="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
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
                <a data-route="project-detail" href="/steelinox/project/${p.id}" 
                   class="text-sm font-black text-[#1a1b25] group-hover:text-orange-600 transition-colors hover:underline inline-block">
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
                <a data-route="project-detail" href="/steelinox/project/${p.id}" class="inline-block p-1 transition-all text-gray-300 hover:text-orange-500">
                    <svg class="w-4 h-4 inline-block opacity-0 group-hover:opacity-100 transition-colors" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </a>
            </td>
        </tr>
    `;
    },

    /** Mobile card for a user */
    _renderUserCard(u) {
        const initials = (window.SIApp && SIApp._getInitials) ? SIApp._getInitials(u.name) : '??';
        const lastAccess = u.last_login_at ? (SIApp.formatDate ? SIApp.formatDate(u.last_login_at) : u.last_login_at) : 'Sin acceso';
        const colors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];
        const colorClass = colors[(u.id || u.name.length) % colors.length];

        return `
            <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 ${colorClass} rounded-full flex items-center justify-center text-[10px] font-black border border-white shadow-sm shrink-0">${initials}</div>
                        <div class="min-w-0">
                            <p class="text-sm font-bold text-gray-900 leading-tight truncate">${u.name}</p>
                            <p class="text-xs text-gray-400 truncate">${u.email}</p>
                        </div>
                    </div>
                    ${window.SIApp ? SIApp.activeBadge(u.is_active) : ''}
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div class="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        ${lastAccess}
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick='ClientDetailAdmin.openUserModal(${JSON.stringify(u)})' class="p-2 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Editar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                        <button onclick="ClientDetailAdmin.deleteUser(${u.id})" class="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
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
            <a data-route="project-detail" href="/steelinox/project/${p.id}" class="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group">
                <div class="flex items-start justify-between mb-3 gap-2">
                    <div class="min-w-0">
                        <p class="text-sm font-black text-[#1a1b25] group-hover:text-orange-600 transition-colors leading-tight truncate">${p.name}</p>
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
        const modal = document.getElementById('user-modal');
        const form = document.getElementById('user-form');
        const title = document.getElementById('user-modal-title');

        form.reset();

        if (user) {
            title.textContent = 'Editar Usuario';
            document.getElementById('user-id').value = user.id;
            document.getElementById('user-name').value = user.name;
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-is-active').checked = user.is_active == 1 || user.is_active === true;
            document.getElementById('user-password').required = false;
        } else {
            title.textContent = 'Añadir Usuario';
            document.getElementById('user-id').value = '';
            document.getElementById('user-is-active').checked = true;
            document.getElementById('user-password').required = true;
        }

        modal.classList.remove('hidden');
        // trigger reflow
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    },

    closeUserModal() {
        const modal = document.getElementById('user-modal');
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    async saveUser() {
        const form = document.getElementById('user-form');
        if (!form.reportValidity()) return;

        const id = document.getElementById('user-id').value;
        const spinner = document.getElementById('user-save-spinner');

        const payload = {
            client_id: this.clientId,
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            is_active: document.getElementById('user-is-active').checked ? 1 : 0
        };

        const pwd = document.getElementById('user-password').value;
        if (pwd) {
            payload.password = pwd;
        }

        // Email Validation (Format)
        const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regexEmail.test(payload.email)) {
            if (window.SIApp) SIApp.showToast('Email no válido', 'Por favor, ingrese un correo electrónico con formato correcto.', 'error');
            return;
        }

        spinner.classList.remove('hidden');
        spinner.classList.add('animate-spin');

        try {
            let res;
            if (id) {
                res = await API.put('/users/' + id, payload);
            } else {
                res = await API.post('/users', payload);
            }

            if (res.success) {
                if (window.SIApp) SIApp.showToast('Éxito', res.message, 'success');
                this.closeUserModal();
                await this.loadClientData();
            } else {
                let errorMsg = res.message || 'Error desconocido';
                if (res.errors) {
                    errorMsg += ': ' + Object.values(res.errors).join(', ');
                }
                if (window.SIApp) SIApp.showToast('Error', errorMsg, 'error');
            }
        } catch (e) {
            console.error(e);
            if (window.SIApp) SIApp.showToast('Error', e.message, 'error');
        } finally {
            spinner.classList.add('hidden');
            spinner.classList.remove('animate-spin');
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
        const modal = document.getElementById('project-modal');
        const form = document.getElementById('project-form');
        form.reset();
        document.getElementById('project-status').value = 'propuesta';

        modal.classList.remove('hidden');
        void modal.offsetWidth; // Reflow
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');

        // Close dropdown when clicking outside
        const closeFn = (e) => {
            if (!e.target.closest('.si-custom-dropdown') && !e.target.closest('button[onclick*="toggleDropdown"]')) {
                document.querySelectorAll('.si-custom-dropdown').forEach(d => d.classList.add('hidden'));
            }
        };
        document.addEventListener('click', closeFn);
        modal._closeFn = closeFn;
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
        if (modal._closeFn) {
            document.removeEventListener('click', modal._closeFn);
            delete modal._closeFn;
        }
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    async saveProject() {
        const form = document.getElementById('project-form');
        if (!form.reportValidity()) return;

        const spinner = document.getElementById('project-save-spinner');

        const payload = {
            client_id: this.clientId,
            name: document.getElementById('project-name').value,
            reference: document.getElementById('project-ref').value,
            budget_amount: document.getElementById('project-budget').value || null,
            surface: document.getElementById('project-surface').value || null,
            project_type: document.getElementById('project-type').value || null,
            status: document.getElementById('project-status').value || 'propuesta',
            description: document.getElementById('project-desc').value || null
        };

        // Regex Validation (Projects are always new in this modal)
        const regexPrj = /^PRJ-\d{4}-\d{3,}$/;
        if (!regexPrj.test(payload.reference)) {
            if (window.SIApp) SIApp.showToast('Referencia Inválida', 'El formato debe ser PRJ-AAAA-XXX (Ej: PRJ-2026-001)', 'error');
            return;
        }

        spinner.classList.remove('hidden');
        spinner.classList.add('animate-spin');

        try {
            const res = await API.post('/projects', payload);
            if (res.success) {
                if (window.SIApp) SIApp.showToast('Éxito', res.message, 'success');
                this.closeProjectModal();
                await this.loadClientData();
            } else {
                let errorMsg = res.message || 'Error desconocido';
                if (res.errors) {
                    errorMsg += ': ' + Object.values(res.errors).join(', ');
                }
                if (window.SIApp) SIApp.showToast('Error', errorMsg, 'error');
            }
        } catch (e) {
            console.error(e);
            if (window.SIApp) SIApp.showToast('Error', e.message, 'error');
        } finally {
            spinner.classList.add('hidden');
            spinner.classList.remove('animate-spin');
        }
    }
};

// Global export
window.ClientDetailAdmin = SIModules.clientDetailAdmin;
