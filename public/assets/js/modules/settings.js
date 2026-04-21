/**
 * Steel Inox Extranet — Settings Module
 * Maneja la interfaz de ajustes de usuario con diseño premium y modal de seguridad.
 */
window.SIModules = window.SIModules || {};

SIModules.settings = {
    /** Inicializar la vista de ajustes */
    async init() {
        const user = SIApp.user;
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
            identityLabel = `Usuario de <span class="text-orange-500 font-bold">${SIApp.escapeHtml(user.client_name || 'Empresa')}</span>, desde ${joinedDate}`;
        } else {
            identityLabel = `<span class="text-orange-500 font-bold">${SIApp._roleLabel(user.role)}</span> de Steel Inox, desde ${joinedDate}`;
        }

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
                        <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">${SIApp.escapeHtml(user.name)}</h1>
                        <p class="text-gray-500 dark:text-zinc-400 font-medium text-lg mt-2">${identityLabel}</p>
                    </div>
                </div>

                <!-- CUADRÍCULA DE AJUSTES (Espaciosa) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <!-- 1. DATOS PERSONALES -->
                    <section class="settings-card flex flex-col justify-between">
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
                                    <input type="email" value="${SIApp.escapeHtml(user.email || '')}" readonly
                                           class="w-full px-5 py-3.5 bg-gray-100 dark:bg-zinc-800/30 border border-transparent rounded-2xl text-gray-400 font-medium text-sm cursor-not-allowed">
                                </div>
                            </div>
                        </div>
                        
                        <div class="pt-8 flex justify-end">
                            <button onclick="SIModules.settings.saveProfile()" class="px-8 py-3.5 bg-gray-900 dark:bg-orange-500 text-white dark:text-white rounded-2xl text-sm font-black shadow-xl hover:bg-orange-600 transition-all active:scale-95 leading-none">
                                Guardar Perfil
                            </button>
                        </div>
                    </section>

                    <!-- 2. SEGURIDAD (Acceso a Modal) -->
                    <section class="settings-card flex flex-col justify-between border-2 border-transparent hover:border-orange-500/20 transition-all">
                        <div>
                            <div class="settings-section-header">
                                <div class="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                </div>
                                <h3 class="text-xl font-extrabold text-gray-900 dark:text-white">Seguridad</h3>
                            </div>
                            
                            <p class="text-gray-500 dark:text-zinc-400 text-sm font-medium leading-relaxed mb-6">
                                Mantén tu cuenta protegida. Te recomendamos cambiar tu contraseña cada 90 días para garantizar la confidencialidad de tus proyectos.
                            </p>
                            
                            <div class="p-4 bg-orange-50 dark:bg-orange-500/5 rounded-2xl border border-orange-100 dark:border-orange-500/10">
                                <div class="flex items-center gap-3">
                                    <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    <span class="text-xs font-bold text-orange-700 dark:text-orange-400">Último cambio: Hace 3 meses</span>
                                </div>
                            </div>
                        </div>

                        <div class="pt-8">
                            <button onclick="SIModules.settings.openPasswordModal()" class="w-full py-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 text-gray-900 dark:text-white rounded-2xl text-sm font-black shadow-sm hover:border-orange-500 hover:text-orange-600 transition-all active:scale-95 flex items-center justify-center gap-3">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                                Cambiar Contraseña
                            </button>
                        </div>
                    </section>

                    <!-- 3. PREFERENCIAS VISUALES -->
                    <section class="settings-card">
                        <div class="settings-section-header">
                            <div class="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                            </div>
                            <h3 class="text-xl font-extrabold text-gray-900 dark:text-white">Interfaz</h3>
                        </div>

                        <div class="space-y-6">
                            <div class="flex items-center justify-between p-5 bg-gray-50 dark:bg-zinc-800/40 rounded-[2rem] border border-gray-100 dark:border-zinc-700 group">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-orange-500 transition-colors shadow-sm">
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
                        </div>
                    </section>

                    <!-- 4. NOTIFICACIONES -->
                    <section class="settings-card">
                        <div class="settings-section-header">
                            <div class="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                            </div>
                            <h3 class="text-xl font-extrabold text-gray-900 dark:text-white">Alertas</h3>
                        </div>
                        
                        <div class="space-y-2">
                            ${this._notificationItem('notify-doc', 'Nuevos Documentos', 'Planos, fotos o PDFs.')}
                            ${this._notificationItem('notify-phase', 'Cambios de Fase', 'Hitos del proyecto.')}
                            ${this._notificationItem('notify-comm', 'Comentarios', 'Tablón de anuncios.')}
                        </div>
                    </section>
                </div>
            </div>
        `;
    },

    _notificationItem(id, title, desc) {
        // Cargar estado de localStorage (por defecto true)
        const saved = localStorage.getItem(`si-pref-${id}`);
        const isChecked = saved !== null ? (saved === '1') : true;

        return `
            <div class="flex items-center justify-between p-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                <div>
                    <span class="block text-sm font-black text-gray-700 dark:text-zinc-200 uppercase tracking-wide leading-none">${title}</span>
                    <p class="text-[11px] text-gray-400 font-medium mt-1">${desc}</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="${id}" class="sr-only peer" ${isChecked ? 'checked' : ''} onchange="SIModules.settings.togglePreference('${id}', this.checked)">
                    <div class="w-9 h-5 bg-gray-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
            </div>
        `;
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

            const result = await API.put('/api/me', { name });

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

    /** Guardar preferencia en localStorage */
    togglePreference(key, value) {
        localStorage.setItem(`si-pref-${key}`, value ? '1' : '0');
        SIApp.showToast('Ajustes', 'Preferencia actualizada.', 'info');
    }
};
