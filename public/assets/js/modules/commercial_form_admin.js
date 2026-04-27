/**
 * STEEL INOX EXTRANET — COMMERCIAL FORM ADMIN
 * Formulario de alta y edición de usuarios de tipo 'comercial' (gestor de proyectos).
 * Opera en dos modos: creación (POST) y edición (PUT), determinados por la URL.
 *
 * @api GET  /api/commercials/:id → { info: User }  (cargar datos en edición)
 * @api POST /api/commercials     → null             (crear comercial)
 * @api PUT  /api/commercials/:id → null             (actualizar comercial)
 *
 * Depende de: api.js (API, SIToast), app.js (SIApp), templates.js (SITemplates), router.js (SIRouter)
 */
window.SIModules = window.SIModules || {};

SIModules.commercialFormAdmin = {

    get container() {
        return document.getElementById('main-content');
    },

    /**
     * VISTA DE ALTA (CREAR)
     * Muestra el formulario vacío para registrar un nuevo comercial.
     */
    /** 1. VISTA DE ALTA (CREAR) */
    async loadCreateSPA() {
        this._renderForm('Alta de Nuevo Comercial', 'Crea una nueva cuenta de acceso para un gestor comercial.', null);
    },

    /**
     * VISTA DE EDICIÓN (EDITAR)
     * Extrae el ID del último segmento de la URL, obtiene los datos del comercial
     * y muestra el formulario precargado.
     * @api GET /api/commercials/:id → { info: User }
     */
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

    /**
     * RENDERIZADO DEL FORMULARIO
     * Genera el layout en dos columnas (campos + avatar/estado/botón).
     * Enlaza el submit al final del render.
     * @param {string} title     - Título de la página
     * @param {string} subtitle  - Descripción de la acción
     * @param {Object|null} data - Datos del comercial (null en creación)
     */
    /** 3. CORE: RENDERIZADO DEL FORMULARIO */
    _renderForm(title, subtitle, data = null) {
        const isEdit = !!data;
        const badgeStatus = (window.SIApp && data) ? SIApp.activeBadge(data.is_active) : '';

        this.container.innerHTML = `
            <div class="max-w-6xl mx-auto w-full pb-10 fade-in px-2 sm:px-0">
                <!-- Breadcrumb -->
                <div class="flex items-center gap-2 mb-4">
                    <nav class="flex text-sm text-gray-500 gap-2" aria-label="Breadcrumb">
                        <a data-route="commercials" href="/steelinox/commercials" class="hover:text-orange-500 transition-colors font-medium">Comerciales</a>
                        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        <span class="text-gray-900 font-bold">${title}</span>
                    </nav>
                </div>

                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 class="text-3xl font-extrabold text-[#000000] tracking-tight mb-2">${title}</h1>
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
                            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col w-full relative">
                                <div class="px-6 py-5 border-b border-gray-50 rounded-t-2xl">
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
                                    ${SITemplates.fragments.userFields(data || {}, {
                                        type: 'commercial',
                                        includeStatusToggle: false,
                                        moduleName: 'commercialFormAdmin'
                                    })}
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT COLUMN: Sidebar Settings -->
                        <div class="lg:col-span-4 space-y-6">
                            <!-- Avatar Preview -->
                            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center gap-4">
                                ${isEdit 
                                    ? SIApp.avatarInitials(data.name, 'w-20 h-20 rounded-2xl', 'text-2xl')
                                    : `<div class="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl font-black text-gray-300 border-4 border-white shadow-sm">
                                         <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                       </div>`
                                }
                                <div>
                                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cuenta Comercial</p>
                                    ${isEdit ? `<p class="text-sm font-bold text-gray-700 mt-1">Gestor de Proyectos</p>` : '<p class="text-sm text-gray-400 mt-1">Nuevo gestor del sistema</p>'}
                                </div>
                            </div>

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

                            <button type="submit" id="btn-submit-commercial" class="w-full bg-[#000000] hover:bg-gray-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-gray-900/10 transition-all hover:-translate-y-1 flex items-center justify-center gap-3">
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

    /**
     * MANEJO DEL SUBMIT
     * Valida el formulario, normaliza is_active (boolean → int) y ejecuta
     * POST (crear) o PUT (actualizar) según el modo.
     * @api POST /api/commercials      → null  (creación)
     * @api PUT  /api/commercials/:id  → null  (edición)
     * @param {Event} e       - Evento submit del formulario
     * @param {boolean} isEdit - true si estamos en modo edición
     */
    /** 4. MANEJAR SUBMIT */
    async _handleSubmit(e, isEdit) {
        e.preventDefault();
        const data = SIApp.getValidatedFormData('form-commercial');
        if (!data) return;

        // Custom normalization for is_active (boolean to int for this API)
        data.is_active = data.is_active ? 1 : 0;
        const id = data.id;
        delete data.id;

        const btnLabel = isEdit ? 'Guardar Cambios' : 'Dar de Alta';
        SIApp.setBtnLoading('btn-submit-commercial', true, 'Procesando...');

        try {
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
                SIApp.handleApiError(result, 'No se pudo completar la acción.');
            }
        } catch (error) {
            console.error('Submit error:', error);
            SIApp.showToast('Error', 'No se pudo conectar con el servidor.', 'error');
        } finally {
            SIApp.setBtnLoading('btn-submit-commercial', false, btnLabel);
        }
    }
};

// Exportar para que router lo encuentre
window.SIModules.commercialFormAdmin = SIModules.commercialFormAdmin;
