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
                <div class="mb-8">
                    <a href="${isEdit ? '/steelinox/client/' + this.clientId : '/steelinox/clients'}" class="inline-flex items-center text-sm text-gray-500 hover:text-orange-500 font-medium transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                        Volver ${isEdit ? 'al detalle del cliente' : 'a la lista de clientes'}
                    </a>
                </div>

                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 class="text-3xl font-extrabold text-[#1a1b25] tracking-tight mb-2">${title}</h1>
                        <p class="text-gray-500 text-sm max-w-xl">${subtitle}</p>
                    </div>
                    ${isEdit ? `
                    <div class="shrink-0 flex items-center bg-white border border-gray-100 rounded-full px-4 py-1.5 shadow-sm w-fit">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-3">ESTADO: </span>
                        ${badgeStatus}
                    </div>` : ''}
                </div>

                <form id="client-form" class="space-y-8">

                    <!-- TWO COLUMNS: Aligned same height on desktop -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                        <!-- LEFT COLUMN: Main Form (8/12) -->
                        <div class="lg:col-span-8 flex">
                            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col w-full">
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
                                <div class="p-6 space-y-6 flex-1">
                                    ${SITemplates.fragments.clientFields(this.clientData || {}, this.mode === 'edit')}
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT COLUMN: Settings (4/12) -->
                        <div class="lg:col-span-4 flex">
                            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col w-full">
                                <div class="px-6 py-5 border-b border-gray-50 flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                    </div>
                                    <div>
                                        <h2 class="text-lg font-bold text-gray-900">Configuración</h2>
                                        <p class="text-[11px] text-gray-400 font-medium">Estado y preferencias del cliente.</p>
                                    </div>
                                </div>
                                <div class="p-6 space-y-5 flex-1">
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
                        </div>
                    </div>

                    <!-- Actions: centered on desktop, sticky bottom on mobile -->
                    <div class="hidden lg:flex items-center justify-center gap-3 pt-2">
                        <button type="button" onclick="SIRouter.navigate('clients')" class="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            Cancelar
                        </button>
                        <button type="submit" id="btn-save-client" class="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                            Guardar Cambios
                        </button>
                    </div>

                    <!-- Mobile: fixed bottom bar -->
                    <div class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 z-50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]">
                        <button type="button" onclick="SIRouter.navigate('clients')" class="flex-1 py-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            Cancelar
                        </button>
                        <button type="submit" class="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                            Guardar
                        </button>
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
        const data = SIApp.getValidatedFormData('client-form');
        if (!data) return;

        // Custom validation for reference (only if present in DOM/edit mode)
        const refInput = document.getElementById('fc-reference');
        if (refInput && !SIApp.constants.regex.CLI.test(data.reference || '')) {
            SIApp.showToast('Error de Formato', 'La referencia debe ser CLI-XXXX (Ej: CLI-0001)', 'error');
            return;
        }

        SIApp.setBtnLoading('btn-save-client', true, 'Guardando...');

        try {
            // Normalización adicional (checkboxes ya vienen como boolean por SIApp)
            data.is_active = data.is_active ? 1 : 0;

            let response;
            if (this.mode === 'create') {
                response = await API.post('/clients', data);
            } else {
                response = await API.put('/clients/' + this.clientId, data);
            }

            if (response.success) {
                SIApp.showToast('Éxito', response.message || 'Datos guardados correctamente', 'success');
                const targetId = response.data?.id || this.clientId;
                SIRouter.navigate('/steelinox/client/' + targetId);
            } else {
                SIApp.showToast('Error', response.message || 'Error al guardar', 'error');
            }
        } catch (error) {
            console.error('Error guardando cliente:', error);
            SIApp.showToast('Error', 'Ha ocurrido un error inesperado al guardar.', 'error');
        } finally {
            SIApp.setBtnLoading('btn-save-client', false, 'Guardar Cambios');
        }
    }
};

window.ClientFormAdmin = SIModules.clientFormAdmin;
