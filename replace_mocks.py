import sys

file_path = r'c:\xampp\htdocs\steelinox\public\assets\js\modules\project_detail_admin.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

cut_idx = -1
for i, line in enumerate(lines):
    if line.strip() == '/** PESTAÑA: DOCUMENTOS (Mock) */' and '259' not in line:
        cut_idx = i
        break

if cut_idx == -1:
    print("Could not find cut point")
    sys.exit(1)

new_content = """    /** PESTAÑA: DOCUMENTOS (Mock) */
    _renderDocumentos() {
        return `
            <div class="space-y-6">
                <!-- Buscador -->
                <div class="relative">
                    <svg class="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input id="doc-search-input" type="text" placeholder="Buscar documentos..." oninput="ProjectAdminView._filterDocs(this.value)" class="w-full bg-white border border-gray-100 text-sm rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-[#E57B23]/20 focus:border-[#E57B23] focus:outline-none shadow-sm text-gray-700 font-medium">
                </div>

                <!-- Botón Principal -->
                <button class="w-full bg-[#E57B23] hover:bg-[#c9661c] text-white rounded-full py-4 text-sm font-bold shadow-lg shadow-[#E57B23]/20 transition-all flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                    Seleccionar Archivo
                </button>

                <!-- Header de Lista -->
                <div class="flex items-center justify-between pt-2">
                    <h3 class="text-[17px] font-extrabold text-[#1a1b25]">Archivos Recientes</h3>
                    <button class="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                    </button>
                </div>

                <!-- Lista de Archivos -->
                <div class="space-y-3 pb-6" id="doc-cards-container">
                    ${this._mockDocCard('Plano_Estructural_V1.dwg', 'CAD', 'v2.4 • 12 Oct', 'JD')}
                    ${this._mockDocCard('Especificaciones_Acero.pdf', 'PDF', 'v1.1 • 10 Oct', 'AL')}
                    ${this._mockDocCard('Memorias_Calculo_Final.zip', 'ZIP', 'v2.0 • 08 Oct', 'MP')}
                    ${this._mockDocCard('Cronograma_Suministros.xlsx', 'XLS', 'v3.2 • 05 Oct', 'RS')}
                    ${this._mockDocCard('Detalle_Soldadura_A3.dwg', 'CAD', 'v1.4 • 02 Oct', 'JD')}
                </div>
            </div>
        `;
    },

    _mockDocCard(title, type, meta, avatar) {
        const typeProps = {
            'CAD': { icon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>', bg: 'bg-[#e0f2fe]', text: 'text-[#0284c7]', badgeBg: 'bg-[#bae6fd]', badgeText: 'text-[#0369a1]' },
            'PDF': { icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>', bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]', badgeBg: 'bg-[#fecaca]', badgeText: 'text-[#b91c1c]' },
            'ZIP': { icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>', bg: 'bg-[#ffedd5]', text: 'text-[#ea580c]', badgeBg: 'bg-[#fed7aa]', badgeText: 'text-[#c2410c]' },
            'XLS': { icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" clip-rule="evenodd"/></svg>', bg: 'bg-[#dcfce7]', text: 'text-[#16a34a]', badgeBg: 'bg-[#bbf7d0]', badgeText: 'text-[#15803d]' }
        };
        const style = typeProps[type] || typeProps['CAD'];

        return `
            <div class="doc-row flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100" data-title="${title.toLowerCase()}">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-[52px] h-[52px] ${style.bg} ${style.text} rounded-[14px] flex items-center justify-center shrink-0">
                        ${style.icon}
                    </div>
                    <div class="min-w-0">
                        <p class="text-[14.5px] font-bold text-gray-900 leading-tight mb-1 truncate">${title}</p>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-[2px] rounded ${style.badgeBg} ${style.badgeText} text-[10px] font-extrabold tracking-wide uppercase">${type}</span>
                            <span class="text-[11px] text-gray-500 font-medium">${meta}</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-center justify-between gap-1.5 shrink-0 pl-3">
                    <div class="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-[10px] uppercase font-bold text-gray-600">${avatar}</div>
                    <button class="text-gray-400 hover:text-gray-700">
                        <svg class="w-5 h-5 translate-y-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                    </button>
                </div>
            </div>
        `;
    },

    /** PESTAÑA: HISTORIAL (Mock) */
    _renderHistorial() {
        return `
            <div class="space-y-6 pb-6">
                <!-- Header -->
                <div class="pt-2">
                     <h3 class="text-[10px] font-extrabold text-[#E57B23] uppercase tracking-widest mb-1">INDUSTRIAL STEEL CO.</h3>
                     <h1 class="text-2xl font-extrabold text-[#1a1b25]">Historial de Proyecto</h1>
                     <p class="text-xs text-gray-500 mt-1">Estructura Metálica - Nave A24</p>
                </div>

                <!-- Modile Filter Chips -->
                <div class="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    <button class="px-5 py-2.5 whitespace-nowrap bg-[#E57B23] text-white rounded-full text-xs font-bold shadow-md shadow-orange-500/20">Todos</button>
                    <button class="px-5 py-2.5 whitespace-nowrap bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors">Status</button>
                    <button class="px-5 py-2.5 whitespace-nowrap bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors">Documentos</button>
                    <button class="px-5 py-2.5 whitespace-nowrap bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors">Chat</button>
                </div>

                <!-- Timeline Container -->
                <div class="relative pl-[26px] space-y-8 mt-6">
                    <!-- Linea vertical -->
                    <div class="absolute top-4 bottom-0 left-[38px] w-px bg-gray-200"></div>

                    ${this._mockHistoryNode('status', 'Carlos Ruiz', 'Hoy, 10:45 AM', 'CAMBIO DE ESTADO', 'Fase de Montaje: Iniciada', 'Se ha verificado la recepción de las vigas maestras y se procede al izaje según el plan de seguridad.')}
                    ${this._mockHistoryNode('document', 'Elena Soler', 'Ayer, 04:20 PM', 'NUEVO DOCUMENTO', 'Planos_Detalle_V5.pdf', 'PDF de Ingeniería (12.4 MB)<br><span class="text-[10px] font-normal text-gray-400">Cargado por Oficina Técnica</span>', true)}
                    ${this._mockHistoryNode('chat', 'Marcos Peña', '22 Oct, 09:15 AM', 'COMENTARIO INTERNO', '', '"Confirmada la revisión estructural del nodo B-12. Podemos proceder con el torqueado final de pernos grado 8."')}
                    ${this._mockHistoryNode('edit', 'Ana Martínez', '21 Oct, 02:30 PM', 'EDICIÓN DE CRONOGRAMA', 'Ajuste de Hito: Cimentación', '<span class="line-through text-gray-400">24/10/2023</span> &nbsp;&rarr;&nbsp; <strong class="text-[#E57B23]">28/10/2023</strong>')}
                </div>

                <!-- Cargar más -->
                <div class="pt-6">
                    <button class="w-full py-4 bg-white border border-gray-200 text-[#E57B23] rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-orange-50 transition-colors shadow-sm">
                        Cargar Registros Anteriores
                    </button>
                </div>
            </div>
        `;
    },

    _mockHistoryNode(type, user, time, actionTitle, title, content, isAttachment = false) {
        const icons = {
            'status': { color: 'bg-[#E57B23]', icon: '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>' },
            'document': { color: 'bg-[#0284c7]', icon: '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
            'chat': { color: 'bg-[#e5e7eb]', icon: '<svg class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/></svg>' },
            'edit': { color: 'bg-[#fdba74]', icon: '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>' }
        };
        const node = icons[type];
        
        let contentHtml = '';
        if (isAttachment) {
            contentHtml = `
                <div class="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3">
                    <div class="w-10 h-10 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center justify-center text-[#0284c7]">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/></svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-gray-900 leading-tight mb-0.5 truncate">${content.split('<br>')[0]}</p>
                        ${content.split('<br>')[1] ? `${content.split('<br>')[1]}` : ''}
                    </div>
                    <button class="text-gray-400 hover:text-gray-900 shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
                </div>
            `;
        } else if (type === 'chat') {
            contentHtml = `
                <div class="mt-3 text-[13.5px] text-gray-600 font-medium italic relative pl-3 border-l-2 border-gray-200 leading-relaxed">
                    ${content}
                </div>
            `;
        } else {
            contentHtml = `
                <p class="text-[13.5px] text-gray-600 mt-2 leading-relaxed font-medium">${content}</p>
                ${type === 'status' ? '<a href="#" class="inline-block mt-4 text-[11px] font-extrabold text-[#E57B23] tracking-widest uppercase hover:text-[#c9661c]">VER DETALLES <span class="pl-1 text-sm leading-none">&rsaquo;</span></a>' : ''}
            `;
        }

        return `
            <div class="relative pl-[22px] z-10 before:absolute before:content-[''] before:-left-0.5 before:top-8 before:w-6 before:h-px before:bg-gray-200">
                <!-- Node Icon -->
                <div class="absolute left-[-16px] top-4 w-9 h-9 ${node.color} rounded-full border-4 border-[#fff] flex items-center justify-center shadow-sm z-20">
                    ${node.icon}
                </div>
                
                <!-- Card -->
                <div class="bg-white border text-left border-gray-100/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-3.5">
                        <div class="flex items-center gap-2">
                            <img src="https://i.pravatar.cc/100?u=${user.replace(' ', '')}" alt="avatar" class="w-7 h-7 rounded-full bg-gray-200 object-cover">
                            <span class="text-sm font-bold text-gray-900">${user}</span>
                        </div>
                        <span class="px-3 py-1 bg-gray-50 text-gray-500 text-[10px] font-semibold rounded-full">${time}</span>
                    </div>
                    
                    <h5 class="text-[10px] font-extrabold text-[#c2410c] tracking-widest uppercase mb-1.5">${actionTitle}</h5>
                    ${title ? `<h4 class="text-[15px] font-bold text-gray-900 leading-tight">${title}</h4>` : ''}
                    
                    ${contentHtml}
                </div>
            </div>
        `;
    },

    /** PESTAÑA: COMENTARIOS/CHAT */
    _renderComentarios() {
        return `
            <div class="flex flex-col bg-transparent -mx-4 sm:mx-0 relative">
                
                <!-- Chat Area (No bottom bar) -->
                <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-7 pb-10">
                    <!-- Date badge -->
                    <div class="text-center">
                        <span class="inline-block px-4 py-1.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-full uppercase tracking-widest">Hoy - 24 Oct</span>
                    </div>

                    <!-- Message Other -->
                    <div class="flex gap-3">
                        <img src="https://i.pravatar.cc/100?u=ElenaValdes" class="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-gray-200" alt="Elena">
                        <div class="flex-1 max-w-[85%]">
                            <div class="flex items-center gap-2 mb-1.5 px-1">
                                <span class="text-xs font-bold text-gray-900">Elena Valdés</span>
                                <span class="text-[11px] text-gray-400 font-medium">09:12 AM</span>
                            </div>
                            <!-- Bubble content -->
                            <div class="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm p-4 text-[13.5px] text-gray-700 leading-relaxed font-medium mb-3">
                                Buenos días equipo. He subido los nuevos planos de la Fase 2. ¿Podéis revisarlos antes de la reunión de las 11:00?
                            </div>
                            
                            <!-- Attached file -->
                            <div class="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-0.5 transition-transform w-[280px] pr-6">
                                <div class="w-11 h-11 bg-[#fef3eb] text-[#ea580c] rounded-xl flex items-center justify-center shrink-0">
                                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[11px] font-extrabold text-gray-900 uppercase tracking-widest mb-0.5 truncate">PLANO_ESTRUCTURAL...pdf</p>
                                    <p class="text-[10px] text-gray-500 font-medium tracking-wide">4.2 MB • PDF</p>
                                </div>
                                <svg class="w-5 h-5 text-gray-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            </div>
                        </div>
                    </div>

                    <!-- Message Me -->
                    <div class="flex gap-3 flex-row-reverse mt-2">
                        <img src="https://i.pravatar.cc/100?u=Tu" class="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-gray-200" alt="Tu">
                        <div class="flex-1 max-w-[85%] flex flex-col items-end">
                            <div class="flex items-center gap-2 mb-1.5 px-1 flex-row-reverse">
                                <span class="text-xs font-bold text-gray-900">Tú</span>
                                <span class="text-[11px] text-gray-400 font-medium">09:15 AM</span>
                            </div>
                            <div class="bg-[#d67b36] shadow-sm rounded-2xl rounded-tr-sm p-4 text-[13.5px] text-white leading-relaxed font-medium">
                                Recibido, Elena. Los reviso ahora mismo. ¿Hay algún cambio crítico en la sección de vigas de acero?
                            </div>
                            <div class="flex items-center gap-1 mt-1.5 text-[9px] font-bold text-gray-400 tracking-wider">
                                <svg class="w-3.5 h-3.5 text-[#d67b36]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                                LEÍDO
                            </div>
                        </div>
                    </div>

                    <!-- Message Other -->
                    <div class="flex gap-3 mt-2">
                         <img src="https://i.pravatar.cc/100?u=ElenaValdes" class="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-gray-200" alt="Elena">
                         <div class="flex-1 max-w-[85%]">
                             <div class="flex items-center gap-2 mb-1.5 px-1">
                                 <span class="text-xs font-bold text-gray-900">Elena Valdés</span>
                                 <span class="text-[11px] text-gray-400 font-medium">09:18 AM</span>
                             </div>
                             <div class="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm p-4 text-[13.5px] text-gray-700 leading-relaxed font-medium">
                                 Sí, se ha ajustado el espesor del refuerzo en el nodo C-4 para cumplir con la nueva normativa industrial.
                             </div>
                         </div>
                    </div>

                    <!-- System msg -->
                    <div class="text-center py-6">
                        <span class="text-[12px] font-medium italic text-gray-400">Ricardo M. se ha unido a la conversación</span>
                    </div>
                </div>
            </div>
        `;
    },

    /** Filtrar filas de la tabla de documentos en tiempo real */
    _filterDocs(query) {
        const q = query.toLowerCase().trim();
        document.querySelectorAll('.doc-row').forEach(row => {
            const title = row.dataset.title || '';
            row.style.display = (!q || title.includes(q)) ? '' : 'none';
        });
    }
};

// Exportación global
window.ProjectAdminView = ProjectAdminView;
"""

lines = lines[:cut_idx]
lines.append(new_content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("SUCCESS!")
