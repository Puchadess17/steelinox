/**
 * Steel Inox Extranet — API Client
 * Capa centralizada para llamadas fetch a la API REST.
 * Gestiona CSRF token automáticamente para POST/PUT/PATCH/DELETE.
 *
 * Formato de respuesta esperado del backend:
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {string}  message
 * @property {*}       data    - Datos de respuesta (objeto, array, null)
 * @property {Object|null} errors - Map de errores por campo { campo: 'msg' }
 */
const API = {
    baseUrl: '/steelinox/api',
    csrfToken: null,
    _csrfPromise: null,

    // ──────────────────────────────────────
    // CSRF
    // ──────────────────────────────────────

    /**
     * Obtener token CSRF del servidor.
     * Se llama 1 vez al inicio y se reintenta si un 403 lo invalida.
     * @returns {Promise<string|null>}
     */
    async fetchCsrfToken() {
        // Singleton: si ya hay una petición en vuelo, reutilizar
        if (this._csrfPromise) return this._csrfPromise;

        this._csrfPromise = (async () => {
            try {
                const res = await fetch(`${this.baseUrl}/csrf-token`, {
                    method: 'GET',
                    credentials: 'same-origin',
                });
                if (!res.ok) {
                    console.warn('API: No se pudo obtener CSRF token, status:', res.status);
                    return null;
                }
                const json = await res.json();
                if (json.success && json.data && json.data.csrf_token) {
                    this.csrfToken = json.data.csrf_token;
                    return this.csrfToken;
                }
                return null;
            } catch (err) {
                console.error('API: Error obteniendo CSRF token:', err);
                return null;
            } finally {
                this._csrfPromise = null;
            }
        })();

        return this._csrfPromise;
    },

    /**
     * Asegurar que tenemos CSRF antes de una mutación
     */
    async ensureCsrf() {
        if (!this.csrfToken) {
            await this.fetchCsrfToken();
        }
    },

    // ──────────────────────────────────────
    // REQUEST PRINCIPAL
    // ──────────────────────────────────────

    /**
     * Realiza una petición a la API.
     * @param {string} method   - GET, POST, PUT, PATCH, DELETE
     * @param {string} endpoint - Ruta relativa (ej: '/login')
     * @param {*}      data     - Body (object o FormData)
     * @param {Object} [options]
     * @param {boolean} [options.silent] - No mostrar toast en error
     * @param {boolean} [options._isRetry] - Interno: es un reintento tras CSRF
     * @returns {Promise<ApiResponse>}
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

        // Asegurar CSRF para mutaciones
        if (isMutation) {
            await this.ensureCsrf();
        }

        const config = {
            method: method.toUpperCase(),
            credentials: 'same-origin',
            headers: {},
        };

        // Inyectar CSRF header en mutaciones
        if (isMutation && this.csrfToken) {
            config.headers['X-CSRF-TOKEN'] = this.csrfToken;
        }

        // Body
        if (data instanceof FormData) {
            config.body = data;
        } else if (data && isMutation) {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);

            // ── Respuesta no-JSON (archivo, etc) ──
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                return response; // Response raw
            }

            // ── Parsear JSON ──
            const result = await response.json();

            // ── 401 Unauthorized → sesión expirada ──
            if (response.status === 401) {
                // Si estamos en login, no redirigir
                if (!endpoint.includes('/login')) {
                    this.handleUnauthorized();
                }
                return result;
            }

            // ── 403 Forbidden → posible error CSRF ──
            if (response.status === 403 && !options._isRetry) {
                // Renovar token e intentar 1 vez más
                console.warn('API: 403 recibido, reintentando con nuevo CSRF token...');
                this.csrfToken = null;
                await this.fetchCsrfToken();
                return this.request(method, endpoint, data, { ...options, _isRetry: true });
            }

            // ── 429 Rate Limit ──
            if (response.status === 429) {
                if (!options.silent) {
                    SIToast.warning(result.message || 'Demasiados intentos. Espere un momento.');
                }
                return result;
            }

            // ── 422 Validation Error ──
            if (response.status === 422) {
                // No mostrar toast genérico, los errores se gestionan por campo
                return result;
            }

            // ── 500+ Server Error ──
            if (response.status >= 500) {
                if (!options.silent) {
                    SIToast.error('Error interno del servidor. Inténtelo más tarde.');
                }
                return result;
            }

            // ── Otros errores HTTP (4xx) ──
            if (!response.ok && !options.silent) {
                SIToast.error(result.message || 'Error en la operación');
            }

            return result;

        } catch (error) {
            console.error('API Error:', error);
            if (!options.silent) {
                SIToast.error('Error de conexión con el servidor. Verifique su conexión a Internet.');
            }
            return {
                success: false,
                message: error.message || 'Error de red',
                data: null,
                errors: { network: error.message }
            };
        }
    },

    // ── Atajos ──
    get(endpoint, options)           { return this.request('GET', endpoint, null, options); },
    post(endpoint, data, options)    { return this.request('POST', endpoint, data, options); },
    put(endpoint, data, options)     { return this.request('PUT', endpoint, data, options); },
    patch(endpoint, data, options)   { return this.request('PATCH', endpoint, data, options); },
    delete(endpoint, data, options)  { return this.request('DELETE', endpoint, data, options); },

    // ──────────────────────────────────────
    // HANDLERS
    // ──────────────────────────────────────

    /** Redirigir por sesión expirada */
    handleUnauthorized() {
        const isOnLogin = window.location.pathname === '/steelinox/' || 
                          window.location.pathname.endsWith('/login');
        if (isOnLogin) return;

        // Evitar múltiples alertas si hay varias llamadas a la vez
        if (this._isRedirecting) return;
        this._isRedirecting = true;

        sessionStorage.clear();
        
        // Un alert nativo bloquea el hilo de JS, impidiendo que el frontend continúe
        // renderizando o intentando parsear datos de un usuario desconectado.
        alert("Tu sesión ha caducado por seguridad. Vuelve a iniciar sesión.");
        
        window.location.href = '/steelinox/'; // Redirige al login limpiamente
    },
};


// ═══════════════════════════════════════════
// Sistema de Toasts — Notificaciones
// ═══════════════════════════════════════════
const SIToast = {
    container: null,

    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.className = 'si-toast-container';
        document.body.appendChild(this.container);
    },

    show(message, type = 'info', duration = 4000) {
        this.init();

        const icons = {
            success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
            error:   '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
            warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            info:    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        };
        const colors = {
            success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            error:   'bg-red-50 border-red-200 text-red-800',
            warning: 'bg-amber-50 border-amber-200 text-amber-800',
            info:    'bg-blue-50 border-blue-200 text-blue-800',
        };

        const toast = document.createElement('div');
        toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[type]} fade-in`;
        toast.style.minWidth = '300px';
        toast.style.maxWidth = '450px';
        toast.innerHTML = `
            <span class="flex-shrink-0">${icons[type]}</span>
            <span class="text-sm font-medium flex-1">${this.escapeHtml(message)}</span>
            <button class="flex-shrink-0 opacity-60 hover:opacity-100" onclick="this.parentElement.remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        `;
        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg)   { this.show(msg, 'error', 6000); },
    warning(msg) { this.show(msg, 'warning', 5000); },
    info(msg)    { this.show(msg, 'info'); },
};
