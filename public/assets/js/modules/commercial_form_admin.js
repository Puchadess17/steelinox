/**
 * Steel Inox — Commercial Form Admin
 * Formularios de Alta y Edición de comerciales.
 */
window.SIModules = window.SIModules || {};

SIModules.commercialFormAdmin = {

    get container() {
        return document.getElementById('main-content');
    },

    /** 1. VISTA DE ALTA (CREAR) */
    async loadCreateSPA() {
        this._renderForm('Alta de Nuevo Comercial', 'Crea una nueva cuenta de acceso para un gestor comercial.', null);
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
            const result = await API.get(`/commercials/${id}`);
            if (!result.success) {
                this.container.innerHTML = `<div class="p-10 text-center text-red-500">${result.message}</div>`;
                return;
            }

            this._renderForm('Editar Comercial', 'Modifica los datos de acceso o el estado de la cuenta.', result.data.info);

        } catch (error) {
            console.error('Error loading edit form:', error);
            this.container.innerHTML = `<div class="p-10 text-center text-red-500">Error al cargar el formulario.</div>`;
        }
    },

    /** 3. CORE: RENDERIZADO DEL FORMULARIO */
    _renderForm(title, subtitle, data = null) {
        const isEdit = !!data;
        const initials = isEdit ? SIApp._getInitials(data.name) : '?';
        const badgeStatus = (window.SIApp && data) ? SIApp.activeBadge(data.is_active) : '';

        this.container.innerHTML = `
            <div class="max-w-6xl mx-auto w-full pb-10 fade-in px-2 sm:px-0">
                <!-- Back link -->
                <div class="mb-8">
                    <button onclick="SIRouter.navigate('commercials')" class="inline-flex items-center text-sm text-gray-500 hover:text-orange-500 font-medium transition-colors group">
                        <svg class="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                        Volver al directorio
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

                <form id="form-commercial" class="space-y-8">
                    <input type="hidden" name="id" value="${data?.id || ''}">

                    <!-- TWO COLUMNS -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                        <!-- LEFT COLUMN: Main Form -->
                        <div class="lg:col-span-8 flex">
                            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col w-full">
                                <div class="px-6 py-5 border-b border-gray-50">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                        </div>
                                        <div>
                                            <h2 class="text-lg font-bold text-gray-900">Información del Comercial</h2>
                                            <p class="text-[11px] text-gray-400 font-medium">Datos personales y de contacto para el acceso al sistema.</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="p-6 space-y-6 flex-1">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <!-- Nombre -->
                                        <div>
                                            <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                                Nombre Completo <span class="text-red-500">*</span>
                                            </label>
                                            <input type="text" name="name" value="${SIApp.escapeHtml(data?.name || '')}" 
                                                class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                                                required placeholder="Ej: Juanma Pérez">
                                            <p class="text-[10px] text-gray-400 mt-2 font-medium">Nombre y apellidos para el perfil público.</p>
                                        </div>

                                        <!-- Email -->
                                        <div>
                                            <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                                Email Corporativo <span class="text-red-500">*</span>
                                            </label>
                                            <input type="email" name="email" value="${SIApp.escapeHtml(data?.email || '')}" 
                                                class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                                                required placeholder="correo@steelinox.es">
                                            <p class="text-[10px] text-gray-400 mt-2 font-medium">Se usará como nombre de usuario para el inicio de sesión.</p>
                                        </div>

                                        <!-- Contraseña -->
                                        <div class="md:col-span-2">
                                            <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                                ${isEdit ? 'Cambiar Contraseña (Opcional)' : 'Contraseña Segura'}
                                            </label>
                                            <div class="relative">
                                                <input type="password" name="password" ${isEdit ? '' : 'required'}
                                                    oninput="SIApp.validatePasswordRequirements(this)"
                                                    class="w-full bg-transparent border border-gray-200 rounded-xl px-4 py-2.5 pr-12 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                                                    placeholder="••••••••">
                                                <button type="button" 
                                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors" 
                                                    onclick="SIApp.togglePasswordVisibility(this)">
                                                    <span class="eye-open">
                                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </span>
                                                    <span class="eye-closed hidden">
                                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    </span>
                                                </button>
                                            </div>
                                            <p class="text-[10px] text-gray-400 mt-2 font-medium">${isEdit ? 'Deje este campo vacío para mantener la actual.' : 'Mínimo 8 caracteres (letras y números).'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT COLUMN: Sidebar Settings -->
                        <div class="lg:col-span-4 space-y-6">
                            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5">Estado de la cuenta</h3>
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div>
                                            <p class="text-sm font-bold text-gray-900">Acceso Habilitado</p>
                                            <p class="text-[10px] text-gray-400 font-medium">Permitir login en extranet</p>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="is_active" class="sr-only peer" ${(!data || data.is_active == 1) ? 'checked' : ''}>
                                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" id="btn-submit-commercial" class="w-full bg-[#1a1b25] hover:bg-gray-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-gray-900/10 transition-all hover:-translate-y-1 flex items-center justify-center gap-3">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                                ${isEdit ? 'Guardar Cambios' : 'Dar de Alta'}
                            </button>
                        </div>
                    </div>
                </form>

            </div>
        `;

        // Atar el submit
        const form = document.getElementById('form-commercial');
        form.addEventListener('submit', (e) => this._handleSubmit(e, isEdit));
    },

    /** 4. MANEJAR SUBMIT */
    async _handleSubmit(e, isEdit) {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById('btn-submit-commercial');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Normalizar checkbox de FlyonUI/Tailwind
        data.is_active = form.is_active.checked ? 1 : 0;

        const id = data.id;
        delete data.id;

        try {
            btn.disabled = true;
            btn.innerHTML = `<span class="si-spinner-mini"></span> Procesando...`;

            let result;
            if (isEdit) {
                result = await API.put(`/commercials/${id}`, data);
            } else {
                result = await API.post('/commercials', data);
            }

            if (result.success) {
                SIApp.showToast('¡Éxito!', isEdit ? 'Comercial actualizado correctamente.' : 'Nuevo comercial registrado.', 'success');
                setTimeout(() => SIRouter.navigate('commercials'), 500);
            } else {
                SIApp.showToast('Error', result.message || 'No se pudo completar la acción.', 'error');
                // Mostrar errores de validación si existen
                if (result.errors) {
                    console.error('Validation errors:', result.errors);
                }
            }

        } catch (error) {
            console.error('Submit error:', error);
            SIApp.showToast('Error Fatal', 'No se pudo conectar con la base de datos.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = isEdit ? 'Guardar Cambios' : 'Dar de Alta';
        }
    }
};

// Exportar para que router lo encuentre
window.SIModules.commercialFormAdmin = SIModules.commercialFormAdmin;
