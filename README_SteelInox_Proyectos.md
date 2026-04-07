# Steel Inox — Guía de Proyectos, Documentación y Flujo de Estados

> Documento de referencia extraído del DDS técnico v1.0  
> Plataforma extranet privada de gestión de proyectos de interiorismo

---

## Tabla de contenidos

1. [¿Qué es la plataforma?](#1-qué-es-la-plataforma)
2. [Roles y quién puede hacer qué](#2-roles-y-quién-puede-hacer-qué)
3. [Proyectos — Estructura y reglas](#3-proyectos--estructura-y-reglas)
4. [Estados del proyecto — Flujo completo](#4-estados-del-proyecto--flujo-completo)
5. [Documentación — Cómo funciona](#5-documentación--cómo-funciona)
6. [Versionado de documentos](#6-versionado-de-documentos)
7. [Propuestas y presupuestos](#7-propuestas-y-presupuestos)
8. [Aprobaciones](#8-aprobaciones)
9. [Comentarios](#9-comentarios)
10. [Notificaciones automáticas](#10-notificaciones-automáticas)
11. [Auditoría y trazabilidad](#11-auditoría-y-trazabilidad)
12. [Resumen visual de permisos por rol](#12-resumen-visual-de-permisos-por-rol)
13. [Preguntas frecuentes](#13-preguntas-frecuentes)

---

## 1. ¿Qué es la plataforma?

Steel Inox es una **extranet privada** (no es un portal público ni un CRM genérico). Su función principal es que clientes y el equipo interno (administradores y comerciales) puedan gestionar proyectos de interiorismo de forma ordenada, segura y con trazabilidad completa.

**Cuatro pilares del sistema:**

- **Acceso controlado** → Solo entran usuarios autenticados con permisos específicos.
- **Exposición ordenada de proyectos** → Cada usuario ve únicamente lo que le corresponde.
- **Gestión documental versionada** → Los documentos tienen historial de versiones y nunca se borran.
- **Comunicación operativa** → Comentarios y aprobaciones directamente dentro del proyecto.

---

## 2. Roles y quién puede hacer qué

Existen tres tipos de usuarios en el sistema:

| Rol | Quién es | Qué ve |
|---|---|---|
| **Administrador** | Equipo interno con acceso total | Todo el sistema, todos los proyectos |
| **Comercial** | Gestor de cuenta interno | Solo los proyectos asignados a él |
| **Cliente** | Usuario de la empresa cliente | Solo los proyectos de su empresa |

### Permisos detallados por entidad

| Acción | Administrador | Comercial | Cliente |
|---|---|---|---|
| Crear/editar clientes | ✅ | ✅ (solo los suyos) | ❌ |
| Crear/editar usuarios cliente | ✅ | ✅ (solo los suyos) | ❌ |
| Crear/editar proyectos | ✅ | ✅ (solo los suyos) | ❌ |
| Ver proyectos | ✅ Todos | ✅ Solo asignados | ✅ Solo de su empresa |
| Cambiar estado del proyecto | ✅ | ✅ | ❌ |
| Aprobar propuesta | ✅ | ❌ | ✅ |
| Subir documentos | ✅ | ✅ | ❌ |
| Ver/descargar documentos | ✅ | ✅ | ✅ (si tiene permiso) |
| Comentar | ✅ | ✅ | ✅ (si el proyecto no está cerrado) |
| Ver logs de auditoría | ✅ Completo | ✅ Limitado | ❌ |
| Reabrir proyecto cerrado | ✅ | ✅ | ❌ |

> **Regla de oro del sistema:** Si no estás explícitamente autorizado, el sistema te deniega el acceso. El principio es *deny by default*.

---

## 3. Proyectos — Estructura y reglas

### ¿Qué es un proyecto?

Un proyecto representa un trabajo de interiorismo para una empresa cliente. Cada proyecto tiene:

- **Cliente** → La empresa a la que pertenece el proyecto.
- **Nombre y referencia** → Identificadores del proyecto.
- **Estado** → En qué fase se encuentra (ver sección 4).
- **Presupuesto** → Puede existir como campo numérico y/o como documento adjunto.
- **Comerciales asignados** → Pueden ser varios; todos tienen el mismo nivel de acceso.
- **Documentos** → Propuestas, presupuestos, planos, renders, etc.
- **Comentarios** → Conversación interna ligada a documentos del proyecto.
- **Histórico de cambios** → Toda la actividad queda registrada.

### Reglas de negocio clave

- Un cliente puede tener **múltiples proyectos**.
- Un proyecto puede estar asignado a **múltiples comerciales** (no hay comercial principal, todos son equivalentes).
- Un proyecto **solo pertenece a un cliente**.
- Los clientes de una empresa **no pueden ver proyectos de otras empresas**.
- Un comercial **no puede ver proyectos de otros comerciales**.
- **No existe borrado físico**: los proyectos se desactivan lógicamente pero el historial se conserva siempre.

---

## 4. Estados del proyecto — Flujo completo

### Los cuatro estados

```
  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
  │  PROPUESTA  │ ───► │  APROBADO   │ ───► │  EJECUCIÓN  │ ───► │   CERRADO   │
  └─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
                                                                        │
                                                         (reapertura)   │
                                                    ◄───────────────────┘
```

### Descripción de cada estado

#### 🔵 PROPUESTA
- El proyecto está en fase de revisión y presentación de material al cliente.
- El cliente **puede comentar y aprobar** la propuesta.
- El equipo interno puede subir y gestionar documentos.
- **Quién puede establecer este estado:** Administrador o Comercial.

#### 🟢 APROBADO
- La propuesta ha sido validada dentro de la plataforma.
- Se generan notificaciones automáticas para administración y comerciales.
- **Quién puede establecer este estado:** El proceso lo desencadena la aprobación del cliente o del administrador; el cambio final lo realiza el Administrador.
- El cliente **mantiene capacidad de comentar**.

#### 🟡 EJECUCIÓN
- El proyecto está en fase operativa o productiva (se está fabricando/instalando).
- El cliente **puede seguir comentando**.
- **Quién puede establecer este estado:** Administrador o Comercial.

#### 🔴 CERRADO
- El proyecto está finalizado y bloqueado.
- **Nadie puede editar ni comentar** mientras permanezca cerrado.
- El proyecto **sigue siendo visible** para todos los que tenían acceso.
- **Puede reabrirse** por Administrador o Comercial, registrando el motivo de reapertura.
- **Quién puede establecer este estado:** Administrador o Comercial.

### Reglas de transición de estado

- El **flujo natural** es: `Propuesta → Aprobado → Ejecución → Cerrado`.
- **No hay orden obligatorio estricto** para los estados operativos; un administrador o comercial puede cambiar el estado cuando corresponda.
- La **reapertura** de un proyecto cerrado requiere registrar el motivo. Queda registrada en el log de auditoría.
- **Mientras un proyecto está cerrado**, está completamente bloqueado: sin edición estructural ni nuevos comentarios.

### ¿Quién puede cambiar el estado?

| Transición | Administrador | Comercial | Cliente |
|---|---|---|---|
| Cualquier cambio de estado operativo | ✅ | ✅ | ❌ |
| Aprobar propuesta (desencadena Aprobado) | ✅ | ❌ | ✅ |
| Reabrir proyecto cerrado | ✅ | ✅ | ❌ |

---

## 5. Documentación — Cómo funciona

### Tipos de documentos soportados

| Tipo | Cómo se sirve al cliente | ¿Lo ve el cliente? | Notas |
|---|---|---|---|
| **Propuesta** | Visor embebido (PDF) | ✅ Sí | Versionable y aprobable |
| **Presupuesto** | Visor embebido (PDF) | ✅ Sí | Además existe como campo numérico en el proyecto |
| **Imagen / Render** | Visor de imagen protegido | ✅ Sí | Nunca se expone la URL directa |
| **Vídeo** | Streaming autenticado o visor protegido | ✅ Sí | Acceso controlado |
| **Plano técnico** | Descarga autenticada | Opcional | Puede configurarse como solo descarga |
| **Documento técnico** | Descarga autenticada | Opcional | DWG, ZIP, DOCX, etc. |
| **Materiales / Acabados** | PDF o imagen | ✅ Sí | Según formato del archivo |

### Cómo se protegen los documentos

Los documentos **nunca se sirven directamente desde una URL pública**. El sistema funciona así:

1. Los archivos se guardan **fuera del directorio público del servidor**.
2. En la base de datos solo se guardan **metadatos y rutas internas** (nunca la ruta real).
3. Cuando alguien quiere ver o descargar un documento, el sistema **verifica en tiempo real**:
   - ¿Está el usuario autenticado?
   - ¿Tiene el rol correcto?
   - ¿Pertenece al proyecto de ese documento?
   - ¿Tiene permiso concreto de visualización o descarga?
4. Si todo es correcto, el sistema sirve el archivo. Si no, acceso denegado.
5. **Cada visualización o descarga queda registrada** en el log de auditoría.

### Acceso a documentos: vista vs descarga

Cada documento tiene configurado un `access_mode`:

- **`view`** → Solo se puede visualizar en el navegador (visor embebido). No se puede descargar.
- **`download`** → Solo se puede descargar el archivo.
- **`both`** → Se puede tanto visualizar como descargar.

Esta configuración la establece el equipo interno (administrador o comercial) por documento.

---

## 6. Versionado de documentos

### Concepto fundamental

Cada **documento lógico** (por ejemplo, "Propuesta de diseño sala principal") puede tener **múltiples versiones físicas** a lo largo del tiempo.

```
  DOCUMENTO LÓGICO: "Propuesta diseño sala principal"
  │
  ├── Versión 1 (archivada)  →  propuesta_v1.pdf  [subida 01/03/2025]
  ├── Versión 2 (archivada)  →  propuesta_v2.pdf  [subida 15/03/2025]
  └── Versión 3 (VIGENTE) ✅ →  propuesta_v3.pdf  [subida 02/04/2025]
```

### Reglas del versionado

- **Solo una versión puede estar marcada como vigente** (`is_current = 1`) en cada momento.
- Cuando se sube una nueva versión, la anterior pasa automáticamente a estado **archivado**.
- Las versiones antiguas **nunca se borran**. Quedan en el historial.
- El historial de versiones es visible para roles autorizados (administrador, comercial y cliente según permisos).
- Cada versión registra: número de versión, nombre del archivo, ruta de almacenamiento, tipo MIME, tamaño, checksum SHA-256 (para verificar integridad), quién la subió y cuándo.

### ¿Por qué el checksum SHA-256?

El sistema calcula y guarda una huella digital (`checksum_sha256`) de cada archivo en el momento de la subida. Esto garantiza que:
- El archivo no ha sido alterado desde que se subió.
- Existe evidencia técnica de la versión exacta que vio/aprobó el cliente.

### Sustitución de versiones

Cuando el equipo sube una nueva versión de un documento:

1. La nueva versión se sube y queda marcada como **vigente**.
2. La versión anterior queda marcada como **archivada** (no se borra físicamente).
3. Se registra el evento en el log de auditoría.
4. Se envían notificaciones automáticas a los interesados.

---

## 7. Propuestas y presupuestos

Las propuestas y presupuestos son **tipos documentales especiales** con capacidades adicionales:

- Son **versionables** como cualquier otro documento.
- Pueden ser **aprobadas** por el cliente directamente desde la plataforma.
- El presupuesto existe en **dos formas complementarias**:
  - Como **campo numérico** en la ficha del proyecto (`budget_amount`).
  - Como **documento PDF** adjunto y versionable.

---

## 8. Aprobaciones

### ¿Cómo aprueba el cliente una propuesta?

1. El cliente entra al proyecto y visualiza el documento de propuesta vigente.
2. Hace clic en el **botón de aprobar**.
3. El sistema solicita una **doble confirmación** (para evitar aprobaciones accidentales).
4. Tras confirmar, el sistema:
   - Registra la aprobación con timestamp y usuario aprobador.
   - Genera un **evento en el log de auditoría**.
   - Envía **notificaciones por email** a administradores y comerciales asignados.
   - El estado del proyecto puede avanzar a **Aprobado**.

### ¿Quién puede aprobar?

- El **cliente** puede aprobar la propuesta desde su panel.
- El **administrador** también puede aprobar (por ejemplo, si actúa en representación del cliente).
- El **comercial no puede aprobar** (solo gestiona la operativa).

---

## 9. Comentarios

### Cómo funcionan los comentarios

Los comentarios no son generales del proyecto; están **ligados a un documento o versión concreta** dentro del proyecto.

- Se muestran en orden cronológico con autor, fecha y texto.
- Son visibles para **todos los participantes autorizados** del proyecto.
- Se añaden de forma asíncrona (sin recargar la página completa).
- **No existen comentarios internos ocultos** en el MVP; todos los comentarios son visibles para todos los que tienen acceso al proyecto.

### Quién puede comentar y cuándo

| Rol | ¿Puede comentar? | Restricción |
|---|---|---|
| Administrador | ✅ | Solo si el proyecto no está cerrado |
| Comercial | ✅ | Solo si el proyecto no está cerrado |
| Cliente | ✅ | Solo si el proyecto no está cerrado |

> Si el proyecto está en estado **Cerrado**, **nadie** puede añadir comentarios.

### El cliente puede comentar en los estados:

- ✅ **Propuesta** → Puede comentar y además puede aprobar.
- ✅ **Aprobado** → Puede comentar.
- ✅ **Ejecución** → Puede comentar.
- ❌ **Cerrado** → No puede comentar.

### ¿Qué pasa cuando se comenta?

Cada comentario nuevo dispara automáticamente:
- Un **email de notificación** a los participantes del proyecto (excepto al propio autor del comentario).
- Un **registro en el log de auditoría**.

---

## 10. Notificaciones automáticas

El sistema envía emails automáticos ante los siguientes eventos:

| Evento | ¿Quién recibe el email? |
|---|---|
| Nueva propuesta o nueva versión de documento | Comerciales asignados + Administradores |
| Cambio de estado del proyecto | Comerciales asignados + Administradores + Cliente (si aplica) |
| Aprobación de propuesta | Comerciales asignados + Administradores |
| Nuevo comentario | Todos los participantes autorizados del proyecto (excepto el autor) |
| Alta de nuevo usuario cliente | El propio usuario creado (con credenciales de acceso) |

> Los emails de notificación incluyen enlace directo al proyecto cuando es posible.

---

## 11. Auditoría y trazabilidad

**Todo queda registrado.** La auditoría no es opcional; es un requisito estructural del sistema.

### ¿Qué acciones se registran?

| Categoría | Eventos registrados |
|---|---|
| **Autenticación** | Login, logout, login fallido, timeout de sesión |
| **Administración** | Alta/edición/desactivación de clientes y usuarios |
| **Proyectos** | Alta, edición, cambio de estado, reapertura |
| **Documentos** | Subida, nueva versión, **visualización**, **descarga** |
| **Comentarios** | Alta, edición, borrado lógico |
| **Aprobaciones** | Inicio de la acción y confirmación final |

### ¿Qué información guarda cada registro?

Cada entrada del log incluye:
- Usuario que realizó la acción (`actor_user_id` y su rol)
- Acción realizada (`action_key`)
- Entidad afectada (tipo y ID)
- Proyecto relacionado
- Metadatos adicionales (estado anterior/nuevo, nombre del archivo, ID de versión, etc.)
- IP del usuario y navegador (user agent)
- Fecha y hora exacta

### Reglas sobre los logs

- Los logs **no pueden editarse ni borrarse** desde la aplicación.
- El historial se conserva indefinidamente.
- Los administradores pueden consultar todos los logs.
- Los comerciales pueden consultar los logs de sus proyectos (de forma acotada).
- Los clientes **no tienen acceso** a los logs de auditoría.

---

## 12. Resumen visual de permisos por rol

### Panel del CLIENTE

```
┌─────────────────────────────────────────────────┐
│  MIS PROYECTOS                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  Proyecto A  [Estado: Propuesta]        │    │
│  │  Proyecto B  [Estado: Ejecución]        │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  DENTRO DE CADA PROYECTO:                       │
│  ✅ Ver resumen del proyecto                    │
│  ✅ Ver y visualizar documentos (si hay acceso) │
│  ✅ Descargar documentos (si hay acceso)        │
│  ✅ Ver comentarios                             │
│  ✅ Añadir comentarios (si no está cerrado)     │
│  ✅ Aprobar propuesta                           │
│  ❌ Editar datos del proyecto                   │
│  ❌ Subir documentos                            │
│  ❌ Cambiar estado                              │
└─────────────────────────────────────────────────┘
```

### Panel del COMERCIAL

```
┌─────────────────────────────────────────────────┐
│  MIS PROYECTOS (solo los asignados a mí)        │
│  Filtros: cliente / proyecto / estado / ref     │
│                                                 │
│  GESTIÓN:                                       │
│  ✅ CRUD clientes (solo los suyos)              │
│  ✅ CRUD usuarios cliente (solo los suyos)      │
│  ✅ CRUD proyectos asignados                    │
│  ✅ Subir y versionar documentos                │
│  ✅ Cambiar estado del proyecto                 │
│  ✅ Comentar                                    │
│  ✅ Reabrir proyectos cerrados                  │
│  ✅ Consultar historial (acotado)               │
│  ❌ Ver proyectos de otros comerciales          │
│  ❌ Aprobar propuestas                          │
└─────────────────────────────────────────────────┘
```

### Panel del ADMINISTRADOR

```
┌─────────────────────────────────────────────────┐
│  VISTA GLOBAL DEL SISTEMA                       │
│                                                 │
│  ✅ CRUD de todo: clientes, comerciales,        │
│     usuarios cliente, proyectos, documentos     │
│  ✅ Cambiar cualquier estado                    │
│  ✅ Aprobar propuestas                          │
│  ✅ Consultar logs completos y auditoría        │
│  ✅ Ver actividad de todos los usuarios         │
│  ✅ Gobernar cualquier documento o flujo        │
│  ✅ Reabrir proyectos cerrados                  │
└─────────────────────────────────────────────────┘
```

---

## 13. Preguntas frecuentes

**¿Puede el cliente ver todos los documentos del proyecto?**
No necesariamente. Cada documento tiene una configuración `is_visible_to_client`. Solo los documentos marcados como visibles para el cliente aparecen en su panel. Además, el modo de acceso (`view`, `download`, `both`) determina qué puede hacer con ellos.

**¿Qué pasa si se sube una versión incorrecta de un documento?**
La versión incorrecta queda archivada en el historial pero se puede subir una nueva versión correcta que pase a ser la vigente. Nada se borra; todo queda registrado.

**¿Puede el cliente ver versiones antiguas de documentos?**
Sí, el historial de versiones es visible para roles autorizados, incluido el cliente en función de sus permisos de acceso al documento.

**¿Qué ocurre si un proyecto se cierra con documentos pendientes?**
El cierre bloquea toda edición y comentario. Los documentos siguen visibles. Para cualquier acción, un administrador o comercial debe reabrir el proyecto registrando el motivo.

**¿Puede haber varios presupuestos vigentes al mismo tiempo?**
No. Solo puede haber **una versión vigente** por documento lógico en cada momento. Si se presenta un nuevo presupuesto, el anterior pasa a archivado.

**¿Los emails de notificación se pueden reenviar si fallan?**
Sí. El sistema registra el resultado de cada envío y permite reintentos en caso de fallo.

**¿Puede un comercial ver lo que hace otro comercial?**
No. El sistema segmenta estrictamente por asignación. Un comercial solo ve los proyectos en los que está asignado explícitamente.

**¿Puede el cliente editar o borrar sus comentarios?**
No hay gestión de edición/borrado de comentarios para el cliente en el MVP. Los comentarios son permanentes (con borrado lógico gestionado solo por administración).

---

*Documento generado a partir del DDS técnico v1.0 — Steel Inox Extranet de Proyectos de Interiorismo*
