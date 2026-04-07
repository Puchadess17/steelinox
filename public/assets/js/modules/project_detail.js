/**
 * Steel Inox Extranet — Project Detail View
 * Maneja la lógica de la página individual del proyecto.
 */

// 1. Data Transfer Object (DTO) para securizar y tipar la respuesta de la API
class ProjectDTO {
    constructor(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Datos inválidos o faltantes desde la API');
        }

        // Parseo seguro con valores por defecto
        this.id = Number(data.id) || 0;
        this.name = String(data.name || 'Sin Título');
        this.reference = String(data.reference || '');
        this.status = String(data.status || 'desconocido');
        this.clientName = String(data.client_name || 'Sin Asignar');
        
        // Conversión de fechas a objetos Date
        this.createdAt = data.created_at ? new Date(data.created_at) : null;
        this.updatedAt = data.updated_at ? new Date(data.updated_at) : null;
    }

    // Funciones auxiliares del DTO
    get isPropuesta() { return this.status === 'propuesta'; }
    get isAprobado() { return this.status === 'aprobado'; }
}

// 2. Módulo principal
const ProjectDetailView = {
    projectId: null,
    project: null,
    user: null,

    async init(projectId, userContext) {
        this.projectId = projectId;
        this.user = userContext;

        if (!this.projectId) {
            if (window.SIApp) SIApp.showToast('Error', 'No se ha especificado un ID de proyecto válido.', 'error');
            setTimeout(() => {
                window.location.href = '/steelinox/panel';
            }, 3000);
            return;
        }

        await this.loadProjectData();
    },

    /** Cargar datos de la API */
    async loadProjectData() {
        try {
            // Se usa el cliente API global para gestionar 401 y CSRF automáticamente
            const response = await API.get('/projects/' + this.projectId);
            
            if (!response.success || !response.data) {
                throw new Error(response.message || 'Error desconocido al cargar el proyecto.');
            }

            // Securizar los datos pasando por el DTO
            this.project = new ProjectDTO(response.data);
            
            // Pintar en pantalla
            this.renderHeader();

        } catch (error) {
            console.error('[ProjectDetail] Error cargando datos:', error);
            
            // Mostrar error visual rápido
            const skel = document.getElementById('project-header-skeleton');
            if(skel) skel.innerHTML = `<div class="text-red-500 font-bold p-4">Error cargando información: ${error.message}</div>`;
        }
    },

    /** Rellenar la cabecera real y quitar skeleton */
    renderHeader() {
        const skel = document.getElementById('project-header-skeleton');
        const content = document.getElementById('project-header-content');
        
        const titleEl = document.getElementById('prj-title');
        const refEl = document.getElementById('prj-ref');
        const badgeEl = document.getElementById('prj-badge');
        
        const btnAdmin = document.getElementById('btn-admin-action');
        const btnClient = document.getElementById('btn-client-action');

        // Textos
        titleEl.textContent = this.project.name;
        refEl.textContent = 'Ref: ' + this.project.reference;
        badgeEl.innerHTML = SIApp.statusBadge(this.project.status);

        // Lógica de botones por rol
        if (this.user.role === 'cliente') {
            if (this.project.isPropuesta) {
                btnClient.classList.remove('hidden');
            } else {
                btnClient.classList.add('hidden');
            }
            btnAdmin.classList.add('hidden');
        } else {
            // Admin o comercial
            btnClient.classList.add('hidden');
            btnAdmin.classList.remove('hidden');
        }

        // Transición de skeleton a contenido
        if (skel && content) {
            skel.classList.add('hidden');
            content.classList.remove('hidden');
            content.classList.add('fade-in');
        }
    }
};

// Exportar globalmente
window.ProjectDetailView = ProjectDetailView;
window.ProjectDTO = ProjectDTO;
