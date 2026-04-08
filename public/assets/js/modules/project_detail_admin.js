/**
 * Steel Inox Extranet — Project Detail View (Admin/Commercial)
 * Maneja la lógica de la página individual del proyecto para el equipo interno.
 */

window.SIModules = window.SIModules || {};

SIModules.projectDetailAdmin = {
    projectId: null,
    project: null,
    userContext: null,  // se inicializa en init()
    assignedUsers: [],
    documents: [],
    activeTab: 'resumen',
    activeDocTypeFilter: 'all',
    updatingDocumentId: null,

    /** Shortcut: usuario de sesión activo (siempre legible desde SIApp) */
    get user() { return window.SIApp ? SIApp.user : null; },

    async loadProjectDetailSPA() {
        const pathParts = window.location.pathname.split('/');
        const projectId = pathParts[pathParts.length - 1];

        if (!projectId || isNaN(projectId)) {
            SIRouter.show404();
            return;
        }

        const user = Auth.getUser();

        // Generar layout inicial
        const container = document.getElementById('main-content');
        container.innerHTML = `
            <!-- Breadcrumb -->
            <nav class="flex text-sm text-gray-500 mb-6 gap-2" aria-label="Breadcrumb">
                <a data-route="dashboard" href="/steelinox/panel" class="hover:text-orange-500 transition-colors">Proyectos</a>
                <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span id="breadcrumb-project-name" class="text-gray-900 font-medium font-bold">Cargando proyecto...</span>
            </nav>

            <!-- Título, Referencia y Status en un solo bloque -->
            <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 id="admin-prj-title" class="text-2xl md:text-3xl font-extrabold text-[#1a1b25] tracking-tight">Cargando...</h1>
                        <div class="flex items-center gap-2">
                            <span id="admin-prj-ref" class="px-2.5 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">REF</span>
                            <span id="admin-prj-status-badge"></span>
                        </div>
                    </div>
                    <p class="text-gray-400 text-sm">Gestión y seguimiento detallado de la obra actual.</p>
                </div>
                <div class="shrink-0 flex items-center">
                    <button onclick="SIModules.projectDetailAdmin.openEditProjectModal()" class="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 shadow-sm group">
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        Editar Proyecto
                    </button>
                </div>
            </div>

            <!-- TABS -->
            <div class="border-b border-gray-200 mb-8 overflow-x-auto hide-scrollbar">
                <nav class="flex gap-8" aria-label="Tabs">
                    <button onclick="SIModules.projectDetailAdmin.switchTab('resumen', this)" class="tab-btn active border-orange-500 text-orange-600 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Resumen</button>
                    <button onclick="SIModules.projectDetailAdmin.switchTab('documentos', this)" class="tab-btn border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Documentos</button>
                    <button onclick="SIModules.projectDetailAdmin.switchTab('historial', this)" class="tab-btn border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200 py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap">Histórico</button>
                </nav>
            </div>

            <!-- TAB CONTENT CONTAINER -->
            <div id="tab-content" class="fade-in min-h-[400px]">
                <div class="flex items-center justify-center py-20">
                    <div class="si-spinner"></div>
                </div>
            </div>

            <!-- MODAL ASIGNAR COMERCIAL -->
            <div id="assign-commercial-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl transform scale-95 transition-transform flex flex-col max-h-[90vh]">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="text-xl font-extrabold text-gray-900">Asignar Comercial</h3>
                        <button onclick="SIModules.projectDetailAdmin.closeAssignCommercialModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto" id="commercial-list-container">
                        <!-- Se llena vía JS -->
                    </div>
                </div>
            </div>

            <!-- MODAL SUBIR DOCUMENTO (PREMIUM) -->
            <div id="upload-doc-modal" class="fixed inset-0 bg-black/60 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4 backdrop-blur-sm">
                <div class="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden">
                    <!-- Header -->
                    <div class="p-8 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
                        <div>
                            <h3 class="text-2xl font-black text-gray-900 tracking-tight uppercase">Nuevo Documento</h3>
                            <p class="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Expediente del Proyecto</p>
                        </div>
                        <button onclick="SIModules.projectDetailAdmin.closeUploadModal()" class="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="p-8 overflow-y-auto space-y-6 custom-scrollbar">
                        <form id="upload-doc-form" class="space-y-6">
                            <!-- Nombre -->
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre del Documento *</label>
                                <input type="text" id="doc-upload-title" name="title" required 
                                       class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                                       placeholder="Ej: Planos de Estructura v2">
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- Tipo (Custom Dropdown) -->
                                <div class="space-y-2 relative">
                                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Archivo *</label>
                                    <input type="hidden" id="doc-upload-type" name="type" value="otros">
                                    <button type="button" onclick="SIModules.projectDetailAdmin.toggleCustomDropdown('dropdown-type-menu')" 
                                            class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 flex items-center justify-between hover:bg-white hover:border-gray-200 transition-all group">
                                        <span id="doc-upload-type-label">Otros</span>
                                        <svg class="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                                    </button>
                                    <!-- Dropdown Menu -->
                                    <div id="dropdown-type-menu" class="hidden absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <ul class="max-h-[220px] overflow-y-auto custom-scrollbar">
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('type', 'propuesta', 'Propuesta')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">Propuesta</li>
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('type', 'presupuesto', 'Presupuesto')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">Presupuesto</li>
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('type', 'plano', 'Plano')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">Plano</li>
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('type', 'documento_tecnico', 'Documento Técnico')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">Documento Técnico</li>
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('type', 'materiales', 'Materiales')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">Materiales</li>
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('type', 'pdf', 'PDF Genérico')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">PDF Genérico</li>
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('type', 'otros', 'Otros')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">Otros</li>
                                        </ul>
                                    </div>
                                </div>

                                <!-- Modo de Acceso (Custom Dropdown) -->
                                <div class="space-y-2 relative">
                                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modo de Acceso Cliente *</label>
                                    <input type="hidden" id="doc-upload-access" name="access_mode" value="download">
                                    <button type="button" onclick="SIModules.projectDetailAdmin.toggleCustomDropdown('dropdown-access-menu')" 
                                            class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 flex items-center justify-between hover:bg-white hover:border-gray-200 transition-all group">
                                        <span id="doc-upload-access-label">Descargar</span>
                                        <svg class="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                                    </button>
                                    <div id="dropdown-access-menu" class="hidden absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <ul>
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('access', 'view', 'Solo Visualizar')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">Solo Visualizar</li>
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('access', 'download', 'Solo Descargar')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">Solo Descargar</li>
                                            <li onclick="SIModules.projectDetailAdmin.selectCustomOption('access', 'both', 'Visualizar y Descargar')" class="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors">Visualizar y Descargar</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <!-- Visible Switch -->
                            <div class="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <p class="text-sm font-black text-gray-900">Visible para el cliente</p>
                                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Permite al cliente ver este documento</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="doc-upload-visible" name="is_visible_to_client" value="1" class="sr-only peer">
                                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                </label>
                            </div>

                            <!-- Selector de Archivo (Zona Drop) -->
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Archivo del Documento *</label>
                                <div onclick="document.getElementById('si-doc-upload-raw').click()" 
                                     id="doc-drop-zone"
                                     class="border-2 border-dashed border-gray-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer group">
                                    <div class="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-300 group-hover:text-orange-500 group-hover:scale-110 transition-all duration-500">
                                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-sm font-black text-gray-600 group-hover:text-gray-900 transition-colors" id="doc-file-selected-name">Haz clic o arrastra un archivo</p>
                                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">PDF, Imágenes, Word o Excel (Max 25MB)</p>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Footer -->
                    <div class="p-8 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                        <button onclick="SIModules.projectDetailAdmin.closeUploadModal()" class="px-6 py-3 text-sm font-black text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest">Cancelar</button>
                        <button onclick="SIModules.projectDetailAdmin.submitUploadForm()" id="btn-submit-upload" class="px-8 py-3 bg-[#E57B23] hover:bg-[#c9661c] text-white rounded-xl text-sm font-black shadow-lg shadow-orange-500/20 transition-all uppercase tracking-widest flex items-center gap-3">
                            <div id="submit-upload-spinner" class="si-spinner w-4 h-4 border-white/30 border-t-white hidden"></div>
                            <span>Subir Documento</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- MODAL PREVISUALIZACIÓN -->
            <div id="preview-doc-modal" class="fixed inset-0 bg-black/80 z-[60] hidden opacity-0 transition-opacity flex items-center justify-center p-4 xl:p-8 backdrop-blur-md">
                <div class="bg-white rounded-[2rem] w-full max-w-[90rem] h-[95vh] shadow-2xl transform scale-95 transition-all duration-300 flex flex-col overflow-hidden">
                    <!-- Header Completo -->
                    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                        <div class="flex items-center gap-4 min-w-0 flex-1">
                            <div class="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </div>
                            <div class="min-w-0 pr-4">
                                <h3 id="preview-doc-title" class="text-base sm:text-lg font-black text-gray-900 truncate uppercase tracking-tight">Cargando documento...</h3>
                                <div class="flex items-center gap-2 mt-1 flex-wrap">
                                    <span id="preview-meta-type" class="text-[10px] font-black text-orange-500 uppercase tracking-widest">Documento</span>
                                    <span class="text-gray-300 text-[10px]">•</span>
                                    <!-- Version Switcher Dropdown -->
                                    <div class="relative" id="version-switcher-wrapper">
                                        <button id="preview-version-btn" onclick="SIModules.projectDetailAdmin.toggleVersionSwitcher()" class="inline-flex items-center gap-1 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 border border-transparent hover:border-orange-200 text-gray-700 text-[10px] font-black px-2 py-0.5 rounded-lg transition-all uppercase tracking-widest cursor-pointer group">
                                            <span id="preview-meta-version">v1</span>
                                            <svg class="w-3 h-3 transition-transform" id="version-switcher-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>
                                        </button>
                                        <!-- Dropdown list: right-0 en mobile para no salirse, sm:left-0 -->
                                        <div id="version-switcher-dropdown" class="hidden absolute top-full right-0 sm:right-auto sm:left-0 mt-1.5 w-[min(14rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                                            <div id="version-switcher-list" class="divide-y divide-gray-50">
                                                <div class="px-3 py-2 flex justify-center"><div class="si-spinner w-4 h-4 border-orange-500/20 border-t-orange-500"></div></div>
                                            </div>
                                        </div>
                                    </div>
                                    <span class="text-gray-300 text-[10px]">•</span>
                                    <span id="preview-meta-author" class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Sistema</span>
                                    <span class="text-gray-300 text-[10px]">•</span>
                                    <span id="preview-meta-date" class="text-[10px] text-gray-400 font-medium">...</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <!-- Descarga directa movida arriba -->
                            <a id="preview-doc-download" href="#" target="_blank" title="Descargar Documento"
                               class="hidden sm:flex items-center justify-center w-10 h-10 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-900 hover:text-white transition-all">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            </a>
                            <button onclick="SIModules.projectDetailAdmin.closePreviewModal()" class="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-500 transition-all">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Layout Principal Partido (Flex Row) -->
                    <div class="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-50 relative">
                        <!-- Panel Izquierdo: Iframe o Placeholder (70%) -->
                        <div id="preview-left-panel" class="flex-1 relative flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 overflow-hidden bg-gray-100/50">
                            <!-- Skeleton Loader -->
                            <div id="preview-skeleton" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/80 z-10 transition-opacity duration-500 backdrop-blur-sm">
                                <div class="si-spinner w-12 h-12 mb-4 border-orange-500/20 border-t-orange-500"></div>
                                <p class="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Generando vista segura...</p>
                            </div>
                            <!-- El IFRAME (para PDF, Textos, etc) -->
                            <iframe id="preview-iframe" class="hidden border-none opacity-0 transition-opacity duration-500 relative z-0 h-full w-full" 
                                    allowfullscreen onload="SIModules.projectDetailAdmin.onIframeLoad()"></iframe>

                            <!-- EL VISUALIZADOR DE IMÁGENES NATIVO -->
                            <img id="preview-img" class="hidden opacity-0 transition-opacity duration-500 object-contain h-full w-full max-h-full max-w-full" 
                                 onload="this.classList.remove('opacity-0'); document.getElementById('preview-skeleton').classList.add('hidden')">

                            <!-- EL REPRODUCTOR DE VIDEO NATIVO (Crucial para Mobile) -->
                            <video id="preview-video" class="hidden opacity-0 transition-opacity duration-500 h-full w-full max-h-full max-w-full bg-black shadow-inner" 
                                   controls playsinline webkit-playsinline preload="metadata" 
                                   onloadedmetadata="this.classList.remove('opacity-0'); document.getElementById('preview-skeleton').classList.add('hidden')"></video>
                            <!-- Mensaje Archivo No Soportado (Fallback) -->
                            <div id="preview-unsupported" class="hidden absolute inset-0 flex flex-col items-center justify-center bg-gray-50 p-8 text-center z-20">
                                <div class="w-20 h-20 bg-white shadow-sm border border-gray-100 rounded-[2rem] flex items-center justify-center mb-6 text-gray-300">
                                     <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                                </div>
                                <p class="text-xl text-gray-900 font-extrabold mb-2 tracking-tight">Previsualización no disponible</p>
                                <p class="text-sm text-gray-500 max-w-sm mx-auto mb-8 font-medium leading-relaxed">Por seguridad y formato, no se puede cargar directamente. Pero puedes descargarlo para verlo en tu equipo local.</p>
                                <a id="preview-unsupported-download" href="#" target="_blank" class="px-8 py-3.5 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-orange-500 transition-all uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-gray-900/10 group">
                                     <svg class="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> 
                                     Descargar Archivo Original
                                </a>
                            </div>
                            <!-- Botón flotante para reabrir el chat (visible en desktop cuando está colapsado) -->
                            <button id="chat-reopen-btn"
                                onclick="SIModules.projectDetailAdmin.toggleChatPanel()"
                                title="Abrir Comentarios"
                                class="hidden absolute right-0 top-1/2 -translate-y-1/2 z-30 w-7 h-14 bg-white border border-gray-200 border-r-0 rounded-l-xl shadow-md flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-orange-500 hover:border-orange-200 transition-all">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                                <svg class="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                            </button>
                        </div>

                        <!-- Panel Derecho: Chat & Comentarios (30%) -->
                        <div id="preview-right-panel"
                             class="w-full lg:w-[26rem] xl:w-[30rem] bg-white flex flex-col shrink-0 lg:max-h-full max-h-[50vh] lg:overflow-hidden"
                             style="transition: max-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;">
                            <!-- Chat Header -->
                            <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                                 <div class="flex items-center gap-2">
                                     <svg class="w-4 h-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                                     <span class="text-xs font-black text-gray-900 uppercase tracking-widest">Comentarios</span>
                                 </div>
                                 <div class="flex items-center gap-2">
                                     <!-- Custom Version Filter Dropdown -->
                                     <div class="relative" id="chat-version-filter-wrapper">
                                         <button id="chat-version-filter-btn" onclick="SIModules.projectDetailAdmin.toggleChatVersionFilter()" class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-50 hover:bg-orange-50 hover:text-orange-600 border border-gray-200 hover:border-orange-200 px-2.5 py-1.5 rounded-lg transition-all">
                                             <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
                                             <span id="chat-version-filter-label">Todas</span>
                                             <svg class="w-3 h-3 transition-transform" id="chat-version-filter-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>
                                         </button>
                                         <!-- Dropdown custom -->
                                         <div id="chat-version-filter-dropdown" class="hidden absolute top-full right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                                             <div id="chat-version-filter-list" class="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                                                 <!-- Opción por defecto -->
                                                 <button onclick="SIModules.projectDetailAdmin.setChatVersionFilter(null, 'Todas')" class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-orange-50 transition-colors group">
                                                     <div class="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center text-[9px] font-black text-gray-500 shrink-0">∞</div>
                                                     <span class="text-[11px] font-bold text-gray-700">Todas las versiones</span>
                                                 </button>
                                             </div>
                                         </div>
                                         <!-- Select oculto para compatibilidad con filterCommentsByVersion -->
                                         <select id="chat-version-select" class="hidden" onchange="SIModules.projectDetailAdmin.filterCommentsByVersion()"><option value="">Todas las versiones</option></select>
                                     </div>
                                     <!-- Toggle mostrar/ocultar chat -->
                                     <button id="chat-toggle-btn" onclick="SIModules.projectDetailAdmin.toggleChatPanel()" title="Mostrar/Ocultar chat" class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 transition-all">
                                         <svg id="chat-toggle-icon" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/></svg>
                                     </button>
                                 </div>
                            </div>

                            <!-- Collapsible area (open by default) -->
                            <div id="chat-collapsible-body" class="flex flex-col flex-1 overflow-hidden transition-all duration-300">
                                <!-- Chat Messages (Scrollable) -->
                                <div id="preview-chat-messages" class="flex-1 overflow-y-auto p-5 bg-[#FAFAFA] relative">
                                     <!-- Centro loading -->
                                     <div id="chat-loading" class="absolute inset-0 flex items-center justify-center bg-[#FAFAFA] z-10">
                                         <div class="si-spinner w-8 h-8 border-orange-500/30 border-t-orange-500"></div>
                                     </div>
                                     <!-- Mensajes inyectados dinámicamente -->
                                     <div id="chat-messages-container" class="space-y-6 flex flex-col min-h-full pb-2">
                                     </div>
                                </div>

                                <!-- Chat Input Form -->
                                <div class="p-4 border-t border-gray-100 bg-white shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)] relative z-20">
                                     <form id="preview-chat-form" onsubmit="event.preventDefault(); SIModules.projectDetailAdmin.submitDocComment();">
                                         <input type="hidden" id="chat-current-doc-id" value="">
                                         <input type="hidden" id="chat-current-version-id" value="">
                                         <!-- Indicador de versión activa al comentar -->
                                         <div id="chat-version-indicator" class="hidden mb-2 flex items-center gap-1.5 px-1">
                                             <div class="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></div>
                                             <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comentando en: <span id="chat-version-indicator-label" class="text-orange-500">v1</span></span>
                                         </div>
                                         <div class="relative flex items-end gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                                             <textarea id="preview-chat-input" rows="1" placeholder="Escribe un comentario..." required 
                                                 class="w-full pl-3 pr-2 py-2.5 bg-transparent border-none text-gray-900 text-sm resize-none outline-none focus:ring-0 max-h-32 min-h-[44px]"
                                                 oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px';"
                                                 onkeydown="if(event.key==='Enter' && !event.ctrlKey && !event.shiftKey){ event.preventDefault(); SIModules.projectDetailAdmin.submitDocComment(); }"></textarea>
                                             <button type="submit" id="preview-chat-submit" class="shrink-0 w-10 h-10 mb-0.5 bg-[#1a1b25] text-white rounded-xl flex items-center justify-center hover:bg-orange-500 transition-all active:scale-95 shadow-md group">
                                                 <svg id="preview-chat-send-icon" class="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                                                 <div id="preview-chat-send-spinner" class="si-spinner w-4 h-4 border-white/30 border-t-white hidden"></div>
                                             </button>
                                         </div>
                                     </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- INPUT OCULTO PARA SUBIR ARCHIVOS (Global para el módulo) -->
            <input type="file" id="si-doc-upload-raw" class="hidden" onchange="SIModules.projectDetailAdmin.handleFileUpload(event)">
        `;

        await this.init(projectId, user);
    },

    async init(projectId, user) {
        this.projectId = projectId;
        this.userContext = user;

        if (!this.projectId) {
            window.location.href = '/steelinox/panel';
            return;
        }

        await this.loadProjectData();
    },

    /** Cargar datos de la API */
    async loadProjectData() {
        try {
            const response = await API.get('/projects/' + this.projectId);

            if (!response.success || !response.data) {
                throw new Error(response.message || 'Error al cargar el proyecto.');
            }

            // Securización vía DTO (Reutilizamos lógica si está disponible o la extendemos aquí)
            this.project = response.data;

            await this.loadAssignedUsers();

            // Actualizar Cabecera
            this.renderHeader();

            // Renderizar modales dinámicos
            this.renderProjectModals();

            // Renderizar la pestaña activa inicial (Resumen)
            this.renderTabContent();

        } catch (error) {
            console.error('[ProjectAdminDetail] Error:', error);
            document.getElementById('tab-content').innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center">
                    <p class="text-red-500 font-bold mb-2">No se pudo cargar la información</p>
                    <p class="text-xs text-gray-500">${error.message}</p>
                    <button onclick="location.reload()" class="mt-4 text-orange-500 font-bold text-sm">Reintentar</button>
                </div>
            `;
        }
    },

    /** Cambiar entre pestañas */
    switchTab(tabId, btn) {
        document.querySelectorAll('.tab-btn').forEach(t => {
            t.classList.remove('active', 'border-orange-500', 'text-orange-600');
            t.classList.add('border-transparent', 'text-gray-400');
        });

        btn.classList.add('active', 'border-orange-500', 'text-orange-600');
        btn.classList.remove('border-transparent', 'text-gray-400');

        this.activeTab = tabId;
        this.renderTabContent();
    },

    /** Renderizar la cabecera (Título, Ref, Status) */
    renderHeader() {
        const titleEl = document.getElementById('admin-prj-title');
        const refEl = document.getElementById('admin-prj-ref');
        const badgeEl = document.getElementById('admin-prj-status-badge');
        const breadcrumbEl = document.getElementById('breadcrumb-project-name');

        if (titleEl) titleEl.textContent = this.project.name;
        if (breadcrumbEl) breadcrumbEl.textContent = this.project.name;
        if (refEl) refEl.textContent = this.project.reference || 'SIN REF';

        if (badgeEl) {
            const labels = {
                propuesta: 'Propuesta',
                aprobado: 'Aprobado',
                ejecucion: 'Ejecución',
                cerrado: 'Cerrado',
            };
            const styles = {
                propuesta: 'badge-propuesta',
                aprobado: 'badge-aprobado',
                ejecucion: 'badge-ejecucion',
                cerrado: 'badge-cerrado',
            };
            const label = labels[this.project.status] || this.project.status;
            const style = styles[this.project.status] || 'bg-gray-100 text-gray-600 border-gray-200';

            badgeEl.className = `inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${style}`;
            badgeEl.textContent = label;
        }
    },

    /** Renderizar Modales Dinámicos que dependen de los datos del proyecto */
    renderProjectModals() {
        let container = document.getElementById('si-dynamic-modals');
        if (!container) {
            container = document.createElement('div');
            container.id = 'si-dynamic-modals';
            document.body.appendChild(container);
        }

        const p = this.project;
        container.innerHTML = `
            <!-- MODAL: EDITAR PROYECTO -->
            <div id="edit-project-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-xl shadow-2xl transform scale-95 transition-transform flex flex-col max-h-[90vh]">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <h3 class="text-xl font-extrabold text-gray-900">Editar Proyecto</h3>
                        <button onclick="SIModules.projectDetailAdmin.closeEditProjectModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto">
                        <form id="edit-project-form" onsubmit="event.preventDefault(); SIModules.projectDetailAdmin.saveProjectEdits();" class="space-y-4">
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nombre <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-project-name" name="name" value="${p.name || ''}" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Referencia <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-project-ref" name="reference" value="${p.reference || ''}" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Presupuesto (€)</label>
                                    <input type="number" step="50" id="edit-project-budget" name="budget_amount" value="${p.budget_amount || ''}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Superficie Obra (m²)</label>
                                    <input type="number" step="1" id="edit-project-surface" name="surface" value="${p.surface || ''}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Tipo de Proyecto</label>
                                <input type="text" id="edit-project-type" name="project_type" value="${p.project_type || ''}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Descripción corta</label>
                                <textarea id="edit-project-desc" name="description" rows="3" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">${p.description || ''}</textarea>
                            </div>

                        </form>
                    </div>
                    <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl sm:rounded-b-[2rem] flex justify-end gap-3 shrink-0">
                         <button onclick="SIModules.projectDetailAdmin.closeEditProjectModal()" type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancelar</button>
                         <button onclick="SIModules.projectDetailAdmin.saveProjectEdits()" type="button" class="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 border border-transparent rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-2">
                             <svg class="w-4 h-4 hidden" id="edit-project-save-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                             Guardar Cambios
                         </button>
                    </div>
                </div>
            </div>

            <!-- MODAL: CAMBIAR ESTADO -->
            <div id="change-status-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-md shadow-2xl transform scale-95 transition-transform flex flex-col">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="text-lg font-extrabold text-gray-900">Cambiar Estado</h3>
                        <button onclick="SIModules.projectDetailAdmin.closeChangeStatusModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6">
                        <form id="change-status-form" onsubmit="event.preventDefault(); SIModules.projectDetailAdmin.saveProjectStatus();" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nuevo Estado <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <input type="hidden" id="change-status-select" name="status" value="${p.status}">
                                    <button type="button" onclick="SIModules.projectDetailAdmin.toggleDropdown('status-dropdown-menu')" class="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm flex justify-between items-center shadow-sm">
                                        <div class="flex items-center gap-2">
                                           <span id="change-status-circle" class="w-2 h-2 rounded-full ${p.status === 'propuesta' ? 'bg-amber-400' : (p.status === 'aprobado' ? 'bg-blue-400' : (p.status === 'ejecucion' ? 'bg-orange-400' : 'bg-emerald-400'))}"></span>
                                           <span id="change-status-display" class="capitalize">${p.status}</span>
                                        </div>
                                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                                    </button>
                                    
                                    <ul id="status-dropdown-menu" class="si-custom-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl shadow-orange-500/10 hidden max-h-60 overflow-y-auto py-1.5 text-sm font-medium">
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('propuesta', 'Propuesta', 'bg-amber-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'propuesta' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-amber-400"></span> Propuesta
                                            ${p.status === 'propuesta' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('aprobado', 'Aprobado', 'bg-blue-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'aprobado' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-blue-400"></span> Aprobado
                                            ${p.status === 'aprobado' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('ejecucion', 'Ejecución', 'bg-orange-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'ejecucion' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-orange-400"></span> Ejecución
                                            ${p.status === 'ejecucion' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('cerrado', 'Cerrado', 'bg-emerald-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'cerrado' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Cerrado
                                            ${p.status === 'cerrado' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Motivo / Notas</label>
                                <textarea id="change-status-reason" name="reason" rows="2" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Añade un motivo"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl sm:rounded-b-[2rem] flex justify-end gap-3 rounded-b-xl">
                         <button onclick="SIModules.projectDetailAdmin.closeChangeStatusModal()" type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancelar</button>
                         <button onclick="SIModules.projectDetailAdmin.saveProjectStatus()" type="button" class="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 border border-transparent rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 focus:outline-none flex items-center gap-2">
                             <svg class="w-4 h-4 hidden" id="change-status-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                             Actualizar
                         </button>
                     </div>
                </div>
            </div>
        `;
    },

    /** Disparar el renderizado según pestaña activa */
    renderTabContent() {
        const container = document.getElementById('tab-content');
        if (!container) return;

        switch (this.activeTab) {
            case 'resumen': container.innerHTML = this._renderResumen(); break;
            case 'documentos': container.innerHTML = this._renderDocumentos(); break;
            case 'historial': container.innerHTML = this._renderHistorial(); break;
            default: container.innerHTML = '<p class="text-center py-20 text-gray-400">Próximamente...</p>';
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // RENDERIZERS (Real + Mocks)
    // ────────────────────────────────────────────────────────────────────────

    /** PESTAÑA: RESUMEN (Datos reales + Mocks UI) */
    _renderResumen() {
        const p = this.project;
        return `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Columna Principal (8/12) -->
                <div class="lg:col-span-8 space-y-6">
                    <!-- KPI Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 bg-[#fff9eb] text-[#cb8e24] rounded-xl flex items-center justify-center">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Presupuesto Total</span>
                                    <p class="text-lg font-extrabold text-[#1a1b25]">${SIApp.formatCurrency(p.budget_amount)}</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 bg-[#f0efff] text-[#6e56cf] rounded-xl flex items-center justify-center">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Superficie Obra</span>
                                    <p class="text-lg font-extrabold text-[#1a1b25]">${p.surface || '—'} m²</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Proyecto & Info -->
                    <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pr-12">
                             <div>
                                <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tipo de Proyecto</span>
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center border border-orange-100/50">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                    </div>
                                    <p class="font-bold text-[#1a1b25]">${p.project_type || 'General'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Descripción -->
                        <div class="mb-8">
                            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
                                Descripción
                            </h4>
                            <div class="relative pl-4">
                                <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-orange-200 rounded-full"></div>
                                <p class="text-sm text-gray-600 leading-loose font-medium">
                                    ${p.description || '<span class="italic text-gray-400">Sin descripción general definida.</span>'}
                                </p>
                            </div>
                        </div>

                        <!-- Comerciales Asignados -->
                        <div class="mt-8 pt-8 border-t border-gray-50">
                            <div class="flex items-center justify-between mb-4">
                                <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comerciales Asignados</span>
                                <button onclick="SIModules.projectDetailAdmin.openAssignCommercialModal()" class="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-white hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 shadow-sm bg-gray-50/50">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                    Asignar
                                </button>
                            </div>
                            <div id="assigned-commercials-container">
                                ${this._renderAssignedCommercials()}
                            </div>
                        </div>
                    </div>


                </div>

                <!-- Barra Lateral Derecha (Sidebar Extra) (4/12) -->
                <div class="lg:col-span-4 space-y-6">
                    <!-- Fechas y Ciclo de Vida -->
                    <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-bl-full -z-10"></div>
                        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            Ciclo de Vida
                        </h4>
                        <div class="space-y-4 relative before:absolute before:inset-0 before:left-[11px] before:w-[2px] before:bg-gray-100 before:-z-10 ml-1">
                            
                            <!-- Creación -->
                            <div class="flex items-start gap-4">
                                <div class="w-6 h-6 rounded-full border-4 border-white bg-blue-500 flex-shrink-0 mt-0.5"></div>
                                <div>
                                    <p class="text-xs font-black text-gray-900 uppercase tracking-wide">Creado el</p>
                                    <p class="text-[11px] text-gray-500 mt-0.5 font-medium">${SIApp.formatDate(p.created_at)}</p>
                                </div>
                            </div>

                            <!-- Modificación -->
                            <div class="flex items-start gap-4">
                                <div class="w-6 h-6 rounded-full border-4 border-white bg-amber-500 flex-shrink-0 mt-0.5"></div>
                                <div>
                                    <p class="text-xs font-black text-gray-900 uppercase tracking-wide">Última Modificación</p>
                                    <p class="text-[11px] text-gray-500 mt-0.5 font-medium">${p.updated_at ? SIApp.formatDate(p.updated_at) : 'Sin cambios'}</p>
                                </div>
                            </div>
                            
                            <!-- Aprobación -->
                            <div class="flex items-start gap-4">
                                <div class="w-6 h-6 rounded-full border-4 border-white ${p.approved_at ? 'bg-emerald-500' : 'bg-gray-200'} flex-shrink-0 mt-0.5"></div>
                                <div>
                                    <p class="text-xs font-black ${p.approved_at ? 'text-gray-900' : 'text-gray-400'} uppercase tracking-wide">Aprobado</p>
                                    <p class="text-[11px] text-gray-400 mt-0.5 font-medium italic">${p.approved_at ? SIApp.formatDate(p.approved_at) : 'Pendiente'}</p>
                                </div>
                            </div>

                            <!-- Cierre -->
                            <div class="flex items-start gap-4">
                                <div class="w-6 h-6 rounded-full border-4 border-white ${p.closed_at ? 'bg-purple-500' : 'bg-gray-200'} flex-shrink-0 mt-0.5"></div>
                                <div>
                                    <p class="text-xs font-black ${p.closed_at ? 'text-gray-900' : 'text-gray-400'} uppercase tracking-wide">Cerrado</p>
                                    <p class="text-[11px] text-gray-400 mt-0.5 font-medium italic">${p.closed_at ? SIApp.formatDate(p.closed_at) : 'No Finalizado'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Botones de Acción -->
<div class="space-y-3">
    <button onclick="SIModules.projectDetailAdmin.openChangeStatusModal()" class="w-full bg-white border border-gray-100 hover:border-orange-500 hover:text-orange-600 text-gray-700 rounded-2xl py-3.5 px-4 text-sm font-bold transition-all shadow-sm flex items-center justify-between group">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg class="w-4 h-4 transition-transform duration-500 group-hover:rotate-[360deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
            </div>
            <span>Cambiar Estado</span>
        </div>
        <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
    </button>

    <button onclick="SIModules.projectDetailAdmin.triggerFileUpload()" class="w-full bg-[#1a1b25] hover:bg-gray-800 text-white rounded-2xl py-3.5 px-4 text-sm font-bold transition-all shadow-md flex items-center justify-between group">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg id="sidebar-upload-icon" class="w-4 h-4 transition-transform duration-300 group-hover:translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                <div id="sidebar-upload-spinner" class="si-spinner w-4 h-4 border-white/30 border-t-white hidden"></div>
            </div>
            <span>Subir Archivo</span>
        </div>
        <svg class="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
    </button>
</div>
                </div>
            </div>

            <!-- MODAL: EDITAR PROYECTO -->
            <div id="edit-project-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-xl shadow-2xl transform scale-95 transition-transform flex flex-col max-h-[90vh]">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <h3 class="text-xl font-extrabold text-gray-900">Editar Proyecto</h3>
                        <button onclick="SIModules.projectDetailAdmin.closeEditProjectModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto">
                        <form id="edit-project-form" onsubmit="event.preventDefault(); SIModules.projectDetailAdmin.saveProjectEdits();" class="space-y-4">
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nombre <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-project-name" name="name" value="${p.name || ''}" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Referencia <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-project-ref" name="reference" value="${p.reference || ''}" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Presupuesto (€)</label>
                                    <input type="number" step="50" id="edit-project-budget" name="budget_amount" value="${p.budget_amount || ''}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Superficie Obra (m²)</label>
                                    <input type="number" step="1" id="edit-project-surface" name="surface" value="${p.surface || ''}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Tipo de Proyecto</label>
                                <input type="text" id="edit-project-type" name="project_type" value="${p.project_type || ''}" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Descripción corta</label>
                                <textarea id="edit-project-desc" name="description" rows="3" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm">${p.description || ''}</textarea>
                            </div>

                        </form>
                    </div>
                    <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl sm:rounded-b-[2rem] flex justify-end gap-3 shrink-0">
                         <button onclick="SIModules.projectDetailAdmin.closeEditProjectModal()" type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancelar</button>
                         <button onclick="SIModules.projectDetailAdmin.saveProjectEdits()" type="button" class="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 border border-transparent rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-2">
                             <svg class="w-4 h-4 hidden" id="edit-project-save-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                             Guardar Cambios
                         </button>
                    </div>
                </div>
            </div>

            <!-- MODAL: CAMBIAR ESTADO -->
            <div id="change-status-modal" class="fixed inset-0 bg-black/50 z-50 hidden opacity-0 transition-opacity flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-md shadow-2xl transform scale-95 transition-transform flex flex-col">
                    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="text-lg font-extrabold text-gray-900">Cambiar Estado</h3>
                        <button onclick="SIModules.projectDetailAdmin.closeChangeStatusModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="p-6">
                        <form id="change-status-form" onsubmit="event.preventDefault(); SIModules.projectDetailAdmin.saveProjectStatus();" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nuevo Estado <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <input type="hidden" id="change-status-select" name="status" value="${p.status}">
                                    <button type="button" onclick="SIModules.projectDetailAdmin.toggleDropdown('status-dropdown-menu')" class="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm flex justify-between items-center shadow-sm">
                                        <div class="flex items-center gap-2">
                                           <span id="change-status-circle" class="w-2 h-2 rounded-full ${p.status === 'propuesta' ? 'bg-amber-400' : (p.status === 'aprobado' ? 'bg-blue-400' : (p.status === 'ejecucion' ? 'bg-orange-400' : 'bg-emerald-400'))}"></span>
                                           <span id="change-status-display" class="capitalize">${p.status}</span>
                                        </div>
                                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                                    </button>
                                    
                                    <ul id="status-dropdown-menu" class="si-custom-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl shadow-orange-500/10 hidden max-h-60 overflow-y-auto py-1.5 text-sm font-medium">
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('propuesta', 'Propuesta', 'bg-amber-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'propuesta' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-amber-400"></span> Propuesta
                                            ${p.status === 'propuesta' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('aprobado', 'Aprobado', 'bg-blue-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'aprobado' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-blue-400"></span> Aprobado
                                            ${p.status === 'aprobado' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('ejecucion', 'Ejecución', 'bg-orange-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'ejecucion' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-orange-400"></span> Ejecución
                                            ${p.status === 'ejecucion' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                        <li onclick="SIModules.projectDetailAdmin.selectCustomStatus('cerrado', 'Cerrado', 'bg-emerald-400', this)" class="px-4 py-2.5 transition-all flex items-center gap-2 ${p.status === 'cerrado' ? 'bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner' : 'hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600'}">
                                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Cerrado
                                            ${p.status === 'cerrado' ? '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Motivo / Notas</label>
                                <textarea id="change-status-reason" name="reason" rows="2" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm" placeholder="Añade un motivo"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl sm:rounded-b-[2rem] flex justify-end gap-3 rounded-b-xl">
                         <button onclick="SIModules.projectDetailAdmin.closeChangeStatusModal()" type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">Cancelar</button>
                         <button onclick="SIModules.projectDetailAdmin.saveProjectStatus()" type="button" class="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 border border-transparent rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 focus:outline-none flex items-center gap-2">
                             <svg class="w-4 h-4 hidden" id="change-status-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                             Actualizar
                         </button>
                    </div>
                </div>
            </div>
        `;
    },

    /** PESTAÑA: DOCUMENTOS (Mock) */
    _renderDocumentos() {
        // Disparar la carga real si no tenemos datos o queremos refrescar
        setTimeout(() => this.loadProjectDocuments(), 50);

        return `
            <div class="space-y-6">
                <!-- Buscador -->
                <div class="relative">
                    <svg class="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input id="doc-search-input" type="text" placeholder="Buscar documentos por nombre o tipo..." oninput="SIModules.projectDetailAdmin._filterDocs(this.value)" class="w-full bg-white border border-gray-100 text-base rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-[#E57B23]/20 focus:border-[#E57B23] focus:outline-none shadow-sm text-gray-700 font-medium">
                </div>

                <!-- Botón Principal -->
                <button onclick="SIModules.projectDetailAdmin.triggerFileUpload()" class="w-full bg-[#E57B23] hover:bg-[#c9661c] text-white rounded-2xl py-4 text-sm font-black shadow-lg shadow-[#E57B23]/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest group mb-4">
                    <svg id="tab-upload-icon" class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                    <div id="tab-upload-spinner" class="si-spinner w-5 h-5 border-white/30 border-t-white hidden"></div>
                    <span id="tab-upload-text">Subir Nuevo Documento</span>
                </button>

                <!-- Filtros por Tipo (Chips) -->
                <div class="flex items-center gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar -mx-1 px-1">
                    <button onclick="SIModules.projectDetailAdmin.setDocTypeFilter('all', this)" class="type-filter-btn px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-orange-500 text-white shadow-md shadow-orange-500/20 active" data-type="all">Todos</button>
                    <button onclick="SIModules.projectDetailAdmin.setDocTypeFilter('propuesta', this)" class="type-filter-btn px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-white border border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 shadow-sm" data-type="propuesta">Propuesta</button>
                    <button onclick="SIModules.projectDetailAdmin.setDocTypeFilter('presupuesto', this)" class="type-filter-btn px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-white border border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 shadow-sm" data-type="presupuesto">Presupuesto</button>
                    <button onclick="SIModules.projectDetailAdmin.setDocTypeFilter('plano', this)" class="type-filter-btn px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-white border border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 shadow-sm" data-type="plano">Plano</button>
                    <button onclick="SIModules.projectDetailAdmin.setDocTypeFilter('pdf', this)" class="type-filter-btn px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-white border border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 shadow-sm" data-type="pdf">PDF</button>
                    <button onclick="SIModules.projectDetailAdmin.setDocTypeFilter('documento_tecnico', this)" class="type-filter-btn px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-white border border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 shadow-sm" data-type="documento_tecnico">Doc. Técnico</button>
                    <button onclick="SIModules.projectDetailAdmin.setDocTypeFilter('materiales', this)" class="type-filter-btn px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-white border border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 shadow-sm" data-type="materiales">Materiales</button>
                    <button onclick="SIModules.projectDetailAdmin.setDocTypeFilter('otros', this)" class="type-filter-btn px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-white border border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 shadow-sm" data-type="otros">Otros</button>
                </div>

                <!-- Header de Lista -->
                <!-- Header de Lista -->
                <div class="flex flex-col pt-2 pb-2 gap-2">
                    <h3 class="text-lg font-black text-[#1a1b25] uppercase tracking-wide text-center sm:text-left">Expediente del Proyecto</h3>
                    <div class="flex justify-center sm:justify-start">
                        <div id="doc-counter" class="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">0 ARCHIVOS</div>
                    </div>
                </div>

                <!-- Lista de Archivos Dynamic -->
                <div class="space-y-3 pb-6 min-h-[200px]" id="doc-cards-container">
                    <div class="flex flex-col items-center justify-center py-20 text-gray-300">
                        <div class="si-spinner mb-4"></div>
                        <p class="text-sm font-bold uppercase tracking-widest">Sincronizando archivo...</p>
                    </div>
                </div>
            </div>
        `;
    },


    /** PESTAÑA: HISTORIAL (Mock) */
    _renderHistorial() {
        return `
            <div class="space-y-6 pb-6">
                <!-- Header -->
                <div class="pt-2 px-1">
                     <h3 class="text-[11px] font-black text-[#E57B23] uppercase tracking-[0.2em] mb-2">INDUSTRIAL STEEL CO.</h3>
                     <h1 class="text-3xl font-black text-[#1a1b25] tracking-tight">Historial de Actividad</h1>
                     <p class="text-sm text-gray-400 mt-2 font-medium">Cronología completa de eventos en el Proyecto Nave A24</p>
                </div>

                <!-- Timeline Container -->
                <div class="relative pl-8 space-y-10 mt-10">
                    <!-- Linea vertical -->
                    <div class="absolute top-0 bottom-0 left-[43px] w-0.5 bg-gray-100"></div>

                    ${this._mockHistoryNode('status', 'Carlos Ruiz', 'Hoy, 10:45 AM', 'CAMBIO DE ESTADO', 'Fase de Montaje: Iniciada', 'Se ha verificado la recepción de las vigas maestras y se procede al izaje según el plan de seguridad.')}
                    ${this._mockHistoryNode('document', 'Elena Soler', 'Ayer, 04:20 PM', 'NUEVO DOCUMENTO', 'Planos_Detalle_V5.pdf', 'Archivo PDF (12.4 MB)<br><span class="text-[11px] font-black text-blue-400 uppercase tracking-tighter">OFICINA TÉCNICA</span>', true)}
                    ${this._mockHistoryNode('chat', 'Marcos Peña', '22 Oct, 09:15 AM', 'COMENTARIO INTERNO', '', '"Confirmada la revisión estructural del nodo B-12. Podemos proceder con el torqueado final de pernos grado 8."')}
                    ${this._mockHistoryNode('edit', 'Ana Martínez', '21 Oct, 02:30 PM', 'EDICIÓN DE DATOS', 'Ajuste de Cronograma', 'El hito de cimentación se ha desplazado debido a condiciones climáticas.<br><strong class="text-orange-500">Nueva fecha: 28/10/2023</strong>')}
                </div>
            </div>
        `;
    },

    _mockHistoryNode(type, user, time, actionTitle, title, content, isAttachment = false) {
        const icons = {
            'status': { color: 'bg-[#E57B23]', icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>' },
            'document': { color: 'bg-[#0284c7]', icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            'chat': { color: 'bg-gray-100', icon: '<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/></svg>' },
            'edit': { color: 'bg-amber-100', icon: '<svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>' }
        };
        const node = icons[type] || icons.edit;

        let contentHtml = '';
        if (isAttachment) {
            contentHtml = `
                <div class="mt-4 p-4 bg-[#f8faff] border border-[#e0e7ff] rounded-2xl flex items-center gap-4">
                    <div class="w-12 h-12 bg-white border border-[#c7d2fe] rounded-xl shadow-sm flex items-center justify-center text-[#4338ca]">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/></svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-black text-[#1e1b4b] leading-tight mb-1 truncate">${content.split('<br>')[0]}</p>
                        ${content.split('<br>')[1] || ''}
                    </div>
                    <button class="text-gray-400 hover:text-gray-900 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
                </div>
            `;
        } else if (type === 'chat') {
            contentHtml = `
                <div class="mt-4 text-[15px] text-gray-500 font-medium italic relative pl-4 border-l-3 border-[#E57B23]/30 leading-relaxed bg-[#fff9f4] py-3 rounded-r-xl">
                    ${content}
                </div>
            `;
        } else {
            contentHtml = `
                <p class="text-[15px] text-gray-600 mt-3 leading-relaxed font-medium">${content}</p>
                ${type === 'status' ? '<div class="mt-4"><span class="inline-flex items-center text-[10px] font-black text-white bg-[#E57B23] px-3 py-1 rounded-lg uppercase tracking-widest cursor-pointer hover:bg-[#c9661c]">Ver Detalles</span></div>' : ''}
            `;
        }

        return `
            <div class="relative pl-6 z-10">
                <!-- Node Icon -->
                <div class="absolute left-[-11px] top-6 w-12 h-12 ${node.color} rounded-full border-4 border-white flex items-center justify-center shadow-md z-20">
                    ${node.icon}
                </div>
                
                <!-- Card -->
                <div class="bg-white border text-left border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <img src="https://i.pravatar.cc/100?u=${user.replace(' ', '')}" alt="avatar" class="w-8 h-8 rounded-full border border-gray-200">
                            <span class="text-[15px] font-black text-[#1a1b25]">${user}</span>
                        </div>
                        <span class="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black rounded-full uppercase tracking-tighter border border-gray-100">${time}</span>
                    </div>
                    
                    <h5 class="text-[11px] font-black text-orange-400 tracking-[0.15em] uppercase mb-1.5">${actionTitle}</h5>
                    ${title ? `<h4 class="text-[17px] font-black text-[#1a1b25] leading-tight">${title}</h4>` : ''}
                    
                    ${contentHtml}
                </div>
            </div>
        `;
    },

    /** Filtrar filas de documentos en tiempo real (ahora por tarjetas) */
    _filterDocs(query = null) {
        const searchText = (query !== null ? query : document.getElementById('doc-search-input')?.value || '').toLowerCase().trim();
        const activeType = this.activeDocTypeFilter;

        let visibleCount = 0;

        document.querySelectorAll('.doc-row-wrapper').forEach(wrapper => {
            const card = wrapper.querySelector('.doc-row');
            const title = card.dataset.title || '';
            const type = card.dataset.type || '';

            const matchesText = !searchText || title.includes(searchText);
            const matchesType = activeType === 'all' || type === activeType;

            if (matchesText && matchesType) {
                wrapper.style.display = 'block';
                visibleCount++;
            } else {
                wrapper.style.display = 'none';
            }
        });

        const counter = document.getElementById('doc-counter');
        if (counter) counter.textContent = `${visibleCount} ARCHIVOS`;
    },

    /** Establecer filtro por tipo documental */
    setDocTypeFilter(type, btn) {
        this.activeDocTypeFilter = type;

        // UI Reset
        document.querySelectorAll('.type-filter-btn').forEach(b => {
            b.classList.remove('bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20', 'active');
            b.classList.add('bg-white', 'border', 'border-gray-100', 'text-gray-400');
        });

        // UI Active
        btn.classList.add('bg-orange-500', 'text-white', 'shadow-md', 'shadow-orange-500/20', 'active');
        btn.classList.remove('bg-white', 'border', 'border-gray-100', 'text-gray-400');

        this._filterDocs();
    },

    // ────────────────────────────────────────────────────────────────────────
    // DOCUMENTOS: LÓGICA DE NEGOCIO REAL
    // ────────────────────────────────────────────────────────────────────────

    /** Cargar documentos desde la API */
    async loadProjectDocuments() {
        const container = document.getElementById('doc-cards-container');
        if (!container) return;

        try {
            const res = await API.get('/projects/' + this.projectId + '/documents');
            if (res.success && res.data) {
                this.documents = res.data;
                this.renderDocumentList();
            } else {
                container.innerHTML = '<p class="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Error al sincronizar expedientes.</p>';
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="text-center py-10 text-red-500 font-bold uppercase tracking-widest text-[10px]">Error de conexión con el servidor.</p>';
        }
    },

    /** Renderizar la lista de documentos obtenida */
    renderDocumentList() {
        const container = document.getElementById('doc-cards-container');
        const counter = document.getElementById('doc-counter');
        if (!container) return;

        if (counter) counter.textContent = `${this.documents.length} ARCHIVOS`;

        if (this.documents.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center fade-in">
                    <div class="w-20 h-20 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <p class="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Expediente Vacío</p>
                    <p class="text-[11px] text-gray-400 mt-2 font-medium">Aún no se han subido documentos técnicos a este proyecto.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.documents.map(doc => {
            const icon = SIApp.getFileIcon(doc.mime_type);
            const size = SIApp.formatFileSize(doc.file_size);
            const date = SIApp.formatDate(doc.uploaded_at);
            const initials = SIApp._getInitials(doc.uploaded_by_name || '??');
            const canView = doc.mime_type === 'application/pdf' ||
                doc.mime_type.startsWith('image/') ||
                doc.mime_type.startsWith('video/') ||
                doc.mime_type.startsWith('text/') ||
                doc.mime_type === 'application/json';

            return `
                <div class="doc-row-wrapper mb-3 fade-in">
                    <div class="doc-row flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100 group gap-4" 
                         data-type="${doc.type}"
                         data-title="${doc.title.toLowerCase()} ${doc.file_name.toLowerCase()}">
                        <div class="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                            <div class="w-[52px] h-[52px] ${icon.bg} ${icon.text} rounded-[14px] flex items-center justify-center shrink-0 shadow-sm border border-transparent group-hover:border-current/10 transition-all">
                                ${icon.svg}
                            </div>
                            <div class="min-w-0 flex-1 w-full">
                                <p class="text-[15.5px] font-extrabold text-[#1a1b25] leading-tight mb-2 w-full truncate group-hover:text-orange-600 transition-colors">${SIApp.escapeHtml(doc.title)}</p>
                                <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                                    <button onclick="SIModules.projectDetailAdmin.toggleVersionHistory(${doc.id}, this)" 
                                            class="w-max px-2.5 py-0.5 rounded ${icon.badgeBg} ${icon.badgeText} text-[10px] font-black tracking-widest uppercase hover:opacity-80 transition-opacity flex items-center gap-1 shrink-0">
                                        ${icon.label} (v${doc.version_number})
                                        <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>
                                    </button>
                                    <span class="text-[11px] text-gray-400 font-bold uppercase tracking-tighter opacity-80 w-full md:w-auto inline-block">${size} • ${date}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0 sm:pl-3">
                            <div class="flex items-center gap-1 border-r border-gray-100 pr-3 mr-1">
                                <button onclick='SIModules.projectDetailAdmin.openPreviewModal(${JSON.stringify(doc).replace(/'/g, "&#39;")})' 
                                   class="p-2 text-gray-300 hover:text-blue-500 transition-colors transform hover:scale-110 active:scale-95 flex items-center justify-center relative group/btn" 
                                   title="Ver / Comentar">
                                    <svg class="w-5 h-5 absolute inset-0 m-auto transition-opacity duration-300 ${canView ? 'opacity-100 group-hover/btn:opacity-0' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                    <svg class="w-5 h-5 absolute inset-0 m-auto transition-opacity duration-300 ${!canView ? 'opacity-100 group-hover/btn:opacity-0' : 'opacity-0 group-hover/btn:opacity-100'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                                </button>
                                
                                <a href="/steelinox/api/projects/${this.projectId}/documents/${doc.id}/download" 
                                   target="_blank"
                                   class="p-2 text-gray-300 hover:text-orange-500 transition-colors transform hover:scale-110 active:scale-95" 
                                   title="Descargar Archivo">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                </a>

                                <button onclick="SIModules.projectDetailAdmin.triggerVersionUpload(${doc.id})"
                                        class="p-2 text-gray-300 hover:text-emerald-500 transition-colors transform hover:scale-110 active:scale-95" 
                                        title="Subir Nueva Versión">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                </button>
                            </div>

                            <div class="w-8 h-8 bg-gray-50 text-gray-400 border border-gray-100 rounded-full flex items-center justify-center text-[9px] font-black uppercase tracking-widest shadow-inner cursor-help shrink-0" title="Subido por ${doc.uploaded_by_name}">
                                ${initials}
                            </div>
                        </div>
                    </div>
                    <!-- Contenedor para el historial de versiones -->
                    <div id="versions-container-${doc.id}" class="hidden mt-2 ml-14 bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 transition-all" style="margin: 0 auto;">
                        <div class="p-4 text-center">
                            <div class="si-spinner-sm mx-auto"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /** Mostrar/Ocultar el historial de versiones de un documento */
    async toggleVersionHistory(docId, btn) {
        const container = document.getElementById(`versions-container-${docId}`);
        if (!container) return;

        const isHidden = container.classList.contains('hidden');
        if (isHidden) {
            container.classList.remove('hidden');
            btn.querySelector('svg').style.transform = 'rotate(180deg)';
            await this.loadVersionHistory(docId);
        } else {
            container.classList.add('hidden');
            btn.querySelector('svg').style.transform = 'rotate(0deg)';
        }
    },

    /** Cargar historial de versiones desde la API */
    async loadVersionHistory(docId) {
        const container = document.getElementById(`versions-container-${docId}`);
        if (!container) return;

        try {
            const res = await API.get(`/projects/${this.projectId}/documents/${docId}/versions`);
            if (res.success) {
                this.renderVersionList(docId, res.data);
            } else {
                container.innerHTML = `<div class="p-4 text-center text-xs text-red-400 font-bold uppercase tracking-widest">Error al cargar historial</div>`;
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="p-4 text-center text-xs text-red-400 font-bold uppercase tracking-widest">Error de conexión</div>`;
        }
    },

    /** Pintar la lista de versiones en el contenedor */
    renderVersionList(docId, versions) {
        const container = document.getElementById(`versions-container-${docId}`);
        if (!container) return;

        if (versions.length <= 1) {
            container.innerHTML = `<div class="p-4 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest italic opacity-60">No hay versiones anteriores disponibles</div>`;
            return;
        }

        container.innerHTML = versions.map(v => {
            const size = SIApp.formatFileSize(v.file_size);
            const date = SIApp.formatDate(v.uploaded_at);
            const canView = v.mime_type === 'application/pdf' || 
                            v.mime_type.startsWith('image/') ||
                            v.mime_type.startsWith('video/');
            const isCurrent = v.is_current == 1;

            return `
                <div class="flex items-center justify-between px-5 py-3.5 hover:bg-white transition-colors group/ver">
                    <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[10px] font-black ${isCurrent ? 'text-emerald-500 border-emerald-100 shadow-sm' : 'text-gray-400'}">
                            v${v.version_number}
                        </div>
                        <div>
                            <p class="text-[12px] font-bold ${isCurrent ? 'text-gray-900' : 'text-gray-500'} tracking-tight">
                                ${SIApp.escapeHtml(v.file_name)}
                                ${isCurrent ? '<span class="ml-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">ACTUAL</span>' : ''}
                            </p>
                            <p class="text-[10px] text-gray-400 font-medium uppercase tracking-tighter mt-0.5">
                                ${size} • ${date} • Subido por ${v.uploaded_by_name || 'Sistema'}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 opacity-40 group-hover/ver:opacity-100 transition-opacity">
                        <button onclick='SIModules.projectDetailAdmin.openPreviewModal(${JSON.stringify({ id: docId, title: SIApp.escapeHtml(v.file_name), mime_type: v.mime_type, file_size: v.file_size, version_number: v.version_number, uploaded_by_name: v.uploaded_by_name, uploaded_at: v.uploaded_at }).replace(/'/g, "&#39;")}, ${v.id})'
                           class="p-1.5 text-gray-400 hover:text-blue-500 transition-colors transform hover:scale-110 relative" title="Visualizar esta versión / Comentar">
                            <svg class="w-4 h-4 transition-opacity duration-300 ${!canView ? 'hidden' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            <svg class="w-4 h-4 transition-opacity duration-300 ${canView ? 'hidden' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                        </button>
                        <a href="/steelinox/api/projects/${this.projectId}/documents/${docId}/download?version_id=${v.id}" 
                           target="_blank"
                           class="p-1.5 text-gray-400 hover:text-orange-500 transition-colors" title="Descargar esta versión">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    },

    /** Abrir el nuevo modal de subida PREMIUM */
    triggerFileUpload() {
        this.openUploadModal();
    },

    openUploadModal() {
        const modal = document.getElementById('upload-doc-modal');
        const form = document.getElementById('upload-doc-form');
        if (!modal || !form) return;

        this.updatingDocumentId = null;
        form.reset();

        // Reset custom labels
        document.getElementById('doc-upload-type-label').textContent = 'Otros';
        document.getElementById('doc-upload-type').value = 'otros';
        document.getElementById('doc-upload-access-label').textContent = 'Descargar';
        document.getElementById('doc-upload-access').value = 'download';
        document.getElementById('doc-file-selected-name').textContent = 'Haz clic o arrastra un archivo';

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-95');
        }, 10);

        // Click outside to close dropdowns
        this._dropdownCloseRef = (e) => {
            if (!e.target.closest('.relative')) {
                document.querySelectorAll('[id^="dropdown-"]').forEach(d => d.classList.add('hidden'));
            }
        };
        document.addEventListener('click', this._dropdownCloseRef);
    },

    closeUploadModal() {
        const modal = document.getElementById('upload-doc-modal');
        if (!modal) return;

        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);

        if (this._dropdownCloseRef) {
            document.removeEventListener('click', this._dropdownCloseRef);
        }
    },

    /** Dropdowns Personalizados */
    toggleCustomDropdown(id) {
        const el = document.getElementById(id);
        const all = document.querySelectorAll('[id^="dropdown-"]');
        all.forEach(d => { if (d.id !== id) d.classList.add('hidden'); });
        if (el) el.classList.toggle('hidden');
    },

    selectCustomOption(field, value, label) {
        if (field === 'type') {
            document.getElementById('doc-upload-type').value = value;
            document.getElementById('doc-upload-type-label').textContent = label;
        } else if (field === 'access') {
            document.getElementById('doc-upload-access').value = value;
            document.getElementById('doc-upload-access-label').textContent = label;
        }
        document.querySelectorAll('[id^="dropdown-"]').forEach(d => d.classList.add('hidden'));
    },

    /** PREVISUALIZACIÓN */
    openPreviewModal(doc, versionId = null) {
        const modal  = document.getElementById('preview-doc-modal');
        const iframe = document.getElementById('preview-iframe');
        const img    = document.getElementById('preview-img');
        const video  = document.getElementById('preview-video');
        const skeleton = document.getElementById('preview-skeleton');
        const unsupportedDiv = document.getElementById('preview-unsupported');
        const unsupportedDownload = document.getElementById('preview-unsupported-download');
        const headerDownloadBtn = document.getElementById('preview-doc-download');

        if (!modal) return;

        // Ocultar todos los visualizadores por defecto para evitar "fantasmas" de previos
        if (iframe) { iframe.classList.add('hidden'); iframe.src = ''; }
        if (img)    { img.classList.add('hidden');    img.src = ''; }
        if (video)  { video.classList.add('hidden');  video.src = ''; video.pause(); }
        if (skeleton) skeleton.classList.remove('hidden', 'opacity-0');
        if (unsupportedDiv) unsupportedDiv.classList.add('hidden');

        // Store current doc context
        this.currentDocId = doc.id;
        this.currentDoc = doc;
        document.getElementById('chat-current-doc-id').value = doc.id;

        // Populate metadata in header
        this._updatePreviewHeader(doc);

        // URLs
        const viewUrl = `/steelinox/api/projects/${this.projectId}/documents/${doc.id}/view${versionId ? '?version_id='+versionId : ''}`;
        const downloadUrl = `/steelinox/api/projects/${this.projectId}/documents/${doc.id}/download${versionId ? '?version_id='+versionId : ''}`;
        
        if (headerDownloadBtn) headerDownloadBtn.href = downloadUrl;
        if (unsupportedDownload) unsupportedDownload.href = downloadUrl;

        // MIME handling específico (Estrategia Pro para Mobile)
        const mime = doc.mime_type || '';
        const isImage = mime.startsWith('image/') && mime !== 'image/vnd.dwg' && mime !== 'image/vnd.adobe.photoshop';
        const isVideo = mime.startsWith('video/');
        const isPdf   = mime === 'application/pdf';
        const isText  = mime.startsWith('text/') || mime === 'application/json';

        if (isImage && img) {
            img.classList.remove('hidden');
            img.src = viewUrl;
            // skeleton se oculta en el onload del img en el HTML
        } else if (isVideo && video) {
            video.classList.remove('hidden');
            video.src = viewUrl;
            video.load(); // Vital para que empiece el streaming en Range
            // skeleton se oculta en onloadedmetadata en el HTML
        } else if ((isPdf || isText) && iframe) {
            iframe.classList.remove('hidden');
            iframe.src = viewUrl;
            // skeleton se oculta en onIframeLoad
        } else {
            if (skeleton) skeleton.classList.add('hidden');
            if (unsupportedDiv) unsupportedDiv.classList.remove('hidden');
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            const innerDiv = modal.querySelector('div');
            if (innerDiv) innerDiv.classList.remove('scale-95');
        }, 10);

        // Reset panel state to expanded and icon rotation
        const panel = document.getElementById('preview-right-panel');
        const icon = document.getElementById('chat-toggle-icon');
        const reopenBtn = document.getElementById('chat-reopen-btn');
        if (panel) {
            panel.dataset.collapsed = 'false';
            panel.style.maxWidth = '';
            panel.style.opacity = '1';
        }
        if (reopenBtn) reopenBtn.classList.add('hidden');
        if (icon) {
            icon.style.transform = (window.innerWidth >= 1024) ? 'rotate(90deg)' : '';
        }

        // Load versions (populates header dropdown) and comments
        this.loadDocVersionsForChat(doc.id, versionId);
        this.loadDocComments(doc.id, versionId);

        // Sync hidden field + indicator with the initial version
        // Will be re-synced precisely after loadDocVersionsForChat resolves
        this._setActiveCommentVersion(
            versionId || null,
            doc.version_number || null
        );
    },

    /** Actualiza la zona de metadatos del header del preview con los datos de una versión */
    _updatePreviewHeader(doc) {
        const titleEl = document.getElementById('preview-doc-title');
        const metaType = document.getElementById('preview-meta-type');
        const metaVersion = document.getElementById('preview-meta-version');
        const metaAuthor = document.getElementById('preview-meta-author');
        const metaDate = document.getElementById('preview-meta-date');

        if (titleEl) titleEl.textContent = doc.title || doc.file_name || 'Documento';
        if (metaType) metaType.textContent = doc.type || 'Archivo';
        if (metaVersion) metaVersion.textContent = 'v' + (doc.version_number || '1');
        if (metaAuthor) metaAuthor.textContent = doc.uploaded_by_name || 'Desconocido';
        if (metaDate) metaDate.textContent = doc.uploaded_at ? SIApp.formatDateTime(doc.uploaded_at) : '';
    },

    /** Actualiza el campo oculto y el indicador de "Comentando en: vX" del chat */
    _setActiveCommentVersion(versionId, versionNumber) {
        const hiddenField = document.getElementById('chat-current-version-id');
        const indicator = document.getElementById('chat-version-indicator');
        const label = document.getElementById('chat-version-indicator-label');

        if (hiddenField) hiddenField.value = versionId || '';

        if (indicator && label) {
            if (versionId) {
                indicator.classList.remove('hidden');
                label.textContent = 'v' + (versionNumber || versionId);
            } else {
                indicator.classList.add('hidden');
            }
        }
    },

    /** Mostrar / ocultar el dropdown de versiones en el header */
    toggleVersionSwitcher() {
        const dropdown = document.getElementById('version-switcher-dropdown');
        const arrow = document.getElementById('version-switcher-arrow');
        if (!dropdown) return;
        const isOpen = !dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden', isOpen);
        if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
        // Cerrar al hacer clic fuera
        if (!isOpen) {
            const close = (e) => {
                if (!document.getElementById('version-switcher-wrapper')?.contains(e.target)) {
                    dropdown.classList.add('hidden');
                    if (arrow) arrow.style.transform = '';
                    document.removeEventListener('click', close);
                }
            };
            setTimeout(() => document.addEventListener('click', close), 10);
        }
    },

    /** Abre / cierra el dropdown custom de filtro de versiones del chat */
    toggleChatVersionFilter() {
        const dropdown = document.getElementById('chat-version-filter-dropdown');
        const arrow = document.getElementById('chat-version-filter-arrow');
        if (!dropdown) return;
        const isOpen = !dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden', isOpen);
        if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
        if (!isOpen) {
            const close = (e) => {
                if (!document.getElementById('chat-version-filter-wrapper')?.contains(e.target)) {
                    dropdown.classList.add('hidden');
                    if (arrow) arrow.style.transform = '';
                    document.removeEventListener('click', close);
                }
            };
            setTimeout(() => document.addEventListener('click', close), 10);
        }
    },

    /** Aplica el filtro de versión seleccionado en el dropdown custom del chat */
    setChatVersionFilter(versionId, label) {
        // Cerrar dropdown
        const dropdown = document.getElementById('chat-version-filter-dropdown');
        const arrow = document.getElementById('chat-version-filter-arrow');
        if (dropdown) dropdown.classList.add('hidden');
        if (arrow) arrow.style.transform = '';

        // Actualizar label del botón
        const labelEl = document.getElementById('chat-version-filter-label');
        if (labelEl) labelEl.textContent = label || 'Todas';

        // Sincronizar select oculto y re-renderizar
        const select = document.getElementById('chat-version-select');
        if (select) select.value = versionId || '';
        this.renderDocComments(versionId ? parseInt(versionId) : null);
    },

    /** Colapsa / expande el panel de chat.
     *  - Desktop (≥1024px): desliza el panel completo fuera hacia la derecha liberando ancho para el preview.
     *  - Mobile (<1024px): colapsa solo el cuerpo (mensajes + input), dejando el header visible.
     */
    toggleChatPanel() {
        const isDesktop = window.innerWidth >= 1024;
        const panel = document.getElementById('preview-right-panel');
        const icon = document.getElementById('chat-toggle-icon');
        const reopenBtn = document.getElementById('chat-reopen-btn');

        if (isDesktop) {
            // ── DESKTOP: colapsar/expandir el panel completo con animación de ancho ──
            const isCollapsed = panel.dataset.collapsed === 'true';

            if (isCollapsed) {
                // ABRIR
                panel.style.maxWidth = '';   // vuelve al max-width de la clase (26rem / 30rem)
                panel.style.opacity = '1';
                panel.dataset.collapsed = 'false';
                // En desktop, cuando está ABIERTO, la flecha apunta a la DERECHA (indicando "ocultar hacia allá")
                if (icon) { icon.style.transform = 'rotate(90deg)'; }
                if (reopenBtn) reopenBtn.classList.add('hidden');
            } else {
                // CERRAR → slide out to the right
                panel.style.maxWidth = panel.offsetWidth + 'px';
                void panel.offsetWidth;
                panel.style.maxWidth = '0px';
                panel.style.opacity = '0';
                panel.dataset.collapsed = 'true';
                // Al colapsar, la flecha apuntaría a la izquierda (aunque el panel se oculte)
                if (icon) { icon.style.transform = 'rotate(-90deg)'; }

                setTimeout(() => {
                    if (panel.dataset.collapsed === 'true' && reopenBtn) {
                        reopenBtn.classList.remove('hidden');
                        reopenBtn.classList.add('flex');
                    }
                }, 360);
            }
        } else {
            // ── MOBILE: solo colapsar el cuerpo (mensajes + input) ──
            const body = document.getElementById('chat-collapsible-body');
            if (!body) return;
            const isBodyCollapsed = body.classList.contains('hidden');
            body.classList.toggle('hidden', !isBodyCollapsed);
            // En mobile: punta arriba si abierto, punta abajo (180deg) si cerrado
            if (icon) icon.style.transform = isBodyCollapsed ? '' : 'rotate(180deg)';
        }
    },

    /** Cambia a una versión específica del documento actualmente abierto */
    async switchDocVersion(versionId) {
        // Cerrar dropdown
        const dropdown = document.getElementById('version-switcher-dropdown');
        const arrow = document.getElementById('version-switcher-arrow');
        if (dropdown) dropdown.classList.add('hidden');
        if (arrow) arrow.style.transform = '';

        const docId = this.currentDocId;
        if (!docId || !versionId) return;

        // Encontrar los datos de la versión en el array cacheado
        const versionData = this.docVersions ? this.docVersions.find(v => v.id == versionId) : null;

        const iframe = document.getElementById('preview-iframe');
        const skeleton = document.getElementById('preview-skeleton');
        const unsupportedDiv = document.getElementById('preview-unsupported');
        const unsupportedDownload = document.getElementById('preview-unsupported-download');
        const headerDownloadBtn = document.getElementById('preview-doc-download');

        // Actualizar metadatos del header con los datos de la versión seleccionada
        if (versionData) {
            const vDoc = {
                title: this.currentDoc.title,
                type: this.currentDoc.type,
                mime_type: versionData.mime_type || this.currentDoc.mime_type,
                version_number: versionData.version_number,
                uploaded_by_name: versionData.uploaded_by_name,
                uploaded_at: versionData.uploaded_at,
            };
            this._updatePreviewHeader(vDoc);

            const mime = vDoc.mime_type || '';
            const canView = mime === 'application/pdf' ||
                mime.startsWith('image/') ||
                mime.startsWith('video/') ||
                mime.startsWith('text/') ||
                mime === 'application/json';

            const viewUrl = `/steelinox/api/projects/${this.projectId}/documents/${docId}/view?version_id=${versionId}`;
            const downloadUrl = `/steelinox/api/projects/${this.projectId}/documents/${docId}/download?version_id=${versionId}`;

            if (headerDownloadBtn) headerDownloadBtn.href = downloadUrl;
            if (unsupportedDownload) unsupportedDownload.href = downloadUrl;

            // Reset
            if (skeleton) skeleton.classList.remove('hidden', 'opacity-0');
            iframe.classList.add('opacity-0', 'hidden');
            iframe.src = '';
            if (unsupportedDiv) unsupportedDiv.classList.add('hidden');

            if (canView) {
                iframe.classList.remove('hidden');
                iframe.src = viewUrl;
            } else {
                if (skeleton) skeleton.classList.add('hidden');
                if (unsupportedDiv) unsupportedDiv.classList.remove('hidden');
            }
        }

        // Actualizar campo oculto de versión activa y el indicador del chat
        this._setActiveCommentVersion(versionId, versionData ? versionData.version_number : null);

        // Actualizar selector de versiones del chat y filtrar comentarios
        const chatSelect = document.getElementById('chat-version-select');
        if (chatSelect) chatSelect.value = versionId;
        this.renderDocComments(versionId);
    },

    async loadDocVersionsForChat(docId, selectedVersionId = null) {
        const chatSelect = document.getElementById('chat-version-select');
        const headerList = document.getElementById('version-switcher-list');

        if (chatSelect) {
            chatSelect.innerHTML = '<option value="">Todas las versiones</option>';
        }
        if (headerList) {
            headerList.innerHTML = '<div class="px-3 py-2 flex justify-center"><div class="si-spinner w-4 h-4 border-orange-500/20 border-t-orange-500"></div></div>';
        }

        try {
            const res = await API.get(`/projects/${this.projectId}/documents/${docId}/versions`);
            if (res.success && res.data) {
                this.docVersions = res.data; // Cache for switchDocVersion

                let listHtml = '';

                res.data.forEach(v => {
                    const isCurrent = v.is_current == 1;
                    const isSelected = selectedVersionId ? v.id == selectedVersionId : isCurrent;

                    // Chat select option
                    if (chatSelect) {
                        const opt = document.createElement('option');
                        opt.value = v.id;
                        opt.textContent = `v${v.version_number}${isCurrent ? ' (Activa)' : ''}`;
                        if (isSelected) opt.selected = true;
                        chatSelect.appendChild(opt);
                    }

                    // Sincronizar el campo oculto con la versión activa seleccionada
                    if (isSelected) {
                        this._setActiveCommentVersion(v.id, v.version_number);
                    }

                    // Header dropdown row
                    const dateStr = v.uploaded_at ? SIApp.formatDateTime(v.uploaded_at) : '';
                    listHtml += `
                        <button onclick="SIModules.projectDetailAdmin.switchDocVersion(${v.id})"
                                class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-orange-50 transition-colors group ${isSelected ? 'bg-orange-50/60' : ''
                        }">
                            <div class="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black border ${isCurrent
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white border-gray-200 text-gray-500 group-hover:border-orange-300'
                        }">
                                v${v.version_number}
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-[11px] font-bold text-gray-900 truncate">${SIApp.escapeHtml(v.file_name || '')}</p>
                                <p class="text-[10px] text-gray-400 font-medium mt-0.5">${v.uploaded_by_name || 'Sistema'} · ${dateStr}</p>
                            </div>
                            ${isCurrent ? '<span class="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0 self-center">ACTIVA</span>' : ''}
                        </button>
                    `;
                });

                if (headerList) headerList.innerHTML = listHtml || '<p class="px-4 py-3 text-xs text-gray-400 font-medium">Sin versiones disponibles</p>';

                // Poblar también el dropdown custom del filtro de chat
                let chatFilterHtml = `<button onclick="SIModules.projectDetailAdmin.setChatVersionFilter(null,'Todas')" class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-orange-50 transition-colors"><div class="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center text-[9px] font-black text-gray-500 shrink-0">\u221e</div><span class="text-[11px] font-bold text-gray-700">Todas las versiones</span></button>`;
                res.data.forEach(v => {
                    const isCur = v.is_current == 1;
                    chatFilterHtml += `<button onclick="SIModules.projectDetailAdmin.setChatVersionFilter(${v.id},'v${v.version_number}')" class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-orange-50 transition-colors"><div class="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 ${isCur ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}">v${v.version_number}</div><div class="min-w-0 flex-1"><p class="text-[11px] font-bold text-gray-800 truncate">v${v.version_number}${isCur ? ' \u00b7 Activa' : ''}</p><p class="text-[10px] text-gray-400 truncate">${SIApp.escapeHtml(v.file_name || '')}</p></div></button>`;
                });
                const chatFilterList = document.getElementById('chat-version-filter-list');
                if (chatFilterList) chatFilterList.innerHTML = chatFilterHtml;
            }
        } catch (e) {
            console.error('Error versiones:', e);
            if (headerList) headerList.innerHTML = '<p class="px-4 py-3 text-xs text-red-400 font-bold">Error al cargar versiones</p>';
        }
    },

    async loadDocComments(docId, versionId = null) {
        const loading = document.getElementById('chat-loading');
        const container = document.getElementById('chat-messages-container');
        if (!loading || !container) return;

        loading.classList.remove('hidden');
        container.innerHTML = '';
        try {
            const res = await API.get(`/projects/${this.projectId}/documents/${docId}/comments`);
            if (res.success && res.data) {
                this.currentComments = res.data;
                this.renderDocComments(versionId);
            } else {
                this.currentComments = [];
                this.renderDocComments(versionId);
            }
        } catch (e) {
            console.error('Error comentarios:', e);
            container.innerHTML = '<p class="text-xs text-red-500 text-center py-4 font-bold border border-red-100 bg-red-50 rounded-lg">Error al cargar historial del chat</p>';
        } finally {
            loading.classList.add('hidden');
        }
    },

    filterCommentsByVersion() {
        const vid = document.getElementById('chat-version-select').value;
        this.renderDocComments(vid === '' ? null : parseInt(vid));
    },

    renderDocComments(versionId = null) {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;

        if (!this.currentComments || this.currentComments.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10 opacity-60">
                     <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg> 
                     </div>
                     <p class="text-[11px] font-black text-gray-500 uppercase tracking-widest text-center px-4">No hay comentarios aún<br><span class="font-medium text-gray-400 capitalize tracking-normal">Sé el primero en aportar feedback</span></p>
                </div>
            `;
            return;
        }

        let filtered = this.currentComments;
        if (versionId) {
            filtered = filtered.filter(c => c.version_id == versionId);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center py-8">No hay comentarios en esta versión</p>';
            return;
        }

        container.innerHTML = filtered.map(c => {
            const me = this.user; // → SIApp.user via getter
            const isMe = me && (
                Number(me.id) === Number(c.author_id) ||
                (me.email && c.author_email && me.email === c.author_email)
            );
            const time = SIApp.formatDateTime(c.created_at);
            const initials = SIApp._getInitials(c.author_name || '??');
            const role = c.author_role || 'cliente';

            // ── Colores corporativos por rol ──────────────────────────────
            // admin     → naranja corporativo
            // comercial → azul índigo
            // cliente   → esmeralda
            const roleConfig = {
                admin: { label: 'Admin', nameCss: 'text-orange-600', badgeCss: 'bg-orange-100 text-orange-700 border-orange-200', avatarCss: 'bg-orange-50 text-orange-600 border-orange-200' },
                comercial: { label: 'Comercial', nameCss: 'text-indigo-600', badgeCss: 'bg-indigo-100 text-indigo-700 border-indigo-200', avatarCss: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
                cliente: { label: 'Cliente', nameCss: 'text-emerald-600', badgeCss: 'bg-emerald-100 text-emerald-700 border-emerald-200', avatarCss: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
            };
            const rc = roleConfig[role] || roleConfig.cliente;

            if (isMe) {
                // ────── MIS MENSAJES (derecha) ──────
                const myRole = (me && me.role) || 'admin';
                const myRc = roleConfig[myRole] || roleConfig.admin;
                return `
                     <div class="flex gap-2 justify-end">
                         <div class="flex flex-col items-end max-w-[88%]">
                             <!-- Nombre + Rol + Versión -->
                             <div class="flex items-center gap-1.5 mb-1.5 px-1 flex-wrap justify-end">
                                 <span class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${myRc.badgeCss}">${myRc.label}</span>
                                 <span class="text-[11px] font-black ${myRc.nameCss} tracking-tight">${SIApp.escapeHtml(c.author_name)}</span>
                                 <span class="text-[9px] font-black uppercase tracking-widest bg-[#1a1b25]/10 text-[#1a1b25] px-1.5 py-0.5 rounded border border-[#1a1b25]/10">v${c.version_number}</span>
                             </div>
                             <!-- Burbuja -->
                             <div class="bg-gradient-to-br from-[#1e1f2e] to-[#1a1b25] text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg text-[13px] leading-relaxed break-words whitespace-pre-line max-w-full">${SIApp.escapeHtml(c.body.trim())}</div>
                             <!-- Timestamp (abajo a la derecha) -->
                             <div class="mt-1.5 px-1 text-[10px] text-gray-400 font-medium">${time}</div>
                         </div>
                     </div>
                 `;
            } else {
                // ────── MENSAJES AJENOS (izquierda) ──────
                return `
                     <div class="flex gap-2.5 justify-start">
                         <!-- Avatar con color de rol -->
                         <div class="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 mt-6 border shadow-sm ${rc.avatarCss}">
                             ${initials}
                         </div>
                         <div class="flex flex-col items-start max-w-[88%]">
                             <!-- Nombre + Rol + Versión -->
                             <div class="flex items-center gap-1.5 mb-1.5 px-1 flex-wrap">
                                 <span class="text-[11px] font-black ${rc.nameCss} tracking-tight">${SIApp.escapeHtml(c.author_name)}</span>
                                 <span class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${rc.badgeCss}">${rc.label}</span>
                                 <span class="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">v${c.version_number}</span>
                             </div>
                             <!-- Burbuja -->
                             <div class="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 text-[#1a1b25] text-[13px] leading-relaxed break-words whitespace-pre-line max-w-full">${SIApp.escapeHtml(c.body.trim())}</div>
                             <!-- Timestamp (abajo a la izquierda) -->
                             <div class="mt-1.5 px-1 text-[10px] text-gray-400 font-medium">${time}</div>
                         </div>
                     </div>
                 `;
            }
        }).join('');

        const scrollContainer = document.getElementById('preview-chat-messages');
        if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    },

    async submitDocComment() {
        const docId = document.getElementById('chat-current-doc-id').value;
        const input = document.getElementById('preview-chat-input');
        const submitBtn = document.getElementById('preview-chat-submit');
        const spinner = document.getElementById('preview-chat-send-spinner');
        const icon = document.getElementById('preview-chat-send-icon');
        // La version_id SIEMPRE la dictamina el header dropdown (versión del visualizador),
        // no el select de filtrado del chat que solo controla la vista.
        const activeVersionId = document.getElementById('chat-current-version-id')?.value;

        if (!docId) return;

        const bodyText = input.value.trim();
        if (!bodyText) return;

        submitBtn.disabled = true;
        icon.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            const data = { body: bodyText };
            if (activeVersionId && activeVersionId !== '') {
                data.version_id = parseInt(activeVersionId);
            }

            const res = await API.post(`/projects/${this.projectId}/documents/${docId}/comments`, data);

            if (res.success) {
                input.value = '';
                input.style.height = '';
                // Recargar todos los comentarios y mantener el filtro actual del chat select
                const chatSelect = document.getElementById('chat-version-select');
                const filterVid = chatSelect && chatSelect.value !== '' ? parseInt(chatSelect.value) : null;
                await this.loadDocComments(docId, filterVid);
            } else {
                if (window.SIApp) SIApp.showToast('Error', res.message || 'Error al enviar el comentario', 'error');
            }
        } catch (e) {
            console.error('Error enviando comentario:', e);
            if (window.SIApp) SIApp.showToast('Error', 'No se pudo comunicar con el servidor', 'error');
        } finally {
            submitBtn.disabled = false;
            icon.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    },

    onIframeLoad() {
        const iframe = document.getElementById('preview-iframe');
        const skeleton = document.getElementById('preview-skeleton');

        if (iframe && skeleton) {
            iframe.classList.remove('opacity-0');
            skeleton.classList.add('opacity-0');
            setTimeout(() => skeleton.classList.add('hidden'), 500);
        }
    },

    closePreviewModal() {
        const modal = document.getElementById('preview-doc-modal');
        const iframe = document.getElementById('preview-iframe');
        if (!modal) return;

        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            if (iframe) iframe.src = 'about:blank';
        }, 300);
    },

    /** Disparar el selector para una nueva versión */
    triggerVersionUpload(docId) {
        this.updatingDocumentId = docId; // Subida de versión
        const input = document.getElementById('si-doc-upload-raw');
        if (input) input.click();
    },

    /** Manejar la selección o subida física del archivo */
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // CASO A: Subida de nueva VERSIÓN (Directa, sin modal de metadatos)
        if (this.updatingDocumentId) {
            this._performDirectVersionUpload(file);
            event.target.value = ''; // Limpiar
            return;
        }

        // CASO B: Nuevo documento (Solo actualizar UI del modal)
        const nameDisplay = document.getElementById('doc-file-selected-name');
        const titleInput = document.getElementById('doc-upload-title');
        const dropZone = document.getElementById('doc-drop-zone');

        if (nameDisplay) {
            nameDisplay.textContent = file.name;
            nameDisplay.classList.add('text-orange-600');
        }
        if (titleInput && !titleInput.value) {
            // Prefill title with filename without extension
            titleInput.value = file.name.split('.').slice(0, -1).join('.');
        }
        if (dropZone) {
            dropZone.classList.add('bg-orange-50/50', 'border-orange-200');
        }
    },

    /** Subida directa para versiones */
    async _performDirectVersionUpload(file) {
        const sidebarSpinner = document.getElementById('sidebar-upload-spinner');
        const tabSpinner = document.getElementById('tab-upload-spinner');

        const setLoading = (loading) => {
            if (sidebarSpinner) sidebarSpinner.classList.toggle('hidden', !loading);
            if (tabSpinner) tabSpinner.classList.toggle('hidden', !loading);
        };

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const endpoint = `/projects/${this.projectId}/documents/${this.updatingDocumentId}/versions`;
            const res = await API.post(endpoint, formData);

            if (res.success) {
                if (window.SIApp) SIApp.showToast('¡Éxito!', 'Nueva versión subida correctamente.', 'success');
                await this.loadProjectDocuments();
            } else {
                if (window.SIApp) SIApp.showToast('Error', res.message || 'Error al subir versión.', 'error');
            }
        } catch (e) {
            console.error(e);
            if (window.SIApp) SIApp.showToast('Error', 'No se pudo subir la versión.', 'error');
        } finally {
            setLoading(false);
            this.updatingDocumentId = null;
        }
    },

    /** Enviar el formulario de subida con todos los metadatos */
    async submitUploadForm() {
        const form = document.getElementById('upload-doc-form');
        const inputRaw = document.getElementById('si-doc-upload-raw');
        const file = inputRaw ? inputRaw.files[0] : null;

        if (!form.reportValidity()) return;
        if (!file) {
            if (window.SIApp) SIApp.showToast('Archivo Requerido', 'Por favor selecciona un archivo antes de continuar.', 'info');
            return;
        }

        const btn = document.getElementById('btn-submit-upload');
        const spinner = document.getElementById('submit-upload-spinner');

        const setLoading = (loading) => {
            if (btn) btn.disabled = loading;
            if (spinner) spinner.classList.toggle('hidden', !loading);
        };

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', document.getElementById('doc-upload-title').value);
            formData.append('type', document.getElementById('doc-upload-type').value);
            formData.append('access_mode', document.getElementById('doc-upload-access').value);
            formData.append('is_visible_to_client', document.getElementById('doc-upload-visible').checked ? 1 : 0);

            const endpoint = `/projects/${this.projectId}/documents`;
            const res = await API.post(endpoint, formData);

            if (res.success) {
                if (window.SIApp) SIApp.showToast('¡Éxito!', 'Documento añadido correctamente.', 'success');
                this.closeUploadModal();
                await this.loadProjectDocuments();
            } else {
                if (window.SIApp) SIApp.showToast('Error', res.message || 'Error al procesar la subida.', 'error');
            }
        } catch (e) {
            console.error(e);
            if (window.SIApp) SIApp.showToast('Error fatal', 'No se pudo completar la subida.', 'error');
        } finally {
            setLoading(false);
            if (inputRaw) inputRaw.value = ''; // Reset core input
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // USUARIOS (COMERCIALES) DEL PROYECTO
    // ────────────────────────────────────────────────────────────────────────

    async loadAssignedUsers() {
        try {
            const res = await API.get('/projects/' + this.projectId + '/users');
            if (res.success && res.data) {
                this.assignedUsers = res.data;
            } else {
                this.assignedUsers = [];
            }
        } catch (e) {
            console.error('Error cargando comerciales asignados:', e);
            this.assignedUsers = [];
        }
    },

    _renderAssignedCommercials() {
        if (!this.assignedUsers || this.assignedUsers.length === 0) {
            return `<div class="border border-dashed border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-400 font-medium">Ningún comercial asignado.</div>`;
        }

        let html = '<div class="flex flex-wrap justify-center gap-2">';

        this.assignedUsers.forEach(u => {
            html += `
                <div class="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-orange-200 hover:bg-orange-50/50 transition-colors rounded-full pl-1.5 pr-3 py-1.5 shadow-sm group">
                    <div class="w-6 h-6 bg-white border border-gray-200 text-orange-600 rounded-full flex items-center justify-center text-[9px] font-extrabold pb-[1px] shrink-0">
                        ${SIApp._getInitials(u.name)}
                    </div>
                    <span class="text-[13px] font-bold text-gray-700 group-hover:text-orange-700 whitespace-nowrap">${u.name}</span>
                    <button onclick="SIModules.projectDetailAdmin.removeUser(${u.id})" class="ml-1 text-gray-300 hover:text-red-500 bg-white hover:bg-red-50 rounded-full p-0.5 transition-all shrink-0" title="Eliminar asignación">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            `;
        });

        html += '</div>';

        return html;
    },

    openAssignCommercialModal() {
        const modal = document.getElementById('assign-commercial-modal');
        modal.classList.remove('hidden');
        void modal.offsetWidth; // force reflow
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');

        this.loadAvailableUsers();
    },

    closeAssignCommercialModal() {
        const modal = document.getElementById('assign-commercial-modal');
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    async loadAvailableUsers() {
        const container = document.getElementById('commercial-list-container');
        container.innerHTML = '<div class="flex justify-center p-8"><div class="si-spinner"></div></div>';

        try {
            const res = await API.get('/projects/' + this.projectId + '/available-users');
            if (res.success && res.data && res.data.length > 0) {
                container.innerHTML = res.data.map(u => `
                    <div onclick="SIModules.projectDetailAdmin.assignUser(${u.id})" class="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-colors group cursor-pointer mb-2">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-gray-100 group-hover:bg-orange-500 group-hover:text-white rounded-full flex items-center justify-center text-xs font-bold text-gray-500 transition-colors">
                                ${SIApp._getInitials(u.name)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-900 leading-tight">${u.name}</p>
                                <p class="text-[10px] text-gray-400 font-medium">${u.email}</p>
                            </div>
                        </div>
                        <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-center text-sm text-gray-500 py-6">No hay comerciales disponibles para asignar.</p>';
            }
        } catch (err) {
            console.error(err);
            container.innerHTML = '<p class="text-center text-sm text-red-500 py-6">Error cargando comerciales.</p>';
        }
    },

    async assignUser(userId) {
        try {
            const res = await API.post('/projects/' + this.projectId + '/users/' + userId);
            if (res.success) {
                SIApp.showToast('Éxito', 'Comercial asignado correctamente.', 'success');
                this.closeAssignCommercialModal();
                await this.loadProjectData(); // Recarga usuarios y repinta
            } else {
                SIApp.showToast('Error', res.message || 'No se pudo asignar.', 'error');
            }
        } catch (e) {
            console.error(e);
            SIApp.showToast('Error', 'Error interno al asignar.', 'error');
        }
    },

    async removeUser(userId) {
        if (window.SIApp && SIApp.confirm) {
            const confirmed = await SIApp.confirm('¿Desasignar Comercial?', 'Esto quitará el acceso del comercial a este proyecto.');
            if (!confirmed) return;
        }

        try {
            const res = await API.delete('/projects/' + this.projectId + '/users/' + userId);
            if (res.success) {
                SIApp.showToast('Éxito', 'Comercial desasignado.', 'success');
                await this.loadProjectData();
            } else {
                SIApp.showToast('Error', res.message || 'No se pudo desasignar.', 'error');
            }
        } catch (e) {
            console.error(e);
            SIApp.showToast('Error', 'Error interno.', 'error');
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // MODAL: EDITAR PROYECTO
    // ────────────────────────────────────────────────────────────────────────

    openEditProjectModal() {
        const modal = document.getElementById('edit-project-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    },

    closeEditProjectModal() {
        const modal = document.getElementById('edit-project-modal');
        if (!modal) return;
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    async saveProjectEdits() {
        const form = document.getElementById('edit-project-form');
        const spinner = document.getElementById('edit-project-save-spinner');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const btn = spinner.parentElement;
        const oldText = btn.innerHTML;
        btn.innerHTML = spinner.outerHTML + ' Guardando...';
        btn.querySelector('svg').classList.remove('hidden');
        btn.querySelector('svg').classList.add('animate-spin');
        btn.disabled = true;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Convertir strings vacíos a null para floats/ints
            if (data.budget_amount === '') data.budget_amount = null;
            if (data.surface === '') data.surface = null;

            // Project Reference Validation
            const regexPrj = /^PRJ-\d{4}-\d{3,}$/;
            if (!regexPrj.test(data.reference)) {
                if (window.SIApp) SIApp.showToast('Referencia Inválida', 'El formato debe ser PRJ-AAAA-XXX (Ej: PRJ-2026-001)', 'error');
                btn.innerHTML = oldText;
                btn.disabled = false;
                return;
            }

            const res = await API.put('/projects/' + this.projectId, data);

            if (res && res.success) {
                if (window.SIApp) SIApp.showToast('Proyecto actualizado', 'Datos guardados correctamente', 'success');
                this.closeEditProjectModal();
                await this.loadProjectData(); // Refresca la vista
            } else {
                if (window.SIApp) SIApp.showToast('Error al actualizar', res?.message || 'Revisa los campos', 'error');
            }
        } catch (error) {
            console.error(error);
            if (window.SIApp) SIApp.showToast('Error', 'Error al modificar el proyecto', 'error');
        } finally {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // MODAL: CAMBIAR ESTADO
    // ────────────────────────────────────────────────────────────────────────

    openChangeStatusModal() {
        const modal = document.getElementById('change-status-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');

        // Cerrar dropdown por si acaso si se hace clic fuera del popovers
        const closeFn = (e) => {
            if (!e.target.closest('.si-custom-dropdown') && !e.target.closest('button[onclick*="toggleDropdown"]')) {
                document.querySelectorAll('.si-custom-dropdown').forEach(d => d.classList.add('hidden'));
            }
        };
        document.addEventListener('click', closeFn);
        modal._closeFn = closeFn;
    },

    toggleDropdown(id) {
        document.querySelectorAll('.si-custom-dropdown').forEach(d => { if (d.id !== id) d.classList.add('hidden'); });
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden');
    },

    selectCustomStatus(val, label, colorClass, liElement) {
        document.getElementById('change-status-select').value = val;
        document.getElementById('change-status-display').textContent = label;

        const circle = document.getElementById('change-status-circle');
        circle.className = 'w-2 h-2 rounded-full ' + colorClass;

        if (liElement) {
            const ul = document.getElementById('status-dropdown-menu');
            const lis = ul.querySelectorAll('li');
            lis.forEach(li => {
                li.className = 'px-4 py-2.5 transition-all flex items-center gap-2 hover:bg-orange-50/50 hover:pl-5 cursor-pointer text-gray-600';
                const check = li.querySelector('.status-check');
                if (check) check.remove();
            });
            liElement.className = 'px-4 py-2.5 transition-all flex items-center gap-2 bg-gray-50 text-gray-900 cursor-default pointer-events-none shadow-inner';
            liElement.insertAdjacentHTML('beforeend', '<svg class="status-check w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>');
        }

        this.toggleDropdown('status-dropdown-menu');
    },

    closeChangeStatusModal() {
        const modal = document.getElementById('change-status-modal');
        if (!modal) return;

        if (modal._closeFn) {
            document.removeEventListener('click', modal._closeFn);
            delete modal._closeFn;
        }

        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    async saveProjectStatus() {
        const form = document.getElementById('change-status-form');
        const spinner = document.getElementById('change-status-spinner');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const btn = spinner.parentElement;
        const oldText = btn.innerHTML;
        btn.innerHTML = spinner.outerHTML + ' Actualizando...';
        btn.querySelector('svg').classList.remove('hidden');
        btn.querySelector('svg').classList.add('animate-spin');
        btn.disabled = true;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const res = await API.put('/projects/' + this.projectId + '/status', data);

            if (res && res.success) {
                if (window.SIApp) SIApp.showToast('Estado actualizado', 'El nuevo estado se ha guardado.', 'success');
                this.closeChangeStatusModal();
                await this.loadProjectData(); // Refresca la vista completa (timeline, badges, etc)
            } else {
                if (window.SIApp) SIApp.showToast('Error', res?.message || 'No se pudo cambiar el estado', 'error');
            }
        } catch (error) {
            console.error(error);
            if (window.SIApp) SIApp.showToast('Error', 'Error al actualizar el estado', 'error');
        } finally {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    }
};
