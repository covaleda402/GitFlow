-- =============================================================================
-- GITFLOW / GITPULSE - DATABASE INITIALIZATION & SCHEMA DDL v2.0
-- Target DB: Neon PostgreSQL (serverless postgres)
-- =============================================================================

-- Clean up existing tables if resetting schema
DROP TABLE IF EXISTS project_documents CASCADE;
DROP TABLE IF EXISTS commits CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores authenticated team members via GitHub OAuth or demo mode
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    github_id VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    name VARCHAR(150),
    avatar_url TEXT,
    custom_avatar TEXT,
    email VARCHAR(255),
    bio TEXT DEFAULT 'Full-Stack Developer en GitFlow',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_username ON users(username);

-- -----------------------------------------------------------------------------
-- 2. PROJECTS TABLE (SALAS)
-- Workspaces with dynamic 5-minute security join codes and live context
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    github_repo VARCHAR(255) NOT NULL,
    context_markdown TEXT DEFAULT '# Contexto del Proyecto\n\nDocumenta aquí las decisiones técnicas, arquitectura y requerimientos.',
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    room_seed VARCHAR(50) DEFAULT 'GF-SECURE',
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_github_repo ON projects(github_repo);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- -----------------------------------------------------------------------------
-- 3. PROJECT MEMBERS TABLE
-- Tracks membership in each room (OWNER, ADMIN, MEMBER)
-- -----------------------------------------------------------------------------
CREATE TABLE project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- -----------------------------------------------------------------------------
-- 4. TASKS TABLE (KANBAN PERSONAL & GLOBAL)
-- Tasks with privacy: Regular members see personal tasks; Owner sees all.
-- -----------------------------------------------------------------------------
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    completion_notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE')),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_archived ON tasks(is_archived);

-- -----------------------------------------------------------------------------
-- 5. COMMITS TABLE (TELEMETRÍA EN VIVO)
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
-- 6. PROJECT DOCUMENTS TABLE (CARPETAS & ARCHIVOS)
-- Supports .md, .pdf, .docx, image and links organized by folder categories
-- -----------------------------------------------------------------------------
CREATE TABLE project_documents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    folder_name VARCHAR(100) NOT NULL DEFAULT 'General',
    title VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL DEFAULT 'md' CHECK (file_type IN ('md', 'pdf', 'docx', 'img', 'link')),
    file_url TEXT,
    content_markdown TEXT,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_docs_project ON project_documents(project_id);
CREATE INDEX idx_project_docs_folder ON project_documents(folder_name);

-- -----------------------------------------------------------------------------
-- SEED DATA - INITIAL DEMO RECORD
-- -----------------------------------------------------------------------------

-- Insert Users
INSERT INTO users (id, github_id, username, name, avatar_url, custom_avatar, email, bio) VALUES
(1, '10101', 'edwin-esquivel', 'Edwin Esquivel', 'https://avatars.githubusercontent.com/u/10101?v=4', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80', 'edwin@omnicode.tech', 'Lead Full-Stack Developer & DevOps'),
(2, '20202', 'maria-dev', 'Maria Gomez', 'https://avatars.githubusercontent.com/u/20202?v=4', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80', 'maria.gomez@omnicode.tech', 'Backend & Telemetry Engineer'),
(3, '30303', 'alex-coder', 'Alex Rivera', 'https://avatars.githubusercontent.com/u/30303?v=4', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80', 'alex.rivera@omnicode.tech', 'Frontend & UX Specialist'),
(4, '40404', 'covaleda402', 'Jose Esneider Covaleda', 'https://avatars.githubusercontent.com/u/108304918?v=4', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80', 'covaleda402@omnicode.tech', 'Full-Stack Developer & Quality Assurance');

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Insert Sample Projects (Salas)
INSERT INTO projects (id, name, description, github_repo, context_markdown, owner_id, room_seed) VALUES
(1, 'GitFlow Ecosystem', 'Sala principal del ecosistema ágil y telemetría de código en tiempo real.', 'edwin-esquivel-ADSO/GitFlow', 
'# GitFlow: Especificaciones del Ecosistema

## 🎯 Objetivo
Unificar el flujo de trabajo ágil con la telemetría de commits en tiempo real directamente desde GitHub.

## 🛠️ Pila Tecnológica
- **Frontend**: React 18, Vite, Tailwind CSS, Socket.io-client.
- **Backend**: Node.js, Express, Socket.io, pg (Neon DB).
- **Seguridad**: Salas dinámicas con código de acceso temporal de 5 minutos.', 
1, 'GF-PROD-2026'),
(2, 'Backend Microservices', 'Sala de infraestructura, microservicios y arquitectura de base de datos.', 'edwin-esquivel-ADSO/GitFlow-Backend', 
'# Documentación de Microservicios Backend\n\nDirectrices de APIs y webhooks.', 
1, 'GF-BACKEND-ROOM');

SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));

-- Assign Memberships
INSERT INTO project_members (project_id, user_id, role) VALUES
(1, 1, 'OWNER'),
(1, 2, 'MEMBER'),
(1, 3, 'MEMBER'),
(2, 1, 'OWNER'),
(2, 2, 'ADMIN');

-- Insert Tasks (With distinct assigned users to demonstrate personal vs owner visibility)
INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_to_user_id, created_by_user_id, is_archived, completed_at) VALUES
(1, 1, 'Configurar autenticación OAuth con GitHub', 'Implementar endpoints de redirección y callback con intercambio de tokens.', 'DONE', 'HIGH', 1, 1, TRUE, NOW() - INTERVAL '2 days'),
(2, 1, 'Construir endpoint receptor de Webhooks de GitHub', 'Procesar payloads de push, extraer autores y vincular commits a tareas.', 'DONE', 'URGENT', 2, 1, TRUE, NOW() - INTERVAL '1 day'),
(3, 1, 'Editor colaborativo de Markdown en tiempo real', 'Sincronizar cursor y contenido entre miembros del equipo con Socket.io.', 'IN_PROGRESS', 'HIGH', 1, 1, FALSE, NULL),
(4, 1, 'Dashboard de telemetría y métricas de impacto', 'Calcular velocidad del equipo, cruce de commits y tareas completadas.', 'IN_PROGRESS', 'MEDIUM', 3, 1, FALSE, NULL),
(5, 1, 'Implementar filtros y búsqueda en el Kanban', 'Permitir filtrar tareas por desarrollador asignado, estado y prioridad.', 'REVIEW', 'LOW', 2, 1, FALSE, NULL),
(6, 1, 'Salas dinámicas con código de 5 minutos', 'Generación de código temporal OTP que rota cada 5 minutos por seguridad.', 'TODO', 'URGENT', 1, 1, FALSE, NULL),
(7, 1, 'Soporte para cambio de tema Claro y Oscuro', 'Alternador de tema con persistencia local y soporte para móvil.', 'DONE', 'MEDIUM', 1, 1, TRUE, NOW() - INTERVAL '3 hours'),
(8, 1, 'Repositorio de Documentos estilo carpetas', 'Organización de archivos .md, .pdf, .docx e imágenes por categorías.', 'TODO', 'HIGH', 3, 1, FALSE, NULL);

SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks));

-- Insert Commits
INSERT INTO commits (project_id, task_id, user_id, hash, message, author_name, url, timestamp) VALUES
(1, 1, 1, '7a9f1b2', 'feat: configurar login OAuth con github y jwt tokens #1', 'edwin-esquivel', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/7a9f1b2', NOW() - INTERVAL '3 hours'),
(1, 1, 1, '8c3d4e5', 'fix: refrescar session y manejar errores en callback #1', 'edwin-esquivel', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/8c3d4e5', NOW() - INTERVAL '2 hours'),
(1, 2, 2, '9e5f6a1', 'feat: parser de payloads de webhook y regex extractor de tareas #2', 'maria-dev', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/9e5f6a1', NOW() - INTERVAL '90 minutes'),
(1, 2, 2, '1b2c3d4', 'feat: emision socket.io de new_commit tras push exitoso #2', 'maria-dev', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/1b2c3d4', NOW() - INTERVAL '60 minutes'),
(1, 3, 1, '2c3d4e5', 'feat: estructurar layout de LiveContextEditor con debounce #3', 'edwin-esquivel', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/2c3d4e5', NOW() - INTERVAL '30 minutes'),
(1, 4, 3, '3d4e5f6', 'feat: calcular metricas de productividad y graficos de aportes #4', 'alex-coder', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/3d4e5f6', NOW() - INTERVAL '15 minutes');

SELECT setval('commits_id_seq', (SELECT MAX(id) FROM commits));

-- Insert Project Documents (Organized in Folders)
INSERT INTO project_documents (project_id, folder_name, title, file_type, file_url, content_markdown, created_by_user_id) VALUES
(1, 'Arquitectura', 'Diagrama de Flujo y Entidades v2.0', 'md', '', '# Arquitectura del Sistema\n\nEspecificaciones de microservicios y protocolos de WebSockets.', 1),
(1, 'Arquitectura', 'Manual de Despliegue en Vercel', 'pdf', 'https://assets.gitflow.dev/docs/vercel-deployment-guide.pdf', '', 1),
(1, 'Diseño & UX', 'Mockups de Interfaz Móvil y Desktop', 'img', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', '', 3),
(1, 'Diseño & UX', 'Guía de Estilo y Paleta de Colores', 'docx', 'https://assets.gitflow.dev/docs/brand-guidelines.docx', '', 3),
(1, 'Reuniones & Notas', 'Minuta de Kickoff y Roles OMNICODE', 'md', '', '# Minuta de Kickoff\n\nDefinición de roles y responsabilidades.', 2);
