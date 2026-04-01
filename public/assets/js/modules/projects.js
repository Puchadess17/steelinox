/**
 * Steel Inox — Módulo de Proyectos (Detalle y Creación)
 */
window.SIModules = window.SIModules || {};

SIModules.projects = {
    get container() {
        return document.getElementById('main-content');
    },

    /**
     * VISTA: Detalle del Proyecto Individual
     */
    async loadProjectDetail() {
        // 1. Extraer el ID dinámicamente de la URL (Ej: de /steelinox/project/123 saca "123")
        const pathParts = window.location.pathname.split('/');
        const projectId = pathParts[pathParts.length - 1];

        if (!projectId || isNaN(projectId)) {
            SIRouter.show404();
            return;
        }

        // 2. Pintar el Skeleton (estado de carga)
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
                
                // 4. Renderizar la información real
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
                                        ${SIApp.escapeHtml(p.client_name || 'Cliente Desconocido')}
                                    </span>
                                    <span class="flex items-center gap-1">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                        Creado: ${SIApp.formatDate(p.created_at)}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="flex gap-2">
                                <button class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors">
                                    Editar
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div class="lg:col-span-2 space-y-6">
                                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h2 class="text-lg font-bold text-gray-900 mb-4">Documentación</h2>
                                    <p class="text-sm text-gray-500 py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                                        El módulo de documentos se implementará en la siguiente fase.
                                    </p>
                                </div>
                            </div>

                            <div class="space-y-6">
                                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h2 class="text-lg font-bold text-gray-900 mb-4">Detalles Financieros</h2>
                                    <div class="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                        <span class="block text-xs font-bold text-orange-600/70 uppercase mb-1">Presupuesto</span>
                                        <span class="text-2xl font-black text-orange-600">
                                            ${p.budget_amount ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.budget_amount) : '---'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error(error);
            this.container.innerHTML = `<div class="p-8 text-red-500">Ocurrió un error al cargar el proyecto.</div>`;
        }
    }
};