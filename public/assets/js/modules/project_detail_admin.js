/**
 * Steel Inox Extranet — Project Detail View (Admin/Commercial)
 * Maneja la lógica de la página individual del proyecto para el equipo interno.
 */

const ProjectAdminView = {
    projectId: null,
    project: null,
    userContext: null,
    activeTab: 'resumen',

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
                ejecucion: 'En Ejecución',
                cerrado: 'Finalizado',
            };
            const styles = {
                propuesta: 'bg-amber-100/50 text-amber-700 border-amber-200/50',
                aprobado: 'bg-blue-100/50 text-blue-700 border-blue-200/50',
                ejecucion: 'bg-orange-100 text-white border-orange-200',
                cerrado: 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50',
            };
            const label = labels[this.project.status] || this.project.status;
            const style = styles[this.project.status] || 'bg-gray-100 text-gray-600';
            
            badgeEl.className = `px-4 py-2 rounded-xl text-xs font-bold uppercase border ${style} shadow-sm inline-block`;
            badgeEl.textContent = label;
        }
    },

    /** Disparar el renderizado según pestaña activa */
    renderTabContent() {
        const container = document.getElementById('tab-content');
        if (!container) return;

        switch(this.activeTab) {
            case 'resumen':    container.innerHTML = this._renderResumen(); break;
            case 'documentos': container.innerHTML = this._renderDocumentos(); break;
            case 'comentarios': container.innerHTML = this._renderComentarios(); break;
            case 'historial':   container.innerHTML = this._renderHistorial(); break;
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
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                             <div>
                                <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tipo de Proyecto</span>
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center border border-orange-100/50">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                    </div>
                                    <p class="font-bold text-[#1a1b25]">${p.project_type || 'General'}</p>
                                </div>
                            </div>
                            <div>
                                <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Fecha de Creación</span>
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center border border-blue-100/50">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v14a2 2 0 002 2z"/></svg>
                                    </div>
                                    <p class="font-bold text-[#1a1b25]">${SIApp.formatDate(p.created_at)}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Mock: Comerciales Asignados -->
                        <div class="mt-8 pt-8 border-t border-gray-50">
                            <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Comerciales Asignados</span>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">CM</div>
                                        <div>
                                            <p class="text-sm font-bold text-gray-900 leading-tight">Carlos Méndez</p>
                                            <p class="text-[10px] text-gray-400 font-medium">Principal</p>
                                        </div>
                                    </div>
                                    <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                                </div>
                                <div class="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">LF</div>
                                        <div>
                                            <p class="text-sm font-bold text-gray-900 leading-tight">Lucía Fernández</p>
                                            <p class="text-[10px] text-gray-400 font-medium">Soporte</p>
                                        </div>
                                    </div>
                                    <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Descripción -->
                    <div class="bg-gray-50/50 border border-gray-100 rounded-2xl p-6">
                        <h4 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                             <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                             Descripción del Proyecto
                        </h4>
                        <p class="text-sm text-gray-600 leading-relaxed italic">
                            "${p.description || 'No hay descripción disponible para este proyecto.'}"
                        </p>
                    </div>
                </div>

                <!-- Barra Lateral Derecha (Sidebar Extra) (4/12) -->
                <div class="lg:col-span-4 space-y-6">
                    <!-- Acciones Rápidas -->
                    <div class="bg-[#fef9f4] border border-[#fdecdb] rounded-2xl p-6 shadow-sm">
                        <h4 class="text-xs font-bold text-[#a75d1c] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>
                            Acciones Rápidas
                        </h4>
                        <div class="space-y-3">
                            <button class="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                Cambiar Estado
                            </button>
                            <button class="w-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-700 rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Subir Archivos
                            </button>
                             <button class="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2">
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                                Reabrir Proyecto
                            </button>
                        </div>
                    </div>

                    <!-- Próximos Pasos (Mock) -->
                    <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                         <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            PROXIMOS PASOS
                        </h4>
                        <div class="space-y-6">
                            <div class="border-l-4 border-orange-400 pl-4 py-1">
                                <p class="text-sm font-bold text-gray-900 leading-tight">Validación de Materiales</p>
                                <p class="text-[11px] text-gray-400 mt-1 font-medium italic">Previsto: 24 May 2024</p>
                            </div>
                            <div class="border-l-4 border-gray-100 pl-4 py-1">
                                <p class="text-sm font-bold text-gray-400 leading-tight">Inicio Montaje Fachada</p>
                                <p class="text-[11px] text-gray-300 mt-1 font-medium">Previsto: 02 Jun 2024</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /** PESTAÑA: DOCUMENTOS (Mock) */
    _renderDocumentos() {
       return `
            <div class="space-y-6">
                <!-- Dropzone Mock -->
                <div class="border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center bg-white hover:border-orange-200 hover:bg-orange-50/20 transition-all cursor-pointer group">
                    <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    </div>
                    <h4 class="text-lg font-extrabold text-[#1a1b25] mb-2">Arrastra y suelta documentos aquí</h4>
                    <p class="text-sm text-gray-400 text-center mb-6 max-w-sm leading-relaxed">Soporta planos CAD (.dwg), documentos PDF y archivos de imagen de alta resolución.</p>
                    <div class="flex gap-4">
                         <button class="bg-orange-500 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">+ Seleccionar Archivo</button>
                         <button class="bg-white border border-gray-100 px-8 py-3 rounded-xl text-sm font-bold text-gray-600 shadow-sm hover:bg-gray-50 transition-all">Ver Requisitos</button>
                    </div>
                </div>

                <!-- Tabla de Documentos Mock -->
                <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div class="px-6 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-4">
                        <h4 class="font-bold text-gray-900">Repositorio del Proyecto</h4>
                        <div class="flex items-center gap-3">
                             <div class="relative">
                                <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                <input type="text" placeholder="Buscar por título..." class="bg-gray-50 border-none text-xs rounded-lg pl-9 pr-4 py-2 w-48 focus:ring-1 focus:ring-orange-500">
                             </div>
                             <button class="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors">
                                 <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                                 Filtrar Tipo
                             </button>
                        </div>
                    </div>
                    <div class="si-table-wrapper">
                        <table class="w-full si-table">
                            <thead>
                                <tr class="bg-gray-50/50">
                                    <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título del Documento</th>
                                    <th class="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo</th>
                                    <th class="px-4 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Versión</th>
                                    <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha de Carga</th>
                                    <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Autor</th>
                                    <th class="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                ${this._mockDocRow('Plano Estructural Planta Baja - Rev A', 'CAD', 'v2.4 (Actual)', '14 Jun 2024, 10:30', 'Roberto Silva')}
                                ${this._mockDocRow('Contrato de Suministro de Acero Inoxidable', 'PDF', 'v1.0 (Final)', '12 Jun 2024, 09:15', 'Elena Martínez')}
                                ${this._mockDocRow('Fotos de Avance Cimentación - Vista Norte', 'Imagen', 'v1.0', '10 Jun 2024, 16:45', 'Carlos Ruiz')}
                                ${this._mockDocRow('Especificaciones Técnicas Perfiles H', 'PDF', 'v3.2 (Actual)', '08 Jun 2024, 11:20', 'Roberto Silva')}
                                ${this._mockDocRow('Detalle de Soldadura Nudo 45', 'CAD', 'v1.2', '05 Jun 2024, 14:00', 'Roberto Silva')}
                            </tbody>
                        </table>
                    </div>
                    <!-- Paginación Mock -->
                    <div class="px-6 py-4 bg-gray-50/30 flex items-center justify-between text-xs text-gray-500 font-medium">
                        <span>Mostrando 5 de 24 documentos</span>
                        <div class="flex items-center gap-1">
                            <button class="px-3 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>Anterior</button>
                            <button class="px-3 py-1 bg-orange-500 text-white rounded-lg">1</button>
                            <button class="px-3 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">2</button>
                            <button class="px-3 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">3</button>
                            <button class="px-3 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Siguiente</button>
                        </div>
                    </div>
                </div>
            </div>
       `;
    },

    _mockDocRow(title, type, version, date, author) {
        const iconMap = {
            'CAD': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
            'PDF': '<svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>',
            'Imagen': '<svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>'
        };
        const badgeMap = {
            'CAD': 'bg-gray-100 text-gray-500',
            'PDF': 'bg-red-50 text-red-600',
            'Imagen': 'bg-blue-50 text-blue-600'
        };
        return `
            <tr class="hover:bg-gray-50/50 group">
                <td class="px-6 py-4">
                     <div class="flex items-center gap-3">
                         <div class="w-9 h-9 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0 group-hover:bg-white group-hover:shadow-sm">
                             ${iconMap[type] || ''}
                         </div>
                         <div>
                            <p class="text-sm font-bold text-gray-900 leading-tight">${title}</p>
                            <p class="text-[10px] text-gray-300 font-medium">42.5 MB</p>
                         </div>
                     </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase ${badgeMap[type] || ''}">${type}</span>
                </td>
                <td class="px-4 py-4 text-center">
                    <span class="text-[10px] font-bold text-gray-500">${version}</span>
                </td>
                <td class="px-6 py-4">
                    <p class="text-xs text-gray-600 font-medium">${date}</p>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                         <div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                             ${author.split(' ').map(n => n[0]).join('')}
                         </div>
                         <p class="text-xs text-gray-700 font-bold">${author}</p>
                    </div>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button class="p-1.5 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
                        <button class="p-1.5 text-gray-300 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg></button>
                    </div>
                </td>
            </tr>
        `;
    },

    /** PESTAÑA: COMENTARIOS (Mock) */
    _renderComentarios() {
        return `
            <div class="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px]">
                <div class="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
                    <h4 class="text-lg font-extrabold text-[#1a1b25] flex items-center gap-3">
                        Línea de Tiempo
                        <span class="px-2 py-0.5 bg-gray-100 text-gray-400 text-[9px] font-black rounded uppercase tracking-wider">3 mensajes</span>
                    </h4>
                    <button class="text-xs font-bold text-gray-400 hover:text-gray-700 flex items-center gap-2">
                        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                        Filtrar por rol
                    </button>
                </div>
                
                <!-- Timeline Scroll Area -->
                <div class="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/20">
                    <!-- Message 1 -->
                    <div class="flex gap-5">
                        <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 font-bold text-sm border-2 border-white shadow-sm">CR</div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="font-extrabold text-sm text-gray-900">Carlos Rodríguez</span>
                                <span class="px-2 py-0.5 bg-gray-100 text-gray-400 text-[8px] font-black rounded uppercase tracking-tighter">CLIENTE</span>
                                <span class="text-[10px] text-gray-300 font-medium ml-2">Hoy, 09:15 AM</span>
                            </div>
                            <div class="bg-white border border-gray-100 p-5 rounded-2xl rounded-tl-sm shadow-sm space-y-4">
                                <p class="text-sm text-gray-700 leading-relaxed">He revisado la propuesta inicial de los acabados. ¿Es posible aumentar el pulido en las juntas de la sección B?</p>
                                <!-- Adjunto Mock -->
                                <div class="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between group cursor-pointer hover:border-orange-200 transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-orange-400 shadow-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
                                        <div>
                                            <p class="text-xs font-bold text-gray-900">Plano_Estructural_SeccionB.pdf</p>
                                            <p class="text-[9px] text-gray-400 font-bold uppercase">Referencia de versión: v1.2</p>
                                        </div>
                                    </div>
                                    <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Message 2 -->
                    <div class="flex gap-5">
                         <div class="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0 font-bold text-sm border-2 border-white shadow-sm">AM</div>
                         <div class="flex-1">
                             <div class="flex items-center gap-2 mb-2">
                                 <span class="font-extrabold text-sm text-gray-900">Ana Martínez</span>
                                 <span class="px-2 py-0.5 bg-red-50 text-red-400 text-[8px] font-black rounded uppercase tracking-tighter">ADMINISTRADOR</span>
                                 <span class="text-[10px] text-gray-300 font-medium ml-2">Hoy, 10:30 AM</span>
                             </div>
                             <div class="bg-white border border-gray-100 p-5 rounded-2xl rounded-tl-sm shadow-sm space-y-4">
                                <p class="text-sm text-gray-700 leading-relaxed">Hola Carlos. Sí, es posible. He hablado con el equipo técnico y ajustaremos el proceso de acabado para esa zona. Adjunto el presupuesto actualizado con ese pequeño cambio.</p>
                                <div class="inline-flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-700 hover:bg-gray-100 cursor-pointer">
                                    <svg class="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                                    Presupuesto_Ajustado_V2.pdf (1.2 MB)
                                    <svg class="w-3 h-3 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                </div>
                             </div>
                         </div>
                    </div>
                </div>

                <!-- Input area -->
                <div class="p-8 border-t border-gray-100">
                    <div class="border border-gray-100 rounded-2xl focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                         <div class="px-5 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/10 rounded-t-2xl">
                             <h5 class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                Nuevo comentario
                             </h5>
                             <button class="text-[10px] text-gray-400 hover:text-gray-900 font-bold uppercase tracking-wider">Cerrar hilo</button>
                         </div>
                         <textarea class="w-full h-32 px-6 py-4 border-none text-sm placeholder:text-gray-300 resize-none focus:ring-0" placeholder="Escribe un mensaje para el equipo o cliente... Usa @ para mencionar a alguien."></textarea>
                         <div class="p-4 flex items-center justify-between border-t border-gray-50">
                             <div class="flex items-center gap-6 px-2">
                                 <span class="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Visibilidad: Todos los participantes</span>
                                 <span class="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Presiona Shift + Enter para salto de línea</span>
                             </div>
                             <div class="flex items-center gap-3">
                                 <button class="px-5 py-2.5 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold border border-gray-100 hover:bg-white transition-all flex items-center gap-2 italic">
                                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                                     Adjuntar archivo
                                 </button>
                                 <button class="px-8 py-2.5 bg-orange-500/30 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-500/5 cursor-not-allowed">Enviar Comentario</button>
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
            <div class="space-y-6">
                <!-- Top Filters -->
                <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="relative flex-1 max-w-lg">
                        <svg class="w-4 h-4 text-gray-300 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" placeholder="Buscar por usuario, acción o palabra clave..." class="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-3 text-sm focus:ring-1 focus:ring-gray-200">
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="flex bg-gray-100 p-1 rounded-xl">
                            <button class="px-4 py-1.5 bg-white text-gray-900 text-xs font-bold rounded-lg shadow-sm">Todo</button>
                            <button class="px-4 py-1.5 text-gray-500 text-xs font-bold rounded-lg">Estados</button>
                            <button class="px-4 py-1.5 text-gray-500 text-xs font-bold rounded-lg">Documentos</button>
                            <button class="px-4 py-1.5 text-gray-500 text-xs font-bold rounded-lg">Usuarios</button>
                        </div>
                         <button class="p-3 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg></button>
                    </div>
                </div>

                <!-- Tabla Registro Activity -->
                <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div class="si-table-wrapper">
                        <table class="w-full si-table">
                            <thead>
                                <tr class="bg-gray-50/50 border-b border-gray-50">
                                    <th class="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha y Hora</th>
                                    <th class="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                                    <th class="px-6 py-5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo de Acción</th>
                                    <th class="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descripción</th>
                                    <th class="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detalles</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50/80">
                                ${this._mockHistoryRow('24 May 2024, 10:45:12', 'Carlos Mendoza', 'Estado', 'Cambio de estado del proyecto', '"Estado cambiado de Propuesta a Aprobado por Cliente."')}
                                ${this._mockHistoryRow('24 May 2024, 09:15:00', 'Elena Rodríguez', 'Comentario', 'Nuevo comentario añadido', '"Confirmación de presupuesto para la fase de cerramientos..."')}
                                ${this._mockHistoryRow('23 May 2024, 16:30:45', 'Juan Pérez', 'Documento', 'Subida de nuevo plano técnico', '"Archivo Plano_Fachada_V2.pdf subido a la sección..."')}
                                ${this._mockHistoryRow('22 May 2024, 11:00:20', 'Carlos Mendoza', 'Edición', 'Actualización de presupuesto', '"Aumento del presupuesto base en un 5% por costes..."')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Bottom Stats Mock -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 group">
                        <div class="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        </div>
                        <div>
                            <p class="text-xs font-extrabold text-[#1a1b25]">Integridad Garantizada</p>
                            <p class="text-[10px] text-gray-400 mt-0.5 leading-tight">Registros sellados en tiempo real.</p>
                        </div>
                    </div>
                    <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 group">
                        <div class="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <div>
                            <p class="text-xs font-extrabold text-[#1a1b25]">Trazabilidad Total</p>
                            <p class="text-[10px] text-gray-400 mt-0.5 leading-tight">Visualice quién, cuándo y qué cambió.</p>
                        </div>
                    </div>
                    <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-gray-200 hover:shadow-md transition-all">
                        <div class="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-all">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-extrabold text-[#1a1b25]">Informes Disponibles</p>
                            <p class="text-[10px] text-gray-400 mt-0.5 pointer-events-none">Exportar historial completo a CSV.</p>
                        </div>
                        <svg class="w-4 h-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </div>
                </div>
            </div>
        `;
    },

    _mockHistoryRow(datetime, user, type, action, details) {
        const typeStyles = {
            'Estado': 'bg-[#f0efff] text-[#6e56cf] border-[#e1dffb]',
            'Comentario': 'bg-[#fff9eb] text-[#cb8e24] border-[#fdecdb]',
            'Documento': 'bg-[#ecfdf4] text-[#44c173] border-[#d1fae5]',
            'Edición': 'bg-gray-100 text-gray-600 border-gray-200'
        };
        const typeIcons = {
            'Estado': '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>',
            'Comentario': '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2.01 2.01 0 00.586 1.414l2.5 2.5a1 1 0 00.707.293V19a1 1 0 001.707.707L11.414 17H11"/></svg>',
            'Documento': '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
            'Edición': '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>'
        };

        return `
            <tr class="hover:bg-gray-50/30 transition-colors">
                <td class="px-8 py-5">
                    <div class="flex items-center gap-3">
                        <svg class="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <p class="text-xs text-gray-500 font-bold">${datetime}</p>
                    </div>
                </td>
                <td class="px-8 py-5">
                    <div class="flex items-center gap-3">
                         <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                             ${user.split(' ').map(n => n[0]).join('')}
                         </div>
                         <div>
                            <p class="text-xs font-bold text-gray-900 leading-tight">${user}</p>
                            <p class="text-[9px] text-gray-300 font-black uppercase tracking-tight">Administrador</p>
                         </div>
                    </div>
                </td>
                <td class="px-6 py-5 text-center">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase border ${typeStyles[type] || ''}">
                        ${typeIcons[type] || ''}
                        ${type}
                    </span>
                </td>
                <td class="px-8 py-5">
                    <p class="text-xs text-gray-600 font-bold leading-tight">${action}</p>
                </td>
                <td class="px-8 py-5">
                    <p class="text-[11px] text-gray-400 font-medium italic translate-y-0.5 truncate max-w-[220px]">${details}</p>
                </td>
            </tr>
        `;
    }
};

// Exportación global
window.ProjectAdminView = ProjectAdminView;
