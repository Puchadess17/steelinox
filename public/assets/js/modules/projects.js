/**
 * Steel Inox — Módulo de Proyectos (Detalle y Creación)
 */
window.SIModules = window.SIModules || {};

SIModules.projects = {
    get container() {
        return document.getElementById('main-content');
    },

    /**
     * VISTA: Detalle del Proyecto Individual (Vista Cliente)
     */
    async loadProjectDetail() {
        const pathParts = window.location.pathname.split('/');
        const projectId = pathParts[pathParts.length - 1];

        if (!projectId || isNaN(projectId)) {
            SIRouter.show404();
            return;
        }

        // 1. Skeleton
        this.container.innerHTML = `
            <div class="fade-in max-w-5xl mx-auto">
                <div class="flex items-center gap-4 mb-8">
                    <div class="w-12 h-12 rounded-xl bg-gray-200 animate-pulse"></div>
                    <div class="space-y-2 flex-1">
                        <div class="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                        <div class="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                    </div>
                </div>
            </div>
        `;

        this.documents = [];

        try {
            const result = await API.get(`/projects/${projectId}`);
            
            if (!result.success) {
                if (result.message && result.message.includes('No tienes permiso')) {
                    SIRouter.showForbidden();
                } else {
                    SIRouter.show404();
                }
                return;
            }

            if (result.success && result.data) {
                const p = result.data;
                this.projectId = p.id;
                
                // 2. Renderizar UI
                this.container.innerHTML = `
                    <div class="fade-in max-w-5xl mx-auto">
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-3 mb-2">
                                    <h1 class="text-2xl font-bold text-gray-900">${SIApp.escapeHtml(p.name)}</h1>
                                    ${SIApp.statusBadge(p.status)}
                                </div>
                                <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                    <span class="flex items-center gap-1 font-mono bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700">
                                        REF: ${SIApp.escapeHtml(p.reference)}
                                    </span>
                                    <span class="flex items-center gap-1">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                        ${SIApp.escapeHtml(p.client_name || 'Cliente')}
                                    </span>
                                    <span class="flex items-center gap-1">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                        Creado: ${SIApp.formatDate(p.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div class="lg:col-span-2 space-y-6">
                                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <div class="flex items-center justify-between mb-6">
                                        <h2 class="text-lg font-black text-gray-900 uppercase tracking-tight">Documentación Técnica</h2>
                                        <div id="client-doc-counter" class="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">0 ARCHIVOS</div>
                                    </div>
                                    
                                    <div id="client-doc-container" class="space-y-3 min-h-[150px]">
                                        <div class="flex justify-center py-10"><div class="si-spinner"></div></div>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-6">
                                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h2 class="text-lg font-black text-gray-900 uppercase tracking-tight mb-4">Información</h2>
                                    <div class="p-4 bg-orange-50/50 rounded-xl border border-orange-100 mb-4">
                                        <span class="block text-[10px] font-black text-orange-600/70 uppercase tracking-widest mb-1">Presupuesto Estimado</span>
                                        <p class="text-xl font-black text-orange-700">${SIApp.formatCurrency(p.budget_amount)}</p>
                                    </div>
                                    <div class="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                        <span class="block text-[10px] font-black text-blue-600/70 uppercase tracking-widest mb-1">Superficie Obra</span>
                                        <p class="text-xl font-black text-blue-700">${p.surface || '—'} m²</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // 3. Cargar documentos
                this.loadProjectDocuments();
            }
        } catch (error) {
            console.error(error);
            this.container.innerHTML = `<div class="p-8 text-red-500 font-bold">Error cargando el proyecto.</div>`;
        }
    },

    /** Cargar documentos del proyecto para el cliente */
    async loadProjectDocuments() {
        const container = document.getElementById('client-doc-container');
        if (!container) return;

        try {
            const res = await API.get(`/projects/${this.projectId}/documents`);
            if (res.success && res.data) {
                this.documents = res.data;
                this.renderDocumentList();
            } else {
                container.innerHTML = '<p class="text-center py-8 text-gray-400 text-xs font-bold uppercase tracking-widest">No hay documentos disponibles.</p>';
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="text-center py-8 text-red-400 text-xs font-bold uppercase tracking-widest">Error al sincronizar documentos.</p>';
        }
    },

    /** Renderizar lista de documentos */
    renderDocumentList() {
        const container = document.getElementById('client-doc-container');
        const counter = document.getElementById('client-doc-counter');
        if (!container) return;

        if (counter) counter.textContent = `${this.documents.length} ARCHIVOS`;

        if (this.documents.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-center text-gray-300">
                    <svg class="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <p class="text-[11px] font-bold uppercase tracking-widest">Sin documentación compartida todavía</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.documents.map(doc => {
            const icon = SIApp.getFileIcon(doc.mime_type);
            const size = SIApp.formatFileSize(doc.file_size);
            const date = SIApp.formatDate(doc.uploaded_at);
            const canView = doc.mime_type === 'application/pdf' || doc.mime_type.startsWith('image/');

            return `
                <div class="doc-row-wrapper mb-3 fade-in">
                    <div class="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 hover:border-orange-200 transition-all shadow-sm group">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-11 h-11 ${icon.bg} ${icon.text} rounded-xl flex items-center justify-center shrink-0 border border-transparent group-hover:border-current/10 transition-all">
                                ${icon.svg}
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors uppercase tracking-tight">${SIApp.escapeHtml(doc.title)}</p>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <button onclick="SIModules.projects.toggleVersionHistory(${doc.id}, this)" 
                                            class="text-[10px] font-black text-gray-400 hover:text-orange-500 uppercase tracking-tighter flex items-center gap-1 transition-colors">
                                        ${icon.label} (v${doc.version_number})
                                        <svg class="w-2.5 h-2.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>
                                    </button>
                                    <span class="text-[10px] text-gray-300">•</span>
                                    <span class="text-[10px] text-gray-400 font-bold uppercase">${size} • ${date}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2 pl-3">
                            ${canView ? `
                            <a href="/steelinox/api/projects/${this.projectId}/documents/${doc.id}/view" 
                               target="_blank"
                               class="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" 
                               title="Visualizar">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </a>` : ''}
                            
                            <a href="/steelinox/api/projects/${this.projectId}/documents/${doc.id}/download" 
                               target="_blank"
                               class="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all" 
                               title="Descargar">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            </a>
                        </div>
                    </div>
                    <!-- Historial (oculto por defecto) -->
                    <div id="client-versions-container-${doc.id}" class="hidden mt-1 ml-10 border-l-2 border-gray-50 pl-4 py-2 space-y-2">
                        <div class="text-[10px] font-bold text-gray-300 italic">Cargando versiones...</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /** Toggle del historial para el cliente */
    async toggleVersionHistory(docId, btn) {
        const container = document.getElementById(`client-versions-container-${docId}`);
        if (!container) return;

        const isHidden = container.classList.contains('hidden');
        if (isHidden) {
            container.classList.remove('hidden');
            btn.querySelector('svg').style.transform = 'rotate(180deg)';
            await this.loadVersionHistory(docId);
        } else {
            container.classList.add('hidden');
            btn.querySelector('svg').style.transform = 'rotate(0deg)';
        }
    },

    /** Cargar versiones desde la API */
    async loadVersionHistory(docId) {
        const container = document.getElementById(`client-versions-container-${docId}`);
        if (!container) return;

        try {
            const res = await API.get(`/projects/${this.projectId}/documents/${docId}/versions`);
            if (res.success) {
                this.renderVersionList(docId, res.data);
            } else {
                container.innerHTML = `<div class="text-[10px] font-bold text-red-300 uppercase">Error al cargar</div>`;
            }
        } catch (e) {
            container.innerHTML = `<div class="text-[10px] font-bold text-red-300 uppercase">Error de conexión</div>`;
        }
    },

    /** Renderizar lista de versiones para cliente */
    renderVersionList(docId, versions) {
        const container = document.getElementById(`client-versions-container-${docId}`);
        if (!container) return;

        if (versions.length <= 1) {
            container.innerHTML = `<div class="text-[10px] font-bold text-gray-300 uppercase italic opacity-60">No hay versiones anteriores</div>`;
            return;
        }

        container.innerHTML = versions.map(v => {
            const date = SIApp.formatDate(v.uploaded_at);
            const canView = v.mime_type === 'application/pdf' || v.mime_type.startsWith('image/');
            const isCurrent = v.is_current == 1;

            return `
                <div class="flex items-center justify-between text-[11px] py-1 group/v">
                    <div class="flex items-center gap-2">
                        <span class="w-5 h-5 flex items-center justify-center rounded bg-gray-50 border border-gray-100 font-bold ${isCurrent ? 'text-emerald-500' : 'text-gray-400'}">v${v.version_number}</span>
                        <span class="${isCurrent ? 'text-gray-900 font-bold' : 'text-gray-500'} truncate max-w-[150px] md:max-w-[300px]" title="${v.file_name}">${v.file_name}</span>
                        <span class="text-gray-300 uppercase text-[9px]">${date}</span>
                    </div>
                    <div class="flex items-center gap-1 opacity-20 group-hover/v:opacity-100 transition-opacity">
                        ${canView ? `
                        <a href="/steelinox/api/projects/${this.projectId}/documents/${docId}/view?version_id=${v.id}" target="_blank" class="p-1 hover:text-blue-500 transition-colors">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </a>` : ''}
                        <a href="/steelinox/api/projects/${this.projectId}/documents/${docId}/download?version_id=${v.id}" target="_blank" class="p-1 hover:text-orange-500 transition-colors">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }
};