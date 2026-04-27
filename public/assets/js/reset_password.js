/**
 * STEEL INOX EXTRANET — RESET PASSWORD (Paso Final)
 * Script independiente (fuera de la SPA) que gestiona el formulario de
 * restablecimiento de contraseña. Se ejecuta en la página dedicada de reset.
 *
 * Flujo:
 *   1. El usuario llega desde el enlace del email con un token en el HTML
 *   2. Valida la nueva contraseña (longitud mínima y confirmación)
 *   3. Envía el token y la nueva contraseña al backend
 *   4. En éxito: limpia la sesión local y muestra el bloque de confirmación
 *   5. En error: muestra el mensaje de error sin recargar la página
 *
 * @api POST /api/password/reset  { token, password } → null
 * Depende de: api.js (API) — cargado como script global antes de este archivo
 */

document.addEventListener('DOMContentLoaded', () => {
    // REFERENCIAS AL DOM
    // Todos los elementos necesarios se resuelven en el DOMContentLoaded
    // para garantizar que el HTML está completamente disponible.
    const form = document.getElementById('reset-password-form');
    const successBox = document.getElementById('reset-success');
    const errorBox = document.getElementById('reset-error');
    const btn = document.getElementById('btn-reset');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = document.getElementById('reset-token').value;
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm-password').value;

        // Limpiar errores
        errorBox.classList.add('hidden');
        errorBox.textContent = '';

        // VALIDACIONES CLIENT-SIDE
        // Se ejecutan antes de enviar al servidor para una respuesta más rápida.
        if (!password || password.length < 6) {
            errorBox.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            errorBox.classList.remove('hidden');
            return;
        }

        if (password !== confirm) {
            errorBox.textContent = 'Las contraseñas no coinciden.';
            errorBox.classList.remove('hidden');
            return;
        }

        // ESTADO DE CARGA
        // Se deshabilita el botón y se muestra un spinner durante la petición.
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="si-spinner" style="width:18px;height:18px;border-width:2px;margin-right:8px;"></span> Actualizando...`;

        try {
            // LLAMADA A LA API
            // Se usa { silent: true } para suprimir el toast de error global de api.js
            // y gestionar el error de forma personalizada en este formulario.
            const res = await API.post('/password/reset', { token, password }, { silent: true });

            if (res.success) {
                // Asegurar limpieza de cualquier sesión previa antes de mostrar el éxito
                if (window.Auth && typeof Auth.clearLocalData === 'function') {
                    Auth.clearLocalData();
                }

                const header = document.getElementById('reset-header');
                if (header) header.classList.add('hidden');
                
                form.classList.add('hidden');
                successBox.classList.remove('hidden');
                successBox.classList.add('animate-in', 'fade-in', 'zoom-in-95', 'duration-500');
            } else {
                errorBox.textContent = res.message || 'No se pudo restablecer la contraseña.';
                errorBox.classList.remove('hidden');
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        } catch (err) {
            console.error('Reset password error:', err);
            errorBox.textContent = 'Error de conexión con el servidor.';
            errorBox.classList.remove('hidden');
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    });
});
