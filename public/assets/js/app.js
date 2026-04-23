/**
 * Steel Inox Extranet — App Entry Point
 * Inicializa la aplicación: verifica sesión, construye header/sidebar, lanza router.
 * Depende de: api.js, auth.js, router.js
 */
const SIApp = {
    user: null,

    constants: {
        regex: {
            PRJ: /^PRJ-\d{4}-\d{4,4}$/,
            CLI: /^CLI-\d{4}$/,
            EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/
        }
    },


    /** Iniciar la aplicación */
    async init() {
        // 1. Verificar sesión local
        this.user = Auth.getUser();

        // 1. Identificar si estamos en una página de autenticación (pública)
        const authPaths = ['/steelinox', '/steelinox/', '/steelinox/index.php', '/steelinox/password/reset'];
        const currentPath = window.location.pathname;
        const isAuthPage = authPaths.some(p => {
            // Comparación flexible (con o sin barra final)
            const pClean = p.replace(/\/$/, '');
            const cClean = currentPath.replace(/\/$/, '');
            return pClean === cClean;
        });

        // Caso especial: si hay un error de token pero ya tenemos sesión local "aparente", 
        // dejamos que el Session Guard verifique si realmente la sesión es válida.
        const urlParams = new URLSearchParams(window.location.search);
        const hasTokenError = urlParams.get('error') === 'token_invalid';

        // 2. Verificar sesión contra el servidor (Session Sync Guard)
        // Incluso si tenemos datos locales, debemos validar que la sesión PHP coincida.
        // Esto evita errores si el usuario cambia de cuenta en otra pestaña.
        try {
            const res = await fetch(`${window.API_BASE}/me`, {
                method: 'GET',
                credentials: 'same-origin',
            });
            
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    // Si ya teníamos un usuario local, comparamos IDs
                    if (this.user && this.user.id !== json.data.id) {
                        console.warn('SIApp: Desincronización de sesión detectada. Forzando logout.');
                        Auth.logout();
                        return;
                    }
                    // Sincronizar datos (por si hubo cambios en el rol o nombre)
                    sessionStorage.setItem('si_user', JSON.stringify(json.data));
                    this.user = json.data;
                } else {
                    // El servidor dice que no hay sesión
                    Auth.clearLocalData();
                    if (!isAuthPage) window.location.href = '/steelinox/';
                    return;
                }
            } else {
                // Error de autorización (401)
                Auth.clearLocalData();
                if (!isAuthPage) window.location.href = '/steelinox/';
                return;
            }
        } catch (e) {
            console.error('SIApp: Error verificando sesión:', e);
            // Si es un error de red, permitimos seguir con el local si existe, 
            // pero si no hay nada, mandamos al login.
            if (!this.user) {
                Auth.clearLocalData();
                if (!isAuthPage) window.location.href = '/steelinox/';
                return;
            }
        }

        // Si a estas alturas seguimos sin usuario y estamos en una página pública, cortamos ejecución
        if (!this.user) return;

        // Si el usuario SÍ tiene sesión, pero está en una página de Auth (Login/Reset) 
        // o hay un error de token (que suele venir de un reset fallido), lo mandamos al panel
        if (this.user && (isAuthPage || hasTokenError)) {
            window.location.href = '/steelinox/panel';
            return;
        }

        // 2. Obtener CSRF token para futuras mutaciones
        await API.fetchCsrfToken();

        // 3. Aplicar preferencias visuales
        const savedFont = localStorage.getItem('si-font-size');
        if (savedFont) {
            document.documentElement.style.fontSize = savedFont;
        }

        // 4. Construir UI
        this.buildHeader();
        this.buildSidebar();

        // 5. Inicializar router
        SIRouter.init('main-content');

        // 5. Validación cruzada (Email modificado -> revaluar password)
        document.addEventListener('input', (e) => {
            const el = e.target;
            if (el.matches('[name="email"], #user-email, input[type="email"]')) {
                const form = el.closest('form') || document;
                const pwdInputs = form.querySelectorAll('input[type="password"]');
                pwdInputs.forEach(pwd => {
                    // Si el password ya tiene el script de validación, forzar actualización
                    if (pwd.hasAttribute('oninput') && pwd.getAttribute('oninput').includes('validatePasswordRequirements')) {
                        this.validatePasswordRequirements(pwd);
                    }
                });
            }
        });
    },

    // ──────────────────────────────────────
    // HEADER
    // ──────────────────────────────────────

    buildHeader() {
        const userName = document.getElementById('header-user-name');
        const userRole = document.getElementById('header-user-role');
        const userAvatar = document.getElementById('header-user-avatar');
        const btnLogout = document.getElementById('btn-logout');

        if (userName) userName.textContent = this.user.name || 'Usuario';

        if (userRole) {
            let roleText = this._roleLabel(this.user.role);
            if (this.user.role === 'cliente' && this.user.client_name) {
                roleText += ` de ${this.user.client_name}`;
            }
            userRole.textContent = roleText;
        }

        if (userAvatar) {
            userAvatar.innerHTML = this.avatarInitials(this.user.name, 'w-8 h-8', 'text-[10px]');
        }

        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
            });
        }
    },

    /** Cambio de tema global */
    toggleTheme() {
        // Bloquear transiciones para evitar latencia en el repintado
        document.documentElement.classList.add('no-transitions');

        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('si-theme', isDark ? 'dark' : 'light');

        // Sincronizar switches si existen en la página
        const settingsSwitch = document.getElementById('theme-toggle');
        if (settingsSwitch) settingsSwitch.checked = isDark;

        // Quitar el bloqueo tras un pequeño delay para que el cambio sea instantáneo
        setTimeout(() => {
            document.documentElement.classList.remove('no-transitions');
        }, 50);
    },

    // ──────────────────────────────────────
    // SIDEBAR
    // ──────────────────────────────────────

    buildSidebar() {
        const sidebar = document.getElementById('sidebar-nav');
        const sidebarMobile = document.getElementById('sidebar-nav-mobile');
        if (!sidebar) return;

        const menus = {
            admin: [
                { icon: 'grid', label: 'Proyectos', href: '/steelinox/panel', route: 'dashboard' },
                { icon: 'building', label: 'Clientes', href: '/steelinox/clients', route: 'clients' },
                { icon: 'users', label: 'Usuarios', href: '/steelinox/users', route: 'users' },
                { icon: 'briefcase', label: 'Comerciales', href: '/steelinox/commercials', route: 'commercials' },
                { icon: 'shield', label: 'Auditoría', href: '/steelinox/audit-log', route: 'audit-log' },
            ],
            comercial: [
                { icon: 'grid', label: 'Proyectos', href: '/steelinox/panel', route: 'dashboard' },
                { icon: 'building', label: 'Clientes', href: '/steelinox/clients', route: 'clients' },
                { icon: 'users', label: 'Usuarios', href: '/steelinox/users', route: 'users' },
            ],
            cliente: [
                { icon: 'grid', label: 'Proyectos', href: '/steelinox/panel', route: 'dashboard' },
            ],
        };

        const icons = {
            grid: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
            users: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
            building: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>',
            briefcase: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>',
            shield: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
            settings: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
        };

        const items = menus[this.user.role] || [];

        const menuHtml = items.map(item => `
            <a href="${item.href}"
               class="sidebar-item"
               data-route="${item.route}">
                ${icons[item.icon] || ''}
                <span>${item.label}</span>
            </a>
        `).join('');

        // Settings al fondo (separado)
        const settingsHtml = `
            <div class="mt-auto pt-4 border-t border-gray-100">
                <a href="/steelinox/settings" class="sidebar-item" data-route="settings">
                    ${icons.settings}
                    <span>Ajustes</span>
                </a>
            </div>
        `;

        const fullHtml = menuHtml + settingsHtml;
        sidebar.innerHTML = fullHtml;

        // Mobile sidebar también
        if (sidebarMobile) {
            sidebarMobile.innerHTML = fullHtml;
        }
    },

    // ──────────────────────────────────────
    // UTILIDADES
    // ──────────────────────────────────────

    /**
     * Actualiza el título de la pestaña del navegador
     * @param {string} pageName - El nombre de la sección actual
     */
    setTitle(pageName) {
        const baseTitle = 'Steel Inox Extranet';
        if (pageName) {
            document.title = `${pageName} — ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    },

    /**
     * Valida un campo en tiempo real y muestra feedback visual.
     * @param {HTMLElement} inputEl 
     * @param {RegExp} regex 
     * @param {string} errorMsg 
     * @returns {boolean}
     */
    validateField(inputEl, validation, errorMsg) {
        if (!inputEl) return true;

        const val = inputEl.value.trim();
        let isValid = true;

        if (typeof validation === 'function') {
            isValid = val === '' || validation(val);
        } else if (validation instanceof RegExp) {
            isValid = val === '' || validation.test(val);
        } else if (typeof validation === 'boolean') {
            isValid = validation;
        }

        let wrapper = inputEl.parentNode;
        if (wrapper.classList.contains('relative')) wrapper = wrapper.parentNode;

        let errorEl = wrapper.querySelector('.si-field-error');
        if (!errorEl) {
            errorEl = document.createElement('p');
            errorEl.className = 'si-field-error text-[10px] font-bold text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200';
            wrapper.appendChild(errorEl);
        }

        if (!isValid) {
            inputEl.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/10');
            inputEl.classList.remove('border-gray-100', 'focus:border-orange-500', 'focus:ring-orange-500/10');
            errorEl.textContent = errorMsg;
            errorEl.classList.remove('hidden');
        } else {
            inputEl.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/10');
            inputEl.classList.add('border-gray-100', 'focus:border-orange-500', 'focus:ring-orange-500/10');
            errorEl.classList.add('hidden');
        }

        return isValid;
    },

    /**
     * Alerta visual (Eye Icon) para campos de contraseña.
     * @param {HTMLElement} btnEl El botón que recibe el click
     */
    togglePasswordVisibility(btnEl) {
        if (!btnEl) return;
        const input = btnEl.parentNode.querySelector('input');
        if (!input) return;

        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';

        const eyeOpen = btnEl.querySelector('.eye-open');
        const eyeClosed = btnEl.querySelector('.eye-closed');

        if (eyeOpen) eyeOpen.classList.toggle('hidden', !isPass);
        if (eyeClosed) eyeClosed.classList.toggle('hidden', isPass);
    },

    /**
     * Validación detallada de contraseñas con indicadores visuales x/tick.
     * @param {HTMLElement} inputEl 
     */
    validatePasswordRequirements(inputEl) {
        if (!inputEl) return true;

        const pwd = inputEl.value;
        const form = inputEl.closest('form') || document;
        const emailInput = form.querySelector('[name="email"], #user-email');
        const emailVal = emailInput ? emailInput.value.trim() : '';
        const emailPrefix = emailVal.split('@')[0].toLowerCase();

        let wrapper = inputEl.parentNode;
        if (wrapper.classList.contains('relative')) wrapper = wrapper.parentNode;
        let container = wrapper.querySelector('.si-pwd-requirements');

        // Si está vacío, ocultar contenedor y limpiar bordes
        if (pwd.length === 0) {
            if (container) container.classList.add('hidden');
            inputEl.classList.remove('border-red-500', 'focus:ring-red-500/10', 'border-emerald-500', 'focus:ring-emerald-500/10');
            return true;
        }

        const requirements = [
            { id: 'req-len', label: 'Mínimo 8 caracteres', check: pwd.length >= 8 },
            { id: 'req-upp', label: 'Al menos una mayúscula', check: /[A-Z]/.test(pwd) },
            { id: 'req-let', label: 'Al menos una minúscula', check: /[a-z]/.test(pwd) },
            { id: 'req-num', label: 'Al menos un número', check: /\d/.test(pwd) }
        ];

        // Solo añadir requisito de email si el email tiene longitud suficiente
        if (emailPrefix.length >= 3) {
            requirements.push({
                id: 'req-eml',
                label: 'No empezar por tu email',
                check: !pwd.toLowerCase().startsWith(emailPrefix)
            });
        }

        // Crear/Obtener contenedor de requisitos si no existía
        if (!container) {
            container = document.createElement('div');
            container.className = 'si-pwd-requirements mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200';
            wrapper.appendChild(container);
        }
        container.classList.remove('hidden');

        // Renderizar/Actualizar requisitos
        container.innerHTML = requirements.map(req => `
            <div id="${req.id}" class="flex items-center gap-2 transition-colors duration-200 ${req.check ? 'text-emerald-500' : 'text-gray-400'}">
                <span class="shrink-0">
                    ${req.check ?
                `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>` :
                `<svg class="w-3.5 h-3.5 ${pwd.length > 0 ? 'text-red-300' : 'text-gray-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>`
            }
                </span>
                <span class="text-[10px] font-bold uppercase tracking-wide italic leading-none">${req.label}</span>
            </div>
        `).join('');

        // Actualizar borde del input basado en si todo se cumple
        const allValid = requirements.every(r => r.check);
        if (allValid) {
            inputEl.classList.remove('border-red-500', 'focus:ring-red-500/10');
            inputEl.classList.add('border-emerald-500', 'focus:ring-emerald-500/10');
        } else {
            inputEl.classList.remove('border-emerald-500', 'focus:ring-emerald-500/10');
            inputEl.classList.add('border-red-500', 'focus:ring-red-500/10');
        }

        return allValid;
    },

    /** Formatear fecha */
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    /** Formatear fecha con hora */
    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            + ' · '
            + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    },

    /** Formatear moneda (12.345,67 €) */
    formatCurrency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) return '-';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /** Formatear número (12.345,67) */
    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        return new Intl.NumberFormat('es-ES').format(num);
    },

    /** Badge de estado con indicador visual */
    statusBadge(status) {
        const map = {
            propuesta: { label: 'Propuesta', css: 'badge-propuesta' },
            aprobado: { label: 'Aprobado', css: 'badge-aprobado' },
            ejecucion: { label: 'Ejecución', css: 'badge-ejecucion', dot: true, pulse: true },
            cerrado: { label: 'Cerrado', css: 'badge-cerrado' },
        };

        const s = map[status] || { label: status || '—', css: 'bg-gray-100 text-gray-500', dot: false };

        // Construir el punto indicador (dot)
        const dotHtml = s.dot ? `
        <svg class="w-1.5 h-1.5 ${s.pulse ? 'animate-si-pulse' : ''}" fill="currentColor" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" />
        </svg>
    ` : '';

        return `
        <span class="si-badge ${s.css}">
            ${dotHtml}
            <span>${s.label}</span>
        </span>
    `;
    },

    /** Badge de Activo/Inactivo unificado */
    activeBadge(isActive) {
        const isA = (isActive == 1 || isActive === true);
        const css = isA ? 'badge-activo' : 'badge-inactivo';
        const label = isA ? 'Activo' : 'Inactivo';

        return `
        <span class="si-badge ${css}">
            <span>${label}</span>
        </span>
    `;
    },

    /** Badge de Referencia estandarizado (PRJ, CLI, etc) */
    refBadge(text) {
        if (!text) return '';
        return `<span class="inline-flex items-center text-[11px] font-bold text-gray-500 dark:text-zinc-400 bg-gray-100/80 dark:bg-zinc-800/50 px-2.5 py-1 rounded-[6px] tracking-wide border border-gray-200/20 dark:border-zinc-700/30">${this.escapeHtml(text)}</span>`;
    },

    /**
     * Genera un avatar con iniciales y color determinista basado en el nombre.
     * @param {string} name - Nombre completo
     * @param {string} sizeClass - Clase de Tailwind para tamaño (ej: 'w-10 h-10')
     * @param {string} fontSizeClass - Clase de Tailwind para fuente (ej: 'text-xs')
     * @returns {string} HTML del avatar
     */
    avatarInitials(name, sizeClass = 'w-9 h-9', fontSizeClass = 'text-[11px]') {
        if (!name) return '';
        const initials = this._getInitials(name);
        const palette = [
            'bg-blue-100 text-blue-700',
            'bg-emerald-100 text-emerald-700',
            'bg-purple-100 text-purple-700',
            'bg-amber-100 text-amber-700',
            'bg-rose-100 text-rose-700',
            'bg-indigo-100 text-indigo-700',
            'bg-cyan-100 text-cyan-700',
            'bg-teal-100 text-teal-700',
            'bg-fuchsia-100 text-fuchsia-700',
            'bg-violet-100 text-violet-700',
            'bg-orange-100 text-orange-700'
        ];

        // Determinar color basado en el nombre (hash determinista simple)
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorClass = palette[Math.abs(hash) % palette.length];

        return `
            <div class="${sizeClass} rounded-full ${colorClass} flex items-center justify-center ${fontSizeClass} font-black border border-white shadow-sm overflow-hidden shrink-0 select-none" title="${this.escapeHtml(name)}">
                ${initials}
            </div>
        `;
    },

    /** Obtener iniciales */
    _getInitials(name) {
        return (name || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    },

    /** Label legible del rol */
    _roleLabel(role) {
        const labels = { admin: 'Administrador', comercial: 'Comercial', cliente: 'Cliente' };
        return labels[role] || role || 'Usuario';
    },

    /** Tiempo relativo */
    timeAgo(dateStr) {
        if (!dateStr) return '';
        const now = new Date();
        const date = new Date(dateStr);
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Hace unos segundos';
        if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
        if (seconds < 2592000) return `Hace ${Math.floor(seconds / 86400)} días`;
        return SIApp.formatDate(dateStr);
    },

    /** Escapar HTML */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /** Custom Confirm Modal Promisified */
    confirm(title, message = '', confirmText = 'Eliminar') {
        return new Promise((resolve) => {
            // Remove existing if any
            const existing = document.getElementById('si-confirm-modal');
            if (existing) existing.remove();

            const modalHtml = `
                <div id="si-confirm-modal" class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 opacity-0 transition-opacity">
                    <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl transform scale-95 transition-transform flex flex-col overflow-hidden">
                        <div class="p-6">
                            <div class="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            </div>
                            <h3 class="text-lg font-extrabold text-gray-900 mb-2">${this.escapeHtml(title)}</h3>
                            ${message ? `<p class="text-sm text-gray-500 font-medium">${this.escapeHtml(message)}</p>` : ''}
                        </div>
                        <div class="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                            <button id="si-confirm-btn-cancel" class="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all focus:outline-none">Cancelar</button>
                            <button id="si-confirm-btn-ok" class="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-md shadow-red-500/20 transition-all focus:outline-none">${this.escapeHtml(confirmText)}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById('si-confirm-modal');
            const btnCancel = document.getElementById('si-confirm-btn-cancel');
            const btnOk = document.getElementById('si-confirm-btn-ok');

            // Animate in
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                modal.querySelector('div').classList.remove('scale-95');
            });

            const close = (val) => {
                modal.classList.add('opacity-0');
                modal.querySelector('div').classList.add('scale-95');
                setTimeout(() => {
                    modal.remove();
                    resolve(val);
                }, 200);
            };

            btnCancel.onclick = () => close(false);
            btnOk.onclick = () => close(true);
        });
    },

    /**
     * Custom Prompt Modal Promisified — pide texto al usuario con una textarea.
     * Devuelve la cadena introducida, o null si cancela.
     * @param {string} title - Título del modal
     * @param {string} message - Mensaje descriptivo (puede contener HTML)
     * @param {string} placeholder - Placeholder del textarea
     * @param {string} confirmText - Texto del botón de confirmar
     */
    prompt(title, message = '', placeholder = '', confirmText = 'Confirmar') {
        return new Promise((resolve) => {
            const existing = document.getElementById('si-prompt-modal');
            if (existing) existing.remove();

            const modalHtml = `
                <div id="si-prompt-modal" class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 opacity-0 transition-opacity">
                    <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl transform scale-95 transition-transform flex flex-col overflow-hidden">
                        <div class="p-6 border-b border-gray-100">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </div>
                                <h3 class="text-base font-extrabold text-gray-900">${this.escapeHtml(title)}</h3>
                            </div>
                            ${message ? `<p class="text-sm text-gray-500 font-medium leading-relaxed">${message}</p>` : ''}
                        </div>
                        <div class="p-6">
                            <textarea id="si-prompt-textarea" rows="3"
                                class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm font-medium resize-none"
                                placeholder="${this.escapeHtml(placeholder)}"></textarea>
                        </div>
                        <div class="px-6 pb-6 flex gap-3 justify-end">
                            <button id="si-prompt-btn-cancel" class="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all focus:outline-none">Cancelar</button>
                            <button id="si-prompt-btn-ok" class="px-5 py-2 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 shadow-md shadow-orange-500/20 transition-all focus:outline-none">${this.escapeHtml(confirmText)}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal     = document.getElementById('si-prompt-modal');
            const textarea  = document.getElementById('si-prompt-textarea');
            const btnCancel = document.getElementById('si-prompt-btn-cancel');
            const btnOk     = document.getElementById('si-prompt-btn-ok');

            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                modal.querySelector('div').classList.remove('scale-95');
                setTimeout(() => textarea && textarea.focus(), 250);
            });

            const close = (val) => {
                modal.classList.add('opacity-0');
                modal.querySelector('div').classList.add('scale-95');
                setTimeout(() => { modal.remove(); resolve(val); }, 200);
            };

            btnCancel.onclick = () => close(null);
            btnOk.onclick = () => close(textarea ? textarea.value : '');

            // Ctrl+Enter también confirma
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    close(textarea.value);
                }
            });
        });
    },

    /** Mapeo de iconos Premium por MIME type */
    getFileIcon(mime) {
        const types = {
            'application/pdf': { label: 'PDF', bg: 'bg-red-50', text: 'text-red-500', badgeBg: 'bg-red-100', badgeText: 'text-red-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9h1m1 0h1m-3 4h3m-3 4h3"/></svg>' },
            'image/jpeg': { label: 'IMG', bg: 'bg-blue-50', text: 'text-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
            'image/png': { label: 'IMG', bg: 'bg-blue-50', text: 'text-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
            'image/webp': { label: 'IMG', bg: 'bg-blue-50', text: 'text-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
            'image/gif': { label: 'IMG', bg: 'bg-blue-50', text: 'text-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
            'image/svg+xml': { label: 'IMG', bg: 'bg-blue-50', text: 'text-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
            'application/msword': { label: 'DOC', bg: 'bg-indigo-50', text: 'text-indigo-500', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOC', bg: 'bg-indigo-50', text: 'text-indigo-500', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            'application/vnd.ms-excel': { label: 'XLS', bg: 'bg-emerald-50', text: 'text-emerald-500', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'XLS', bg: 'bg-emerald-50', text: 'text-emerald-500', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
        };
        const defaultIcon = { label: 'FILE', bg: 'bg-gray-50', text: 'text-gray-500', badgeBg: 'bg-gray-100', badgeText: 'text-gray-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>' };
        return types[mime] || defaultIcon;
    },

    /** Formatear tamaño de archivo en KB/MB */
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    /**
         * Muestra estado de carga en un botón
         * @param {string} btnId ID del botón
         * @param {boolean} loading true para activar, false para desactivar
         * @param {string} text Texto temporal mientras carga
         */
    setBtnLoading(btnId, loading, text = '...') {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        btn.disabled = loading;

        if (loading) {
            // Guardamos el contenido original solo la primera vez que entra en estado de carga
            if (!btn.dataset.originalHtml) {
                btn.dataset.originalHtml = btn.innerHTML;
            }

            // Inyectamos el spinner y el texto de carga de forma estandarizada
            btn.innerHTML = `
                <span class="si-spinner inline-block w-4 h-4 border-2 border-current border-b-transparent rounded-full animate-spin mr-2 align-middle">
                </span> 
                <span class="align-middle">${text}</span>
            `;
            btn.classList.add('opacity-80', 'pointer-events-none');

        } else {
            // Restauramos el contenido exacto que tenía el botón antes de cargar
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            } else if (text && text !== '...') {
                btn.innerHTML = text; // Fallback por si acaso
            }

            btn.classList.remove('opacity-80', 'pointer-events-none');
        }
    },

    /** Custom Toast Notification (Proxy a SIToast) */
    showToast(title, message, type = 'info') {
        if (typeof SIToast !== 'undefined') {
            SIToast.show(title, message, type);
        } else {
            console.error('showToast: SIToast no está definido');
        }
    },

    /** Maneja de forma unificada los errores de API */
    handleApiError(res, fallbackMessage = 'Error en la operación') {
        const title = res && res.message ? res.message : 'Error';
        let messageStr = fallbackMessage;
        
        if (res && res.errors && typeof res.errors === 'object') {
            const errValues = Object.values(res.errors).filter(v => typeof v === 'string');
            if (errValues.length > 0) {
                messageStr = errValues.join('<br>');
            }
        }
        
        this.showToast(title, messageStr, 'error');
    },

    /** Validar y obtener datos de un formulario */
    getValidatedFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error(`Formulario no encontrado: #${formId}`);
            return null;
        }

        if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
            return null; // El navegador ya mostró los tooltips de error nativos
        }

        return Object.fromEntries(new FormData(form));
    },

    /**
     * Renderiza los controles de paginación en el contenedor especificado.
     */
    renderPaginationControls(container, pagination, onPageChange, onLimitChange) {
        if (!container || !pagination) return;

        const cp = pagination.current_page;
        const tp = pagination.total_pages;

        let buttons = [];
        buttons.push({ page: 1, active: cp === 1 });

        if (cp > 3) buttons.push({ type: 'ellipsis' });
        if (cp > 2) buttons.push({ page: cp - 1, active: false });
        if (cp > 1 && cp < tp) buttons.push({ page: cp, active: true });
        if (cp < tp - 1) buttons.push({ page: cp + 1, active: false });
        if (cp < tp - 2) buttons.push({ type: 'ellipsis' });
        if (tp > 1) buttons.push({ page: tp, active: cp === tp });

        const buttonsHtml = buttons.map(b => {
            if (b.type === 'ellipsis') return `<span class="px-2 text-gray-400 font-bold">...</span>`;
            const activeClass = b.active
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700';

            return `<button class="si-page-btn w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${activeClass}" data-page="${b.page}">${b.page}</button>`;
        }).join('');

        container.innerHTML = `
            <div class="flex flex-col lg:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                <div class="order-3 lg:order-1 flex-1 flex items-center gap-4">
                    <p class="text-[11px] sm:text-[13px] font-medium text-gray-400">
                        <span class="hidden sm:inline">Mostrando página</span>
                        <span class="sm:hidden">Pág.</span>
                        <span class="text-gray-900 dark:text-zinc-100 font-bold">${cp}</span> de <span class="text-gray-900 dark:text-zinc-100 font-bold">${tp}</span>
                        <span class="hidden md:inline text-gray-300 dark:text-zinc-700 ml-1">(${pagination.total_results || 0} resultados)</span>
                    </p>
                    <div class="flex items-center gap-1.5 pl-4 border-l border-gray-100 dark:border-zinc-800">
                        <input type="number" id="si-input-goto" class="w-11 h-8 text-center text-[11px] font-bold bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-orange-500/20 outline-none transition-all" min="1" max="${tp}" placeholder="${cp}">
                        <button id="si-btn-goto" class="h-8 px-3 bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-orange-600 dark:hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg text-[10px] font-black uppercase transition-all border border-transparent hover:border-orange-100 dark:hover:border-orange-500/20">Ir</button>
                    </div>
                </div>

                <div class="order-1 lg:order-2 flex items-center gap-1.5 justify-center">
                    <button id="si-btn-prev" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all ${!pagination.has_previous_page ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    ${buttonsHtml}
                    <button id="si-btn-next" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all ${!pagination.has_next_page ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>

                <div class="order-2 lg:order-3 flex-1 flex justify-end">
                    <div class="flex items-center bg-gray-50/80 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-gray-100/50 dark:border-zinc-700/50">
                        <button class="si-limit-btn px-4 py-1.5 text-[11px] font-black uppercase rounded-xl transition-all ${pagination.per_page == 15 ? 'bg-white dark:bg-zinc-700 shadow-sm text-orange-600 dark:text-orange-500 border border-gray-100 dark:border-zinc-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300'}" data-limit="15">15</button>
                        <button class="si-limit-btn px-4 py-1.5 text-[11px] font-black uppercase rounded-xl transition-all ${pagination.per_page == 30 ? 'bg-white dark:bg-zinc-700 shadow-sm text-orange-600 dark:text-orange-500 border border-gray-100 dark:border-zinc-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300'}" data-limit="30">30</button>
                        <button class="si-limit-btn px-4 py-1.5 text-[11px] font-black uppercase rounded-xl transition-all ${pagination.per_page == 50 ? 'bg-white dark:bg-zinc-700 shadow-sm text-orange-600 dark:text-orange-500 border border-gray-100 dark:border-zinc-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300'}" data-limit="50">50</button>
                    </div>
                </div>
            </div>
        `;

        const btnPrev = container.querySelector('#si-btn-prev');
        const btnNext = container.querySelector('#si-btn-next');
        if (btnPrev && pagination.has_previous_page) btnPrev.addEventListener('click', () => onPageChange(pagination.previous_page));
        if (btnNext && pagination.has_next_page) btnNext.addEventListener('click', () => onPageChange(pagination.next_page));

        container.querySelectorAll('.si-page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page, 10);
                if (page !== cp) onPageChange(page);
            });
        });

        const inputGoto = container.querySelector('#si-input-goto');
        const btnGoto = container.querySelector('#si-btn-goto');
        const handleGoto = () => {
            const val = parseInt(inputGoto.value, 10);
            if (!isNaN(val) && val >= 1 && val <= tp && val !== cp) onPageChange(val);
            else inputGoto.value = '';
        };

        if (btnGoto) btnGoto.addEventListener('click', handleGoto);
        if (inputGoto) inputGoto.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGoto(); });

        container.querySelectorAll('.si-limit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newLimit = parseInt(e.target.dataset.limit, 10);
                if (newLimit !== pagination.per_page) onLimitChange(newLimit);
            });
        });
    },

    // ──────────────────────────────────────
    // MODAL HELPER
    // ──────────────────────────────────────

    modal: {
        _escapeHandler: null,

        open(id, options = {}) {
            const el = document.getElementById(id);
            if (!el) return;

            const defaults = { allowOutsideClick: true, allowEscape: true };
            const opts = { ...defaults, ...options };

            // Marcar el modal con su propio ID
            el.dataset.modalId = id;

            el.classList.remove('hidden');
            requestAnimationFrame(() => {
                el.classList.add('opacity-100');
                const inner = el.querySelector(':scope > div');
                if (inner) {
                    inner.classList.add('scale-100');
                    inner.classList.remove('scale-95');
                }
            });

            // Click en backdrop
            if (el._backdropHandler) el.removeEventListener('click', el._backdropHandler);
            el._backdropHandler = (e) => {
                if (e.target === el && opts.allowOutsideClick) {
                    SIApp.modal.close(id);
                }
            };
            el.addEventListener('click', el._backdropHandler);

            // Escape cierra el modal (si está permitido)
            if (this._escapeHandler) document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = (e) => {
                if (e.key === 'Escape' && opts.allowEscape) {
                    SIApp.modal.close(id);
                }
            };
            document.addEventListener('keydown', this._escapeHandler);
        },

        close(id) {
            const el = document.getElementById(id);
            if (!el) return;

            el.classList.remove('opacity-100');
            const inner = el.querySelector(':scope > div');
            if (inner) {
                inner.classList.remove('scale-100');
                inner.classList.add('scale-95');
            }
            setTimeout(() => el.classList.add('hidden'), 300);

            // Limpiar el listener de Escape
            if (this._escapeHandler) {
                document.removeEventListener('keydown', this._escapeHandler);
                this._escapeHandler = null;
            }
        }
    },

};

// Exportar globalmente
window.SIApp = SIApp;
