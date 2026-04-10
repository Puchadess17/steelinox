<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer Contraseña — Steel Inox</title>
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Favicon -->
    <link rel="apple-touch-icon" sizes="180x180" href="/steelinox/public/assets/img/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/steelinox/public/assets/img/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/steelinox/public/assets/img/favicon-16x16.png">
    <link rel="manifest" href="/steelinox/public/assets/img/site.webmanifest">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/steelinox/public/assets/css/app.css">
    <style>*{font-family:'Inter', sans-serif;}</style>
</head>
<body class="login-bg antialiased">
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
        <!-- Logo -->
        <div class="flex items-center gap-2.5 mb-8">
            <img src="/steelinox/public/logo-header.svg" alt="Steel Inox" class="h-12 w-auto">
        </div>

        <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
            <div class="p-8">
                <h1 class="text-xl font-bold text-gray-900 text-center mb-1">Nueva Contraseña</h1>
                <p class="text-sm text-gray-500 text-center mb-6">Por favor, introduce tu nueva clave de acceso.</p>

                <div id="reset-error" class="hidden mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"></div>

                <form id="reset-password-form" novalidate>
                    <input type="hidden" id="reset-token" value="<?php echo htmlspecialchars($token); ?>">
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1.5">Email asociado</label>
                        <input type="text" id="user-email" value="<?php echo htmlspecialchars($user['email']); ?>" disabled class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400">
                    </div>

                    <div class="mb-4">
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">Nueva Contraseña</label>
                        <div class="relative">
                            <input type="password" id="password" name="password" 
                                oninput="SIApp.validatePasswordRequirements(this); const cp = document.getElementById('confirm-password'); if(cp && cp.value) SIApp.validateField(cp, cp.value === this.value, 'Las contraseñas no coinciden');"
                                class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" required>
                            <button type="button" 
                                onclick="SIApp.togglePasswordVisibility(this)"
                                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors">
                                <span class="eye-open">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </span>
                                <span class="eye-closed hidden">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                </span>
                            </button>
                        </div>
                    </div>

                    <div class="mb-6">
                        <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Contraseña</label>
                        <div class="relative">
                            <input type="password" id="confirm-password"
                                oninput="SIApp.validateField(this, this.value === document.getElementById('password').value, 'Las contraseñas no coinciden')"
                                class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" required>
                            <button type="button" 
                                onclick="SIApp.togglePasswordVisibility(this)"
                                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors">
                                <span class="eye-open">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </span>
                                <span class="eye-closed hidden">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                </span>
                            </button>
                        </div>
                    </div>

                    <button type="submit" id="btn-reset" class="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all">
                        Cambiar Contraseña
                    </button>
                </form>

                <div id="reset-success" class="hidden text-center">
                    <div class="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <p class="text-gray-900 font-bold mb-2">¡Todo listo!</p>
                    <p class="text-sm text-gray-500 mb-6">Tu contraseña ha sido actualizada correctamente.</p>
                    <a href="/steelinox/login" class="inline-block py-3 px-8 bg-orange-500 text-white rounded-xl font-bold text-sm">Ir al Login</a>
                </div>
            </div>
        </div>
    </div>

    <script src="/steelinox/public/assets/js/api.js"></script>
    <script src="/steelinox/public/assets/js/reset_password.js"></script>
</body>
</html>
