# 📘 Manual Técnico Detallado - GitFlow v2.0

Este documento contiene las especificaciones técnicas profundas, protocolos de integración y configuración avanzada para desarrolladores y administradores del sistema.

---

## 1. Sistema de Salas (Rooms) & Códigos Dinámicos de 5 Minutos

### 1.1 Algoritmo de Generación y Rotación
Para evitar filtraciones de acceso no autorizado y enlaces compartidos indefinidamente, GitFlow implementa un algoritmo de rotación temporal basado en HMAC/SHA-256 (inspirado en TOTP RFC 6238):

- **Ventana de tiempo**: Cada 5 minutos exactos (`Math.floor(Date.now() / 300000)`).
- **Semilla criptográfica**: Se calcula el hash usando `sha256(projectId + room_seed + windowTime)`.
- **Formato**: 6 caracteres alfanuméricos en mayúsculas (ej. `7A9F1B`).
- **Margen de Gracia (Grace Period)**: Al validar el código de unión (`POST /api/projects/join`), el backend valida tanto el código de la ventana activa como el de la ventana anterior inmediata (`prevCode`). Esto otorga un margen de tolerancia para miembros que ingresaron el código segundos antes de la expiración.

### 1.2 Endpoints de Salas
- `GET /api/projects/:id/security-code`: Retorna el código activo, los segundos restantes y si el solicitante es el creador.
- `POST /api/projects/join`: Recibe `{ code }`, valida la vigencia en todas las salas y asocia al usuario como `MEMBER`.
- `POST /api/projects`: Crea una nueva sala y asigna al usuario autenticado el rol `OWNER`.

---

## 2. Privacidad de Tareas, Instrucciones Técnicas y Roles en el Tablero Kanban

### 2.1 Modelo de Visibilidad Personal vs. Global
- **Creador de la Sala (`owner_id`)**:
  - Consulta `GET /api/projects/:id/tasks` y recibe **todas las tareas activas** de todos los miembros del equipo.
  - Cuenta con selector para alternar entre **Todo el Equipo** y **Mis Tareas**, además de filtrar tareas por desarrollador específico.
- **Miembros del Equipo (`role = 'MEMBER'`)**:
  - Consulta `GET /api/projects/:id/tasks` y el backend filtra automáticamente mediante Prepared Statement:
    ```sql
    WHERE t.project_id = $1 AND t.is_archived = false 
      AND (t.assigned_to_user_id = $2 OR t.created_by_user_id = $2)
    ```
  - Cada miembro solo visualiza y gestiona sus propias asignaciones en su tablero personal.

### 2.2 Instrucciones Técnicas Paso a Paso (`instructions`)
- Cada tarea soporta documentación detallada de implementación paso a paso.
- Endpoint: `PATCH /api/tasks/:id/instructions`
  - Payload: `{ instructions: string }`
  - Emite evento WebSockets `task_status_changed` a la sala para sincronización reactiva inmediata.

### 2.3 Ciclo de Vida, QA y Transición al Historial
1. `TODO` (Por hacer)
2. `IN_PROGRESS` (En progreso - auto-activado si un commit referencia la tarea con `#ID`)
3. `REVIEW` (En revisión / PR - canalizado hacia la Revisión Previa de QA)
4. `DONE` (Terminada): Al alcanzar este estado, la tarea se marca con `is_archived = true`, se guarda `completed_at = CURRENT_TIMESTAMP`, se almacena `completion_notes` y se traslada al endpoint `/api/projects/:id/history`.

---

## 3. Control de Calidad (QA) & Revisión Previa (Pre-Review Gate)

### 3.1 Arquitectura del Módulo de QA
Ubicado en el componente `PreReviewSection.jsx`, actúa como la compuerta de validación obligatoria antes de autorizar el cierre definitivo de tareas:

- **Filtro de Entrada**: Tareas activas en estado `REVIEW`.
- **Matriz de Verificación (Checklist Interactivo)**:
  1. *Compilación limpia*: Cero errores en tests o build.
  2. *Instrucciones cumplidas*: Verificación estricta del paso a paso documentado.
  3. *Código limpio*: Sin credenciales expuestas ni fugas de memoria.
  4. *Responsive móvil*: Estilos verificados en diferentes viewports.
- **Dictamen de QA**:
  - **Aprobar y Finalizar (DONE)**: Invoca `PATCH /api/tasks/:id/status` con `{ status: 'DONE', completion_notes: '...' }`.
  - **Solicitar Ajustes (Rechazar)**: Devuelve la tarea a `IN_PROGRESS` con `{ status: 'IN_PROGRESS', completion_notes: 'Ajustes solicitados: ...' }`.

---

## 4. Control de Commits y Motor de Respaldo Continuo (Rollback Engine)

### 4.1 Rastreabilidad y Auditoría de Salud
- Endpoint: `GET /api/projects/:id/commit-health`
  - Examina el histórico de commits vinculados a la sala.
  - Identifica automáticamente commits con mensajes de error o fallos reportados (`broken`, `error`).
  - Detecta y retorna el objeto del **Último Respaldo Estable Verificado** (`lastStableCommit`).

### 4.2 Restauración con 1 Clic (Rollback Endpoint)
- Endpoint: `POST /api/projects/:id/rollback`
  - Restaura las tareas afectadas o cerradas erróneamente en los últimos 30 minutos a estado funcional `IN_PROGRESS`.
  - Emite el evento WebSocket `project_rolled_back` a toda la sala, forzando la recarga sincronizada de los tableros de todos los clientes.

---

## 5. Repositorio de Documentos & Editor Colaborativo en Vivo

El modelo `project_documents` y el componente `LiveContextEditor.jsx` soportan documentación técnica compartida:

### 5.1 Editor en Vivo con Soporte de Alto Contraste (Modo Claro & Oscuro)
- Sincronización continua de borradores mediante evento `context_draft_change` y avisos de escritura `typing_context`.
- Parser y renderizador de Markdown con soporte completo para:
  - Encabezados `#`, `##`, `###` estilizados.
  - Formato inline: negritas `**texto**`, cursivas `*texto*`, código `` `código` ``, tachado `~~texto~~`.
  - Citas en bloque `> bloque` y separadores horizontales `---`.
  - Listas ordenadas y desordenadas de alta legibilidad en modo claro.
- Persistencia a base de datos mediante `PUT /api/projects/:id/context`.

| Tipo | Formato | Visualización |
|---|---|---|
| `md` | Markdown | Lector interactivo y editor colaborativo con vista previa |
| `pdf` | PDF | Enlace directo y visor de documentos externos |
| `docx` | Word | Enlace descargable para especificaciones de negocio |
| `img` | Imagen (.png, .jpg) | Miniatura visual y lightbox de mockups |

Categorías estándar soportadas:
- `Arquitectura`
- `Diseño & UX`
- `Reuniones & Notas`
- `Documentación General`

---

## 4. Perfil de Usuario, Avatares y Telemetría Personal

Endpoint: `/api/users/profile/me`
- Permite actualizar nombre, biografía y avatar personalizado (`custom_avatar`).
- Opciones de avatar:
  1. Avatar original de GitHub sincronizado vía OAuth.
  2. Presets estilizados (Tech Lead, Cyberpunk, Backend Architect, Security Hacker).
  3. URL de imagen externa o foto propia.
- Retorna el historial personal acumulado de tareas cerradas y commits registrados para calcular el **Score de Impacto**:
  $$\text{Score} = (\text{Commits} \times 10) + (\text{Tareas Cerradas} \times 25)$$

---

## 5. WebSockets y Eventos Reactivos (Socket.io)

| Evento | Dirección | Propósito |
|---|---|---|
| `join_project` | Cliente ➔ Servidor | Suscribe al socket a la sala `project_{id}` |
| `member_joined` | Servidor ➔ Sala | Notifica que un nuevo integrante ingresó mediante código |
| `new_commit` | Servidor ➔ Sala | Telemetría en tiempo real de nuevo push desde GitHub |
| `task_status_changed` | Servidor ➔ Sala | Mueve la tarjeta Kanban en todos los navegadores conectados |
| `task_created` | Servidor ➔ Sala | Añade la tarjeta al tablero de los interesados |
| `typing_context` | Bidireccional | Notifica que un usuario está redactando en el editor Markdown |
| `context_draft_change` | Bidireccional | Sincroniza borradores de texto en vivo |
| `document_added` | Servidor ➔ Sala | Actualiza el repositorio de carpetas de documentos |
