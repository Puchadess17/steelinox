/**
 * Steel Inox Extranet — Reset Password Final Step
 */

document.addEventListener('DOMContentLoaded', () => {
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

        // Validaciones
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

        // Loading state
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="si-spinner" style="width:18px;height:18px;border-width:2px;margin-right:8px;"></span> Actualizando...`;

        try {
            const res = await API.post('/password/reset', { token, password }, { silent: true });

            if (res.success) {
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
