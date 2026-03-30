<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steel Inox Extranet — Detalle del Proyecto</title>
    
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
        /* Scrollbar styling para el visor y chat */
        .chat-scroll::-webkit-scrollbar { width: 6px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .chat-scroll:hover::-webkit-scrollbar-thumb { background: #d1d5db; }
    </style>
</head>
<body class="bg-gray-50 flex flex-col h-screen overflow-hidden">
    <!-- Variables inyectadas por PHP -->
    <script>
        const PROJECT_ID = <?= json_encode($projectId ?? 0) ?>;
    </script>

    <!-- HEADER (Simplificado para vista enfocada o igual que panel) -->
    <header class="bg-white border-b border-gray-200 z-40 h-16 shrink-0 flex items-center justify-between px-4 lg:px-6">
        <div class="flex items-center gap-4">
            <!-- Botón Volver -->
            <a href="/steelinox/panel" class="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                <span class="text-sm font-medium hidden sm:inline">Volver</span>
            </a>

            <!-- Logo -->
            <div class="flex items-center gap-2 pl-4 border-l border-gray-100">
                <div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                </div>
                <span class="text-lg font-bold text-orange-500 hidden md:inline">Steel Inox Extranet</span>
            </div>
        </div>

        <!-- Buscador Global falso como en el wireframe -->
        <div class="hidden lg:flex flex-1 max-w-md mx-8 relative">
            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder="Search projects, documents, or clients..." class="w-full bg-gray-50 border border-gray-100 placeholder-gray-400 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" disabled>
        </div>

        <div class="flex items-center gap-3">
            <button class="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </button>
            <div class="w-px h-8 bg-gray-200 hidden sm:block"></div>
            <div class="flex items-center gap-3">
                <div class="hidden sm:block text-right">
                    <p id="header-user-name" class="text-sm font-semibold text-gray-800">Cargando...</p>
                    <p id="header-user-role" class="text-xs text-gray-400">...</p>
                </div>
                <div id="header-user-avatar" class="avatar-initials w-9 h-9">--</div>
            </div>
        </div>
    </header>

    <!-- PROJECT TOP BAR -->
    <div class="bg-white border-b border-gray-200 shrink-0">
        <div class="max-w-[1920px] mx-auto px-4 lg:px-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 min-h-[80px]">
                
                <!-- Skeleton Izquierdo -->
                <div id="project-header-skeleton" class="flex gap-4 items-center w-full sm:w-1/2 animate-pulse">
                    <div class="w-12 h-12 bg-gray-100 rounded-xl"></div>
                    <div class="flex-1">
                        <div class="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-4 bg-gray-100 rounded w-1/4"></div>
                    </div>
                </div>

                <!-- Contenido Real Izquierdo (Oculto inicio) -->
                <div id="project-header-content" class="hidden flex items-center gap-4">
                    <div class="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center border border-orange-100/50 shrink-0">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <div>
                        <h1 id="prj-title" class="text-xl font-bold text-[#1a1b25] leading-tight">...</h1>
                        <p id="prj-ref" class="text-sm text-gray-500 mt-0.5">Ref: ...</p>
                    </div>
                </div>

                <!-- Right Side Actions -->
                <div class="flex items-center gap-3 self-end sm:self-auto">
                    <div id="prj-badge" class="mr-2">
                        <!-- Badge se inyecta por JS -->
                    </div>
                    <button class="bg-[#1a1b25] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors hidden" id="btn-admin-action">
                        Modificar Estado
                    </button>
                    <button class="bg-orange-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-orange-600 hover:-translate-y-0.5 transition-all shadow-orange-500/20" id="btn-client-action">
                        Aprobar Propuesta
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- MAIN APP GRID LAYOUT -->
    <main class="flex-1 overflow-hidden">
        <div class="h-full flex flex-col lg:flex-row max-w-[1920px] mx-auto bg-white border-x border-gray-200 layout-shadow">
            
            <!-- LEFT: Historial de Versiones -->
            <aside class="w-full lg:w-[320px] border-r border-gray-100 flex flex-col shrink-0 h-[300px] lg:h-full">
                <div class="p-4 border-b border-gray-50 bg-white">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Historial de Versiones
                    </h3>
                </div>
                <div class="flex-1 overflow-y-auto chat-scroll py-2 px-3 space-y-2 relative">
                    <!-- Linea vertical conectora -->
                    <div class="absolute left-6 top-8 bottom-8 w-px bg-gray-100 -z-10"></div>
                    
                    <!-- MOCK ITEM 1 (Activo) -->
                    <div class="p-4 border-2 border-orange-100 bg-orange-50/30 rounded-xl relative cursor-pointer">
                        <div class="absolute -left-1.5 top-5 w-3 h-3 rounded-full bg-orange-500 border-[3px] border-white shadow-sm"></div>
                        <div class="flex justify-between items-start mb-1">
                            <h4 class="font-bold text-sm text-gray-900">Versión 3.0 Final</h4>
                            <span class="text-xs text-orange-600 bg-orange-100 rounded-full px-2 py-0.5 font-bold">Activo</span>
                        </div>
                        <p class="text-xs text-gray-600 mb-2">Planos de Estructura</p>
                        <div class="text-[10px] text-gray-400 font-medium">24 May 2024 • Ing. Carlos Ruiz</div>
                    </div>

                    <!-- MOCK ITEM 2 -->
                    <div class="p-4 border border-transparent hover:bg-gray-50 rounded-xl transition-colors relative cursor-pointer">
                        <div class="absolute -left-1.5 top-5 w-3 h-3 rounded-full bg-red-400 border-[3px] border-white z-10"></div>
                        <div class="flex justify-between items-start mb-1">
                            <h4 class="font-bold text-sm text-gray-700">Versión 2.1 Ajuste...</h4>
                            <span class="text-[10px] text-red-600 bg-red-50 rounded-full px-2 py-0.5 font-bold">Rechazada</span>
                        </div>
                        <div class="text-[10px] text-gray-400 font-medium">15 May 2024 • Arq. Elena Sanz</div>
                    </div>

                    <!-- MOCK ITEM 3 -->
                    <div class="p-4 border border-transparent hover:bg-gray-50 rounded-xl transition-colors relative cursor-pointer">
                        <div class="absolute -left-1.5 top-5 w-3 h-3 rounded-full bg-emerald-400 border-[3px] border-white z-10"></div>
                        <div class="flex justify-between items-start mb-1">
                            <h4 class="font-bold text-sm text-gray-700">Versión 1.0 Concepto</h4>
                            <span class="text-[10px] text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 font-bold">Aprobada</span>
                        </div>
                        <div class="text-[10px] text-gray-400 font-medium">02 May 2024 • Ing. Carlos Ruiz</div>
                    </div>
                </div>
            </aside>

            <!-- MIDDLE: Visor Oscuro PDF -->
            <section class="flex-1 bg-[#151515] flex flex-col w-full relative h-[50Vh] lg:h-full border-r border-[#2a2a2a] shrink-0">
                
                <!-- Toolbar top -->
                <div class="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-4 border border-white/10 z-10 shadow-xl">
                    <button class="text-gray-400 hover:text-white transition"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg></button>
                    <span class="text-white text-xs font-bold w-12 text-center">100%</span>
                    <button class="text-gray-400 hover:text-white transition"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"/></svg></button>
                    <div class="w-px h-4 bg-gray-600"></div>
                    <button class="text-gray-400 hover:text-white transition"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg></button>
                    <button class="text-gray-400 hover:text-white transition"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
                </div>

                <!-- Visor Canvas Mock -->
                <div class="flex-1 overflow-auto flex items-center justify-center p-8 relative">
                    <!-- Imagen de la torre desde LoremPicsum o un placeholder -->
                    <div class="bg-white w-full max-w-lg aspect-[3/4] shadow-2xl rounded relative p-8 flex items-center justify-center border border-white/10 group overflow-hidden">
                        <!-- Placholder de plano simulado -->
                        <div class="absolute inset-4 border-2 border-blue-900/10 grid grid-cols-4 grid-rows-4 opacity-50">
                            <div class="border-b border-r border-blue-900/10"></div><div class="border-b border-r border-blue-900/10"></div><div class="border-b border-r border-blue-900/10"></div><div class="border-b border-blue-900/10"></div>
                            <div class="border-b border-r border-blue-900/10"></div><div class="border-b border-r border-blue-900/10"></div><div class="border-b border-r border-blue-900/10"></div><div class="border-b border-blue-900/10"></div>
                            <div class="border-b border-r border-blue-900/10"></div><div class="border-b border-r border-blue-900/10"></div><div class="border-b border-r border-blue-900/10"></div><div class="border-b border-blue-900/10"></div>
                            <div class="border-r border-blue-900/10"></div><div class="border-r border-blue-900/10"></div><div class="border-r border-blue-900/10"></div><div></div>
                        </div>
                        <svg class="w-full h-full text-gray-200 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="0.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        
                        <div class="absolute bottom-6 left-6 bg-black/60 backdrop-blur text-white text-[10px] px-3 py-1.5 rounded uppercase font-bold tracking-wider">
                            Página 1 de 12
                        </div>
                    </div>
                </div>

                <!-- Footer del Visor (Barra Info) -->
                <div class="h-14 bg-[#0a0a0a] border-t border-white/10 flex items-center justify-between px-6 shrink-0">
                    <button class="text-white text-xs font-semibold hover:text-orange-500 transition flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                        Anterior
                    </button>
                    <span class="text-white text-xs">Hoja 01 / E-102</span>
                    <button class="text-white text-xs font-semibold hover:text-orange-500 transition flex items-center gap-1">
                        Siguiente
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </section>

            <!-- RIGHT: Panel de Comentarios -->
            <aside class="w-full lg:w-[360px] flex flex-col shrink-0 h-[400px] lg:h-full bg-white relative">
                
                <div class="p-4 border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                        Comentarios
                    </h3>
                    <span class="text-xs text-gray-400 font-bold">3 Mensajes</span>
                </div>

                <!-- Chat Scroll Area -->
                <div class="flex-1 overflow-y-auto chat-scroll p-4 space-y-4 bg-gray-50/30">
                    <!-- Received -->
                    <div class="flex gap-3">
                        <div class="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">CR</div>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xs font-bold text-gray-800">Carlos Ruiz</span>
                                <span class="text-[10px] text-gray-400">09:15 AM</span>
                            </div>
                            <div class="bg-gray-100/80 text-gray-700 text-sm p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                                Hola, adjunto los planos con las correcciones solicitadas en la reunión pasada sobre la tornillería.
                            </div>
                        </div>
                    </div>

                    <!-- Sent (User) -->
                    <div class="flex gap-3 flex-row-reverse">
                        <div class="w-7 h-7 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">TU</div>
                        <div class="flex flex-col items-end">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-[10px] text-gray-400">10:30 AM</span>
                                <span class="text-xs font-bold text-gray-800">Tú (Cliente)</span>
                            </div>
                            <div class="bg-orange-500 text-white text-sm p-3 rounded-2xl rounded-tr-sm shadow-md border border-orange-600/50 text-right leading-relaxed">
                                Gracias Carlos. ¿Habéis tenido en cuenta la resistencia al ambiente salino para el acero inoxidable?
                            </div>
                        </div>
                    </div>

                    <!-- Received -->
                    <div class="flex gap-3">
                        <div class="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">CR</div>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xs font-bold text-gray-800">Carlos Ruiz</span>
                                <span class="text-[10px] text-gray-400">11:45 AM</span>
                            </div>
                            <div class="bg-gray-100/80 text-gray-700 text-sm p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                                Afirmativo. Se ha especificado AISI 316L en todas las juntas expuestas.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Input box -->
                <div class="p-4 border-t border-gray-200 bg-white">
                    <div class="relative">
                        <textarea rows="2" placeholder="Escribe un comentario o duda..." class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none pr-10"></textarea>
                        <button class="absolute bottom-3 right-3 p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition shadow-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                        </button>
                    </div>
                    <div class="flex justify-between items-center mt-2 px-1">
                        <span class="text-[10px] text-gray-400">Presiona Enter para enviar</span>
                        <button class="text-xs text-gray-500 font-medium hover:text-gray-900 flex items-center gap-1">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                            Adjuntar
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    </main>

    <!-- SCRIPTS CORE -->
    <script src="/steelinox/public/assets/js/api.js"></script>
    <script src="/steelinox/public/assets/js/auth.js"></script>
    <script src="/steelinox/public/assets/js/app.js"></script>
    
    <!-- SCRIPT ESPECÍFICO DEL DETALLE -->
    <script src="/steelinox/public/assets/js/modules/project_detail.js"></script>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const user = Auth.getUser();
            if(!user) {
                window.location.href = '/steelinox';
                return;
            }

            // Mostrar nombre del usuario en header
            document.getElementById('header-user-name').textContent = user.name || 'Usuario';
            document.getElementById('header-user-role').textContent = user.role.toUpperCase() || 'CLIENTE';
            document.getElementById('header-user-avatar').textContent = SIApp.avatarInitials(user.name).replace(/<[^>]*>?/gm, '');

            // Iniciar la lógica del Detail view
            ProjectDetailView.init(PROJECT_ID, user);
        });
    </script>
</body>
</html>
