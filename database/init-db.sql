-- =============================================================================
-- GITFLOW / GITPULSE - DATABASE INITIALIZATION & SCHEMA DDL
-- Target DB: Neon PostgreSQL (serverless postgres)
-- =============================================================================

-- Clean up existing tables if resetting schema
DROP TABLE IF EXISTS commits CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores authenticated team members via GitHub OAuth
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    github_id VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    name VARCHAR(150),
    avatar_url TEXT,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_username ON users(username);

-- -----------------------------------------------------------------------------
-- 2. PROJECTS TABLE
-- Stores workspaces, GitHub repositories, and shared live Markdown context
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    github_repo VARCHAR(255) NOT NULL,
    context_markdown TEXT DEFAULT '# Project Context\n\nBienvenido a GitFlow. Documenta aquí las decisiones de arquitectura, especificaciones y notas del equipo en tiempo real.',
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_github_repo ON projects(github_repo);

-- -----------------------------------------------------------------------------
-- 3. TASKS TABLE
-- Agile Kanban tasks linked to projects and assigned to developers
-- -----------------------------------------------------------------------------
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE')),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- -----------------------------------------------------------------------------
-- 4. COMMITS TABLE
-- Telemetry of Git commits automatically associated with tasks and authors
-- -----------------------------------------------------------------------------
CREATE TABLE commits (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    hash VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commits_task_id ON commits(task_id);
CREATE INDEX idx_commits_project_id ON commits(project_id);
CREATE INDEX idx_commits_user_id ON commits(user_id);
CREATE INDEX idx_commits_hash ON commits(hash);

-- -----------------------------------------------------------------------------
-- SEED DATA - INITIAL DEMO RECORD
-- -----------------------------------------------------------------------------

-- Insert Sample Users
INSERT INTO users (github_id, username, name, avatar_url, email) VALUES
('10101', 'edwin-esquivel', 'Edwin Esquivel', 'https://avatars.githubusercontent.com/u/10101?v=4', 'edwin@example.com'),
('20202', 'maria-dev', 'Maria Gomez', 'https://avatars.githubusercontent.com/u/20202?v=4', 'maria.gomez@example.com'),
('30303', 'alex-coder', 'Alex Rivera', 'https://avatars.githubusercontent.com/u/30303?v=4', 'alex.rivera@example.com');

-- Insert Sample Project
INSERT INTO projects (id, name, description, github_repo, context_markdown, owner_id) VALUES
(1, 'GitFlow Ecosystem', 'Plataforma de gestión ágil y telemetría de código en tiempo real conectada a GitHub.', 'edwin-esquivel-ADSO/GitFlow', 
'# GitFlow: Especificaciones del Ecosistema

## 🎯 Objetivo
Unificar el flujo de trabajo ágil con la telemetría de commits en tiempo real directamente desde GitHub.

## 🛠️ Pila Tecnológica
- **Frontend**: React 18, Vite, Tailwind CSS, Socket.io-client.
- **Backend**: Node.js, Express, Socket.io, `pg` (PostgreSQL client).
- **Base de Datos**: Neon Serverless PostgreSQL.
- **Telemetría**: Webhooks sincronizados con RegEx `#ID` para auto-vincular commits a tareas.

## 📌 Reglas de Integración
1. Todo commit debe referenciar una tarea mediante su tag: `feat: login integrado #1`.
2. Al escribir `fixes #ID` o `closes #ID`, la tarea pasa automáticamente al estado **DONE**.
3. El editor colaborativo sincroniza en vivo los cambios usando WebSockets.', 
1);

-- Restart sequence for projects to prevent id collision
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));

-- Insert Sample Tasks for Project 1
INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_to_user_id) VALUES
(1, 1, 'Configurar autenticación OAuth con GitHub', 'Implementar endpoints de redirección y callback con intercambio de tokens.', 'DONE', 'HIGH', 1),
(2, 1, 'Construir endpoint receptor de Webhooks de GitHub', 'Procesar payloads de push, extraer autores y vincular commits a tareas.', 'DONE', 'URGENT', 2),
(3, 1, 'Editor colaborativo de Markdown en tiempo real', 'Sincronizar cursor y contenido entre miembros del equipo con Socket.io.', 'IN_PROGRESS', 'HIGH', 1),
(4, 1, 'Dashboard de telemetría y métricas de impacto', 'Calcular velocidad del equipo, cruce de commits y tareas completadas.', 'IN_PROGRESS', 'MEDIUM', 3),
(5, 1, 'Implementar filtros y búsqueda en el Kanban', 'Permitir filtrar tareas por desarrollador asignado, estado y prioridad.', 'TODO', 'LOW', 2),
(6, 1, 'Despliegue y configuración de producción en Vercel', 'Ajustar vercel.json para ruteo monorepo y variables de entorno.', 'TODO', 'URGENT', 1);

-- Restart sequence for tasks
SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks));

-- Insert Sample Commits Linked to Tasks
INSERT INTO commits (project_id, task_id, user_id, hash, message, author_name, url, timestamp) VALUES
(1, 1, 1, '7a9f1b2', 'feat: configurar login OAuth con github y jwt tokens #1', 'edwin-esquivel', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/7a9f1b2', NOW() - INTERVAL '3 hours'),
(1, 1, 1, '8c3d4e5', 'fix: refrescar session y manejar errores en callback #1', 'edwin-esquivel', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/8c3d4e5', NOW() - INTERVAL '2 hours'),
(1, 2, 2, '9e5f6a1', 'feat: parser de payloads de webhook y regex extractor de tareas #2', 'maria-dev', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/9e5f6a1', NOW() - INTERVAL '90 minutes'),
(1, 2, 2, '1b2c3d4', 'feat: emision socket.io de new_commit tras push exitoso #2', 'maria-dev', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/1b2c3d4', NOW() - INTERVAL '60 minutes'),
(1, 3, 1, '2c3d4e5', 'feat: estructurar layout de LiveContextEditor con debounce #3', 'edwin-esquivel', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/2c3d4e5', NOW() - INTERVAL '30 minutes'),
(1, 4, 3, '3d4e5f6', 'feat: calcular metricas de productividad y graficos de aportes #4', 'alex-coder', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/3d4e5f6', NOW() - INTERVAL '15 minutes');

-- Sequence update for commits
SELECT setval('commits_id_seq', (SELECT MAX(id) FROM commits));
