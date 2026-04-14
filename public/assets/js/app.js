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

        // Detectar si estamos actualmente en la página pública del login
        const isLoginPage = window.location.pathname === '/steelinox/' || window.location.pathname === '/steelinox/index.php';

        // Si no hay datos en sessionStorage, intentar recuperar la sesión del servidor.
        if (!this.user) {
            try {
                const res = await fetch('/steelinox/api/me', {
                    method: 'GET',
                    credentials: 'same-origin',
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        // Sesión PHP sigue viva → recuperar datos
                        sessionStorage.setItem('si_user', JSON.stringify(json.data));
                        this.user = json.data;
                    } else {
                        // Sesión expirada
                        sessionStorage.removeItem('si_user');
                        if (!isLoginPage) window.location.href = '/steelinox/';
                        return;
                    }
                } else {
                    // Error 401 o similar
                    sessionStorage.removeItem('si_user');
                    if (!isLoginPage) window.location.href = '/steelinox/';
                    return;
                }
            } catch (e) {
                console.error('SIApp: Error verificando sesión:', e);
                sessionStorage.removeItem('si_user');
                if (!isLoginPage) window.location.href = '/steelinox/';
                return;
            }
        }

        // Si a estas alturas seguimos sin usuario y estamos en el login, cortamos la ejecución 
        // (así permitimos que el usuario escriba su email/contraseña sin pintar la SPA)
        if (!this.user) return;

        // Si el usuario SÍ tiene sesión, pero por algún motivo está en la URL del login, lo metemos al panel
        if (this.user && isLoginPage) {
            window.location.href = '/steelinox/panel';
            return;
        }

        // 2. Obtener CSRF token para futuras mutaciones
        await API.fetchCsrfToken();

        // 3. Construir UI
        this.buildHeader();
        this.buildSidebar();

        // 4. Inicializar router
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
        if (userRole) userRole.textContent = this._roleLabel(this.user.role);

        if (userAvatar) {
            userAvatar.textContent = this._getInitials(this.user.name);
        }

        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
            });
        }
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
                { icon: 'grid', label: 'Mis Proyectos', href: '/steelinox/panel', route: 'dashboard' },
                { icon: 'building', label: 'Clientes', href: '/steelinox/clients', route: 'clients' },
                { icon: 'users', label: 'Usuarios', href: '/steelinox/users', route: 'users' },
            ],
            cliente: [
                { icon: 'grid', label: 'Mis Proyectos', href: '/steelinox/panel', route: 'dashboard' },
            ],
        };

        const icons = {
            grid: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>',
            users: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
            building: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>',
            briefcase: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
            shield: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
            settings: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
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
        if (!inputEl) return;

        const pwd = inputEl.value;
        const form = inputEl.closest('form') || document;
        const emailInput = form.querySelector('[name="email"], #user-email');
        const emailVal = emailInput ? emailInput.value.trim() : '';
        const emailPrefix = emailVal.split('@')[0].toLowerCase();

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
                check: pwd.length > 0 && !pwd.toLowerCase().startsWith(emailPrefix)
            });
        }

        let wrapper = inputEl.parentNode;
        if (wrapper.classList.contains('relative')) wrapper = wrapper.parentNode;

        // Crear/Obtener contenedor de requisitos
        let container = wrapper.querySelector('.si-pwd-requirements');
        if (!container) {
            container = document.createElement('div');
            container.className = 'si-pwd-requirements mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200';
            wrapper.appendChild(container);
        }

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
        if (pwd.length > 0) {
            if (allValid) {
                inputEl.classList.remove('border-red-500', 'focus:ring-red-500/10');
                inputEl.classList.add('border-emerald-500', 'focus:ring-emerald-500/10');
            } else {
                inputEl.classList.remove('border-emerald-500', 'focus:ring-emerald-500/10');
                inputEl.classList.add('border-red-500', 'focus:ring-red-500/10');
            }
        } else {
            inputEl.classList.remove('border-red-500', 'focus:ring-red-500/10', 'border-emerald-500', 'focus:ring-emerald-500/10');
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

    /** Generar URLs amigables (slugs) */
    generateSlug(texto) {
        if (!texto) return '';
        return texto
            .toString()
            .toLowerCase()
            .normalize("NFD") // Separa las letras de las tildes (ej: 'é' -> 'e' + '´')
            .replace(/[\u0300-\u036f]/g, "") // Borra las tildes que separamos antes
            .replace(/[^a-z0-9 -]/g, "") // Borra cualquier carácter raro que no sea letra o número
            .replace(/\s+/g, "-") // Cambia los espacios por guiones
            .replace(/-+/g, "-") // Evita que haya dos guiones seguidos
            .trim();
    },

    /** Avatar con iniciales */
    avatarInitials(name) {
        const initials = this._getInitials(name);
        return `<div class="avatar-initials">${initials}</div>`;
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

    /** Mapeo de iconos Premium por MIME type */
    getFileIcon(mime) {
        const types = {
            'application/pdf': { label: 'PDF', bg: 'bg-red-50', text: 'text-red-500', badgeBg: 'bg-red-100', badgeText: 'text-red-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9h1m1 0h1m-3 4h3m-3 4h3"/></svg>' },
            'image/jpeg': { label: 'IMG', bg: 'bg-blue-50', text: 'text-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
            'image/png': { label: 'IMG', bg: 'bg-blue-50', text: 'text-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', svg: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
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

    /** Custom Toast Notification (Proxy a SIToast) */
    showToast(title, message, type = 'info') {
        if (typeof SIToast !== 'undefined') {
            SIToast.show(title, message, type);
        } else {
            console.error('showToast: SIToast no está definido');
        }
    },

    /**
     * Renderiza los controles de paginación en el contenedor especificado.
     * @param {HTMLElement} container Contenedor donde se insertará el HTML de paginación
     * @param {Object} pagination Datos de paginación recibidos del backend
     * @param {Function} onPageChange Callback al cambiar de página (recibe número de página)
     * @param {Function} onLimitChange Callback al cambiar el límite por página (recibe número de límite)
     */
    renderPaginationControls(container, pagination, onPageChange, onLimitChange) {
        if (!container || !pagination) return;

        const cp = pagination.current_page;
        const tp = pagination.total_pages;

        // --- LÓGICA DE BOTONES NUMÉRICOS ---
        let buttons = [];

        // Página 1 siempre
        buttons.push({ page: 1, active: cp === 1 });

        // Elipsis inicial
        if (cp > 3) {
            buttons.push({ type: 'ellipsis' });
        }

        // Página Anterior (si no es la 1 o 2)
        if (cp > 2) {
            buttons.push({ page: cp - 1, active: false });
        }

        // Página Actual (si no es la 1 o la última)
        if (cp > 1 && cp < tp) {
            buttons.push({ page: cp, active: true });
        }

        // Página Siguiente (si no es la última o penúltima)
        if (cp < tp - 1) {
            buttons.push({ page: cp + 1, active: false });
        }

        // Elipsis final
        if (cp < tp - 2) {
            buttons.push({ type: 'ellipsis' });
        }

        // Última página siempre (si hay más de una)
        if (tp > 1) {
            buttons.push({ page: tp, active: cp === tp });
        }

        // Renderizado del HTML de los botones numéricos
        const buttonsHtml = buttons.map(b => {
            if (b.type === 'ellipsis') {
                return `<span class="px-2 text-gray-400 font-bold">...</span>`;
            }
            const activeClass = b.active
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300';

            return `
                <button class="si-page-btn w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${activeClass}" 
                        data-page="${b.page}">
                    ${b.page}
                </button>
            `;
        }).join('');

        container.innerHTML = `
            <div class="flex flex-col lg:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-100">
                <!-- IZQUIERDA: Info de página y Salto Manual -->
                <div class="order-3 lg:order-1 flex-1 flex items-center gap-4">
                    <p class="text-[11px] sm:text-[13px] font-medium text-gray-400">
                        <span class="hidden sm:inline">Mostrando página</span>
                        <span class="sm:hidden">Pág.</span>
                        <span class="text-gray-900 font-bold">${cp}</span> de <span class="text-gray-900 font-bold">${tp}</span>
                        <span class="hidden md:inline text-gray-300 ml-1">(${pagination.total_results || 0} resultados en total)</span>
                    </p>
                    <div class="flex items-center gap-1.5 pl-4 border-l border-gray-100">
                        <input type="number" id="si-input-goto" 
                               class="w-11 h-8 text-center text-[11px] font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all" 
                               min="1" max="${tp}" placeholder="${cp}">
                        <button id="si-btn-goto" 
                                class="h-8 px-3 bg-gray-50 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-orange-100">
                            Ir
                        </button>
                    </div>
                </div>

                <!-- CENTRO: Navegación Numérica -->
                <div class="order-1 lg:order-2 flex items-center gap-1.5 justify-center">
                    <button id="si-btn-prev" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all ${!pagination.has_previous_page ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    
                    ${buttonsHtml}

                    <button id="si-btn-next" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all ${!pagination.has_next_page ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>

                <!-- DERECHA: Selector de Límite -->
                <div class="order-2 lg:order-3 flex-1 flex justify-end">
                    <div class="flex items-center bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100/50">
                        <button class="si-limit-btn px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${pagination.per_page == 15 ? 'bg-white shadow-sm text-orange-600 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}" data-limit="15">15</button>
                        <button class="si-limit-btn px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${pagination.per_page == 30 ? 'bg-white shadow-sm text-orange-600 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}" data-limit="30">30</button>
                        <button class="si-limit-btn px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${pagination.per_page == 50 ? 'bg-white shadow-sm text-orange-600 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}" data-limit="50">50</button>
                    </div>
                </div>
            </div>
        `;

        // Eventos para botones Anterior/Siguiente (Iconos)
        const btnPrev = container.querySelector('#si-btn-prev');
        const btnNext = container.querySelector('#si-btn-next');
        if (btnPrev && pagination.has_previous_page) btnPrev.addEventListener('click', () => onPageChange(pagination.previous_page));
        if (btnNext && pagination.has_next_page) btnNext.addEventListener('click', () => onPageChange(pagination.next_page));

        // Eventos para botones numéricos
        container.querySelectorAll('.si-page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page, 10);
                if (page !== cp) onPageChange(page);
            });
        });

        // Eventos para el salto manual de página
        const inputGoto = container.querySelector('#si-input-goto');
        const btnGoto = container.querySelector('#si-btn-goto');
        const handleGoto = () => {
            const val = parseInt(inputGoto.value, 10);
            if (!isNaN(val) && val >= 1 && val <= tp && val !== cp) {
                onPageChange(val);
            } else {
                inputGoto.value = '';
            }
        };

        if (btnGoto) btnGoto.addEventListener('click', handleGoto);
        if (inputGoto) {
            inputGoto.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleGoto();
            });
        }

        // Eventos para selectores de límite
        container.querySelectorAll('.si-limit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newLimit = parseInt(e.target.dataset.limit, 10);
                if (newLimit !== pagination.per_page) onLimitChange(newLimit);
            });
        });
    }
};

// Exportar globalmente para que typeof window.SIApp funcione correctamente
window.SIApp = SIApp;
