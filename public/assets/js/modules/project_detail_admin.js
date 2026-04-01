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
                ejecucion: 'bg-orange-100 text-orange-700 border-orange-200',
                cerrado: 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50',
            };
            const label = labels[this.project.status] || this.project.status;
            const style = styles[this.project.status] || 'bg-gray-100 text-gray-600 border-gray-200';

            badgeEl.className = `px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest border shadow-md inline-block ${style}`;
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
                <!-- Buscador -->
                <div class="relative">
                    <svg class="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input id="doc-search-input" type="text" placeholder="Buscar documentos..." oninput="ProjectAdminView._filterDocs(this.value)" class="w-full bg-white border border-gray-100 text-base rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-[#E57B23]/20 focus:border-[#E57B23] focus:outline-none shadow-sm text-gray-700 font-medium">
                </div>

                <!-- Botón Principal -->
                <button class="w-full bg-[#E57B23] hover:bg-[#c9661c] text-white rounded-full py-4 text-sm font-black shadow-lg shadow-[#E57B23]/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                    Seleccionar Archivo
                </button>

                <!-- Header de Lista -->
                <div class="flex items-center justify-between pt-2">
                    <h3 class="text-lg font-black text-[#1a1b25] uppercase tracking-wide">Archivos Recientes</h3>
                    <button class="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                    </button>
                </div>

                <!-- Lista de Archivos -->
                <div class="space-y-3 pb-6" id="doc-cards-container">
                    ${this._mockDocCard('Plano_Estructural_V1.dwg', 'CAD', 'v2.4 • 12 Oct', 'JD')}
                    ${this._mockDocCard('Especificaciones_Acero.pdf', 'PDF', 'v1.1 • 10 Oct', 'AL')}
                    ${this._mockDocCard('Memorias_Calculo_Final.zip', 'ZIP', 'v2.0 • 08 Oct', 'MP')}
                    ${this._mockDocCard('Cronograma_Suministros.xlsx', 'XLS', 'v3.2 • 05 Oct', 'RS')}
                    ${this._mockDocCard('Detalle_Soldadura_A3.dwg', 'CAD', 'v1.4 • 02 Oct', 'JD')}
                </div>
            </div>
        `;
    },

    _mockDocCard(title, type, meta, avatar) {
        const typeProps = {
            'CAD': { icon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>', bg: 'bg-[#e0f2fe]', text: 'text-[#0284c7]', badgeBg: 'bg-[#bae6fd]', badgeText: 'text-[#0369a1]' },
            'PDF': { icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>', bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]', badgeBg: 'bg-[#fecaca]', badgeText: 'text-[#b91c1c]' },
            'ZIP': { icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>', bg: 'bg-[#ffedd5]', text: 'text-[#ea580c]', badgeBg: 'bg-[#fed7aa]', badgeText: 'text-[#c2410c]' },
            'XLS': { icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" clip-rule="evenodd"/></svg>', bg: 'bg-[#dcfce7]', text: 'text-[#16a34a]', badgeBg: 'bg-[#bbf7d0]', badgeText: 'text-[#15803d]' }
        };
        const style = typeProps[type] || typeProps['CAD'];

        return `
            <div class="doc-row flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100" data-title="${title.toLowerCase()}">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-[52px] h-[52px] ${style.bg} ${style.text} rounded-[14px] flex items-center justify-center shrink-0">
                        ${style.icon}
                    </div>
                    <div class="min-w-0">
                        <p class="text-[15.5px] font-extrabold text-gray-900 leading-tight mb-1 truncate">${title}</p>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded ${style.badgeBg} ${style.badgeText} text-[10px] font-black tracking-widest uppercase">${type}</span>
                            <span class="text-xs text-gray-400 font-bold uppercase tracking-tighter">${meta}</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-center justify-between gap-2 shrink-0 pl-3">
                    <div class="w-8 h-8 bg-gray-100 rounded-full border border-white shadow-sm flex items-center justify-center text-[10px] uppercase font-black text-gray-500">${avatar}</div>
                    <button class="text-gray-300 hover:text-gray-700">
                        <svg class="w-5 h-5 translate-y-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                    </button>
                </div>
            </div>
        `;
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
    }
};

// Exportación global
window.ProjectAdminView = ProjectAdminView;
