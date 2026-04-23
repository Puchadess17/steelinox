<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steel Inox Extranet — Panel</title>
    <meta name="description" content="Panel de gestión de proyectos Steel Inox.">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Favicon -->
    <link rel="apple-touch-icon" sizes="180x180" href="/steelinox/public/assets/img/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/steelinox/public/assets/img/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/steelinox/public/assets/img/favicon-16x16.png">
    <link rel="manifest" href="/steelinox/public/assets/img/site.webmanifest">

    <!-- Tailwind CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class'
        }
    </script>

    <!-- FlyonUI CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flyonui@latest/flyonui.min.css">

    <!-- Flatpickr CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">

    <!-- Custom CSS -->
    <link rel="stylesheet"
        href="/steelinox/public/assets/css/app.css?v=<?php echo filemtime(ROOT_PATH . '/public/assets/css/app.css'); ?>">



    <script>
            // Aplicar modo oscuro inmediatamente si existe en localStorage
            (function () {
                const savedTheme = localStorage.getItem('si-theme');
                if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                }
            })();
    </script>
</head>

<body class="bg-gray-50 antialiased">

    <!-- ═══════════════════════════════════ -->
    <!-- HEADER / NAVBAR                     -->
    <!-- ═══════════════════════════════════ -->
    <header class="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div class="flex items-center justify-between h-16 px-4 lg:px-6">
            <!-- Left: Logo + Hamburger (mobile) -->
            <div class="flex items-center gap-3">
                <!-- Mobile hamburger -->
                <button id="btn-mobile-menu" class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <!-- Logo -->
                <a href="javascript:void(0)" onclick="SIRouter.navigate('dashboard')" class="flex items-center gap-2">
                    <img src="/steelinox/public/logo-header.svg" alt="Steel Inox" class="h-9 w-auto dark:hidden">
                    <img src="/steelinox/public/logo-header-blanco.svg" alt="Steel Inox"
                        class="h-9 w-auto hidden dark:block">
                </a>
            </div>

            <!-- Center: (Vació tras eliminar el buscador global) -->
            <div class="hidden md:block flex-1 mx-8"></div>

            <!-- Right: Notifications + Avatar + Logout -->
            <div class="flex items-center gap-3">

                <!-- User info -->
                <div class="flex items-center gap-3">
                    <div class="hidden sm:block text-right">
                        <p id="header-user-name" class="text-sm font-semibold text-gray-800">Usuario</p>
                        <p id="header-user-role" class="text-xs text-gray-400">Rol</p>
                    </div>
                    <div id="header-user-avatar" class="avatar-initials">??</div>
                    <!-- Logout -->
                    <button id="btn-logout" class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="Cerrar sesión">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- LAYOUT: SIDEBAR + MAIN              -->
    <div class="pt-16 flex min-h-screen">

        <!-- Desktop Sidebar -->
        <aside
            class="sidebar-desktop fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-gray-200 overflow-y-auto z-30 hidden lg:flex flex-col">
            <nav id="sidebar-nav" class="flex-1 flex flex-col p-4 gap-1">
                <!-- Inyectado por SIApp.buildSidebar() -->
            </nav>
        </aside>

        <!-- Mobile Sidebar Overlay -->
        <div id="sidebar-overlay" class="sidebar-mobile-overlay fixed inset-0 bg-black/40 z-40 hidden"
            onclick="SIPanelUI.closeMobileSidebar()"></div>

        <!-- Mobile Sidebar -->
        <aside id="sidebar-mobile"
            class="sidebar-mobile fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto z-50 transform -translate-x-full transition-transform duration-300">
            <!-- Mobile sidebar header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-100">
                <div class="flex items-center gap-2">
                    <img src="/steelinox/public/logo-header.svg" alt="Steel Inox" class="h-8 w-auto dark:hidden">
                    <img src="/steelinox/public/logo-header-blanco.svg" alt="Steel Inox"
                        class="h-8 w-auto hidden dark:block">
                </div>
                <button onclick="SIPanelUI.closeMobileSidebar()" class="p-2 rounded-lg text-gray-400 hover:bg-gray-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <nav id="sidebar-nav-mobile" class="flex flex-col p-4 gap-1">
                <!-- Inyectado por SIApp.buildSidebar() -->
            </nav>
        </aside>

        <!-- MAIN CONTENT -->
        <main id="main-content" class="flex-1 lg:ml-60 p-4 lg:p-8 page-enter">
            <!-- Breadcrumb -->
            <div id="breadcrumb" class="flex items-center gap-2 text-sm mb-6">
                <span class="text-gray-400">Cargando...</span>
            </div>

            <!-- Spinner inicial -->
            <div class="flex items-center justify-center py-20">
                <div class="si-spinner"></div>
            </div>
        </main>
    </div>

    <!-- FOOTER                              -->
    <footer class="lg:ml-60 border-t border-gray-100 bg-white">
        <div class="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <span>© <?= date('Y') ?> Steel Inox Extranet. Todos los derechos reservados.</span>

            <div class="opacity-50 hover:opacity-100 transition-opacity">
                <a href="https://unanimecreativos.com" target="_blank" class="flex items-center gap-2">
                    <img class="h-5 w-auto invert"
                        src="https://workspace.unanimecreativos.com/img/unanime/by-unanime.svg" alt="UNANIME"
                        loading="lazy">
                </a>
            </div>
        </div>
    </footer>

    <!-- SCRIPTS                             -->
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/es.js"></script>
    <script
        src="/steelinox/public/assets/js/api.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/api.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/app.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/app.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/auth.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/auth.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/router.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/router.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/templates.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/templates.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/dashboard.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/dashboard.js'); ?>"></script>

    <script
        src="/steelinox/public/assets/js/modules/project_detail_admin.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/project_detail_admin.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/client_detail_admin.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/client_detail_admin.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/client_form_admin.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/client_form_admin.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/audit.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/audit.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/commercials_admin.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/commercials_admin.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/commercial_form_admin.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/commercial_form_admin.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/client_users_admin.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/client_users_admin.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/client_user_form_admin.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/client_user_form_admin.js'); ?>"></script>
    <script
        src="/steelinox/public/assets/js/modules/settings.js?v=<?php echo filemtime(ROOT_PATH . '/public/assets/js/modules/settings.js'); ?>"></script>

    <script>

        // Panel UI helpers (mobile sidebar)
        const SIPanelUI = {
            openMobileSidebar() {
                document.getElementById('sidebar-mobile')?.classList.remove('-translate-x-full');
                document.getElementById('sidebar-overlay')?.classList.remove('hidden');
            },
            closeMobileSidebar() {
                document.getElementById('sidebar-mobile')?.classList.add('-translate-x-full');
                document.getElementById('sidebar-overlay')?.classList.add('hidden');
            }
        };

        // Mobile menu toggle
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('btn-mobile-menu')?.addEventListener('click', SIPanelUI.openMobileSidebar);

            // Init app
            SIApp.init();
        });
    </script>
</body>

</html>