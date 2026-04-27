/**
 * STEEL INOX EXTRANET — SETTINGS MODULE
 * Gestión del perfil del usuario y preferencias de interfaz (tema, fuente).
 * Las preferencias de UI se persisten en localStorage para sobrevivir recargas.
 *
 * @api GET  /api/me       → { id, name, email, role, created_at, client_id }
 * @api PUT  /api/me       → null  (actualizar nombre de perfil)
 * @api POST /api/password/change → null  (cambio de contraseña)
 *
 * Depende de: api.js (API, SIToast), app.js (SIApp), auth.js (Auth)
 */
window.SIModules = window.SIModules || {};

SIModules.settings = {
    fontOptions: [
        { value: '16px', label: 'Normal' },
        { value: '18px', label: 'Grande' },
        { value: '20px', label: 'Muy Grande' }
    ],

    /**
     * INICIALIZACIÓN DE LA VISTA DE AJUSTES
     * Obtiene el perfil actualizado desde el backend si faltan campos clave,
     * genera el template y enlaza los eventos de los formularios.
     * @api GET /api/me → { id, name, email, role, created_at, client_id }
     */
    async init() {
        let user = SIApp.user;

        // Si el objeto user existe pero le faltan los nuevos campos (email o created_at), 
        // forzamos una recarga desde la API para actualizar sessionStorage.
        if (user && (!user.email || !user.created_at)) {
            const res = await API.get('/me');
            if (res.success && res.data) {
                SIApp.user = res.data;
                sessionStorage.setItem('si_user', JSON.stringify(res.data));
                user = res.data;
            }
        }

        if (!user) return;

        SIApp.setTitle('Ajustes de Perfil');

        const container = document.getElementById('main-content');
        if (!container) return;

        container.innerHTML = this._template(user);

        // Inicializar eventos
        this._initEvents();
    },

    /** Template principal de Ajustes */
    _template(user) {
        // Formatear la fecha "Desde..."
        const joinedDate = SIApp.formatDate(user.created_at);
        let identityLabel = '';

        if (user.role === 'cliente') {
            identityLabel = `Usuario de <span class="text-orange-500 font-bold">${SIApp.escapeHtml(user.client_name || 'Empresa')}</span>`;
        } else {
            identityLabel = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 mb-2 uppercase tracking-wide">${SIApp._roleLabel(user.role)} de Steel Inox</span>`;
        }

        // Recuperar tamaño de fuente
        const currentFontSize = localStorage.getItem('si-font-size') || '16px'; // default


        return `
            <div class="max-w-5xl mx-auto space-y-12 fade-in pb-12">
                
                <!-- HEADER DE IDENTIDAD (Muy despejado) -->
                <div class="flex flex-col items-center text-center space-y-6 py-8">
                    <div class="relative group">
                        ${SIApp.avatarInitials(user.name, 'w-24 h-24 rounded-[2rem]', 'text-4xl')}
                        <div class="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-lg border-2 border-orange-500">
                            <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                        </div>
                    </div>
                    <div>
                        <div class="mb-2">${identityLabel}</div>
                        <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">${SIApp.escapeHtml(user.name)}</h1>
                        <div class="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500 dark:text-zinc-400 font-medium">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full">
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                Miembro desde ${joinedDate}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- CUADRÍCULA DE AJUSTES (Espaciosa) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <!-- 1. DATOS PERSONALES -->
                    <section class="settings-card md:col-span-1 flex flex-col justify-between">
                        <div>
                            <div class="settings-section-header">
                                <div class="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                </div>
                                <h3 class="text-xl font-extrabold text-gray-900 dark:text-white">Datos de la Cuenta</h3>
                            </div>
                            
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                                    <input type="text" id="set-name" value="${SIApp.escapeHtml(user.name || '')}" 
                                           class="w-full px-5 py-3.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-sm" 
                                           placeholder="Ej: Juan Pérez">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                                    <div class="relative">
                                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                        </div>
                                        <input type="email" value="${SIApp.escapeHtml(user.email || 'No especificado')}" readonly
                                            class="w-full pl-11 pr-5 py-3.5 bg-gray-100 dark:bg-zinc-800/80 border border-transparent rounded-2xl text-gray-500 dark:text-gray-400 font-medium text-sm cursor-not-allowed select-none">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="pt-8 flex justify-end">
                            <button onclick="SIModules.settings.saveProfile()" class="px-8 py-3.5 bg-gray-900 dark:bg-orange-500 text-white dark:text-white rounded-2xl text-sm font-black shadow-xl hover:bg-orange-600 transition-all active:scale-95 leading-none">
                                Guardar Perfil
                            </button>
                        </div>
                    </section>

                    <!-- 2. PREFERENCIAS VISUALES -->
                    <section class="settings-card">
                        <div class="settings-section-header">
                            <div class="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                            </div>
                            <h3 class="text-xl font-extrabold text-gray-900 dark:text-white">Interfaz</h3>
                        </div>

                        <div class="space-y-6">
                            <div class="flex flex-col md:flex-row items-center justify-between p-5 bg-gray-50 dark:bg-zinc-800/40 rounded-[2rem] border border-gray-100 dark:border-zinc-700 group gap-4">
                                <div class="flex items-center gap-4 w-full md:w-auto">
                                    <div class="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-orange-500 transition-colors shadow-sm shrink-0">
                                        <svg class="sun w-6 h-6 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
                                        <svg class="moon w-6 h-6 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                                    </div>
                                    <div>
                                        <span class="block text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Modo Oscuro</span>
                                        <span class="text-xs text-gray-400 font-medium italic">Cambiar apariencia visual</span>
                                    </div>
                                </div>
                                
                                <button onclick="SIApp.toggleTheme()" class="theme-switcher-btn scale-110" id="theme-toggle-btn">
                                    <svg class="sun w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
                                    <svg class="moon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                                </button>
                            </div>

                            <div class="flex flex-col md:flex-row items-center justify-between p-5 bg-gray-50 dark:bg-zinc-800/40 rounded-[2rem] border border-gray-100 dark:border-zinc-700 group gap-4 relative">
                                <div class="flex items-center gap-4 w-full md:w-auto">
                                    <div class="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-purple-500 transition-colors shadow-sm shrink-0">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
                                    </div>
                                    <div>
                                        <span class="block text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Tamaño de Letra</span>
                                        <span class="text-xs text-gray-400 font-medium italic">Mejora la legibilidad</span>
                                    </div>
                                </div>
                                
                                <!-- Custom Dropdown -->
                                <div class="relative w-full md:w-48" id="font-size-dropdown-container">
                                    <button onclick="SIModules.settings.toggleFontSizeDropdown(event)" 
                                            class="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-5 py-3 rounded-2xl flex items-center justify-between shadow-sm hover:border-purple-500 transition-all group/btn">
                                        <span id="current-font-label" class="text-sm font-bold text-gray-900 dark:text-white">
                                            ${this.fontOptions.find(opt => opt.value === currentFontSize)?.label || 'Normal'}
                                        </span>
                                        <svg id="font-dropdown-icon" class="w-4 h-4 text-gray-400 group-hover/btn:text-purple-500 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                                        </svg>
                                    </button>
                                    
                                    <div id="font-size-options" class="hidden absolute z-50 bottom-full md:bottom-auto md:top-full left-0 w-full mt-2 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden py-1 fade-in-up">
                                        ${this._renderFontSizeOptions(currentFontSize)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        `;
    },


    /** Helper para renderizar las opciones de tamaño de fuente con el tick en la seleccionada */
    _renderFontSizeOptions(currentValue) {
        return this.fontOptions.map(opt => `
            <div onclick="SIModules.settings.changeFontSize('${opt.value}', '${opt.label}')" 
                 class="px-5 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors flex items-center justify-between group/item">
                <span>${opt.label}</span>
                ${currentValue === opt.value ? '<svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
            </div>
        `).join('');
    },

    /** Lógica de eventos */
    _initEvents() {
        // No necesitamos toggle local porque ya usamos SIApp.toggleTheme()
    },

    /** Abre el modal de cambio de contraseña reutilizando SITemplates */
    openPasswordModal() {
        const contentHtml = `
            <div class="space-y-6">
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Contraseña Actual</label>
                    <div class="relative">
                        <input type="password" id="modal-current-pwd" required
                               class="w-full px-5 py-3.5 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-sm" 
                               placeholder="••••••••">
                        <button type="button" onclick="SIApp.togglePasswordVisibility(this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors">
                            <span class="eye-open"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></span>
                            <span class="eye-closed hidden"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19a9.97 9.97 0 01-9.543-7 9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg></span>
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nueva Contraseña</label>
                    <div class="relative">
                        <input type="password" id="modal-new-pwd" required
                               oninput="SIApp.validatePasswordRequirements(this)"
                               class="w-full px-5 py-3.5 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-sm" 
                               placeholder="••••••••">
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Repetir Nueva Contraseña</label>
                    <input type="password" id="modal-repeat-pwd" required
                           class="w-full px-5 py-3.5 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-sm" 
                           placeholder="••••••••">
                </div>
            </div>
        `;

        const modalHtml = SITemplates.modal({
            id: 'modal-change-password',
            title: 'Actualizar Contraseña',
            contentHtml: contentHtml,
            saveBtnLabel: 'Actualizar Ahora',
            saveActionLabel: 'SIModules.settings.confirmPasswordChange()',
            maxWidth: 'max-w-md'
        });

        // Eliminar existente si lo hay
        const existing = document.getElementById('modal-change-password');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        SIApp.modal.open('modal-change-password');
    },

    /** Confirmar cambio desde el modal */
    confirmPasswordChange() {
        const current = document.getElementById('modal-current-pwd').value;
        const newPwd = document.getElementById('modal-new-pwd').value;
        const repeat = document.getElementById('modal-repeat-pwd').value;

        if (!current || !newPwd || !repeat) {
            SIApp.showToast('Atención', 'Todos los campos son obligatorios.', 'warning');
            return;
        }

        if (newPwd !== repeat) {
            SIApp.showToast('Error', 'Las contraseñas nuevas no coinciden.', 'error');
            return;
        }

        const isWeak = !SIApp.validatePasswordRequirements(document.getElementById('modal-new-pwd'));
        if (isWeak) {
            SIApp.showToast('Seguridad', 'La contraseña no cumple los requisitos.', 'error');
            return;
        }

        // Éxito simulado
        SIApp.showToast('Éxito', 'Contraseña actualizada correctamente.', 'success');
        SIApp.modal.close('modal-change-password');
    },

    /** Guardar Perfil REAL */
    async saveProfile() {
        const nameInput = document.getElementById('set-name');
        const name = nameInput.value.trim();
        const btn = document.querySelector('button[onclick="SIModules.settings.saveProfile()"]');

        if (!name) {
            SIApp.showToast('Error', 'Introduce tu nombre.', 'error');
            return;
        }

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="si-spinner-xs"></span> Guardando...`;
            }

            const result = await API.put('/me', { name });

            if (result.success) {
                // Actualizar objeto global y sesión
                SIApp.user.name = name;
                sessionStorage.setItem('si_user', JSON.stringify(SIApp.user));

                SIApp.showToast('Perfil', 'Tus datos se han guardado correctamente.', 'success');

                // Actualizar UI del header sin recargar
                const headerName = document.getElementById('header-user-name');
                if (headerName) headerName.textContent = name;
                const headerAvatar = document.getElementById('header-user-avatar');
                if (headerAvatar) headerAvatar.innerHTML = SIApp.avatarInitials(name, 'w-8 h-8 rounded-lg', 'text-[10px]');

                // Refrescar vista actual para actualizar iniciales grandes
                this.init();
            } else {
                SIApp.showToast('Error', result.message || 'No se pudo actualizar el perfil', 'error');
            }
        } catch (error) {
            console.error('Error al guardar perfil:', error);
            SIApp.showToast('Error', 'Error de conexión con el servidor', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `Guardar Perfil`;
            }
        }
    },


    /** Manejo del dropdown personalizado de tamaño de fuente */
    toggleFontSizeDropdown(e) {
        if (e) e.stopPropagation();
        const drop = document.getElementById('font-size-options');
        const icon = document.getElementById('font-dropdown-icon');
        if (!drop) return;

        const isHidden = drop.classList.contains('hidden');

        // Cerrar otros dropdowns si los hubiera (buena práctica)
        document.querySelectorAll('[id$="-options"]').forEach(d => {
            if (d !== drop) d.classList.add('hidden');
        });

        if (isHidden) {
            drop.classList.remove('hidden');
            icon.style.transform = 'rotate(180deg)';

            // Listener para cerrar al hacer clic fuera
            const closeHandler = (ev) => {
                if (!drop.contains(ev.target)) {
                    drop.classList.add('hidden');
                    icon.style.transform = 'rotate(0deg)';
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 10);
        } else {
            drop.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    },

    /** Cambiar tamaño de letra y persistirlo en localStorage */
    changeFontSize(value, label) {
        localStorage.setItem('si-font-size', value);
        document.documentElement.style.fontSize = value;

        // Actualizar UI del dropdown
        const labelEl = document.getElementById('current-font-label');
        if (labelEl) labelEl.textContent = label;

        // Actualizar los ticks de las opciones
        const optionsContainer = document.getElementById('font-size-options');
        if (optionsContainer) {
            optionsContainer.innerHTML = this._renderFontSizeOptions(value);
        }

        // Cerrar dropdown
        const drop = document.getElementById('font-size-options');
        const icon = document.getElementById('font-dropdown-icon');
        if (drop) drop.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';

        SIApp.showToast('Interfaz', `Tamaño de letra: ${label}`, 'success');
    }
};
