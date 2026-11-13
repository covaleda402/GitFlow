# 🏛️ GitFlow Architecture & Engineering Specification

## 1. Visión General del Sistema

**GitFlow** (RepoSync / GitPulse) es una plataforma de ingeniería full-stack diseñada para cerrar la brecha entre la gestión ágil de proyectos y la telemetría del código fuente en tiempo real. 

A diferencia de los gestores tradicionales desconectados del desarrollo, GitFlow reacciona instantáneamente a cada commit empujado a GitHub, analiza la intención técnica mediante expresiones regulares (ej. `#12`, `fixes #12`), actualiza el ciclo de vida de las tareas en un tablero Kanban reactivo y propaga los cambios a través de WebSockets sin requerir recargas de página.

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React + Vite + Tailwind)"]
        UI["UI View (Kanban / Context / Telemetry)"]
        SocketClient["Socket.io Client"]
        AuthCtx["Auth Context (JWT + GitHub)"]
    end

    subgraph Platform["Cloud Edge & Server (Node.js + Express)"]
        VercelRouting["Vercel Routing Proxy"]
        ExpressApp["Express API Router"]
        SocketServer["Socket.io WebSocket Engine"]
        WebhookHandler["GitHub Webhook Ingestion Engine"]
        OAuthHandler["GitHub OAuth Service"]
        JWTMiddleware["JWT Auth Middleware"]
    end

    subgraph GitHubService["GitHub Ecosystem"]
        GitHubOAuth["GitHub OAuth Provider"]
        GitHubRepo["Git Repository (Push Events)"]
    end

    subgraph Database["Neon Serverless PostgreSQL"]
        UsersTable[("users")]
        ProjectsTable[("projects")]
        TasksTable[("tasks")]
        CommitsTable[("commits")]
    end

    UI -->|REST Requests + JWT| ExpressApp
    UI <-->|Bi-directional Events| SocketServer
    ExpressApp --> JWTMiddleware
    JWTMiddleware --> ExpressApp

    AuthCtx -->|1. OAuth Redirect| GitHubOAuth
    GitHubOAuth -->|2. Code Callback| OAuthHandler
    OAuthHandler -->|3. Upsert User & Sign JWT| UsersTable

    GitHubRepo -->|4. Push Event Webhook| WebhookHandler
    WebhookHandler -->|5. Match Task #ID & Save Commit| CommitsTable
    WebhookHandler -->|6. Auto-Update Task Status| TasksTable
    WebhookHandler -->|7. Broadcast new_commit| SocketServer
    SocketServer -->|8. Push to Room Subscribers| SocketClient
    SocketClient --> UI

    ExpressApp -->|Prepared Statements| Database
```

---

## 2. Modelo de Datos y Esquema Relacional (ERD)

La base de datos está implementada sobre **Neon PostgreSQL**. Todas las operaciones de lectura y escritura utilizan consultas parametrizadas (**Prepared Statements**) mediante `$1, $2, ...` para garantizar una protección absoluta contra inyecciones SQL (SQL Injection).

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    USERS ||--o{ TASKS : assigned_to
    USERS ||--o{ COMMITS : authors
    PROJECTS ||--o{ TASKS : contains
    PROJECTS ||--o{ COMMITS : tracks
    TASKS ||--o{ COMMITS : linked_to

    USERS {
        int id PK
        string github_id UK
        string username
        string name
        string avatar_url
        string email
        timestamp created_at
        timestamp updated_at
    }

    PROJECTS {
        int id PK
        string name
        string description
        string github_repo
        text context_markdown
        int owner_id FK
        timestamp created_at
        timestamp updated_at
    }

    TASKS {
        int id PK
        int project_id FK
        string title
        text description
        string status
        string priority
        int assigned_to_user_id FK
        timestamp created_at
        timestamp updated_at
    }

    COMMITS {
        int id PK
        int project_id FK
        int task_id FK
        int user_id FK
        string hash
        text message
        string author_name
        text url
        timestamp timestamp
    }
```

---

## 3. Flujo de Telemetría: GitHub Webhook ➔ Vinculación ➔ WebSocket Push

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Desarrollador
    participant GH as Repositorio GitHub
    participant WH as Webhook Endpoint (/api/webhook/github)
    participant DB as Neon DB (pg)
    participant WS as Socket.io Server
    participant Team as Clientes Navegador (Equipo)

    Dev->>GH: git push (ej. "feat: validacion de sesion #3")
    GH->>WH: POST /api/webhook/github (Payload JSON con commits)
    WH->>WH: Regex match: /#(\d+)/ ➔ extrae taskId = 3
    WH->>DB: SELECT * FROM tasks WHERE id = $1 AND project_id = $2
    
    alt Mensaje incluye "fixes #3" o "closes #3"
        WH->>DB: UPDATE tasks SET status = 'DONE' WHERE id = $1
    else Tarea estaba en 'TODO'
        WH->>DB: UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = $1
    end

    WH->>DB: INSERT INTO commits (project_id, task_id, hash, message, ...) VALUES ($1, $2, ...)
    WH->>WS: io.to('project_1').emit('new_commit', commitData)
    WH->>WS: io.to('project_1').emit('task_status_changed', updatedTask)
    WS-->>Team: Renderiza commit en ActivityFeed y mueve card en Kanban
    WH-->>GH: HTTP 200 OK { success: true }
```

---

## 4. Edición Colaborativa de Contexto (Live Markdown Notion-style)

```mermaid
sequenceDiagram
    autonumber
    actor UserA as Desarrollador A
    participant UI as LiveContextEditor
    participant WS as Socket.io Engine
    actor UserB as Desarrollador B
    participant DB as Neon DB (pg)

    UserA->>UI: Escribe en el editor Markdown
    UI->>WS: emit('typing_context', { username, section })
    WS-->>UserB: "Edwin Esquivel está editando el contexto..."
    UI->>WS: emit('context_draft_change', { markdown })
    WS-->>UserB: Sincroniza vista previa instantánea
    UserA->>UI: Clic en "Guardar Cambios" (o autosave)
    UI->>DB: PUT /api/projects/:id/context (Prepared Statement UPDATE)
    DB-->>UI: 200 OK (updated_at)
    UI->>WS: emit('context_updated')
    WS-->>UserB: Confirma estado 'Sincronizado' en todos los clientes
```

---

## 5. Estrategia de Despliegue en Vercel (Monorepo)

- **Frontend Estático**: Compilado con Vite (`npm run build`), optimizado con Tailwind CSS, servido vía el CDN global de Vercel.
- **Backend Serverless / Node.js**: Las rutas bajo `/api/(.*)` son dirigidas a `backend/api/index.js`, que envuelve la aplicación Express.
- **Seguridad**:
  - Encabezados CORS restrictivos pero flexibles para previsualizaciones de Vercel.
  - Validación JWT en endpoints privados.
  - Parámetros SQL sanitizados al 100% mediante `pg.Pool.query(sql, [params])`.
