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
        if (!this.user) {
            window.location.href = '/steelinox/';
            return;
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
                { icon: 'grid',      label: 'Projects',   href: '/steelinox/panel',                  route: 'dashboard' },
                { icon: 'users',     label: 'Clients',    href: '/steelinox/clients',     route: 'clients' },
                { icon: 'briefcase', label: 'Commercials',href: '/steelinox/commercials',  route: 'commercials' },
                { icon: 'shield',    label: 'Audit Log',  href: '/steelinox/audit-log',   route: 'audit-log' },
            ],
            comercial: [
                { icon: 'grid',  label: 'My Projects', href: '/steelinox/panel',               route: 'dashboard' },
                { icon: 'users', label: 'Clients',     href: '/steelinox/clients',  route: 'clients' },
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

    /** Formatear moneda */
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    },

    /** Badge de estado */
    statusBadge(status) {
        const map = {
            propuesta: { label: 'Propuesta', css: 'badge-propuesta' },
            aprobado: { label: 'Aprobado', css: 'badge-aprobado' },
            ejecucion: { label: 'Ejecución', css: 'badge-ejecucion' },
            cerrado: { label: 'Cerrado', css: 'badge-cerrado' },
        };
        const s = map[status] || { label: status || '—', css: 'bg-gray-100 text-gray-600' };
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.css}">${s.label}</span>`;
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
};
