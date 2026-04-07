/**
 * Steel Inox Extranet — Project Detail View (Admin/Commercial)
 * Maneja la lógica de la página individual del proyecto para el equipo interno.
 */

window.SIModules = window.SIModules || {};

SIModules.projectDetailAdmin = {
    projectId: null,
    project: null,
    userContext: null,
    assignedUsers: [],
    documents: [],
    activeTab: 'resumen',

    async loadProjectDetailSPA() {
        const pathParts = window.location.pathname.split('/');
        const projectId = pathParts[pathParts.length - 1];

        if (!projectId || isNaN(projectId)) {
            SIRouter.show404();
            return;
        }

        const user = Auth.getUser();

        // Generar layout inicial
        const container = document.getElementById('main-content');
        container.innerHTML = `
            <!-- Breadcrumb -->
            <nav class="flex text-sm text-gray-500 mb-6 gap-2" aria-label="Breadcrumb">
                <a data-route="dashboard" href="/steelinox/panel" class="hover:text-orange-500 transition-colors">Proyectos</a>
                <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span id="breadcrumb-project-name" class="text-gray-900 font-medium font-bold">Cargando proyecto...</span>
            </nav>

            <!-- Título, Referencia y Status en un solo bloque -->
            <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 id="admin-prj-title" class="text-2xl md:text-3xl font-extrabold text-[#1a1b25] tracking-tight">Cargando...</h1>
                        <div class="flex items-center gap-2">
                            <span id="admin-prj-ref" class="px-2.5 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">REF</span>
                            <span id="admin-prj-status-badge"></span>
                        </div>
                    </div>
                    <p class="text-gray-400 text-sm">Gestión y seguimiento detallado de la obra actual.</p>
                </div>
                <div class="shrink-0 flex items-center">
                    <button onclick="SIModules.projectDetailAdmin.openEditProjectModal()" class="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 shadow-sm group">
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        Editar Proyecto
                    </button>
                </div>
            </div>

            <!-- TABS -->
            <div class="border-b border-gray-200 mb-8 overflow-x-auto hide-scrollbar">
                <nav class="flex gap-8" aria-label="Tabs">
                    <button onclick="SIModules.projectDetailAdmin.switchTab('resumen', this)" class="tab-btn active border-orange-500 text-orange-600 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Resumen</button>
                    <button onclick="SIModules.projectDetailAdmin.switchTab('documentos', this)" class="tab-btn border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Documentos</button>
                    <button onclick="SIModules.projectDetailAdmin.switchTab('comentarios', this)" class="tab-btn border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Comentarios</button>
                    <button onclick="SIModules.projectDetailAdmin.switchTab('historial', this)" class="tab-btn border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Histórico</button>
                </nav>
            </div>

            <!-- TAB CONTENT CONTAINER -->
            <div id="tab-content" class="fade-in min-h-[400px]">
                <div class="flex items-center justify-center py-20">
                    <div class="si-spinner"></div>
                </div>
            </div>

            <!-- MODAL ASIGNAR COMERCIAL -->
            <div id="assign-commercial-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl transform scale-95 transition-transform flex flex-col max-h-[90vh]">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="text-xl font-extrabold text-gray-900">Asignar Comercial</h3>
                        <button onclick="SIModules.projectDetailAdmin.closeAssignCommercialModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto" id="commercial-list-container">
                        <!-- Se llena vía JS -->
                    </div>
                </div>
            </div>

            <!-- INPUT OCULTO PARA SUBIR ARCHIVOS (Global para el módulo) -->
            <input type="file" id="si-doc-upload-raw" class="hidden" onchange="SIModules.projectDetailAdmin.handleFileUpload(event)">
        `;

        await this.init(projectId, user);
    },

    async init(projectId, user) {
        this.projectId = projectId;
        this.userContext = user;

        if (!this.projectId) {
            window.location.href = '/steelinox/panel';
            return;
        }

        await this.loadProjectData();
    },

    /** Cargar datos de la API */
    async loadProjectData() {
        try {
            const response = await API.get('/projects/' + this.projectId);

            if (!response.success || !response.data) {
                throw new Error(response.message || 'Error al cargar el proyecto.');
            }

            // Securización vía DTO (Reutilizamos lógica si está disponible o la extendemos aquí)
            this.project = response.data;

            await this.loadAssignedUsers();

            // Actualizar Cabecera
            this.renderHeader();

            // Renderizar la pestaña activa inicial (Resumen)
            this.renderTabContent();

        } catch (error) {
            console.error('[ProjectAdminDetail] Error:', error);
            document.getElementById('tab-content').innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center">
                    <p class="text-red-500 font-bold mb-2">No se pudo cargar la información</p>
                    <p class="text-xs text-gray-500">${error.message}</p>
                    <button onclick="location.reload()" class="mt-4 text-orange-500 font-bold text-sm">Reintentar</button>
                </div>
            `;
        }
    },

    /** Cambiar entre pestañas */
    switchTab(tabId, btn) {
        document.querySelectorAll('.tab-btn').forEach(t => {
            t.classList.remove('active', 'border-orange-500', 'text-orange-600');
            t.classList.add('border-transparent', 'text-gray-400');
        });

        btn.classList.add('active', 'border-orange-500', 'text-orange-600');
        btn.classList.remove('border-transparent', 'text-gray-400');

        this.activeTab = tabId;
        this.renderTabContent();
    },

    /** Renderizar la cabecera (Título, Ref, Status) */
    renderHeader() {
        const titleEl = document.getElementById('admin-prj-title');
        const refEl = document.getElementById('admin-prj-ref');
        const badgeEl = document.getElementById('admin-prj-status-badge');
        const breadcrumbEl = document.getElementById('breadcrumb-project-name');

        if (titleEl) titleEl.textContent = this.project.name;
        if (breadcrumbEl) breadcrumbEl.textContent = this.project.name;
        if (refEl) refEl.textContent = this.project.reference || 'SIN REF';

        if (badgeEl) {
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
            const label = labels[this.project.status] || this.project.status;
            const style = styles[this.project.status] || 'bg-gray-100 text-gray-600 border-gray-200';

            badgeEl.className = `inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${style}`;
            badgeEl.textContent = label;
        }
    },

    /** Disparar el renderizado según pestaña activa */
    renderTabContent() {
        const container = document.getElementById('tab-content');
        if (!container) return;

        switch (this.activeTab) {
            case 'resumen': container.innerHTML = this._renderResumen(); break;
            case 'documentos': container.innerHTML = this._renderDocumentos(); break;
            case 'comentarios': container.innerHTML = this._renderComentarios(); break;
            case 'historial': container.innerHTML = this._renderHistorial(); break;
            default: container.innerHTML = '<p class="text-center py-20 text-gray-400">Próximamente...</p>';
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // RENDERIZERS (Real + Mocks)
    // ────────────────────────────────────────────────────────────────────────

    /** PESTAÑA: RESUMEN (Datos reales + Mocks UI) */
    _renderResumen() {
        const p = this.project;
        return `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Columna Principal (8/12) -->
                <div class="lg:col-span-8 space-y-6">
                    <!-- KPI Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 bg-[#fff9eb] text-[#cb8e24] rounded-xl flex items-center justify-center">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Presupuesto Total</span>
                                    <p class="text-lg font-extrabold text-[#1a1b25]">${SIApp.formatCurrency(p.budget_amount)}</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 bg-[#f0efff] text-[#6e56cf] rounded-xl flex items-center justify-center">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Superficie Obra</span>
                                    <p class="text-lg font-extrabold text-[#1a1b25]">${p.surface || '—'} m²</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Proyecto & Info -->
                    <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pr-12">
                             <div>
                                <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tipo de Proyecto</span>
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center border border-orange-100/50">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                    </div>
                                    <p class="font-bold text-[#1a1b25]">${p.project_type || 'General'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Descripción -->
                        <div class="mb-8">
                            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
                                Descripción
                            </h4>
                            <div class="relative pl-4">
                                <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-orange-200 rounded-full"></div>
                                <p class="text-sm text-gray-600 leading-loose font-medium">
                                    ${p.description || '<span class="italic text-gray-400">Sin descripción general definida.</span>'}
                                </p>
                            </div>
                        </div>

                        <!-- Comerciales Asignados -->
                        <div class="mt-8 pt-8 border-t border-gray-50">
                            <div class="flex items-center justify-between mb-4">
                                <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comerciales Asignados</span>
                                <button onclick="SIModules.projectDetailAdmin.openAssignCommercialModal()" class="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-white hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 shadow-sm bg-gray-50/50">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                    Asignar
                                </button>
                            </div>
                            <div id="assigned-commercials-container">
                                ${this._renderAssignedCommercials()}
                            </div>
                        </div>
                    </div>


                </div>

                <!-- Barra Lateral Derecha (Sidebar Extra) (4/12) -->
                <div class="lg:col-span-4 space-y-6">
                    <!-- Fechas y Ciclo de Vida -->
                    <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-bl-full -z-10"></div>
                        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            Ciclo de Vida
                        </h4>
                        <div class="space-y-4 relative before:absolute before:inset-0 before:left-[11px] before:w-[2px] before:bg-gray-100 before:-z-10 ml-1">
                            
                            <!-- Creación -->
                            <div class="flex items-start gap-4">
                                <div class="w-6 h-6 rounded-full border-4 border-white bg-blue-500 flex-shrink-0 mt-0.5"></div>
                                <div>
                                    <p class="text-xs font-black text-gray-900 uppercase tracking-wide">Creado el</p>
                                    <p class="text-[11px] text-gray-500 mt-0.5 font-medium">${SIApp.formatDate(p.created_at)}</p>
                                </div>
                            </div>

                            <!-- Modificación -->
                            <div class="flex items-start gap-4">
                                <div class="w-6 h-6 rounded-full border-4 border-white bg-amber-500 flex-shrink-0 mt-0.5"></div>
                                <div>
                                    <p class="text-xs font-black text-gray-900 uppercase tracking-wide">Última Modificación</p>
                                    <p class="text-[11px] text-gray-500 mt-0.5 font-medium">${p.updated_at ? SIApp.formatDate(p.updated_at) : 'Sin cambios'}</p>
                                </div>
                            </div>
                            
                            <!-- Aprobación -->
                            <div class="flex items-start gap-4">
                                <div class="w-6 h-6 rounded-full border-4 border-white ${p.approved_at ? 'bg-emerald-500' : 'bg-gray-200'} flex-shrink-0 mt-0.5"></div>
                                <div>
                                    <p class="text-xs font-black ${p.approved_at ? 'text-gray-900' : 'text-gray-400'} uppercase tracking-wide">Aprobado</p>
                                    <p class="text-[11px] text-gray-400 mt-0.5 font-medium italic">${p.approved_at ? SIApp.formatDate(p.approved_at) : 'Pendiente'}</p>
                                </div>
                            </div>

                            <!-- Cierre -->
                            <div class="flex items-start gap-4">
                                <div class="w-6 h-6 rounded-full border-4 border-white ${p.closed_at ? 'bg-purple-500' : 'bg-gray-200'} flex-shrink-0 mt-0.5"></div>
                                <div>
                                    <p class="text-xs font-black ${p.closed_at ? 'text-gray-900' : 'text-gray-400'} uppercase tracking-wide">Cerrado</p>
                                    <p class="text-[11px] text-gray-400 mt-0.5 font-medium italic">${p.closed_at ? SIApp.formatDate(p.closed_at) : 'No Finalizado'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Botones de Acción -->
<div class="space-y-3">
    <button onclick="SIModules.projectDetailAdmin.openChangeStatusModal()" class="w-full bg-white border border-gray-100 hover:border-orange-500 hover:text-orange-600 text-gray-700 rounded-2xl py-3.5 px-4 text-sm font-bold transition-all shadow-sm flex items-center justify-between group">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg class="w-4 h-4 transition-transform duration-500 group-hover:rotate-[360deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
            </div>
            <span>Cambiar Estado</span>
        </div>
        <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
    </button>

    <button onclick="SIModules.projectDetailAdmin.triggerFileUpload()" class="w-full bg-[#1a1b25] hover:bg-gray-800 text-white rounded-2xl py-3.5 px-4 text-sm font-bold transition-all shadow-md flex items-center justify-between group">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg id="sidebar-upload-icon" class="w-4 h-4 transition-transform duration-300 group-hover:translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                <div id="sidebar-upload-spinner" class="si-spinner w-4 h-4 border-white/30 border-t-white hidden"></div>
            </div>
            <span>Subir Archivo</span>
        </div>
        <svg class="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
    </button>
</div>
                </div>
            </div>

            <!-- MODAL: EDITAR PROYECTO -->
            <div id="edit-project-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-xl shadow-2xl transform scale-95 transition-transform flex flex-col max-h-[90vh]">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <h3 class="text-xl font-extrabold text-gray-900">Editar Proyecto</h3>
                        <button onclick="SIModules.projectDetailAdmin.closeEditProjectModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto">
                        <form id="edit-project-form" onsubmit="event.preventDefault(); SIModules.projectDetailAdmin.saveProjectEdits();" class="space-y-4">
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nombre <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-project-name" name="name" value="${p.name || ''}" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Referencia <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-project-ref" name="reference" value="${p.reference || ''}" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Presupuesto (€)</label>
                                    <input type="number" step="50" id="edit-project-budget" name="budget_amount" value="${p.budget_amount || ''}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Superficie Obra (m²)</label>
                                    <input type="number" step="1" id="edit-project-surface" name="surface" value="${p.surface || ''}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Tipo de Proyecto</label>
                                <input type="text" id="edit-project-type" name="project_type" value="${p.project_type || ''}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Descripción corta</label>
                                <textarea id="edit-project-desc" name="description" rows="3" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">${p.description || ''}</textarea>
                            </div>

                        </form>
                    </div>
                    <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl sm:rounded-b-[2rem] flex justify-end gap-3 shrink-0">
                         <button onclick="SIModules.projectDetailAdmin.closeEditProjectModal()" type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancelar</button>
                         <button onclick="SIModules.projectDetailAdmin.saveProjectEdits()" type="button" class="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 border border-transparent rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-2">
                             <svg class="w-4 h-4 hidden" id="edit-project-save-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                             Guardar Cambios
                         </button>
                    </div>
                </div>
            </div>

            <!-- MODAL: CAMBIAR ESTADO -->
            <div id="change-status-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-md shadow-2xl transform scale-95 transition-transform flex flex-col">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="text-lg font-extrabold text-gray-900">Cambiar Estado</h3>
                        <button onclick="SIModules.projectDetailAdmin.closeChangeStatusModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6">
                        <form id="change-status-form" onsubmit="event.preventDefault(); SIModules.projectDetailAdmin.saveProjectStatus();" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nuevo Estado <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <input type="hidden" id="change-status-select" name="status" value="${p.status}">
                                    <button type="button" onclick="SIModules.projectDetailAdmin.toggleDropdown('status-dropdown-menu')" class="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm flex justify-between items-center shadow-sm">
                                        <div class="flex items-center gap-2">
                                           <span id="change-status-circle" class="w-2 h-2 rounded-full ${p.status === 'propuesta' ? 'bg-amber-400' : (p.status === 'aprobado' ? 'bg-blue-400' : (p.status === 'ejecucion' ? 'bg-orange-400' : 'bg-emerald-400'))}"></span>
                                           <span id="change-status-display" class="capitalize">${p.status}</span>
                                        </div>
                                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                                    </button>
                                    
                                    <ul id="status-dropdown-menu" class="si-custom-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl shadow-orange-500/10 hidden max-h-60 overflow-y-auto py-1.5 text-sm font-medium">
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('propuesta', 'Propuesta', 'bg-amber-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'propuesta' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-amber-400"></span> Propuesta
                                            ${p.status === 'propuesta' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('aprobado', 'Aprobado', 'bg-blue-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'aprobado' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-blue-400"></span> Aprobado
                                            ${p.status === 'aprobado' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('ejecucion', 'Ejecución', 'bg-orange-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'ejecucion' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-orange-400"></span> Ejecución
                                            ${p.status === 'ejecucion' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('cerrado', 'Cerrado', 'bg-emerald-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'cerrado' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Cerrado
                                            ${p.status === 'cerrado' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Motivo / Notas</label>
                                <textarea id="change-status-reason" name="reason" rows="2" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Añade un motivo"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl sm:rounded-b-[2rem] flex justify-end gap-3 rounded-b-xl">
                         <button onclick="SIModules.projectDetailAdmin.closeChangeStatusModal()" type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancelar</button>
                         <button onclick="SIModules.projectDetailAdmin.saveProjectStatus()" type="button" class="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 border border-transparent rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 focus:outline-none flex items-center gap-2">
                             <svg class="w-4 h-4 hidden" id="change-status-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                             Actualizar
                         </button>
                    </div>
                </div>
            </div>
        `;
    },

    /** PESTAÑA: DOCUMENTOS (Mock) */
    _renderDocumentos() {
        // Disparar la carga real si no tenemos datos o queremos refrescar
        setTimeout(() => this.loadProjectDocuments(), 50);

        return `
            <div class="space-y-6">
                <!-- Buscador -->
                <div class="relative">
                    <svg class="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input id="doc-search-input" type="text" placeholder="Buscar documentos por nombre o tipo..." oninput="SIModules.projectDetailAdmin._filterDocs(this.value)" class="w-full bg-white border border-gray-100 text-base rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-[#E57B23]/20 focus:border-[#E57B23] focus:outline-none shadow-sm text-gray-700 font-medium">
                </div>

                <!-- Botón Principal -->
                <button onclick="SIModules.projectDetailAdmin.triggerFileUpload()" class="w-full bg-[#E57B23] hover:bg-[#c9661c] text-white rounded-2xl py-4 text-sm font-black shadow-lg shadow-[#E57B23]/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest group">
                    <svg id="tab-upload-icon" class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                    <div id="tab-upload-spinner" class="si-spinner w-5 h-5 border-white/30 border-t-white hidden"></div>
                    <span id="tab-upload-text">Subir Nuevo Documento</span>
                </button>

                <!-- Header de Lista -->
                <div class="flex items-center justify-between pt-2">
                    <h3 class="text-lg font-black text-[#1a1b25] uppercase tracking-wide">Expediente del Proyecto</h3>
<div id="doc-counter" class="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">0 ARCHIVOS</div>
                </div>

                <!-- Lista de Archivos Dynamic -->
                <div class="space-y-3 pb-6 min-h-[200px]" id="doc-cards-container">
                    <div class="flex flex-col items-center justify-center py-20 text-gray-300">
                        <div class="si-spinner mb-4"></div>
                        <p class="text-sm font-bold uppercase tracking-widest">Sincronizando archivo...</p>
                    </div>
                </div>
            </div>
        `;
    },

    _mockDocCard(title, type, meta, avatar) {
    },

    /** PESTAÑA: COMENTARIOS/CHAT */
    _renderComentarios() {
        return `
            <div class="flex flex-col bg-transparent -mx-4 sm:mx-0 relative">
                <!-- Chat Area -->
                <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 pb-10">
                    <!-- Date badge -->
                    <div class="text-center mb-4">
                        <span class="inline-block px-4 py-1.5 bg-[#f8f9fa] text-gray-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-gray-100">Hoy • 24 Octubre</span>
                    </div>

                    <!-- Message Other -->
                    <div class="flex gap-4">
                        <img src="https://i.pravatar.cc/100?u=ElenaValdes" class="w-11 h-11 rounded-full object-cover shrink-0 shadow-sm border-2 border-white" alt="Elena">
                        <div class="flex-1 max-w-[85%]">
                            <div class="flex items-center gap-2 mb-2 px-1">
                                <span class="text-sm font-black text-[#1a1b25]">Elena Valdés</span>
                                <span class="text-[11px] text-gray-300 font-bold">09:12 AM</span>
                            </div>
                            <!-- Bubble content -->
                            <div class="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm p-5 text-[15px] text-gray-700 leading-relaxed font-medium mb-3">
                                Buenos días equipo. He subido los nuevos planos de la Fase 2. ¿Podéis revisarlos antes de la reunión de las 11:00?
                            </div>
                            
                            <!-- Attached file card -->
                            <div class="bg-[#f0f9ff] border border-[#bae6fd] shadow-sm rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-[#e0f2fe] transition-colors w-full max-w-[320px]">
                                <div class="w-12 h-12 bg-white text-[#0284c7] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-xs font-black text-[#0369a1] uppercase tracking-wider truncate">PLANO_ESTRUCTURAL_F2.pdf</p>
                                    <p class="text-[10px] text-[#0ea5e9] font-black uppercase tracking-tighter">4.2 MB • DOCUMENTO PDF</p>
                                </div>
                                <svg class="w-5 h-5 text-[#0ea5e9] ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            </div>
                        </div>
                    </div>

                    <!-- Message Me -->
                    <div class="flex gap-4 flex-row-reverse mt-4">
                        <img src="https://i.pravatar.cc/100?u=Tu" class="w-11 h-11 rounded-full object-cover shrink-0 shadow-sm border-2 border-white" alt="Tu">
                        <div class="flex-1 max-w-[85%] flex flex-col items-end">
                            <div class="flex items-center gap-2 mb-2 px-1 flex-row-reverse">
                                <span class="text-sm font-black text-[#1a1b25]">Tú (Admin)</span>
                                <span class="text-[11px] text-gray-300 font-bold">09:15 AM</span>
                            </div>
                            <div class="bg-[#E57B23] shadow-md shadow-orange-500/10 rounded-2xl rounded-tr-sm p-5 text-[15px] text-white leading-relaxed font-bold">
                                Recibido, Elena. Los reviso ahora mismo. ¿Hay algún cambio crítico en la sección de vigas de acero?
                            </div>
                            <div class="flex items-center gap-1 mt-2 text-[10px] font-black text-[#E57B23] tracking-widest uppercase">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                LEÍDO
                            </div>
                        </div>
                    </div>

                    <!-- Message Other -->
                    <div class="flex gap-4 mt-4">
                         <img src="https://i.pravatar.cc/100?u=ElenaValdes" class="w-11 h-11 rounded-full object-cover shrink-0 shadow-sm border-2 border-white" alt="Elena">
                         <div class="flex-1 max-w-[85%]">
                             <div class="flex items-center gap-2 mb-2 px-1">
                                 <span class="text-sm font-black text-[#1a1b25]">Elena Valdés</span>
                                 <span class="text-[11px] text-gray-300 font-bold">09:18 AM</span>
                             </div>
                             <div class="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm p-5 text-[15px] text-gray-700 leading-relaxed font-medium">
                                 Sí, se ha ajustado el espesor del refuerzo en el nodo C-4 para cumplir con la nueva normativa industrial de resistencia.
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        `;
    },

    /** PESTAÑA: HISTORIAL (Mock) */
    _renderHistorial() {
        return `
            <div class="space-y-6 pb-6">
                <!-- Header -->
                <div class="pt-2 px-1">
                     <h3 class="text-[11px] font-black text-[#E57B23] uppercase tracking-[0.2em] mb-2">INDUSTRIAL STEEL CO.</h3>
                     <h1 class="text-3xl font-black text-[#1a1b25] tracking-tight">Historial de Actividad</h1>
                     <p class="text-sm text-gray-400 mt-2 font-medium">Cronología completa de eventos en el Proyecto Nave A24</p>
                </div>

                <!-- Timeline Container -->
                <div class="relative pl-8 space-y-10 mt-10">
                    <!-- Linea vertical -->
                    <div class="absolute top-0 bottom-0 left-[43px] w-0.5 bg-gray-100"></div>

                    ${this._mockHistoryNode('status', 'Carlos Ruiz', 'Hoy, 10:45 AM', 'CAMBIO DE ESTADO', 'Fase de Montaje: Iniciada', 'Se ha verificado la recepción de las vigas maestras y se procede al izaje según el plan de seguridad.')}
                    ${this._mockHistoryNode('document', 'Elena Soler', 'Ayer, 04:20 PM', 'NUEVO DOCUMENTO', 'Planos_Detalle_V5.pdf', 'Archivo PDF (12.4 MB)<br><span class="text-[11px] font-black text-blue-400 uppercase tracking-tighter">OFICINA TÉCNICA</span>', true)}
                    ${this._mockHistoryNode('chat', 'Marcos Peña', '22 Oct, 09:15 AM', 'COMENTARIO INTERNO', '', '"Confirmada la revisión estructural del nodo B-12. Podemos proceder con el torqueado final de pernos grado 8."')}
                    ${this._mockHistoryNode('edit', 'Ana Martínez', '21 Oct, 02:30 PM', 'EDICIÓN DE DATOS', 'Ajuste de Cronograma', 'El hito de cimentación se ha desplazado debido a condiciones climáticas.<br><strong class="text-orange-500">Nueva fecha: 28/10/2023</strong>')}
                </div>
            </div>
        `;
    },

    _mockHistoryNode(type, user, time, actionTitle, title, content, isAttachment = false) {
        const icons = {
            'status': { color: 'bg-[#E57B23]', icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>' },
            'document': { color: 'bg-[#0284c7]', icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            'chat': { color: 'bg-gray-100', icon: '<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/></svg>' },
            'edit': { color: 'bg-amber-100', icon: '<svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>' }
        };
        const node = icons[type] || icons.edit;

        let contentHtml = '';
        if (isAttachment) {
            contentHtml = `
                <div class="mt-4 p-4 bg-[#f8faff] border border-[#e0e7ff] rounded-2xl flex items-center gap-4">
                    <div class="w-12 h-12 bg-white border border-[#c7d2fe] rounded-xl shadow-sm flex items-center justify-center text-[#4338ca]">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/></svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-black text-[#1e1b4b] leading-tight mb-1 truncate">${content.split('<br>')[0]}</p>
                        ${content.split('<br>')[1] || ''}
                    </div>
                    <button class="text-gray-400 hover:text-gray-900 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
                </div>
            `;
        } else if (type === 'chat') {
            contentHtml = `
                <div class="mt-4 text-[15px] text-gray-500 font-medium italic relative pl-4 border-l-3 border-[#E57B23]/30 leading-relaxed bg-[#fff9f4] py-3 rounded-r-xl">
                    ${content}
                </div>
            `;
        } else {
            contentHtml = `
                <p class="text-[15px] text-gray-600 mt-3 leading-relaxed font-medium">${content}</p>
                ${type === 'status' ? '<div class="mt-4"><span class="inline-flex items-center text-[10px] font-black text-white bg-[#E57B23] px-3 py-1 rounded-lg uppercase tracking-widest cursor-pointer hover:bg-[#c9661c]">Ver Detalles</span></div>' : ''}
            `;
        }

        return `
            <div class="relative pl-6 z-10">
                <!-- Node Icon -->
                <div class="absolute left-[-11px] top-6 w-12 h-12 ${node.color} rounded-full border-4 border-white flex items-center justify-center shadow-md z-20">
                    ${node.icon}
                </div>
                
                <!-- Card -->
                <div class="bg-white border text-left border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <img src="https://i.pravatar.cc/100?u=${user.replace(' ', '')}" alt="avatar" class="w-8 h-8 rounded-full border border-gray-200">
                            <span class="text-[15px] font-black text-[#1a1b25]">${user}</span>
                        </div>
                        <span class="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black rounded-full uppercase tracking-tighter border border-gray-100">${time}</span>
                    </div>
                    
                    <h5 class="text-[11px] font-black text-orange-400 tracking-[0.15em] uppercase mb-1.5">${actionTitle}</h5>
                    ${title ? `<h4 class="text-[17px] font-black text-[#1a1b25] leading-tight">${title}</h4>` : ''}
                    
                    ${contentHtml}
                </div>
            </div>
        `;
    },

    /** Filtrar filas de documentos en tiempo real (ahora por tarjetas) */
    _filterDocs(query) {
        const q = query.toLowerCase().trim();
        document.querySelectorAll('.doc-row').forEach(card => {
            const title = card.dataset.title || '';
            card.style.display = (!q || title.includes(q)) ? 'flex' : 'none';
        });
    },

    // ────────────────────────────────────────────────────────────────────────
    // DOCUMENTOS: LÓGICA DE NEGOCIO REAL
    // ────────────────────────────────────────────────────────────────────────

    /** Cargar documentos desde la API */
    async loadProjectDocuments() {
        const container = document.getElementById('doc-cards-container');
        if (!container) return;

        try {
            const res = await API.get('/projects/' + this.projectId + '/documents');
            if (res.success && res.data) {
                this.documents = res.data;
                this.renderDocumentList();
            } else {
                container.innerHTML = '<p class="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Error al sincronizar expedientes.</p>';
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="text-center py-10 text-red-500 font-bold uppercase tracking-widest text-[10px]">Error de conexión con el servidor.</p>';
        }
    },

    /** Renderizar la lista de documentos obtenida */
    renderDocumentList() {
        const container = document.getElementById('doc-cards-container');
        const counter = document.getElementById('doc-counter');
        if (!container) return;

        if (counter) counter.textContent = `${this.documents.length} ARCHIVOS`;

        if (this.documents.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center fade-in">
                    <div class="w-20 h-20 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <p class="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Expediente Vacío</p>
                    <p class="text-[11px] text-gray-400 mt-2 font-medium">Aún no se han subido documentos técnicos a este proyecto.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.documents.map(doc => {
            const icon = this.getFileIcon(doc.mime_type);
            const size = this.formatFileSize(doc.file_size);
            const date = SIApp.formatDate(doc.uploaded_at);
            const initials = SIApp._getInitials(doc.uploaded_by_name || '??');

            return `
                <div class="doc-row flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100 group fade-in" 
                     data-title="${doc.title.toLowerCase()} ${doc.file_name.toLowerCase()}">
                    <div class="flex items-center gap-4 min-w-0">
                        <div class="w-[52px] h-[52px] ${icon.bg} ${icon.text} rounded-[14px] flex items-center justify-center shrink-0 shadow-sm border border-transparent group-hover:border-current/10 transition-all">
                            ${icon.svg}
                        </div>
                        <div class="min-w-0">
                            <p class="text-[15.5px] font-extrabold text-[#1a1b25] leading-tight mb-1 truncate group-hover:text-orange-600 transition-colors">${SIApp.escapeHtml(doc.title)}</p>
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded ${icon.badgeBg} ${icon.badgeText} text-[10px] font-black tracking-widest uppercase">${icon.label}</span>
                                <span class="text-[11px] text-gray-400 font-bold uppercase tracking-tighter opacity-80">${size} • ${date}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col items-center justify-between gap-2 shrink-0 pl-3">
                        <div class="w-8 h-8 bg-gray-50 text-gray-400 border border-gray-100 rounded-full flex items-center justify-center text-[9px] font-black uppercase tracking-widest shadow-inner cursor-help" title="Subido por ${doc.uploaded_by_name}">
                            ${initials}
                        </div>
                        <a href="/steelinox/api/projects/${this.projectId}/documents/${doc.id}/download" 
                           target="_blank"
                           class="p-2 text-gray-300 hover:text-orange-500 transition-colors transform hover:scale-110 active:scale-95" 
                           title="Descargar Archivo Oficial">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    },

    /** Disparar el selector nativo del sistema */
    triggerFileUpload() {
        const input = document.getElementById('si-doc-upload-raw');
        if (input) input.click();
    },

    /** Manejar la subida física del archivo vía AJAX/FormData */
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Visual Feedback: Activar Spinners y estados de carga
        const sidebarIcon = document.getElementById('sidebar-upload-icon');
        const sidebarSpinner = document.getElementById('sidebar-upload-spinner');
        const tabIcon = document.getElementById('tab-upload-icon');
        const tabSpinner = document.getElementById('tab-upload-spinner');
        const tabText = document.getElementById('tab-upload-text');

        const setLoading = (loading) => {
            if (sidebarIcon) sidebarIcon.classList.toggle('hidden', loading);
            if (sidebarSpinner) sidebarSpinner.classList.toggle('hidden', !loading);
            if (tabIcon) tabIcon.classList.toggle('hidden', loading);
            if (tabSpinner) tabSpinner.classList.toggle('hidden', !loading);
            if (tabText) tabText.textContent = loading ? 'Subiendo archivo...' : 'Subir Nuevo Documento';
        };

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', file.name.split('.').slice(0, -1).join('.'));

            const res = await API.post('/projects/' + this.projectId + '/documents', formData);

            if (res.success) {
                if (window.SIApp) SIApp.showToast('¡Éxito!', 'Documento añadido al expediente correctamente.', 'success');
                // Si estamos en la pestaña documentos, recargar la lista
                if (this.activeTab === 'documentos') {
                    await this.loadProjectDocuments();
                }
            } else {
                if (window.SIApp) SIApp.showToast('Error', res.message || 'El servidor rechazó el archivo.', 'error');
            }
        } catch (e) {
            console.error(e);
            if (window.SIApp) SIApp.showToast('Error de red', 'No se pudo contactar con el servidor de archivos.', 'error');
        } finally {
            setLoading(false);
            event.target.value = ''; // Limpiar para permitir re-subida del mismo
        }
    },

    /** Helper: Mapeo de iconos Premium por MIME type */
    getFileIcon(mime) {
        const types = {
            'application/pdf': { label: 'PDF', bg: 'bg-red-50', text: 'text-red-500', badgeBg: 'bg-red-100', badgeText: 'text-red-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9h1m1 0h1m-3 4h3m-3 4h3"/></svg>' },
            'image/jpeg': { label: 'IMG', bg: 'bg-blue-50', text: 'text-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
            'image/png': { label: 'IMG', bg: 'bg-blue-50', text: 'text-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
            'application/msword': { label: 'DOC', bg: 'bg-indigo-50', text: 'text-indigo-500', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOC', bg: 'bg-indigo-50', text: 'text-indigo-500', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            'application/vnd.ms-excel': { label: 'XLS', bg: 'bg-emerald-50', text: 'text-emerald-500', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'XLS', bg: 'bg-emerald-50', text: 'text-emerald-500', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
        };
        const defaultIcon = { label: 'FILE', bg: 'bg-gray-50', text: 'text-gray-500', badgeBg: 'bg-gray-100', badgeText: 'text-gray-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>' };
        return types[mime] || defaultIcon;
    },

    /** Helper: Formatear tamaño de archivo en KB/MB */
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    // ────────────────────────────────────────────────────────────────────────
    // USUARIOS (COMERCIALES) DEL PROYECTO
    // ────────────────────────────────────────────────────────────────────────

    async loadAssignedUsers() {
        try {
            const res = await API.get('/projects/' + this.projectId + '/users');
            if (res.success && res.data) {
                this.assignedUsers = res.data;
            } else {
                this.assignedUsers = [];
            }
        } catch (e) {
            console.error('Error cargando comerciales asignados:', e);
            this.assignedUsers = [];
        }
    },

    _renderAssignedCommercials() {
        if (!this.assignedUsers || this.assignedUsers.length === 0) {
            return `<div class="border border-dashed border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-400 font-medium">Ningún comercial asignado.</div>`;
        }

        let html = '<div class="flex flex-wrap justify-center gap-2">';

        this.assignedUsers.forEach(u => {
            html += `
                <div class="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-orange-200 hover:bg-orange-50/50 transition-colors rounded-full pl-1.5 pr-3 py-1.5 shadow-sm group">
                    <div class="w-6 h-6 bg-white border border-gray-200 text-orange-600 rounded-full flex items-center justify-center text-[9px] font-extrabold pb-[1px] shrink-0">
                        ${SIApp._getInitials(u.name)}
                    </div>
                    <span class="text-[13px] font-bold text-gray-700 group-hover:text-orange-700 whitespace-nowrap">${u.name}</span>
                    <button onclick="SIModules.projectDetailAdmin.removeUser(${u.id})" class="ml-1 text-gray-300 hover:text-red-500 bg-white hover:bg-red-50 rounded-full p-0.5 transition-all shrink-0" title="Eliminar asignación">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            `;
        });

        html += '</div>';

        return html;
    },

    openAssignCommercialModal() {
        const modal = document.getElementById('assign-commercial-modal');
        modal.classList.remove('hidden');
        void modal.offsetWidth; // force reflow
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');

        this.loadAvailableUsers();
    },

    closeAssignCommercialModal() {
        const modal = document.getElementById('assign-commercial-modal');
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    async loadAvailableUsers() {
        const container = document.getElementById('commercial-list-container');
        container.innerHTML = '<div class="flex justify-center p-8"><div class="si-spinner"></div></div>';

        try {
            const res = await API.get('/projects/' + this.projectId + '/available-users');
            if (res.success && res.data && res.data.length > 0) {
                container.innerHTML = res.data.map(u => `
                    <div onclick="SIModules.projectDetailAdmin.assignUser(${u.id})" class="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-colors group cursor-pointer mb-2">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-gray-100 group-hover:bg-orange-500 group-hover:text-white rounded-full flex items-center justify-center text-xs font-bold text-gray-500 transition-colors">
                                ${SIApp._getInitials(u.name)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-900 leading-tight">${u.name}</p>
                                <p class="text-[10px] text-gray-400 font-medium">${u.email}</p>
                            </div>
                        </div>
                        <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-center text-sm text-gray-500 py-6">No hay comerciales disponibles para asignar.</p>';
            }
        } catch (err) {
            console.error(err);
            container.innerHTML = '<p class="text-center text-sm text-red-500 py-6">Error cargando comerciales.</p>';
        }
    },

    async assignUser(userId) {
        try {
            const res = await API.post('/projects/' + this.projectId + '/users/' + userId);
            if (res.success) {
                SIApp.showToast('Éxito', 'Comercial asignado correctamente.', 'success');
                this.closeAssignCommercialModal();
                await this.loadProjectData(); // Recarga usuarios y repinta
            } else {
                SIApp.showToast('Error', res.message || 'No se pudo asignar.', 'error');
            }
        } catch (e) {
            console.error(e);
            SIApp.showToast('Error', 'Error interno al asignar.', 'error');
        }
    },

    async removeUser(userId) {
        if (window.SIApp && SIApp.confirm) {
            const confirmed = await SIApp.confirm('¿Desasignar Comercial?', 'Esto quitará el acceso del comercial a este proyecto.');
            if (!confirmed) return;
        }

        try {
            const res = await API.delete('/projects/' + this.projectId + '/users/' + userId);
            if (res.success) {
                SIApp.showToast('Éxito', 'Comercial desasignado.', 'success');
                await this.loadProjectData();
            } else {
                SIApp.showToast('Error', res.message || 'No se pudo desasignar.', 'error');
            }
        } catch (e) {
            console.error(e);
            SIApp.showToast('Error', 'Error interno.', 'error');
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // MODAL: EDITAR PROYECTO
    // ────────────────────────────────────────────────────────────────────────

    openEditProjectModal() {
        const modal = document.getElementById('edit-project-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    },

    closeEditProjectModal() {
        const modal = document.getElementById('edit-project-modal');
        if (!modal) return;
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    async saveProjectEdits() {
        const form = document.getElementById('edit-project-form');
        const spinner = document.getElementById('edit-project-save-spinner');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const btn = spinner.parentElement;
        const oldText = btn.innerHTML;
        btn.innerHTML = spinner.outerHTML + ' Guardando...';
        btn.querySelector('svg').classList.remove('hidden');
        btn.querySelector('svg').classList.add('animate-spin');
        btn.disabled = true;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Convertir strings vacíos a null para floats/ints
            if (data.budget_amount === '') data.budget_amount = null;
            if (data.surface === '') data.surface = null;

            const res = await API.put('/projects/' + this.projectId, data);

            if (res && res.success) {
                if (window.SIApp) SIApp.showToast('Proyecto actualizado', 'Datos guardados correctamente', 'success');
                this.closeEditProjectModal();
                await this.loadProjectData(); // Refresca la vista
            } else {
                if (window.SIApp) SIApp.showToast('Error al actualizar', res?.message || 'Revisa los campos', 'error');
            }
        } catch (error) {
            console.error(error);
            if (window.SIApp) SIApp.showToast('Error', 'Error al modificar el proyecto', 'error');
        } finally {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // MODAL: CAMBIAR ESTADO
    // ────────────────────────────────────────────────────────────────────────

    openChangeStatusModal() {
        const modal = document.getElementById('change-status-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');

        // Cerrar dropdown por si acaso si se hace clic fuera del popovers
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
        document.getElementById('change-status-select').value = val;
        document.getElementById('change-status-display').textContent = label;

        const circle = document.getElementById('change-status-circle');
        circle.className = 'w-2 h-2 rounded-full ' + colorClass;

        if (liElement) {
            const ul = document.getElementById('status-dropdown-menu');
            const lis = ul.querySelectorAll('li');
            lis.forEach(li => {
                li.className = 'px-4 py-2.5 transition-all flex items-center gap-2 hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600';
                const check = li.querySelector('.status-check');
                if (check) check.remove();
            });
            liElement.className = 'px-4 py-2.5 transition-all flex items-center gap-2 bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner';
            liElement.insertAdjacentHTML('beforeend', '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>');
        }

        this.toggleDropdown('status-dropdown-menu');
    },

    closeChangeStatusModal() {
        const modal = document.getElementById('change-status-modal');
        if (!modal) return;

        if (modal._closeFn) {
            document.removeEventListener('click', modal._closeFn);
            delete modal._closeFn;
        }

        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    async saveProjectStatus() {
        const form = document.getElementById('change-status-form');
        const spinner = document.getElementById('change-status-spinner');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const btn = spinner.parentElement;
        const oldText = btn.innerHTML;
        btn.innerHTML = spinner.outerHTML + ' Actualizando...';
        btn.querySelector('svg').classList.remove('hidden');
        btn.querySelector('svg').classList.add('animate-spin');
        btn.disabled = true;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const res = await API.put('/projects/' + this.projectId + '/status', data);

            if (res && res.success) {
                if (window.SIApp) SIApp.showToast('Estado actualizado', 'El nuevo estado se ha guardado.', 'success');
                this.closeChangeStatusModal();
                await this.loadProjectData(); // Refresca la vista completa (timeline, badges, etc)
            } else {
                if (window.SIApp) SIApp.showToast('Error', res?.message || 'No se pudo cambiar el estado', 'error');
            }
        } catch (error) {
            console.error(error);
            if (window.SIApp) SIApp.showToast('Error', 'Error al actualizar el estado', 'error');
        } finally {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    }
};
