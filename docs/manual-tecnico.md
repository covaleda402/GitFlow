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

## 2. Privacidad de Tareas y Roles en el Tablero Kanban

### 2.1 Modelo de Visibilidad Personal vs. Global
- **Creador de la Sala (`owner_id`)**:
  - Consulta `GET /api/projects/:id/tasks` y recibe **todas las tareas activas** de todos los miembros del equipo.
  - Cuenta con selector para filtrar tareas por cualquier desarrollador.
- **Miembros del Equipo (`role = 'MEMBER'`)**:
  - Consulta `GET /api/projects/:id/tasks` y el backend filtra automáticamente mediante Prepared Statement:
    ```sql
    WHERE t.project_id = $1 AND t.is_archived = false 
      AND (t.assigned_to_user_id = $2 OR t.created_by_user_id = $2)
    ```
  - Cada miembro solo visualiza y gestiona sus propias asignaciones.

### 2.2 Ciclo de Vida y Transición al Historial
1. `TODO` (Por hacer)
2. `IN_PROGRESS` (En progreso - auto-activado si un commit referencia la tarea)
3. `REVIEW` (En revisión / PR)
4. `DONE` (Terminada): Al alcanzar este estado, la tarea se marca con `is_archived = true`, se guarda `completed_at = CURRENT_TIMESTAMP` y se traslada al endpoint `/api/projects/:id/history`.

---

## 3. Repositorio de Documentos & Contexto por Carpetas

El modelo `project_documents` soporta organización tipo directorio con metadatos y enlaces:

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
