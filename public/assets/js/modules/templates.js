/**
 * Archivo: templates.js
 * Librería de fragmentos HTML reutilizables para Steel Inox.
 */
window.SITemplates = window.SITemplates || {};

/** 1. FRAGMENTOS DE FORMULARIO (Campos individuales) */
SITemplates.fragments = {

    /** Campos para Proyectos (Nombre, Ref, Presupuesto, etc) */
    projectFields(data = {}, isEdit = false) {
        const p = data;
        const user = window.SIApp ? window.SIApp.user : null;
        const isAdmin = user && user.role === 'admin';
        
        // La referencia se oculta si: 
        // 1. Es creación (!isEdit)
        // 2. Es edición pero NO es admin (!isAdmin)
        const showReference = isEdit && isAdmin;

        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="${!showReference ? 'md:col-span-2' : ''}">
                    <label class="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 transition-colors">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                        Nombre del Proyecto <span class="text-red-500 ml-0.5">*</span>
                    </label>
                    <input type="text" name="name" value="${SIApp.escapeHtml(p.name || '')}" required 
                           class="w-full px-4 py-3 bg-transparent border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm"
                           placeholder="Ej: Reforma Planta 3 - Oficinas Centrales">
                </div>
                ${showReference ? `
                <div>
                    <label class="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                        Referencia <span class="text-red-500 ml-0.5">*</span>
                    </label>
                    <input type="text" name="reference" value="${SIApp.escapeHtml(p.reference || '')}" required 
                           class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl font-medium text-sm focus:ring-2 focus:ring-orange-500/20"
                           placeholder="PRJ-2024-001">
                </div>
                ` : ''}
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Presupuesto (€) <span class="text-red-500 ml-0.5">*</span>
                    </label>
                    <input type="number" min="0" step="50" name="budget_amount" value="${p.budget_amount || ''}" required 
                           class="w-full px-4 py-3 bg-transparent border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm"
                           placeholder="0.00">
                </div>
                <div>
                    <label class="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
                        Superficie Obra (m²)
                    </label>
                    <input type="number" min="0" step="1" name="surface" value="${p.surface || ''}" 
                           class="w-full px-4 py-3 bg-transparent border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm"
                           placeholder="m²">
                </div>
            </div>

            <div>
                <label class="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                    Tipo de Proyecto <span class="text-red-500 ml-0.5">*</span>
                </label>
                <input type="text" name="project_type" value="${SIApp.escapeHtml(p.project_type || '')}" required 
                       class="w-full px-4 py-3 bg-transparent border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm"
                       placeholder="Ej: Instalación Industrial, Residencial, etc.">
            </div>

            <div>
                <label class="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h12"/></svg>
                    Descripción corta
                </label>
                <textarea name="description" rows="3" 
                          class="w-full px-4 py-3 bg-transparent border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm"
                          placeholder="Breve resumen del alcance...">${SIApp.escapeHtml(p.description || '')}</textarea>
            </div>
        `;
    },

    /** Campos para Clientes (Nombre, Referencia) */
    clientFields(data = {}, isEdit = false) {
        const c = data;
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="${!isEdit ? 'md:col-span-2' : ''}">
                    <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
                        Nombre de la Empresa <span class="text-red-500">*</span>
                    </label>
                    <input type="text" name="name" value="${SIApp.escapeHtml(c.name || '')}" required
                        class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                        placeholder="Ej. Construcciones Metálicas S.A.">
                    <p class="text-[10px] text-gray-400 mt-2 font-medium">Nombre legal completo para facturación.</p>
                </div>

                ${isEdit ? `
                <!-- Ref Interna (Solo en Edición) -->
                <div>
                    <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <span class="text-gray-400 font-black">#</span> Referencia Interna <span class="text-red-500">*</span>
                    </label>
                    <input type="text" name="reference" value="${SIApp.escapeHtml(c.reference || '')}" 
                           oninput="SIApp.validateField(this, SIApp.constants.regex.CLI, 'Formato inválido: CLI-XXXX')"
                           class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                           required placeholder="Ej. CLI-0089">
                    <p class="text-[10px] text-gray-400 mt-2 font-medium">Código único de seguimiento (CLI-XXXX).</p>
                </div>
                ` : ''}
            </div>
        `;
    },

    /** Campos para Usuarios y Comerciales */
    userFields(data = {}, options = {}) {
        const { 
            type = 'user', 
            isEdit = !!data.id,
            includeClientSelector = false,
            clients = [],
            moduleName = 'clientUserFormAdmin',
            includeStatusToggle = true
        } = options;
        
        const u = data;
        const isCommercial = type === 'commercial';

        // Determinar el cliente seleccionado para el label
        let clientLabel = '-- Selecciona una empresa --';
        if (includeClientSelector && u.client_id) {
            const selected = clients.find(c => c.id == u.client_id);
            if (selected) clientLabel = `${SIApp.escapeHtml(selected.name)} (${SIApp.escapeHtml(selected.reference || '')})`;
        }

        return `
            <input type="hidden" name="id" value="${u.id || ''}">
            
            <div class="space-y-6">
                ${includeClientSelector ? `
                <!-- Empresa (Client) - CUSTOM DROPDOWN -->
                <div class="space-y-2 relative" id="client-dropdown-container">
                    <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        Empresa <span class="text-red-500">*</span>
                    </label>
                    
                    <input type="hidden" id="user-client-id" name="client_id" value="${u.client_id || ''}" required>

                    <button type="button" 
                        onclick="SIModules.${moduleName}.toggleClientDropdown(event)"
                        id="btn-client-dropdown" 
                        class="w-full px-5 py-3 bg-gray-50 border border-gray-200 text-sm font-bold text-gray-700 flex items-center justify-between hover:bg-white hover:border-orange-500 transition-all rounded-xl group">
                        <div class="flex items-center gap-3">
                            <span id="client-dropdown-label" class="truncate">${clientLabel}</span>
                        </div>
                        <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-transform duration-300" id="icon-client-dropdown" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                    </button>

                    <div id="drop-client-list" class="hidden absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div class="p-3 border-b border-gray-50 bg-gray-50/50">
                            <div class="relative group">
                                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                <input type="text" 
                                    id="client-search-input"
                                    oninput="SIModules.${moduleName}.filterClients(this.value)"
                                    placeholder="Buscar por nombre o ref..." 
                                    class="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none transition-all">
                            </div>
                        </div>
                        <ul id="client-items-list" class="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                            <!-- Cargado dinámicamente -->
                        </ul>
                    </div>
                </div>
                ` : ''}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="${!isCommercial ? 'md:col-span-2' : ''}">
                        <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            Nombre Completo <span class="text-red-500">*</span>
                        </label>
                        <input type="text" name="name" value="${SIApp.escapeHtml(u.name || '')}" required 
                            class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                            placeholder="Ej: Juan Pérez">
                    </div>

                    <div>
                        <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                            Email <span class="text-red-500">*</span>
                        </label>
                        <input type="email" name="email" value="${SIApp.escapeHtml(u.email || '')}" required 
                            oninput="SIApp.validateField(this, SIApp.constants.regex.EMAIL, 'Email no válido')"
                            class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                            placeholder="correo@steelinox.es">
                    </div>

                    <div class="md:col-span-2">
                        <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                            Contraseña ${isEdit ? '(Opcional)' : '<span class="text-red-500">*</span>'}
                        </label>
                        <div class="relative">
                            <input type="password" name="password" ${isEdit ? '' : 'required'}
                                oninput="SIApp.validatePasswordRequirements(this)"
                                class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 pr-12 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                                placeholder="••••••••">
                            <button type="button" onclick="SIApp.togglePasswordVisibility(this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors">
                                <span class="eye-open">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </span>
                                <span class="eye-closed hidden">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                </span>
                            </button>
                        </div>
                        ${isEdit ? '<p class="text-[10px] text-gray-400 mt-2 font-medium italic">Dejar vacío para no cambiar.</p>' : ''}
                    </div>

                    ${includeStatusToggle !== false && !includeClientSelector ? `
                    <div class="flex items-center gap-3 pt-2">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="hidden" name="is_active_sent" value="1">
                            <input type="checkbox" name="is_active" value="1" class="sr-only peer" ${(!isEdit || u.is_active == 1) ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                        <span class="text-sm font-bold text-gray-700">Cuenta Activa</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
};

/** 2. GENERADORES DE MODALES GENÉRICOS */

/**
 * Genera un modal estandarizado envolviendo el contenido proporcionado.
 */
SITemplates.modal = function(options) {
    const {
        id,
        title,
        contentHtml,
        saveBtnLabel = 'Guardar',
        saveActionLabel = '', // JS a ejecutar al guardar
        maxWidth = 'max-w-md'
    } = options;

    return `
        <div id="${id}" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 hidden opacity-0 transition-opacity duration-300 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-[2rem] w-full ${maxWidth} shadow-2xl transform scale-95 transition-transform duration-300 flex flex-col max-h-[90vh] border border-transparent dark:border-zinc-800">
                <!-- Header -->
                <div class="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <h3 class="text-xl font-extrabold text-gray-900 dark:text-white">${title}</h3>
                    <button onclick="SIApp.modal.close('${id}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                
                <!-- Body -->
                <div class="p-6 overflow-y-auto custom-scrollbar">
                    <form id="${id}-form" onsubmit="event.preventDefault(); ${saveActionLabel};" class="space-y-4">
                        ${contentHtml}
                    </form>
                </div>
                
                <!-- Footer -->
                <div class="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 rounded-b-2xl sm:rounded-b-[2rem] flex justify-end gap-3 shrink-0">
                     <button onclick="SIApp.modal.close('${id}')" type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all leading-none">Cancelar</button>
                     <button id="${id}-btn-save" onclick="${saveActionLabel}" type="button" class="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 min-w-[120px] leading-none shadow-lg shadow-orange-500/20">
                         ${saveBtnLabel}
                     </button>
                </div>
            </div>
        </div>
    `;
};
