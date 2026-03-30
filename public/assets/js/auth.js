/**
 * Steel Inox Extranet — Auth Module
 * Login, logout, y gestión de sesión en sessionStorage.
 * Depende de: api.js (API, SIToast)
 */
const Auth = {

    // ──────────────────────────────────────
    // LOGIN
    // ──────────────────────────────────────

    /** Inicializa el formulario de login */
    initLogin() {
        const form       = document.getElementById('login-form');
        const togglePass = document.getElementById('toggle-password');
        const passInput  = document.getElementById('password');
        const emailInput = document.getElementById('email');
        const submitBtn  = document.getElementById('btn-login');
        const errorBox   = document.getElementById('login-error');

        if (!form) return;

        // Toggle visibilidad contraseña
        if (togglePass && passInput) {
            togglePass.addEventListener('click', () => {
                const isPass = passInput.type === 'password';
                passInput.type = isPass ? 'text' : 'password';
                const eyeOpen   = togglePass.querySelector('.eye-open');
                const eyeClosed = togglePass.querySelector('.eye-closed');
                if (eyeOpen)   eyeOpen.classList.toggle('hidden', !isPass);
                if (eyeClosed) eyeClosed.classList.toggle('hidden', isPass);
            });
        }

        // Submit del login
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Limpiar error anterior
            if (errorBox) {
                errorBox.classList.add('hidden');
                errorBox.textContent = '';
            }

            const email    = emailInput?.value?.trim();
            const password = passInput?.value;

            // ── Validación client-side ──
            if (!email || !password) {
                Auth.showLoginError('Por favor, completa todos los campos.');
                return;
            }
            if (!Auth._isValidEmail(email)) {
                Auth.showLoginError('Introduce un correo electrónico válido.');
                return;
            }
            if (password.length < 6) {
                Auth.showLoginError('La contraseña debe tener al menos 6 caracteres.');
                return;
            }

            // ── Loading state ──
            Auth._setLoginLoading(submitBtn, true);

            // ── Llamada a la API ──
            const result = await API.post('/login', { email, password }, { silent: true });

            if (result.success && result.data) {
                // Guardar datos del usuario en sessionStorage
                sessionStorage.setItem('si_user', JSON.stringify(result.data));

                // Redirigir al panel
                window.location.href = '/steelinox/panel';
            } else {
                // Mostrar error
                let errorMsg = result.message || 'Error al iniciar sesión.';

                // Si hay errores por campo, concatenar
                if (result.errors) {
                    const fieldErrors = Object.values(result.errors);
                    if (fieldErrors.length > 0) {
                        errorMsg = fieldErrors.join('. ');
                    }
                }

                Auth.showLoginError(errorMsg);
                Auth._setLoginLoading(submitBtn, false);
            }
        });

        // Foco inicial en email
        emailInput?.focus();
    },

    /** Mostrar error en el login */
    showLoginError(message) {
        const errorBox = document.getElementById('login-error');
        if (errorBox) {
            errorBox.textContent = message;
            errorBox.classList.remove('hidden');
            errorBox.classList.add('fade-in');
        }
    },

    /** Toggle loading state del botón de login */
    _setLoginLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        if (loading) {
            btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = `
                <span class="si-spinner" style="width:20px;height:20px;border-width:2px;"></span>
                <span>Iniciando sesión...</span>
            `;
        } else {
            btn.innerHTML = btn.dataset.originalHtml || `
                <span>Iniciar sesión</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            `;
        }
    },

    /** Validación simple de email */
    _isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // ──────────────────────────────────────
    // SESIÓN
    // ──────────────────────────────────────

    /** ¿Está logueado? */
    isLoggedIn() {
        return sessionStorage.getItem('si_user') !== null;
    },

    /** Obtener datos del usuario */
    getUser() {
        const data = sessionStorage.getItem('si_user');
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch {
            sessionStorage.removeItem('si_user');
            return null;
        }
    },

    /** Cerrar sesión */
    async logout() {
        try {
            await API.post('/logout', null, { silent: true });
        } catch (e) {
            // Si falla la petición, igualmente limpiamos el frontend
            console.warn('Auth: Error en logout API, limpiando sesión local:', e);
        }
        sessionStorage.removeItem('si_user');
        API.csrfToken = null;
        window.location.href = '/steelinox/';
    },
};
