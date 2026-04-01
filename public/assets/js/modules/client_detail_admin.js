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
    stats: null,
    userContext: null,

    async loadClientDetailSPA() {
        const pathParts = window.location.pathname.split('/');
        const clientId = pathParts[pathParts.length - 1];

        if (!clientId || isNaN(clientId)) {
            SIRouter.show404();
            return;
        }

        const container = document.getElementById('main-content');
        container.innerHTML = `
            <!-- Breadcrumb y Acciones -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 fade-in">
                <nav class="flex text-sm text-gray-500 gap-2" aria-label="Breadcrumb">
                    <a data-route="clients" href="/steelinox/clients" class="hover:text-orange-500 transition-colors font-medium">Clientes</a>
                    <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    <span id="breadcrumb-client-name" class="text-gray-900 font-bold">Cargando...</span>
                </nav>
                <div class="flex gap-2" id="client-actions">
                    <!-- Botones de estado -->
                </div>
            </div>

            <!-- Header Cliente -->
            <div class="bg-white border border-gray-100 rounded-[2rem] p-8 mb-8 shadow-sm flex flex-col md:flex-row gap-8 items-start md:items-center relative overflow-hidden fade-in" style="animation-delay: 0.1s">
                <div class="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div class="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 border-4 border-white shadow-lg flex items-center justify-center text-3xl font-black text-orange-600 shrink-0 relative z-10" id="client-avatar">
                   <div class="si-spinner"></div>
                </div>

                <div class="flex-1 relative z-10">
                    <div class="flex items-center gap-3 mb-2">
                        <h1 id="client-name" class="text-3xl font-extrabold text-[#1a1b25] tracking-tight">Cargando detalles...</h1>
                        <span id="client-cif" class="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg tracking-wider border border-gray-200/50 hidden"></span>
                    </div>
                </div>
            </div>

            <!-- Grid: Info y Proyectos -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Columna Izquierda: Info Contacto -->
                <div class="lg:col-span-1 space-y-8 fade-in" style="animation-delay: 0.2s">
                    <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Información de Contacto</h3>
                            <button class="text-gray-400 hover:text-orange-500 transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </button>
                        </div>
                        <div class="space-y-5" id="client-contact-info">
                            <div class="flex justify-center py-4"><div class="si-spinner"></div></div>
                        </div>
                    </div>
                </div>

                <!-- Columna Derecha: Proyectos -->
                <div class="lg:col-span-2 fade-in" style="animation-delay: 0.3s">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-bold text-[#1a1b25] flex items-center gap-2">
                            Proyectos Activos
                            <span id="client-projects-count" class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs hidden">0</span>
                        </h2>
                        <button class="text-sm font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition-colors">
                            + Nuevo Proyecto
                        </button>
                    </div>

                    <div id="client-projects-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2 py-10 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                            <div class="si-spinner mb-4"></div>
                            <p class="text-sm font-medium">Buscando proyectos...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.init(clientId, window.SIApp.user);
    },

    async init(clientId, user) {
        this.clientId = clientId;
        this.userContext = user;

        if (!this.clientId) {
            window.location.href = '/steelinox/clients';
            return;
        }

        await this.loadClientData();
    },

    /** Fetch detail data from API */
    async loadClientData() {
        try {
            const response = await API.get('/clients/' + this.clientId);

            if (!response.success || !response.data) {
                throw new Error(response.message || 'Error al cargar el cliente.');
            }

            const d = response.data;
            this.client = d.client;
            this.users = d.users || [];
            this.projects = d.projects || [];
            this.stats = d.stats || {};

            this.renderHeader();
            this.renderContent();

        } catch (error) {
            console.error('[ClientDetailAdmin] Error:', error);
            document.getElementById('client-detail-content').innerHTML = `
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
    },

    /** Update Title, Reference and Breadcrumb */
    renderHeader() {
        const nameEl = document.getElementById('client-name');
        const refEl = document.getElementById('client-ref');
        const breadcrumbEl = document.getElementById('breadcrumb-client-name');

        if (nameEl) nameEl.textContent = this.client.name;
        if (breadcrumbEl) breadcrumbEl.textContent = this.client.name;
        
        if (refEl) {
            const statusBadge = this.client.is_active 
                ? '<span class="ml-3 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase tracking-widest border border-emerald-200/50">Activo</span>'
                : '<span class="ml-3 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded uppercase tracking-widest border border-red-200/50">Inactivo</span>';
            
            refEl.innerHTML = `REF: ${this.client.reference || 'SIN REF'} ${statusBadge}`;
        }
    },

    /** Render main sections */
    renderContent() {
        const container = document.getElementById('client-detail-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-10">
                <!-- KPI SECTION (Redistribuida a 4 columnas) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${this._renderKPIDash()}
                </div>

                <!-- USUARIOS ASOCIADOS -->
                <section>
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-2">
                             <div class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                             </div>
                             <h2 class="text-xl font-extrabold text-gray-900">Usuarios Asociados</h2>
                        </div>
                        <button class="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-white hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 shadow-sm bg-gray-50/50">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                            Invitar Usuario
                        </button>
                    </div>
                    <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <table class="w-full text-left">
                            <thead class="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th class="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest">Nombre y Email</th>
                                    <th class="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest">Cargo</th>
                                    <th class="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest text-center">Estado</th>
                                    <th class="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest">Último Acceso</th>
                                    <th class="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                ${this.users.length > 0 
                                    ? this.users.map(u => this._renderUserRow(u)).join('') 
                                    : '<tr><td colspan="5" class="py-10 text-center text-gray-400 italic">No hay usuarios vinculados</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- PROYECTOS VINCULADOS -->
                <section>
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-2">
                             <div class="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                             </div>
                             <h2 class="text-xl font-extrabold text-gray-900">Proyectos Vinculados</h2>
                        </div>
                        <a href="/steelinox/projects" class="text-orange-500 text-xs font-bold hover:underline flex items-center gap-1">
                            Ver Todos
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        </a>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${this.projects.length > 0 
                            ? this.projects.map(p => this._renderProjectCard(p)).join('') 
                            : '<div class="col-span-full py-10 bg-white border border-dashed border-gray-200 rounded-2xl text-center text-gray-400 italic">No hay proyectos para este cliente</div>'}
                        
                        <!-- Botón Nuevo Proyecto -->
                        <div class="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 group cursor-pointer hover:border-orange-300 transition-all hover:bg-orange-50/30">
                            <div class="w-12 h-12 bg-white rounded-full border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 group-hover:text-orange-500 group-hover:scale-110 transition-transform">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
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
                    <div class="flex items-center gap-2 mb-6">
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
                                time: '15 de Mayo, 2024 • 10:24 AM',
                                note: 'Se han actualizado los datos de contacto y la dirección fiscal tras el traslado de oficinas.'
                            })}
                            ${this._renderTimelineItem({
                                type: 'info',
                                author: 'Sistema',
                                action: 'Nuevo proyecto asignado: PRJ-2024-018',
                                time: '01 de Marzo, 2024 • 09:00 AM',
                                note: null
                            })}
                        </div>
                        <div class="mt-8 pt-6 border-t border-gray-50 text-center">
                            <button class="text-xs font-bold text-orange-500 hover:text-orange-600 uppercase tracking-widest">Ver historial completo de auditoría</button>
                        </div>
                    </div>
                </section>
            </div>
        `;
    },

    /** Section: KPI Cards (4 columns) */
    _renderKPIDash() {
        const s = this.stats;
        return `
            <!-- Proyectos Totales -->
            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-5">
                <div class="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Proyectos Totales</span>
                    <p class="text-2xl font-black text-gray-900">${s.total_projects || 0}</p>
                </div>
            </div>

            <!-- Usuarios con Acceso -->
            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-5">
                <div class="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Usuarios con Acceso</span>
                    <p class="text-2xl font-black text-gray-900">${s.total_users || 0}</p>
                </div>
            </div>

            <!-- Proyectos Activos -->
            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-5">
                <div class="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Proyectos Activos</span>
                    <p class="text-2xl font-black text-gray-900">${s.active_projects || 0}</p>
                </div>
            </div>

            <!-- Facturación Anual -->
            <div class="bg-[#fcfaff] border border-[#f3ebff] rounded-2xl p-6 shadow-sm flex items-center gap-5">
                <div class="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-[#8a5cf5] uppercase tracking-widest leading-none mb-1">Facturación Total</span>
                    <p class="text-2xl font-black text-gray-900">${SIApp.formatCurrency(s.total_billing || 0)}</p>
                </div>
            </div>
        `;
    },

    /** Row: Individual User row in the table */
    _renderUserRow(u) {
        const initials = SIApp._getInitials(u.name);
        const lastAccess = u.last_login_at ? SIApp.formatDate(u.last_login_at) : 'Sin acceso';
        
        return `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-[10px] font-black border border-white shadow-sm">${initials}</div>
                        <div>
                            <p class="text-sm font-bold text-gray-900 leading-tight">${u.name}</p>
                            <p class="text-xs text-gray-400">${u.email}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <p class="text-xs font-semibold text-gray-600 italic">Director de Proyecto</p>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 ${u.is_active ? 'bg-emerald-100/60 text-emerald-700' : 'bg-red-100/60 text-red-700'} text-[10px] font-black rounded-lg uppercase tracking-widest">
                        ${u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <p class="text-xs font-bold text-gray-500">${lastAccess}</p>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button class="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                        <button class="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
                        <button class="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></button>
                    </div>
                </td>
            </tr>
        `;
    },

    /** Card: Individual Project card */
    _renderProjectCard(p) {
        const labels = { propuesta: 'Propuesta', aprobado: 'Aprobado', ejecucion: 'En Ejecución', cerrado: 'Finalizado' };
        const statusColors = { 
            propuesta: 'bg-amber-100 text-amber-600', 
            aprobado: 'bg-blue-100 text-blue-600', 
            ejecucion: 'bg-orange-100 text-orange-600', 
            cerrado: 'bg-emerald-100 text-emerald-600' 
        };

        return `
            <a data-route="project-detail" href="/steelinox/project/${p.id}" class="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow group cursor-pointer block">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-[10px] font-bold text-gray-400 tracking-wide uppercase bg-gray-50 px-2 py-1 rounded">REF: ${SIApp.escapeHtml(p.reference)}</span>
                    <button class="text-gray-300 hover:text-gray-600">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                    </button>
                </div>
                
                <h4 class="text-lg font-black text-gray-900 leading-snug mb-4 group-hover:text-orange-500 transition-colors">${p.name}</h4>
                
                <div class="space-y-3 pb-4 mb-4 border-b border-gray-50">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black text-gray-300 uppercase tracking-widest">Estado:</span>
                        <span class="text-xs font-black uppercase tracking-tight ${statusColors[p.status] || 'text-gray-400'}">${labels[p.status] || p.status}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black text-gray-300 uppercase tracking-widest">Comercial:</span>
                        <span class="text-xs font-bold text-gray-700">${p.creator_name || 'Ana García'}</span>
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-gray-400 uppercase">Iniciado: ${SIApp.formatDate(p.created_at)}</span>
                    <span class="text-xs font-black text-orange-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                        Detalles
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </span>
                </div>
            </a>
        `;
    },

    /** Item: Timeline history item */
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
    }
};

// Global export
window.ClientDetailAdmin = SIModules.clientDetailAdmin;
