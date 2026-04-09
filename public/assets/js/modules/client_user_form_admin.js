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

                                    <!-- Empresa (Client) - CUSTOM DROPDOWN -->
                                    <div class="space-y-2 relative" id="client-dropdown-container">
                                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                                            Empresa <span class="text-red-500">*</span>
                                        </label>
                                        
                                        <!-- Valor oculto para el formulario -->
                                        <input type="hidden" id="user-client-id" name="client_id" value="${data?.client_id || ''}" required>

                                        <!-- Trigger del Dropdown -->
                                        <button type="button" 
                                            onclick="SIModules.clientUserFormAdmin.toggleClientDropdown(event)"
                                            id="btn-client-dropdown" 
                                            class="w-full px-5 py-3 bg-gray-50 border border-gray-200 text-sm font-bold text-gray-700 flex items-center justify-between hover:bg-white hover:border-orange-500 transition-all rounded-xl group">
                                            <div class="flex items-center gap-3">
                                                <svg class="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                                <span id="client-dropdown-label" class="truncate">${triggerLabel}</span>
                                            </div>
                                            <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-transform duration-300" id="icon-client-dropdown" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                                        </button>

                                        <!-- Panel del Dropdown -->
                                        <div id="drop-client-list" class="hidden absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <!-- Buscador interno -->
                                            <div class="p-3 border-b border-gray-50 bg-gray-50/50">
                                                <div class="relative group">
                                                    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                                    <input type="text" 
                                                        id="client-search-input"
                                                        oninput="SIModules.clientUserFormAdmin.filterClients(this.value)"
                                                        placeholder="Buscar por nombre o ref..." 
                                                        class="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none transition-all">
                                                </div>
                                            </div>
                                            <!-- Listado de items -->
                                            <ul id="client-items-list" class="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                                                <!-- Cargado por _renderClientList() -->
                                            </ul>
                                        </div>

                                        <p class="text-[10px] text-gray-400 mt-1 font-medium">El usuario tendrá acceso a los proyectos de esta empresa.</p>
                                    </div>

                                    <!-- Nombre -->
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                                            Nombre Completo <span class="text-red-500">*</span>
                                        </label>
                                        <div class="relative">
                                            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                            <input type="text" id="user-name" name="name" required
                                                value="${data?.name || ''}"
                                                placeholder="Ej: María García"
                                                class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                        </div>
                                    </div>

                                    <!-- Email -->
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                                            Email <span class="text-red-500">*</span>
                                        </label>
                                        <div class="relative">
                                            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                            <input type="email" id="user-email" name="email" required
                                                value="${data?.email || ''}"
                                                placeholder="ejemplo@empresa.com"
                                                class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                        </div>
                                    </div>

                                    <!-- Contraseña -->
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                                            Contraseña ${isEdit ? '' : '<span class="text-red-500">*</span>'}
                                        </label>
                                        <div class="relative">
                                            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                            <input type="password" id="user-password" name="password"
                                                ${isEdit ? '' : 'required'}
                                                placeholder="${isEdit ? 'Dejar en blanco para no modificar' : 'Mínimo 8 caracteres'}"
                                                class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                        </div>
                                        ${isEdit ? '<p class="text-[10px] text-gray-400 mt-1 font-medium">Solo rellena este campo si deseas cambiar la contraseña actual.</p>' : ''}
                                    </div>

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
                                            <input type="checkbox" id="user-is-active" name="is_active"
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
                                <svg id="save-spinner" class="w-4 h-4 hidden animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                <svg id="save-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
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
        const form = document.getElementById('form-user');
        if (!form) return;

        const id = form.querySelector('[name="id"]').value;
        const isEdit = !!id;

        // Validate
        const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const email = document.getElementById('user-email').value.trim();
        if (!regexEmail.test(email)) {
            SIApp.showToast('Email no válido', 'Por favor, ingresa un correo electrónico con formato correcto.', 'error');
            return;
        }

        const clientId = document.getElementById('user-client-id').value;
        if (!clientId) {
            SIApp.showToast('Empresa requerida', 'Debes seleccionar una empresa para el usuario.', 'error');
            return;
        }

        const spinner = document.getElementById('save-spinner');
        const icon = document.getElementById('save-icon');
        const btn = document.getElementById('btn-save-user');

        spinner?.classList.remove('hidden');
        icon?.classList.add('hidden');
        if (btn) btn.disabled = true;

        const payload = {
            client_id: clientId,
            name: document.getElementById('user-name').value.trim(),
            email: email,
            is_active: document.getElementById('user-is-active').checked ? 1 : 0
        };

        const password = document.getElementById('user-password').value;
        if (password) payload.password = password;

        try {
            let res;
            if (isEdit) {
                res = await API.put(`/users/${id}`, payload);
            } else {
                payload.password = password; // Required for new
                if (!password) {
                    SIApp.showToast('Contraseña requerida', 'La contraseña es obligatoria para nuevos usuarios.', 'error');
                    return;
                }
                res = await API.post('/users', payload);
            }

            if (res.success) {
                SIApp.showToast('Éxito', res.message || (isEdit ? 'Usuario actualizado.' : 'Usuario creado.'), 'success');
                setTimeout(() => SIRouter.navigate('users'), 1000);
            } else {
                let errorMsg = res.message || 'Error desconocido';
                if (res.errors) errorMsg += ': ' + Object.values(res.errors).join(', ');
                SIApp.showToast('Error', errorMsg, 'error');
            }
        } catch (e) {
            console.error(e);
            SIApp.showToast('Error', e.message, 'error');
        } finally {
            spinner?.classList.add('hidden');
            icon?.classList.remove('hidden');
            if (btn) btn.disabled = false;
        }
    }
};

window.SIModules.clientUserFormAdmin = SIModules.clientUserFormAdmin;
