<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steel Inox Extranet — Detalle del Cliente</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">

    <!-- Tailwind CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flyonui@latest/flyonui.min.css">
    <link rel="stylesheet" href="/steelinox/public/assets/css/app.css">

    <style>
        * {
            font-family: 'Inter', sans-serif;
        }
    </style>
</head>

<body class="bg-gray-50 antialiased">
    <!-- Variables inyectadas por PHP -->
    <script>
        const CLIENT_ID = <?= json_encode($clientId ?? 0) ?>;
    </script>

    <!-- HEADER -->
    <header class="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div class="flex items-center justify-between h-16 px-4 lg:px-6">
            <div class="flex items-center gap-3">
                <button id="btn-mobile-menu" class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <a href="/steelinox/panel" class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <span class="text-lg font-bold text-orange-500 hidden sm:inline">Steel Inox Extranet</span>
                </a>
            </div>

            <div class="hidden lg:block flex-1 mx-8"></div>

            <div class="flex items-center gap-3">
                <button class="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </button>
                <div class="w-px h-8 bg-gray-200"></div>
                <div class="flex items-center gap-3">
                    <div class="hidden sm:block text-right">
                        <p id="header-user-name" class="text-sm font-semibold text-gray-800">Cargando...</p>
                        <p id="header-user-role" class="text-xs text-gray-400 uppercase tracking-tighter">Admin</p>
                    </div>
                    <div id="header-user-avatar" class="avatar-initials">--</div>
                    <button id="btn-logout" class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <div class="pt-16 flex min-h-screen">
        <!-- SIDEBAR -->
        <aside class="sidebar-desktop fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-gray-200 overflow-y-auto z-30 hidden lg:flex flex-col">
            <nav id="sidebar-nav" class="flex-1 flex flex-col p-4 gap-1">
                <!-- Inyectado por SIApp.buildSidebar() -->
            </nav>
        </aside>

        <!-- MAIN CONTENT -->
        <main id="main-content" class="flex-1 lg:ml-60 p-4 lg:p-8">
            <!-- Breadcrumb -->
            <nav class="flex text-sm text-gray-500 mb-6 gap-2" aria-label="Breadcrumb">
                <a href="/steelinox/clients" class="hover:text-orange-500 transition-colors">Clientes</a>
                <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span id="breadcrumb-client-name" class="text-gray-900 font-medium font-bold">Cargando cliente...</span>
            </nav>

            <!-- Título y Acciones -->
            <div id="client-header-container" class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-orange-100/50 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm border border-orange-200/50">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <h1 id="client-name" class="text-2xl md:text-3xl font-black text-[#1a1b25] tracking-tight">Cargando...</h1>
                        <p id="client-ref" class="text-gray-400 text-sm font-bold tracking-widest uppercase">REF: --</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button class="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver
                    </button>
                    <button class="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar Cliente
                    </button>
                </div>
            </div>

            <!-- CONTENIDO DINÁMICO -->
            <div id="client-detail-content">
                <div class="flex items-center justify-center py-40">
                    <div class="si-spinner"></div>
                </div>
            </div>

        </main>
    </div>

    <!-- FOOTER -->
    <footer class="lg:ml-60 border-t border-gray-100 bg-white">
        <div class="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
            <span>© 2024 Steel Inox Extranet. All rights reserved.</span>
            <div class="flex items-center gap-4">
                <a href="#" class="hover:text-orange-500">Privacy Policy</a>
                <a href="#" class="hover:text-orange-500">Terms of Service</a>
                <a href="#" class="hover:text-orange-500">Support</a>
            </div>
        </div>
    </footer>

    <!-- SCRIPTS CORE -->
    <script src="/steelinox/public/assets/js/api.js"></script>
    <script src="/steelinox/public/assets/js/auth.js"></script>
    <script src="/steelinox/public/assets/js/app.js"></script>

    <!-- SCRIPT ESPECÍFICO DEL DETALLE CLIENTE -->
    <script src="/steelinox/public/assets/js/modules/client_detail_admin.js"></script>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            SIApp.init(); // Inicializar header/sidebar

            const user = Auth.getUser();
            if (user && user.name) {
                document.getElementById('header-user-name').textContent = user.name;
                document.getElementById('header-user-role').textContent = SIApp._roleLabel(user.role).toUpperCase();
                document.getElementById('header-user-avatar').textContent = SIApp._getInitials(user.name);
            }

            // Iniciar lógica del Client Detail view Admin
            ClientDetailAdmin.init(CLIENT_ID, user);
        });
    </script>
</body>

</html>
