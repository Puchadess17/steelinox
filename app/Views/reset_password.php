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
                        <input type="text" value="<?php echo htmlspecialchars($user['email']); ?>" disabled class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400">
                    </div>

                    <div class="mb-4">
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">Nueva Contraseña</label>
                        <input type="password" id="password" name="password" 
                            class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" required>
                    </div>

                    <div class="mb-6">
                        <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Contraseña</label>
                        <input type="password" id="confirm-password"
                            class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" required>
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
