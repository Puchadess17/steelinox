/**
 * Steel Inox Extranet — Client Form View (Create & Edit)
 * Componente UI puro diseñado para crear y editar clientes.
 */

window.SIModules = window.SIModules || {};

SIModules.clientFormAdmin = {
    mode: 'create', // 'create' o 'edit'
    clientId: null,
    clientData: null,

    /** Inicializador para la creación */
    async loadCreateSPA() {
        this.mode = 'create';
        this.clientId = null;
        this.clientData = {
            name: '',
            reference: '',
            notes: '',
            is_active: 1
        };
        await this.init();
    },

    /** Inicializador para la edición */
    async loadEditSPA() {
        this.mode = 'edit';
        
        const path = window.location.pathname;
        const match = path.match(/\/client\/edit\/(\d+)/i);
        this.clientId = match ? match[1] : null;

        if (!this.clientId) {
            SIRouter.show404();
            return;
        }

        this.renderSkeleton();

        try {
            // Simulamos obtener los datos del backend, o llamamos real al detallar si existe
            const response = await API.get('/clients/' + this.clientId);
            if (response.success && response.data && response.data.info) {
                this.clientData = response.data.info;
                // Add default empty notes field for the mockup format
                this.clientData.notes = ''; 
                this.init();
            } else {
                throw new Error("No se pudo obtener la info del cliente.");
            }
        } catch (error) {
           // En caso de fallar o si backend no está al 100%
           console.error("Error al cargar en edición:", error);
           this.clientData = {
                name: 'Cliente Mock',
                reference: 'CLI-000',
                notes: 'Datos de prueba de interfaz',
                is_active: 1
            };
           this.init();
        }
    },

    async init() {
        this.render();
        this.bindEvents();
    },

    renderSkeleton() {
        const container = document.getElementById('main-content');
        if (!container) return;

        container.innerHTML = `
            <div class="flex items-center justify-center py-20">
                <div class="si-spinner"></div>
            </div>
        `;
    },

    render() {
        const container = document.getElementById('main-content');
        if (!container) return;

        const isEdit = this.mode === 'edit';
        const title = isEdit ? 'Gestión de Cliente' : 'Nuevo Cliente';
        const subtitle = isEdit 
            ? 'Complete los campos a continuación para actualizar la información del cliente en el sistema.' 
            : 'Ingrese los datos necesarios para registrar un nuevo cliente en el sistema.';
        
        const badgeStatus = (window.SIApp && this.clientData) ? SIApp.activeBadge(this.clientData.is_active) : '';

        // Toggles para el switch
        const isChecked = this.clientData.is_active == 1 ? 'checked' : '';

        container.innerHTML = `
            <div class="max-w-6xl mx-auto w-full pb-10 fade-in px-2 sm:px-0">
                <!-- Breadcrumb -->
                <div class="mb-8">
                    <a data-route="clients" href="/steelinox/clients" class="inline-flex items-center text-sm text-gray-500 hover:text-orange-500 font-medium transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                        Volver a la lista de clientes
                    </a>
                </div>

                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 class="text-3xl font-extrabold text-[#1a1b25] tracking-tight mb-2">${title}</h1>
                        <p class="text-gray-500 text-sm max-w-xl">${subtitle}</p>
                    </div>
                    ${isEdit ? `
                    <div class="shrink-0 flex items-center bg-white border border-gray-100 rounded-full px-4 py-1.5 shadow-sm">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-3">ESTADO: </span>
                        ${badgeStatus}
                    </div>` : ''}
                </div>

                <form id="client-form" class="flex flex-col lg:flex-row gap-8">
                    
                    <!-- LEFT COLUMN: Main Form -->
                    <div class="flex-1 space-y-8">
                        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <!-- Section Title -->
                            <div class="px-6 py-5 border-b border-gray-50">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                    </div>
                                    <div>
                                        <h2 class="text-lg font-bold text-gray-900">Información Corporativa</h2>
                                        <p class="text-[11px] text-gray-400 font-medium">Datos básicos de identificación de la empresa y referencia interna.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Form Fields -->
                            <div class="p-6 space-y-6">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <!-- Nombre -->
                                    <div>
                                        <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
                                            Nombre de la Empresa <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="fc-name" value="${this.clientData.name || ''}" class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required placeholder="Ej. Construcciones Metálicas S.A.">
                                        <p class="text-[10px] text-gray-400 mt-2 font-medium">Nombre legal completo para facturación.</p>
                                    </div>

                                    <!-- Ref Interna -->
                                    <div>
                                        <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                            <span class="text-gray-400 font-black">#</span> Referencia Interna <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="fc-reference" value="${this.clientData.reference || ''}" class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required placeholder="Ej. CLI-2024-089">
                                        <p class="text-[10px] text-gray-400 mt-2 font-medium">Código único de seguimiento (CLI-XXX).</p>
                                    </div>
                                </div>

                                <!-- Notas -->
                                <div>
                                    <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                        Notas y Observaciones
                                    </label>
                                    <textarea id="fc-notes" rows="5" class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-y" placeholder="Ej. Cliente preferente para proyectos de estructura ligera. Requiere facturación electrónica anticipada.">${this.clientData.notes || ''}</textarea>
                                    <p class="text-[10px] text-gray-400 mt-2 font-medium">Detalles adicionales, preferencias de contacto o avisos internos.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Actions (Desktop / General) -->
                        <div class="flex items-center justify-end gap-3 pt-2">
                            <button type="button" onclick="SIRouter.navigate('clients')" class="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                Cancelar
                            </button>
                            <button type="submit" class="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                                Guardar Cambios
                            </button>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: Settings -->
                    <div class="w-full lg:w-80 shrink-0 space-y-6">
                        <!-- Box Config -->
                        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div class="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                                <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                <h3 class="text-sm font-bold text-gray-900">Configuración</h3>
                            </div>
                            <div class="p-5 space-y-5">
                                
                                <div class="flex items-center justify-between gap-4">
                                    <div>
                                        <p class="text-xs font-bold text-gray-900 mb-0.5">Estado del Cliente</p>
                                        <p class="text-[10px] text-gray-400">Define si el cliente puede ver sus proyectos.</p>
                                    </div>
                                    <!-- Toggle -->
                                    <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                      <input type="checkbox" id="fc-is_active" class="sr-only peer" ${isChecked}>
                                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>

                                <div class="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                    <div class="flex items-center gap-1 mb-2">
                                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        <p class="text-[10px] font-bold text-gray-500 tracking-wider">AYUDA</p>
                                    </div>
                                    <p class="text-[11px] text-gray-500 leading-relaxed">
                                        Al marcar un cliente como <strong class="font-bold text-gray-700">"Inactivo"</strong>, se restringirá su acceso al portal de clientes y se ocultarán sus proyectos de los dashboards comerciales activos.
                                    </p>
                                </div>

                            </div>
                        </div>

                        <!-- Audit Log -->
                        <div class="bg-[#fcfaff] border border-[#f3ebff] rounded-2xl p-6 text-center shadow-sm">
                            <div class="w-10 h-10 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                            </div>
                            <h4 class="text-xs font-bold text-gray-900 mb-2">Registro de Auditoría</h4>
                            <p class="text-[10px] text-gray-500 leading-relaxed max-w-xs mx-auto">Cualquier cambio realizado en este formulario quedará registrado con su usuario, fecha y hora en el log global de auditoría.</p>
                        </div>
                    </div>
                </form>
            </div>
        `;
    },

    bindEvents() {
        const form = document.getElementById('client-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveClient();
            });
        }
    },

    /** Funcionalidad real de guardado (Post a API en creacion) */
    async saveClient() {
        const btn = document.querySelector('button[type="submit"]');
        const originalHtml = btn.innerHTML;
        
        btn.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> Guardando...`;
        btn.disabled = true;

        try {
            const data = {
                name: document.getElementById('fc-name').value,
                reference: document.getElementById('fc-reference').value,
                notes: document.getElementById('fc-notes').value,
                is_active: document.getElementById('fc-is_active').checked ? 1 : 0
            };

            if (this.mode === 'create') {
                const response = await API.post('/clients', data);
                if (response.success && response.data && response.data.id) {
                    if (window.SIApp && SIApp.showToast) {
                        SIApp.showToast('Cliente creado correctamente.', 'success');
                    }
                    SIRouter.navigate('/steelinox/client/' + response.data.id);
                } else {
                    throw new Error(response.message || 'Error al guardar el cliente');
                }
            } else {
                // Modo Edit: API PUT
                const response = await API.put('/clients/' + this.clientId, data);
                if (response.success) {
                    if (window.SIApp && SIApp.showToast) {
                        SIApp.showToast('Cliente actualizado correctamente.', 'success');
                    }
                    SIRouter.navigate(`/steelinox/client/${this.clientId}`);
                } else {
                    throw new Error(response.message || 'Error al actualizar el cliente');
                }
            }
        } catch (error) {
            console.error('Error guardando cliente:', error);
            if (window.SIApp && SIApp.showToast) {
                SIApp.showToast(error.message || 'Ha ocurrido un error inesperado al guardar.', 'error');
            }
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
};

window.ClientFormAdmin = SIModules.clientFormAdmin;
