<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steel Inox Extranet — Admin Project Detail</title>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Tailwind CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flyonui@latest/flyonui.min.css">
    <link rel="stylesheet" href="/steelinox/public/assets/css/app.css">

    <style>
        * { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-gray-50 antialiased">
    <!-- Variables inyectadas por PHP -->
    <script>
        const PROJECT_ID = <?= json_encode($projectId ?? 0) ?>;
    </script>

    <!-- HEADER -->
    <header class="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div class="flex items-center justify-between h-16 px-4 lg:px-6">
            <div class="flex items-center gap-3">
                <!-- Mobile hamburger -->
                <button id="btn-mobile-menu" class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <!-- Logo -->
                <a href="/steelinox/panel" class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                    <span class="text-lg font-bold text-orange-500 hidden sm:inline">Steel Inox Extranet</span>
                </a>
            </div>

            <!-- Center spacer -->
            <div class="hidden lg:block flex-1 mx-8"></div>

            <div class="flex items-center gap-3">
                <button class="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                </button>
                <div class="w-px h-8 bg-gray-200"></div>
                <div class="flex items-center gap-3">
                    <div class="hidden sm:block text-right">
                        <p id="header-user-name" class="text-sm font-semibold text-gray-800">Administrador</p>
                        <p id="header-user-role" class="text-xs text-gray-400 uppercase tracking-tighter">Admin</p>
                    </div>
                    <div id="header-user-avatar" class="avatar-initials">AD</div>
                    <button id="btn-logout" class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
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
                <a href="/steelinox/panel" class="hover:text-orange-500 transition-colors">Proyectos</a>
                <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                <span id="breadcrumb-project-name" class="text-gray-900 font-medium font-bold">Cargando proyecto...</span>
            </nav>

            <!-- Título y Referencia -->
            <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 id="admin-prj-title" class="text-2xl md:text-3xl font-extrabold text-[#1a1b25] tracking-tight">Cargando...</h1>
                        <span id="admin-prj-ref" class="px-2.5 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">REF</span>
                    </div>
                    <p class="text-gray-400 text-sm">Gestión y seguimiento detallado de la obra actual.</p>
                </div>
                <div class="text-right">
                    <span class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado Actual</span>
                    <span id="admin-prj-status-badge"></span>
                </div>
            </div>

            <!-- TABS -->
            <div class="border-b border-gray-200 mb-8 overflow-x-auto hide-scrollbar">
                <nav class="flex gap-8" aria-label="Tabs">
                    <button onclick="ProjectAdminView.switchTab('resumen', this)" class="tab-btn active border-orange-500 text-orange-600 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Resumen</button>
                    <button onclick="ProjectAdminView.switchTab('documentos', this)" class="tab-btn border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Documentos</button>
                    <button onclick="ProjectAdminView.switchTab('comentarios', this)" class="tab-btn border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Comentarios</button>
                    <button onclick="ProjectAdminView.switchTab('historial', this)" class="tab-btn border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Histórico</button>
                </nav>
            </div>

            <!-- TAB CONTENT CONTAINER -->
            <div id="tab-content" class="fade-in min-h-[400px]">
                <!-- El JS inyectará aquí el contenido de la pestaña seleccionada -->
                <div class="flex items-center justify-center py-20">
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
    
    <!-- SCRIPT ESPECÍFICO DEL DETALLE ADMIN -->
    <script src="/steelinox/public/assets/js/modules/project_detail_admin.js"></script>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            SIApp.init(); // Inicializar header/sidebar
            
            const user = Auth.getUser();
            if (user && user.name) {
                document.getElementById('header-user-name').textContent = user.name;
                document.getElementById('header-user-role').textContent = user.role.toUpperCase();
                document.getElementById('header-user-avatar').textContent = SIApp.avatarInitials(user.name).replace(/<[^>]*>?/gm, '');
            }

            // Iniciar lógica del Detail view Admin
            ProjectAdminView.init(PROJECT_ID, user);
        });
    </script>
</body>
</html>
