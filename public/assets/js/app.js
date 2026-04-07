/**
 * Steel Inox Extranet — App Entry Point
 * Inicializa la aplicación: verifica sesión, construye header/sidebar, lanza router.
 * Depende de: api.js, auth.js, router.js
 */
const SIApp = {
    user: null,

    /** Iniciar la aplicación */
    async init() {
        // 1. Verificar sesión local
        this.user = Auth.getUser();

        // Si no hay datos en sessionStorage, intentar recuperar la sesión del servidor.
        // Esto evita un bucle infinito de redirecciones cuando el usuario cierra
        // la pestaña y la reabre (sessionStorage se pierde, pero la cookie PHP sigue viva).
        if (!this.user) {
            try {
                const res = await fetch('/steelinox/api/me', {
                    method: 'GET',
                    credentials: 'same-origin',
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        // Sesión PHP sigue viva → recuperar datos en sessionStorage
                        sessionStorage.setItem('si_user', JSON.stringify(json.data));
                        this.user = json.data;
                    } else {
                        // Sesión PHP expirada → ir a login
                        window.location.href = '/steelinox/';
                        return;
                    }
                } else {
                    // 401 u otro error → ir a login
                    window.location.href = '/steelinox/';
                    return;
                }
            } catch (e) {
                console.error('SIApp: Error verificando sesión:', e);
                window.location.href = '/steelinox/';
                return;
            }
        }

        // 2. Obtener CSRF token para futuras mutaciones
        await API.fetchCsrfToken();

        // 3. Construir UI
        this.buildHeader();
        this.buildSidebar();

        // 4. Inicializar router
        SIRouter.init('main-content');
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
                { icon: 'grid', label: 'Projects', href: '/steelinox/panel', route: 'dashboard' },
                { icon: 'users', label: 'Clients', href: '/steelinox/clients', route: 'clients' },
                { icon: 'briefcase', label: 'Commercials', href: '/steelinox/commercials', route: 'commercials' },
                { icon: 'shield', label: 'Audit Log', href: '/steelinox/audit-log', route: 'audit-log' },
            ],
            comercial: [
                { icon: 'grid', label: 'My Projects', href: '/steelinox/panel', route: 'dashboard' },
                { icon: 'users', label: 'Clients', href: '/steelinox/clients', route: 'clients' },
            ],
            cliente: [
                { icon: 'grid', label: 'My Projects', href: '/steelinox/panel', route: 'dashboard' },
            ],
        };

        const icons = {
            grid: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>',
            users: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
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
                    <span>Settings</span>
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

    /** Formatear fecha */
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
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
    confirm(title, message = '') {
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
                            <button id="si-confirm-btn-ok" class="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-md shadow-red-500/20 transition-all focus:outline-none">Eliminar</button>
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

    /** Custom Toast Notification */
    showToast(title, message, type = 'info') {
        let container = document.getElementById('si-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'si-toast-container';
            container.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none';
            document.body.appendChild(container);
        }

        const icons = {
            success: '<div class="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></div>',
            error: '<div class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></div>',
            info: '<div class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>'
        };

        const toastHtml = `
            <div class="pointer-events-auto bg-white border border-gray-100 shadow-xl rounded-xl p-4 flex gap-3 items-start transform translate-y-8 opacity-0 transition-all duration-300 min-w-[300px] max-w-sm">
                ${icons[type] || icons.info}
                <div class="flex-1">
                    <p class="text-sm font-bold text-gray-900">${this.escapeHtml(title)}</p>
                    ${message ? `<p class="text-[11px] font-medium text-gray-500 mt-0.5 leading-relaxed">${this.escapeHtml(message)}</p>` : ''}
                </div>
                <button class="text-gray-400 hover:text-gray-600 transition-colors shrink-0" onclick="this.closest('.pointer-events-auto').remove()">
                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = container.lastElementChild;

        // Animate in
        requestAnimationFrame(() => {
            toastEl.classList.remove('translate-y-8', 'opacity-0');
        });

        // Remove after 5s
        setTimeout(() => {
            if (toastEl && toastEl.parentElement) {
                toastEl.classList.add('opacity-0', 'translate-x-8');
                setTimeout(() => toastEl.remove(), 300);
            }
        }, 5000);
    }
};

// Exportar globalmente para que typeof window.SIApp funcione correctamente
window.SIApp = SIApp;
