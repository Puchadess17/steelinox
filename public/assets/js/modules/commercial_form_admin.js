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

        this.container.innerHTML = `
            <div class="fade-in max-w-4xl mx-auto">
                <!-- Back link -->
                <button onclick="SIRouter.navigate('commercials')" class="flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-colors mb-6 text-sm font-bold group">
                    <svg class="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    Volver al listado
                </button>

                <div class="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-gray-200/50 overflow-hidden">
                    <div class="bg-gray-50/50 px-8 py-10 border-b border-gray-100 flex items-center gap-6">
                         <div class="w-16 h-16 rounded-2xl bg-[#1a1b25] text-white flex items-center justify-center text-2xl font-black shadow-xl shrink-0">
                            ${initials}
                        </div>
                        <div>
                            <h1 class="text-2xl font-extrabold text-[#1a1b25] tracking-tight">${title}</h1>
                            <p class="text-sm text-gray-500 font-medium">${subtitle}</p>
                        </div>
                    </div>

                    <form id="form-commercial" class="p-8 lg:p-12 space-y-8">
                        <input type="hidden" name="id" value="${data?.id || ''}">

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Nombre -->
                            <div class="space-y-2">
                                <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <div class="relative group">
                                    <input type="text" name="name" value="${SIApp.escapeHtml(data?.name || '')}" required
                                        class="si-input w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b25] focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                        placeholder="Ej: Juanma Pérez">
                                    <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                    </div>
                                </div>
                            </div>

                            <!-- Email -->
                            <div class="space-y-2">
                                <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                <div class="relative group">
                                    <input type="email" name="email" value="${SIApp.escapeHtml(data?.email || '')}" required
                                        class="si-input w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b25] focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                        placeholder="correo@steelinox.es">
                                    <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                    </div>
                                </div>
                            </div>

                            <!-- Contraseña -->
                            <div class="space-y-2">
                                <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">${isEdit ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial'}</label>
                                <div class="relative group">
                                    <input type="password" name="password" ${isEdit ? '' : 'required'}
                                        class="si-input w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-bold text-[#1a1b25] focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                        placeholder="••••••••">
                                    <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors cursor-pointer" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                    </div>
                                </div>
                                ${isEdit ? '<p class="text-[10px] text-gray-400 font-medium ml-1">Deja este campo vacío para mantener la contraseña actual.</p>' : ''}
                            </div>

                            <!-- Estado (Solo en Edición) -->
                            ${isEdit ? `
                                <div class="space-y-2">
                                    <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado de la cuenta</label>
                                    <div class="flex items-center gap-4 bg-gray-50/50 border border-gray-100 p-4 rounded-xl">
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="is_active" class="sr-only peer" ${data.is_active == 1 ? 'checked' : ''}>
                                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                        </label>
                                        <span class="text-sm font-bold text-gray-700">Cuenta activa</span>
                                    </div>
                                </div>
                            ` : `
                                <input type="hidden" name="is_active" value="1">
                            `}
                        </div>

                        <div class="pt-8 border-t border-gray-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                            <div class="flex items-center gap-3 w-full sm:w-auto">
                                <button type="button" onclick="SIRouter.navigate('commercials')" class="flex-1 sm:flex-none px-8 py-3 bg-gray-50 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" class="flex-1 sm:flex-none px-10 py-3 bg-[#1a1b25] hover:bg-gray-800 text-white text-sm font-bold rounded-xl transition-all shadow-xl shadow-gray-900/10 hover:-translate-y-0.5" id="btn-submit-commercial">
                                    ${isEdit ? 'Guardar Cambios' : 'Dar de Alta'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
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
