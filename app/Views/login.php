<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steel Inox Extranet — Iniciar sesión</title>
    <meta name="description" content="Accede a la extranet privada de Steel Inox para gestionar tus proyectos.">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Tailwind CDN -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- FlyonUI CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flyonui@latest/flyonui.min.css">

    <!-- Custom CSS -->
    <link rel="stylesheet"
        href="/steelinox/public/assets/css/app.css?v=<?php echo filemtime(ROOT_PATH . '/public/assets/css/app.css'); ?>">

    <style>
        * {
            font-family: 'Inter', sans-serif;
        }
    </style>
</head>

<body class="login-bg antialiased">

    <div class="min-h-screen flex flex-col items-center justify-center p-4">
        <!-- Logo -->
        <div class="flex items-center gap-2.5 mb-8">
            <div class="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            </div>
            <span class="text-2xl font-bold text-orange-500">Steel Inox</span>
        </div>

        <!-- Card de login -->
        <div class="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
            <div class="p-8">
                <h1 class="text-xl font-bold text-gray-900 text-center mb-1">Iniciar sesión</h1>
                <p class="text-sm text-gray-500 text-center mb-6">Accede a tu panel de gestión de proyectos</p>

                <!-- Error general -->
                <div id="login-error"
                    class="hidden mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"></div>

                <!-- Formulario -->
                <form id="login-form" autocomplete="on" novalidate>
                    <!-- Email -->
                    <div class="mb-4">
                        <label for="email" class="block text-sm font-medium text-gray-700 mb-1.5">Correo
                            electrónico</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </span>
                            <input type="email" id="email" name="email" autocomplete="email"
                                placeholder="ejemplo@steelinox.com"
                                class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                required>
                        </div>
                    </div>

                    <!-- Password -->
                    <div class="mb-5">
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </span>
                            <input type="password" id="password" name="password" autocomplete="current-password"
                                placeholder="Tu contraseña"
                                class="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                required>
                            <button type="button" id="toggle-password"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <span class="eye-open">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </span>
                                <span class="eye-closed hidden">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                </span>
                            </button>
                        </div>
                    </div>

                    <!-- Submit -->
                    <button type="submit" id="btn-login"
                        class="w-full flex items-center justify-center gap-2 py-3 btn-si-primary rounded-xl text-sm font-semibold">
                        <span>Iniciar sesión</span>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </form>
            </div>

            <!-- Footer del card -->
            <div class="border-t border-gray-100 px-8 py-4 bg-gray-50/50 text-center">
                <a href="#" class="text-sm text-orange-500 hover:text-orange-600 font-medium">¿Olvidaste tu
                    contraseña?</a>
            </div>
        </div>

        <!-- Footer global -->
        <div class="mt-8 text-center">
            <p class="text-xs text-gray-400">© 2024 Steel Inox Extranet. Todos los derechos reservados.</p>
        </div>

        <!-- Scripts -->
        <script
            src="/steelinox/public/assets/js/api.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/api.js'); ?>"></script>
        <script
            src="/steelinox/public/assets/js/auth.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/auth.js'); ?>"></script>
        <script>
            // Inicializar CSRF + login form cuando el DOM esté listo
            document.addEventListener('DOMContentLoaded', async () => {
                // Si ya tiene sesión, ir al panel
                if (Auth.isLoggedIn()) {
                    window.location.href = '/steelinox/panel';
                    return;
                }
                // Pedir CSRF para el login POST
                await API.fetchCsrfToken();
                // Bindear formulario
                Auth.initLogin();
            });
        </script>
</body>

</html>