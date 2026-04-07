/**
 * Steel Inox Extranet — Auth Module
 * Login, logout, y gestión de sesión en sessionStorage.
 * Depende de: api.js (API, SIToast)
 */
const Auth = {

    // ──────────────────────────────────────
    // LOGIN
    // ──────────────────────────────────────

    initLogin() {
        this.initForgotPassword();
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
        }
    },

    // ──────────────────────────────────────
    // FORGOT PASSWORD
    // ──────────────────────────────────────

    toggleForgotPassword(show) {
        const loginForm = document.getElementById('login-form');
        const forgotForm = document.getElementById('forgot-password-form');
        const footer = document.getElementById('footer-forgot');
        const errorBox = document.getElementById('login-error');

        if (errorBox) errorBox.classList.add('hidden');

        if (show) {
            loginForm.classList.add('hidden');
            forgotForm.classList.remove('hidden');
            footer.classList.add('opacity-0', 'pointer-events-none');
            forgotForm.querySelector('input').focus();
        } else {
            forgotForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            footer.classList.remove('opacity-0', 'pointer-events-none');
            loginForm.querySelector('input').focus();
        }
    },

    initForgotPassword() {
        const form = document.getElementById('forgot-password-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-forgot');
            const emailInput = document.getElementById('forgot-email');
            const email = emailInput.value.trim();

            if (!email || !this._isValidEmail(email)) {
                this.showLoginError('Por favor, introduce un correo válido.');
                return;
            }

            this._setBtnLoading(btn, true, 'Enviando...');

            try {
                const result = await API.post('/password/forgot', { email }, { silent: true });
                if (result.success) {
                    if (window.SIToast) SIToast.success('Correo enviado', result.message);
                    this.toggleForgotPassword(false);
                } else {
                    this.showLoginError(result.message || 'Error al procesar la solicitud.');
                }
            } catch (err) {
                this.showLoginError('Error de conexión con el servidor.');
            } finally {
                this._setBtnLoading(btn, false, 'Enviar enlace de recuperación');
            }
        });
    },

    /** Toggle loading state genérico */
    _setBtnLoading(btn, loading, text) {
        if (!btn) return;
        btn.disabled = loading;
        if (loading) {
            btn.dataset.oldHtml = btn.innerHTML;
            btn.innerHTML = `<span class="si-spinner" style="width:18px;height:18px;border-width:2px;margin-right:8px;"></span> ${text}`;
        } else {
            btn.innerHTML = btn.dataset.oldHtml || text;
        }
    },

    /** Toggle loading state del botón de login */
    _setLoginLoading(btn, loading) {
        this._setBtnLoading(btn, loading, 'Iniciando sesión...');
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
