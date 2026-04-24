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
// Variable global para parametrizar la ruta de la API.
// En producción, si se despliega en la raíz, cambiar a '/api'
window.API_BASE = '/steelinox/api';

const API = {
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
                const res = await fetch(`${window.API_BASE}/csrf-token`, {
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
        const url = `${window.API_BASE}${endpoint}`;
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
                // No redirigir si estamos en endpoints de auth o verificación
                const authEndpoints = ['/login', '/me', '/csrf-token'];
                const isAuthEndpoint = authEndpoints.some(e => endpoint.includes(e));
                
                if (!isAuthEndpoint) {
                    this.handleUnauthorized();
                }
                return result;
            }

            // ── 403 Forbidden → Solo reintentar si el mensaje indica fallo de CSRF ──
            if (response.status === 403 && !options._isRetry && result.message && result.message.toLowerCase().includes('csrf')) {
                // Renovar token e intentar 1 vez más
                console.warn('API: 403 (CSRF) recibido, reintentando con nuevo token...');
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

            // ── Errores de Servidor (500+) ──
            if (response.status >= 500) {
                if (!options.silent) {
                    SIToast.error('Error interno del servidor. Inténtelo más tarde.');
                }
                return result;
            }

            // ── Errores de Cliente (4xx) ──
            // Se vuelven silenciosos por defecto para evitar duplicidad de "toasts",
            // ya que el patrón del proyecto es gestionarlos en el componente llamador.
            if (!response.ok && !options.silent) {
                // SIToast.error(result.message || 'Error en la operación');
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
    get(endpoint, options) { return this.request('GET', endpoint, null, options); },
    post(endpoint, data, options) { return this.request('POST', endpoint, data, options); },
    put(endpoint, data, options) { return this.request('PUT', endpoint, data, options); },
    patch(endpoint, data, options) { return this.request('PATCH', endpoint, data, options); },
    delete(endpoint, data, options) { return this.request('DELETE', endpoint, data, options); },

    // ──────────────────────────────────────
    // HANDLERS
    // ──────────────────────────────────────

    /** Redirigir por sesión expirada con modal UI */
    handleUnauthorized() {
        if (this._isRedirecting) return;
        this._isRedirecting = true;

        sessionStorage.clear();

        // ── Modal de Aviso Premium ──
        const modalId = 'si-unauthorized-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalHtml = `
            <div id="${modalId}" class="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300">
                <div class="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl transform scale-95 transition-transform duration-300 flex flex-col overflow-hidden">
                    <div class="p-8 text-center">
                        <div class="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <h3 class="text-xl font-extrabold text-gray-900 mb-2">Sesión Finalizada</h3>
                        <p class="text-sm text-gray-500 font-medium leading-relaxed">Tu sesión ha caducado por seguridad. Por favor, vuelve a iniciar sesión para continuar.</p>
                    </div>
                    <div class="p-6 bg-gray-50/50 border-t border-gray-100">
                        <button id="si-unauthorized-btn" class="w-full py-3.5 text-sm font-black text-white bg-[#1a1b25] rounded-xl hover:bg-gray-800 shadow-lg shadow-gray-400/20 transition-all focus:outline-none uppercase tracking-widest">
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById(modalId);
        const btn = document.getElementById('si-unauthorized-btn');

        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-95');
        });

        btn.onclick = () => {
            modal.classList.add('opacity-0');
            modal.querySelector('div').classList.add('scale-95');
            setTimeout(() => {
                window.location.href = '/steelinox/';
            }, 300);
        };
    },
};


// ═══════════════════════════════════════════
// Sistema de Toasts — Notificaciones Premium
// ═══════════════════════════════════════════
const SIToast = {
    container: null,

    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'si-toast-container';
        this.container.className = 'fixed bottom-6 right-6 z-[250] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(this.container);
    },

    /** Mostrar notificación flotante */
    show(title, message = '', type = 'info', duration = 5000) {
        this.init();

        const icons = {
            success: '<div class="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>',
            error: '<div class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg></div>',
            warning: '<div class="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>',
            info: '<div class="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>'
        };

        const toastHtml = `
            <div class="pointer-events-auto bg-white border border-gray-100 shadow-2xl rounded-2xl p-5 flex gap-4 items-start transform translate-y-10 opacity-0 transition-all duration-500 min-w-[320px] max-w-md group overflow-hidden relative">
                <div class="absolute top-0 left-0 w-1 h-full ${type === 'success' ? 'bg-emerald-500' : (type === 'error' ? 'bg-red-500' : (type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'))}"></div>
                ${icons[type] || icons.info}
                <div class="flex-1 min-w-0 pr-2">
                    <p class="text-[15px] font-black text-[#1a1b25] leading-tight mb-1">${this.escapeHtml(title)}</p>
                    ${message ? `<p class="text-xs font-medium text-gray-500 leading-relaxed">${this.escapeHtml(message)}</p>` : ''}
                </div>
                <button class="text-gray-300 hover:text-gray-900 transition-colors shrink-0 -mt-1" onclick="this.closest('.pointer-events-auto').remove()">
                     <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        `;

        this.container.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = this.container.lastElementChild;

        // Animate in
        requestAnimationFrame(() => {
            toastEl.classList.remove('translate-y-10', 'opacity-0');
        });

        // Autohremove
        setTimeout(() => {
            if (toastEl && toastEl.parentElement) {
                toastEl.classList.add('opacity-0', 'translate-x-12');
                setTimeout(() => toastEl.remove(), 500);
            }
        }, duration);
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Atajos semánticos
    success(title, msg) { this.show(title, msg, 'success'); },
    error(title, msg) { this.show(title, msg, 'error', 7000); },
    warning(title, msg) { this.show(title, msg, 'warning', 6000); },
    info(title, msg) { this.show(title, msg, 'info'); },
};
