<?php
// app/Views/error.php
$errorCode = http_response_code() ?: 404;
$errorTitle = ($errorCode == 403) ? 'Acceso Denegado' : 'Página no encontrada';
$errorMessage = ($errorCode == 403) 
    ? 'No tienes los permisos necesarios para acceder a esta sección del sistema.' 
    : 'Lo sentimos, la página que estás buscando no existe o ha sido movida permanentemente.';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steel Inox Extranet — <?php echo $errorTitle; ?></title>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Tailwind CDN -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Custom CSS -->
    <link rel="stylesheet" href="/steelinox/public/assets/css/app.css">

    <style>
        * { font-family: 'Inter', sans-serif; }
        .error-num {
            background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
    </style>
</head>
<body class="bg-gray-50 flex items-center justify-center min-h-screen p-6 antialiased">

    <div class="max-w-md w-full text-center">
        <!-- Logo -->
        <div class="flex items-center justify-center gap-2.5 mb-12">
            <div class="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
            </div>
            <span class="text-2xl font-bold text-gray-900">Steel Inox</span>
        </div>

        <!-- Error Content -->
        <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
            <h1 class="error-num text-8xl font-black mb-4"><?php echo $errorCode; ?></h1>
            <h2 class="text-2xl font-bold text-gray-900 mb-4"><?php echo $errorTitle; ?></h2>
            <p class="text-gray-500 mb-8 leading-relaxed">
                <?php echo $errorMessage; ?>
            </p>

            <a href="/steelinox/panel" class="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-orange-500/25 active:transform active:scale-[0.98]">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                <span>Volver al Dashboard</span>
            </a>
        </div>
    </div>

</body>
</html>
