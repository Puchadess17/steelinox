/**
 * STEEL INOX EXTRANET — AUTH MODULE
 * Gestiona la autenticación del usuario: login, logout y flujo de
 * recuperación de contraseña. Persiste los datos del usuario en sessionStorage.
 *
 * @api POST /api/login   → { user: { id, name, role, client_id } }
 * @api POST /api/logout  → null
 * @api GET  /api/me      → { id, name, email, role, client_id }
 * @api POST /api/password/forgot → null
 * Depende de: api.js (API, SIToast), app.js (SIApp)
 */
const Auth = {

    // ──────────────────────────────────────
    // LOGIN
    // ──────────────────────────────────────

    /**
     * INICIALIZACIÓN DEL FORMULARIO DE LOGIN
     * Enlaza el toggle de visibilidad de contraseña y el submit del formulario.
     * Realiza validación client-side antes de enviar al servidor.
     * @api POST /api/login → { user: { id, name, role, client_id } }
     */
    initLogin() {
        this.initForgotPassword();
        const form = document.getElementById('login-form');
        const togglePass = document.getElementById('toggle-password');
        const passInput = document.getElementById('password');
        const emailInput = document.getElementById('email');
        const submitBtn = document.getElementById('btn-login');
        const errorBox = document.getElementById('login-error');

        if (!form) return;

        // Toggle visibilidad contraseña
        if (togglePass && passInput) {
            togglePass.addEventListener('click', () => {
                const isPass = passInput.type === 'password';
                passInput.type = isPass ? 'text' : 'password';
                const eyeOpen = togglePass.querySelector('.eye-open');
                const eyeClosed = togglePass.querySelector('.eye-closed');
                if (eyeOpen) eyeOpen.classList.toggle('hidden', !isPass);
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

            const email = emailInput?.value?.trim();
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
            SIApp.setBtnLoading('btn-login', true, 'Iniciando sesión...');

            // ── Llamada a la API ──
            const result = await API.post('/login', { email, password }, { silent: true });

            if (result.success && result.data) {
                if (result.data.requires_2fa) {
                    // FLUJO 2FA: Intercambiar formularios en la misma vista
                    Auth.showOtpPanel(result.data.email_hint);
                } else {
                    // LOGIN DIRECTO (Legacy/Bypass si fuera necesario)
                    this.clearLocalData();
                    sessionStorage.setItem('si_user', JSON.stringify(result.data));
                    window.location.href = '/steelinox/panel';
                }
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
                SIApp.setBtnLoading('btn-login', false);
            }
        });

        // Inicializar también el form de OTP por si acaso el usuario refresca (aunque SPA previene esto)
        this.initOtp();

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
        const otpForm = document.getElementById('otp-form');
        const footer = document.getElementById('footer-forgot');
        const errorBox = document.getElementById('login-error');

        if (errorBox) errorBox.classList.add('hidden');
        if (otpForm) otpForm.classList.add('hidden');

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

    /**
     * FLUJO 2FA: MOSTRAR PANEL OTP
     * Oculta el login y muestra el campo de 6 dígitos sin recarga de página.
     */
    showOtpPanel(emailHint) {
        const loginForm = document.getElementById('login-form');
        const otpForm = document.getElementById('otp-form');
        const footer = document.getElementById('footer-forgot');
        const emailHintEl = document.getElementById('otp-email-hint');

        if (emailHintEl) emailHintEl.textContent = emailHint || 'tu correo';

        loginForm.classList.add('hidden');
        otpForm.classList.remove('hidden');
        if (footer) footer.classList.add('hidden');

        // Focus al primer campo de código
        setTimeout(() => {
            document.getElementById('otp-code')?.focus();
        }, 400);
    },

    /** Volver al panel de login desde OTP */
    showLoginPanel() {
        const loginForm = document.getElementById('login-form');
        const otpForm = document.getElementById('otp-form');
        const footer = document.getElementById('footer-forgot');
        const errorBox = document.getElementById('login-error');

        if (errorBox) errorBox.classList.add('hidden');
        otpForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        if (footer) footer.classList.remove('hidden');
        
        SIApp.setBtnLoading('btn-login', false);
    },

    /**
     * INICIALIZACIÓN DEL FORMULARIO OTP
     * Gestiona el submit del código de 6 dígitos.
     * @api POST /api/login/verify-otp → { user: { id, name, role } }
     */
    initOtp() {
        const form = document.getElementById('otp-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codeInput = document.getElementById('otp-code');
            const code = codeInput.value.trim();

            if (code.length !== 6) {
                this.showLoginError('El código debe tener 6 dígitos.');
                return;
            }

            SIApp.setBtnLoading('btn-otp', true, 'Verificando...');

            try {
                const result = await API.post('/login/verify-otp', { code }, { silent: true });
                if (result.success && result.data) {
                    this.clearLocalData();
                    sessionStorage.setItem('si_user', JSON.stringify(result.data));
                    window.location.href = '/steelinox/panel';
                } else {
                    this.showLoginError(result.message || 'Código incorrecto.');
                }
            } catch (err) {
                this.showLoginError('Error de conexión al verificar el código.');
            } finally {
                SIApp.setBtnLoading('btn-otp', false);
            }
        });

        // Mejorar experiencia de entrada: solo números
        const codeInput = document.getElementById('otp-code');
        if (codeInput) {
            codeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value.length === 6) {
                    // Auto-submit opcional? Mejor que el usuario pulse el botón por seguridad
                }
            });
        }
    },

    /**
     * INICIALIZACIÓN DEL FORMULARIO DE RECUPERACIÓN DE CONTRASEÑA
     * Enlaza el submit del formulario de "olvidaste tu contraseña" y
     * envía el email al backend para generar el enlace de reset.
     * @api POST /api/password/forgot → null
     */
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

            SIApp.setBtnLoading('btn-forgot', true, 'Enviando...');

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
                SIApp.setBtnLoading('btn-forgot', false);
            }
        });
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

    /**
     * CIERRE DE SESIÓN
     * Notifica al backend y limpia todos los datos locales antes de redirigir al login.
     * @api POST /api/logout → null
     */
    async logout() {
        try {
            await API.post('/logout', null, { silent: true });
        } catch (e) {
            // Silently fail if API logout fails, we still clear local session
        }
        this.clearLocalData();
        window.location.href = '/steelinox/';
    },

    /** Limpia todos los datos de sesión local y preferencias específicas */
    clearLocalData() {
        // 1. Limpiar sessionStorage (datos de navegación temporal)
        sessionStorage.clear();

        // 2. Limpiar localStorage de forma selectiva (solo lo que empiece por si-)
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('si-') || key === 'si_user') {
                localStorage.removeItem(key);
            }
        });

        // 3. Resetear token en memoria de la API
        if (window.API) API.csrfToken = null;
    }
};
