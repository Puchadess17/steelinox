/**
 * Steel Inox — Client User Form Admin
 * Formularios de Alta y Edición de usuarios cliente.
 */
window.SIModules = window.SIModules || {};

SIModules.clientUserFormAdmin = {

    get container() {
        return document.getElementById('main-content');
    },

    clients: [], // Cache de clientes para el selector

    /** 1. VISTA DE ALTA (CREAR) */
    async loadCreateSPA() {
        await this._loadClients();
        this._renderForm('Alta de Nuevo Usuario Cliente', 'Crea una nueva cuenta de acceso para un usuario de un cliente.', null);
    },

    /** 2. VISTA DE EDICIÓN (EDITAR) */
    async loadEditSPA() {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 1];

        if (!id || isNaN(id)) {
            SIRouter.show404();
            return;
        }

        try {
            const [clientsResult, userResult] = await Promise.all([
                this._loadClients(),
                API.get(`/users/${id}`)
            ]);

            if (!userResult.success) {
                this.container.innerHTML = `<div class="p-10 text-center text-red-500">${userResult.message}</div>`;
                return;
            }

            this._renderForm('Editar Usuario Cliente', 'Modifica los datos de acceso o el estado de la cuenta.', userResult.data);

        } catch (error) {
            console.error('Error loading edit form:', error);
            this.container.innerHTML = `<div class="p-10 text-center text-red-500">Error al cargar el formulario.</div>`;
        }
    },

    async _loadClients() {
        try {
            const result = await API.get('/clients');
            if (result.success && result.data) {
                // Support both array and {list} format
                this.clients = Array.isArray(result.data) ? result.data : (result.data.list || []);
            }
        } catch (e) {
            console.error('Error loading clients:', e);
            this.clients = [];
        }
    },

    /** 3. CORE: RENDERIZADO DEL FORMULARIO */
    _renderForm(title, subtitle, data = null) {
        const isEdit = !!data;
        const initials = isEdit ? SIApp._getInitials(data.name) : '?';
        const badgeStatus = (window.SIApp && data) ? SIApp.activeBadge(data.is_active) : '';

        // Buscamos el cliente actual para mostrarlo en el trigger si es edición
        const selectedClient = data ? this.clients.find(c => c.id == data.client_id) : null;
        const triggerLabel = selectedClient
            ? `${SIApp.escapeHtml(selectedClient.name)} (${SIApp.escapeHtml(selectedClient.reference || '')})`
            : '-- Selecciona una empresa --';

        this.container.innerHTML = `
            <div class="max-w-6xl mx-auto w-full pb-10 fade-in px-2 sm:px-0">
                <!-- Back link -->
                <div class="mb-8">
                    <button onclick="SIRouter.navigate('users')" class="inline-flex items-center text-sm text-gray-500 hover:text-orange-500 font-medium transition-colors group">
                        <svg class="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                        Volver al listado
                    </button>
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

                <form id="form-user" class="space-y-8">
                    <input type="hidden" name="id" value="${data?.id || ''}">

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                        <!-- LEFT: Main Form -->
                        <div class="lg:col-span-8 flex">
                            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col w-full">
                                <!-- Card Header -->
                                <div class="px-7 py-5 border-b border-gray-50 bg-gray-50/30">
                                    <h2 class="text-sm font-bold text-[#1a1b25]">Información de la Cuenta</h2>
                                    <p class="text-xs text-gray-400 mt-0.5">Datos de identificación y acceso del usuario.</p>
                                </div>
                                <div class="p-7 space-y-6 flex-1">
                                    ${SITemplates.fragments.userFields(data || {}, {
                                        includeClientSelector: true,
                                        clients: this.clients,
                                        moduleName: 'clientUserFormAdmin'
                                    })}
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT: Estado + Avatar -->
                        <div class="lg:col-span-4 space-y-6">

                            <!-- Avatar / Initials Card -->
                            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center gap-4">
                                <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-2xl font-black text-blue-600 border-4 border-white shadow-lg">
                                    ${isEdit ? initials : `<svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`}
                                </div>
                                <div>
                                    <p class="text-xs font-black text-gray-400 uppercase tracking-widest">Usuario Cliente</p>
                                    ${isEdit ? `<p class="text-sm font-bold text-gray-700 mt-1">Miembro desde ${SIApp.formatDate(data.created_at)}</p>` : '<p class="text-sm text-gray-400 mt-1">Nuevo acceso a la extranet</p>'}
                                </div>
                            </div>

                            <!-- Estado Card -->
                            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div class="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
                                    <h3 class="text-sm font-bold text-[#1a1b25]">Estado de la Cuenta</h3>
                                </div>
                                <div class="p-6">
                                    <label class="flex items-center justify-between gap-3 cursor-pointer group">
                                        <div>
                                            <p class="text-sm font-bold text-gray-900">Cuenta Activa</p>
                                            <p class="text-xs text-gray-400 mt-0.5">El usuario puede iniciar sesión</p>
                                        </div>
                                        <div class="relative">
                                            <input type="hidden" name="is_active_sent" value="1">
                                            <input type="checkbox" id="user-is-active" name="is_active" value="1"
                                                class="sr-only peer"
                                                ${!isEdit || data?.is_active == 1 ? 'checked' : ''}>
                                            <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 transition-colors peer-focus:ring-2 peer-focus:ring-orange-500/20"></div>
                                            <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- Guardar Button -->
                            <button type="button" id="btn-save-user" onclick="SIModules.clientUserFormAdmin.save()"
                                class="w-full flex items-center justify-center gap-2 bg-[#1a1b25] hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                ${isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
                            </button>
                        </div>

                    </div>
                </form>
            </div>
        `;

        // Inicializar el listado de clientes en el dropdown
        this._renderClientList();

        // Cerrar al hacer clic fuera
        this._initOutsideClick();
    },

    /** 4. LÓGICA DEL DROPDOWN BUSCABLE */
    toggleClientDropdown(e) {
        if (e) e.stopPropagation();
        const drop = document.getElementById('drop-client-list');
        const icon = document.getElementById('icon-client-dropdown');
        if (!drop) return;

        const isHidden = drop.classList.contains('hidden');
        if (isHidden) {
            drop.classList.remove('hidden');
            icon.style.transform = 'rotate(180deg)';
            // Focus al buscador
            setTimeout(() => document.getElementById('client-search-input')?.focus(), 100);
        } else {
            drop.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    },

    filterClients(val) {
        const term = val.toLowerCase().trim();
        this._renderClientList(term);
    },

    _renderClientList(filter = '') {
        const list = document.getElementById('client-items-list');
        if (!list) return;

        const filtered = filter
            ? this.clients.filter(c =>
                c.name.toLowerCase().includes(filter) ||
                (c.reference && c.reference.toLowerCase().includes(filter))
            )
            : this.clients;

        if (filtered.length === 0) {
            list.innerHTML = `<li class="px-5 py-4 text-xs font-bold text-gray-400 text-center">No se encontraron clientes</li>`;
            return;
        }

        list.innerHTML = filtered.map(c => `
            <li onclick="SIModules.clientUserFormAdmin.selectClient(${c.id}, '${SIApp.escapeHtml(c.name)}', '${SIApp.escapeHtml(c.reference || '')}')"
                class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between group/item">
                <div class="flex flex-col">
                    <span class="truncate">${SIApp.escapeHtml(c.name)}</span>
                    <span class="text-[10px] font-black text-gray-300 group-hover/item:text-orange-400/70 uppercase tracking-widest">${SIApp.escapeHtml(c.reference || 'SIN REF')}</span>
                </div>
                <svg class="w-4 h-4 text-orange-500 opacity-0 group-hover/item:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            </li>
        `).join('');
    },

    selectClient(id, name, ref) {
        const input = document.getElementById('user-client-id');
        const label = document.getElementById('client-dropdown-label');
        const drop = document.getElementById('drop-client-list');
        const icon = document.getElementById('icon-client-dropdown');

        if (input) input.value = id;
        if (label) label.textContent = `${name} (${ref || '—'})`;

        if (drop) drop.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';

        // Limpiar buscador para la próxima vez
        const searchInput = document.getElementById('client-search-input');
        if (searchInput) searchInput.value = '';
        this._renderClientList();
    },

    _initOutsideClick() {
        // Asegurarse de quitar listener anterior si existe para evitar duplicados
        if (this._outsideHandler) document.removeEventListener('click', this._outsideHandler);

        this._outsideHandler = (e) => {
            const container = document.getElementById('client-dropdown-container');
            if (container && !container.contains(e.target)) {
                const drop = document.getElementById('drop-client-list');
                const icon = document.getElementById('icon-client-dropdown');
                if (drop && !drop.classList.contains('hidden')) {
                    drop.classList.add('hidden');
                    icon.style.transform = 'rotate(0deg)';
                }
            }
        };

        document.addEventListener('click', this._outsideHandler);
    },

    /** 5. GUARDAR */
    async save() {
        const data = SIApp.getValidatedFormData('form-user');
        if (!data) return;

        const isEdit = !!data.id;

        // Extra validation for password on create
        if (!isEdit && !data.password) {
            SIApp.showToast('Contraseña requerida', 'La contraseña es obligatoria para nuevos usuarios.', 'error');
            return;
        }

        SIApp.setBtnLoading('btn-save-user', true, isEdit ? 'Guardando...' : 'Creando...');

        try {
            let res;
            if (isEdit) {
                res = await API.put(`/users/${data.id}`, data);
            } else {
                res = await API.post('/users', data);
            }

            if (res.success) {
                SIApp.showToast('Éxito', res.message || (isEdit ? 'Usuario actualizado.' : 'Usuario creado.'), 'success');
                setTimeout(() => SIRouter.navigate('users'), 1000);
            } else {
                SIApp.showToast('Error', res.message || 'Error en la operación', 'error');
            }
        } catch (e) {
            console.error(e);
            SIApp.showToast('Error', e.message, 'error');
        } finally {
            SIApp.setBtnLoading('btn-save-user', false, isEdit ? 'Guardar Cambios' : 'Crear Usuario');
        }
    }
};

window.SIModules.clientUserFormAdmin = SIModules.clientUserFormAdmin;
