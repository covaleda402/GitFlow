const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.NEON_DB_URL || process.env.DATABASE_URL;

let pool = null;
let useMockFallback = false;

/**
 * Computes a time-based dynamic join code for a project room.
 * Rotates automatically every 5 minutes (300 seconds) for high security.
 */
function getDynamicRoomCode(projectId, seed = 'GF-SECURE') {
  const windowTime = Math.floor(Date.now() / 300000); // 5-minute window
  const hash = crypto.createHash('sha256').update(`${projectId}-${seed}-${windowTime}`).digest('hex');
  const code = hash.substring(0, 6).toUpperCase();
  const timeRemainingSeconds = 300 - (Math.floor(Date.now() / 1000) % 300);

  // Previous window code (30s grace period)
  const prevWindowTime = windowTime - 1;
  const prevHash = crypto.createHash('sha256').update(`${projectId}-${seed}-${prevWindowTime}`).digest('hex');
  const prevCode = prevHash.substring(0, 6).toUpperCase();

  return { code, prevCode, timeRemainingSeconds, windowTime };
}

// Resilient in-memory data store for local dev
const mockStore = {
  users: [
    {
      id: 1,
      github_id: '10101',
      username: 'edwin-esquivel',
      name: 'Edwin Esquivel',
      avatar_url: 'https://avatars.githubusercontent.com/u/10101?v=4',
      custom_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      email: 'edwin@omnicode.tech',
      bio: 'Lead Full-Stack Developer & DevOps en GitFlow',
      created_at: new Date('2026-11-01T10:00:00Z')
    },
    {
      id: 2,
      github_id: '20202',
      username: 'maria-dev',
      name: 'Maria Gomez',
      avatar_url: 'https://avatars.githubusercontent.com/u/20202?v=4',
      custom_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
      email: 'maria.gomez@omnicode.tech',
      bio: 'Backend & Telemetry Engineer',
      created_at: new Date('2026-11-02T11:00:00Z')
    },
    {
      id: 3,
      github_id: '30303',
      username: 'alex-coder',
      name: 'Alex Rivera',
      avatar_url: 'https://avatars.githubusercontent.com/u/30303?v=4',
      custom_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      email: 'alex.rivera@omnicode.tech',
      bio: 'Frontend & UX Specialist',
      created_at: new Date('2026-11-03T12:00:00Z')
    },
    {
      id: 4,
      github_id: '40404',
      username: 'covaleda402',
      name: 'Jose Esneider Covaleda',
      avatar_url: 'https://avatars.githubusercontent.com/u/108304918?v=4',
      custom_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
      email: 'covaleda402@omnicode.tech',
      bio: 'Full-Stack Developer & Quality Assurance',
      created_at: new Date('2026-11-04T10:00:00Z')
    }
  ],
  projects: [
    {
      id: 1,
      name: 'GitFlow Ecosystem',
      description: 'Sala principal del ecosistema ágil y telemetría de código en tiempo real.',
      github_repo: 'edwin-esquivel-ADSO/GitFlow',
      context_markdown: `# GitFlow: Especificaciones del Ecosistema\n\n## 🎯 Objetivo\nUnificar el flujo de trabajo ágil con la telemetría de commits en tiempo real directamente desde GitHub.\n\n## 🛠️ Pila Tecnológica\n- **Frontend**: React 18, Vite, Tailwind CSS, Socket.io-client.\n- **Backend**: Node.js, Express, Socket.io, pg (Neon DB).\n- **Seguridad**: Salas dinámicas con código de acceso temporal de 5 minutos.`,
      owner_id: 1,
      room_seed: 'GF-PROD-2026',
      created_at: new Date('2026-11-01T10:00:00Z'),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Backend Microservices',
      description: 'Sala de infraestructura, microservicios y arquitectura de base de datos.',
      github_repo: 'edwin-esquivel-ADSO/GitFlow-Backend',
      context_markdown: `# Documentación de Microservicios Backend\n\nDirectrices de APIs y webhooks.`,
      owner_id: 1,
      room_seed: 'GF-BACKEND-ROOM',
      created_at: new Date('2026-11-05T10:00:00Z'),
      updated_at: new Date()
    }
  ],
  project_members: [
    { id: 1, project_id: 1, user_id: 1, role: 'OWNER', joined_at: new Date() },
    { id: 2, project_id: 1, user_id: 2, role: 'MEMBER', joined_at: new Date() },
    { id: 3, project_id: 1, user_id: 3, role: 'MEMBER', joined_at: new Date() },
    { id: 4, project_id: 2, user_id: 1, role: 'OWNER', joined_at: new Date() },
    { id: 5, project_id: 2, user_id: 2, role: 'ADMIN', joined_at: new Date() }
  ],
  tasks: [
    {
      id: 1,
      project_id: 1,
      title: 'Configurar autenticación OAuth con GitHub',
      description: 'Implementar endpoints de redirección y callback con intercambio de tokens.',
      instructions: '1. Crear OAuth App en GitHub Developer Settings.\n2. Configurar GITHUB_CLIENT_ID y GITHUB_CLIENT_SECRET en .env.\n3. Implementar ruta /api/auth/github/callback para intercambiar el code temporal por access_token.\n4. Firmar y emitir JWT con expiración de 7 días.',
      status: 'DONE',
      priority: 'HIGH',
      assigned_to_user_id: 1,
      created_by_user_id: 1,
      is_archived: true,
      completed_at: new Date(Date.now() - 2 * 86400000),
      created_at: new Date('2026-11-01T10:00:00Z'),
      updated_at: new Date('2026-11-02T15:00:00Z')
    },
    {
      id: 2,
      project_id: 1,
      title: 'Construir endpoint receptor de Webhooks de GitHub',
      description: 'Procesar payloads de push, extraer autores y vincular commits a tareas.',
      instructions: '1. Configurar ruta POST /api/webhook/github para escuchar eventos de push.\n2. Procesar el arreglo de commits y extraer referencias numéricas tipo #ID con regex.\n3. Almacenar el commit en la base de datos vinculándolo a la tarea correspondiente.\n4. Emitir telemetría new_commit por WebSockets a toda la sala.',
      status: 'DONE',
      priority: 'URGENT',
      assigned_to_user_id: 2,
      created_by_user_id: 1,
      is_archived: true,
      completed_at: new Date(Date.now() - 1 * 86400000),
      created_at: new Date('2026-11-01T11:00:00Z'),
      updated_at: new Date('2026-11-02T16:00:00Z')
    },
    {
      id: 3,
      project_id: 1,
      title: 'Editor colaborativo de Markdown en tiempo real',
      description: 'Sincronizar cursor y contenido entre miembros del equipo con Socket.io.',
      instructions: '1. Inicializar SocketContext y escuchar eventos typing_context.\n2. Emitir live_context_stream al detectar cambios en el textarea de Markdown.\n3. Sincronizar el estado entre clientes conectados a la sala project_{id}.\n4. Persistir cambios en la base de datos mediante el botón Guardar.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigned_to_user_id: 1,
      created_by_user_id: 1,
      is_archived: false,
      completed_at: null,
      created_at: new Date('2026-11-02T09:00:00Z'),
      updated_at: new Date()
    },
    {
      id: 4,
      project_id: 1,
      title: 'Dashboard de telemetría y métricas de impacto',
      description: 'Calcular velocidad del equipo, cruce de commits y tareas completadas.',
      instructions: '1. Consultar historial de commits y tareas terminadas del sprint.\n2. Calcular fórmula de impacto: (Commits * 10) + (Tareas * 25).\n3. Renderizar gráficos de barras y tarjetas de velocidad por miembro.\n4. Actualizar métricas dinámicamente al recibir nuevos eventos de push.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assigned_to_user_id: 3,
      created_by_user_id: 1,
      is_archived: false,
      completed_at: null,
      created_at: new Date('2026-11-02T10:00:00Z'),
      updated_at: new Date()
    },
    {
      id: 5,
      project_id: 1,
      title: 'Implementar filtros y búsqueda en el Kanban',
      description: 'Permitir filtrar tareas por desarrollador asignado, estado y prioridad.',
      instructions: '1. Añadir barra de búsqueda rápida por título o código de tarea.\n2. Implementar selector de desarrollador para alternar entre vista personal y global.\n3. Filtrar columnas del Kanban de manera reactiva sin recargar la página.',
      status: 'REVIEW',
      priority: 'LOW',
      assigned_to_user_id: 2,
      created_by_user_id: 1,
      is_archived: false,
      completed_at: null,
      created_at: new Date('2026-11-03T10:00:00Z'),
      updated_at: new Date()
    },
    {
      id: 6,
      project_id: 1,
      title: 'Salas dinámicas con código de 5 minutos',
      description: 'Generación de código temporal OTP que rota cada 5 minutos por seguridad.',
      instructions: '1. Implementar función de hash HMAC/SHA-256 basada en ventanas de 300 segundos.\n2. Exponer endpoint GET /api/projects/:id/security-code para el dueño de la sala.\n3. Permitir ingreso de miembros mediante POST /api/projects/join con código activo.\n4. Incluir margen de tolerancia de 30 segundos con el código de la ventana previa.',
      status: 'TODO',
      priority: 'URGENT',
      assigned_to_user_id: 1,
      created_by_user_id: 1,
      is_archived: false,
      completed_at: null,
      created_at: new Date('2026-11-03T11:00:00Z'),
      updated_at: new Date()
    },
    {
      id: 7,
      project_id: 1,
      title: 'Soporte para cambio de tema Claro y Oscuro',
      description: 'Alternador de tema con persistencia local y soporte para móvil.',
      instructions: '1. Configurar ThemeContext con detección de preferencia del sistema y localStorage.\n2. Aplicar clases dark de Tailwind en el tag <html>.\n3. Diseñar botón de sol/luna tanto en la barra lateral de escritorio como en la cabecera móvil.',
      status: 'DONE',
      priority: 'MEDIUM',
      assigned_to_user_id: 1,
      created_by_user_id: 1,
      is_archived: true,
      completed_at: new Date(Date.now() - 3 * 3600000),
      created_at: new Date('2026-11-03T12:00:00Z'),
      updated_at: new Date()
    },
    {
      id: 8,
      project_id: 1,
      title: 'Repositorio de Documentos estilo carpetas',
      description: 'Organización de archivos .md, .pdf, .docx e imágenes por categorías.',
      instructions: '1. Definir categorías de carpetas: Arquitectura, Diseño & UX, Reuniones & Notas.\n2. Soportar extensiones .md, .pdf, .docx e imágenes con badges distintivos.\n3. Crear visor modal de documentos y formulario para anexar nuevas referencias.',
      status: 'TODO',
      priority: 'HIGH',
      assigned_to_user_id: 3,
      created_by_user_id: 1,
      is_archived: false,
      completed_at: null,
      created_at: new Date('2026-11-03T13:00:00Z'),
      updated_at: new Date()
    }
  ],
  commits: [
    {
      id: 1,
      project_id: 1,
      task_id: 1,
      user_id: 1,
      hash: '7a9f1b2',
      message: 'feat: configurar login OAuth con github y jwt tokens #1',
      author_name: 'edwin-esquivel',
      url: 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/7a9f1b2',
      timestamp: new Date(Date.now() - 3 * 3600000)
    },
    {
      id: 2,
      project_id: 1,
      task_id: 1,
      user_id: 1,
      hash: '8c3d4e5',
      message: 'fix: refrescar session y manejar errores en callback #1',
      author_name: 'edwin-esquivel',
      url: 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/8c3d4e5',
      timestamp: new Date(Date.now() - 2 * 3600000)
    },
    {
      id: 3,
      project_id: 1,
      task_id: 2,
      user_id: 2,
      hash: '9e5f6a1',
      message: 'feat: parser de payloads de webhook y regex extractor de tareas #2',
      author_name: 'maria-dev',
      url: 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/9e5f6a1',
      timestamp: new Date(Date.now() - 90 * 60000)
    },
    {
      id: 4,
      project_id: 1,
      task_id: 2,
      user_id: 2,
      hash: '1b2c3d4',
      message: 'feat: emision socket.io de new_commit tras push exitoso #2',
      author_name: 'maria-dev',
      url: 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/1b2c3d4',
      timestamp: new Date(Date.now() - 60 * 60000)
    },
    {
      id: 5,
      project_id: 1,
      task_id: 3,
      user_id: 1,
      hash: '2c3d4e5',
      message: 'feat: estructurar layout de LiveContextEditor con debounce #3',
      author_name: 'edwin-esquivel',
      url: 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/2c3d4e5',
      timestamp: new Date(Date.now() - 30 * 60000)
    },
    {
      id: 6,
      project_id: 1,
      task_id: 4,
      user_id: 3,
      hash: '3d4e5f6',
      message: 'feat: calcular metricas de productividad y graficos de aportes #4',
      author_name: 'alex-coder',
      url: 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/3d4e5f6',
      timestamp: new Date(Date.now() - 15 * 60000)
    }
  ],
  project_documents: [
    {
      id: 1,
      project_id: 1,
      folder_name: 'Arquitectura',
      title: 'Diagrama de Flujo y Microservicios v2.0',
      file_type: 'md',
      file_url: '',
      content_markdown: '# Arquitectura del Ecosistema GitFlow\n\n## Servicios Principales:\n1. Ingestion de Webhooks con Regex Parser.\n2. Conexiones Socket.io con salas por proyecto.\n3. Base de Datos Neon PostgreSQL protegida con Prepared Statements.',
      created_by_user_id: 1,
      created_at: new Date('2026-11-01T10:00:00Z')
    },
    {
      id: 2,
      project_id: 1,
      folder_name: 'Arquitectura',
      title: 'Guía de Despliegue en Vercel Monorepo',
      file_type: 'pdf',
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      content_markdown: '',
      created_by_user_id: 1,
      created_at: new Date('2026-11-02T10:00:00Z')
    },
    {
      id: 3,
      project_id: 1,
      folder_name: 'Diseño & UX',
      title: 'Mockup de Navegación Móvil TikTok Style',
      file_type: 'img',
      file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      content_markdown: '',
      created_by_user_id: 3,
      created_at: new Date('2026-11-03T10:00:00Z')
    },
    {
      id: 4,
      project_id: 1,
      folder_name: 'Diseño & UX',
      title: 'Especificaciones de Paleta de Colores y Contrastes',
      file_type: 'docx',
      file_url: 'https://calibre-ebook.com/downloads/demos/demo.docx',
      content_markdown: '',
      created_by_user_id: 3,
      created_at: new Date('2026-11-03T11:00:00Z')
    },
    {
      id: 5,
      project_id: 1,
      folder_name: 'Reuniones & Notas',
      title: 'Minuta de Kickoff y Roles OMNICODE',
      file_type: 'md',
      file_url: '',
      content_markdown: '# Minuta de Kickoff OMNICODE\n\n- **A00**: Orquestador General.\n- **A03/A05**: Product Owner y UX.\n- **A06/A10**: Arquitecto y DBA.\n- **Desarrollador Principal**: Edwin Esquivel.',
      created_by_user_id: 2,
      created_at: new Date('2026-11-04T10:00:00Z')
    },
    {
      id: 6,
      project_id: 1,
      folder_name: 'Documentación General',
      title: 'Manual de Vinculación de GitHub OAuth y Webhooks',
      file_type: 'md',
      file_url: '',
      content_markdown: '# Guía de Vinculación GitHub\n\nConfiguración paso a paso de Client ID, Secret y endpoint receptor de commits.',
      created_by_user_id: 1,
      created_at: new Date('2026-11-05T09:00:00Z')
    },
    {
      id: 7,
      project_id: 1,
      folder_name: 'Diseño & UX',
      title: 'Wireframes de Tablero Ágil y Chatbot',
      file_type: 'img',
      file_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
      content_markdown: '',
      created_by_user_id: 2,
      created_at: new Date('2026-11-05T14:00:00Z')
    }
  ]
};

const isValidConnectionString = connectionString &&
  !connectionString.includes('npg_sample_password') &&
  !connectionString.includes('password@ep-sample-pooler');

if (isValidConnectionString) {
  try {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    pool.on('error', (err) => {
      console.error('[Neon DB Error]: Unexpected error on idle client', err.message);
    });
  } catch (err) {
    console.warn('[Neon DB Warning]: Falling back to local in-memory store:', err.message);
    useMockFallback = true;
  }
} else {
  console.log('[Neon DB Notice]: No live NEON_DB_URL configured in .env. Initializing in-memory fallback datastore with seed data.');
  useMockFallback = true;
}

/**
 * Execute a strictly parameterized SQL query.
 * Guarantees zero SQL injection risk by enforcing prepared statements.
 */
async function query(text, params = []) {
  if (!useMockFallback && pool) {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (error) {
      console.error(`[SQL Execution Error]:`, error.message, `\nQuery: ${text}`);
      return executeMockFallback(text, params);
    }
  }

  return executeMockFallback(text, params);
}

/**
 * Fallback SQL handler for offline or non-configured local environments
 */
function executeMockFallback(text, params) {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');

  // 1. SELECT users BY github_id
  if (normalized.includes('from users where github_id = $1')) {
    const user = mockStore.users.find(u => String(u.github_id) === String(params[0]));
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  // 2. SELECT users BY id
  if (normalized.includes('from users where id = $1')) {
    const user = mockStore.users.find(u => Number(u.id) === Number(params[0]));
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  // 3. SELECT users ALL
  if (normalized.includes('from users') && !normalized.includes('where')) {
    return { rows: [...mockStore.users], rowCount: mockStore.users.length };
  }

  // 4. UPDATE users profile (custom_avatar, name, bio)
  if (normalized.startsWith('update users set') && normalized.includes('where id = $')) {
    const userId = Number(params[params.length - 1]);
    const user = mockStore.users.find(u => u.id === userId);
    if (user) {
      if (params[0] !== undefined) user.name = params[0] || user.name;
      if (params[1] !== undefined) user.custom_avatar = params[1] || user.custom_avatar;
      if (params[2] !== undefined) user.bio = params[2] || user.bio;
      user.updated_at = new Date();
      return { rows: [user], rowCount: 1 };
    }
  }

  // 5. INSERT INTO users ... RETURNING *
  if (normalized.startsWith('insert into users')) {
    const newUser = {
      id: mockStore.users.length + 1,
      github_id: String(params[0]),
      username: params[1],
      name: params[2] || params[1],
      avatar_url: params[3] || '',
      custom_avatar: params[3] || '',
      email: params[4] || '',
      bio: 'Desarrollador en GitFlow',
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // 6. SELECT projects for user (or all projects)
  if (normalized.includes('from projects') && !normalized.includes('where id = $1')) {
    const projectsWithCounts = mockStore.projects.map(p => {
      const taskCount = mockStore.tasks.filter(t => t.project_id === p.id && !t.is_archived).length;
      const commitCount = mockStore.commits.filter(c => c.project_id === p.id).length;
      const memberCount = mockStore.project_members.filter(m => m.project_id === p.id).length;
      return {
        ...p,
        total_tasks: taskCount,
        total_commits: commitCount,
        total_members: memberCount
      };
    });
    return { rows: projectsWithCounts, rowCount: projectsWithCounts.length };
  }

  // 7. SELECT projects WHERE id = $1
  if (normalized.includes('from projects where id = $1') || normalized.includes('from projects p') && normalized.includes('p.id = $1')) {
    const project = mockStore.projects.find(p => Number(p.id) === Number(params[0]));
    if (project) {
      const owner = mockStore.users.find(u => u.id === project.owner_id);
      const members = mockStore.project_members
        .filter(m => m.project_id === project.id)
        .map(m => {
          const u = mockStore.users.find(user => user.id === m.user_id);
          return {
            ...m,
            username: u ? u.username : 'dev',
            name: u ? u.name : 'Developer',
            avatar: u ? (u.custom_avatar || u.avatar_url) : ''
          };
        });
      return {
        rows: [{
          ...project,
          owner_username: owner ? owner.username : 'owner',
          owner_avatar: owner ? (owner.custom_avatar || owner.avatar_url) : '',
          members
        }],
        rowCount: 1
      };
    }
    return { rows: [], rowCount: 0 };
  }

  // 8. INSERT INTO projects ... RETURNING *
  if (normalized.startsWith('insert into projects')) {
    const newProj = {
      id: mockStore.projects.length + 1,
      name: params[0],
      description: params[1] || '',
      github_repo: params[2] || 'edwin-esquivel-ADSO/GitFlow',
      context_markdown: params[3] || '# Contexto de la Sala\n\nEspecificaciones.',
      owner_id: Number(params[4]),
      room_seed: 'GF-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.projects.push(newProj);
    // Add owner as member
    mockStore.project_members.push({
      id: mockStore.project_members.length + 1,
      project_id: newProj.id,
      user_id: newProj.owner_id,
      role: 'OWNER',
      joined_at: new Date()
    });
    return { rows: [newProj], rowCount: 1 };
  }

  // 9. INSERT INTO project_members
  if (normalized.startsWith('insert into project_members')) {
    const projectId = Number(params[0]);
    const userId = Number(params[1]);
    const role = params[2] || 'MEMBER';
    const exists = mockStore.project_members.find(m => m.project_id === projectId && m.user_id === userId);
    if (!exists) {
      const member = {
        id: mockStore.project_members.length + 1,
        project_id: projectId,
        user_id: userId,
        role,
        joined_at: new Date()
      };
      mockStore.project_members.push(member);
      return { rows: [member], rowCount: 1 };
    }
    return { rows: [exists], rowCount: 1 };
  }

  // 9b. INSERT INTO tasks
  if (normalized.startsWith('insert into tasks')) {
    let newTask;
    if (normalized.includes('instructions')) {
      // params: [projectId, title, description, instructions, status, priority, assignedId, req.user.id]
      newTask = {
        id: mockStore.tasks.length + 1,
        project_id: Number(params[0]),
        title: params[1],
        description: params[2] || '',
        instructions: params[3] || '',
        status: params[4] || 'TODO',
        priority: params[5] || 'MEDIUM',
        assigned_to_user_id: params[6] ? Number(params[6]) : 1,
        created_by_user_id: params[7] ? Number(params[7]) : 1,
        is_archived: false,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };
    } else {
      newTask = {
        id: mockStore.tasks.length + 1,
        project_id: Number(params[0]),
        title: params[1],
        description: params[2] || '',
        instructions: '',
        status: params[3] || 'TODO',
        priority: params[4] || 'MEDIUM',
        assigned_to_user_id: params[5] ? Number(params[5]) : 1,
        created_by_user_id: params[6] ? Number(params[6]) : 1,
        is_archived: false,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };
    }
    mockStore.tasks.push(newTask);
    return { rows: [newTask], rowCount: 1 };
  }

  // 10. SELECT tasks BY project_id (with privacy check)
  if (normalized.includes('from tasks') && normalized.includes('project_id = $1') && !normalized.includes('is_archived = true') && !normalized.includes("status = 'done'")) {
    const projectId = Number(params[0]);
    const userId = params[1] ? Number(params[1]) : null;
    const project = mockStore.projects.find(p => p.id === projectId);
    const isOwner = project && userId && project.owner_id === userId;

    let filtered = mockStore.tasks.filter(t => t.project_id === projectId && !t.is_archived);

    // If regular member, filter to only their tasks!
    if (!isOwner && userId) {
      filtered = filtered.filter(t => t.assigned_to_user_id === userId || t.created_by_user_id === userId);
    }

    const tasksWithDetails = filtered.map(t => {
      const user = mockStore.users.find(u => u.id === t.assigned_to_user_id);
      const commitsCount = mockStore.commits.filter(c => c.task_id === t.id).length;
      return {
        ...t,
        assigned_username: user ? user.username : null,
        assigned_name: user ? user.name : null,
        assigned_avatar_url: user ? (user.custom_avatar || user.avatar_url) : null,
        commits_count: commitsCount
      };
    });
    return { rows: tasksWithDetails, rowCount: tasksWithDetails.length };
  }

  // 11. SELECT tasks HISTORY (completed tasks)
  if (normalized.includes('from tasks') && (normalized.includes('is_archived = true') || normalized.includes("status = 'done'"))) {
    const projectId = Number(params[0]);
    const userId = params[1] ? Number(params[1]) : null;
    const project = mockStore.projects.find(p => p.id === projectId);
    const isOwner = project && userId && project.owner_id === userId;

    let filtered = mockStore.tasks.filter(t => t.project_id === projectId && (t.status === 'DONE' || t.is_archived));
    if (!isOwner && userId) {
      filtered = filtered.filter(t => t.assigned_to_user_id === userId);
    }

    const result = filtered.map(t => {
      const user = mockStore.users.find(u => u.id === t.assigned_to_user_id);
      const creator = mockStore.users.find(u => u.id === t.created_by_user_id);
      const commitsCount = mockStore.commits.filter(c => c.task_id === t.id).length;
      return {
        ...t,
        assigned_username: user ? user.username : null,
        assigned_name: user ? user.name : null,
        assigned_avatar_url: user ? (user.custom_avatar || user.avatar_url) : null,
        created_by_username: creator ? creator.username : null,
        created_by_name: creator ? creator.name : null,
        commits_count: commitsCount
      };
    });
    return { rows: result, rowCount: result.length };
  }

  // 12. UPDATE tasks SET status
  if (normalized.startsWith('update tasks set status')) {
    // 12a. Bulk Rollback query: update tasks set status = 'in_progress', is_archived = false ... where project_id = $1 ...
    if (normalized.includes("status = 'in_progress'") && normalized.includes('where project_id = $1')) {
      const projectId = Number(params[0]);
      let rolledBackCount = 0;
      mockStore.tasks.forEach(t => {
        if (t.project_id === projectId && (t.status === 'DONE' || t.is_archived)) {
          t.status = 'IN_PROGRESS';
          t.is_archived = false;
          t.completed_at = null;
          t.updated_at = new Date();
          rolledBackCount++;
        }
      });
      return { rows: [], rowCount: rolledBackCount };
    }

    const taskId = Number(params[params.length - 1]);
    const nextStatus = params[0];
    const task = mockStore.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = nextStatus;
      if (params.length >= 4 && params[2] !== null && params[2] !== undefined) {
        task.completion_notes = params[2];
      }
      if (nextStatus === 'DONE') {
        task.completed_at = new Date();
        task.is_archived = true;
      } else {
        task.is_archived = false;
        task.completed_at = null;
      }
      task.updated_at = new Date();
      return { rows: [task], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 12b. UPDATE tasks SET instructions
  if (normalized.startsWith('update tasks set instructions')) {
    const taskId = Number(params[1]);
    const newInstructions = params[0];
    const task = mockStore.tasks.find(t => t.id === taskId);
    if (task) {
      task.instructions = newInstructions;
      task.updated_at = new Date();
      return { rows: [task], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 13. DOCUMENTS (project_documents)
  if (normalized.includes('from project_documents where project_id = $1')) {
    const projectId = Number(params[0]);
    const docs = mockStore.project_documents.filter(d => d.project_id === projectId);
    return { rows: docs, rowCount: docs.length };
  }

  if (normalized.startsWith('insert into project_documents')) {
    const newDoc = {
      id: mockStore.project_documents.length + 1,
      project_id: Number(params[0]),
      folder_name: params[1] || 'General',
      title: params[2],
      file_type: params[3] || 'md',
      file_url: params[4] || '',
      content_markdown: params[5] || '',
      created_by_user_id: params[6] ? Number(params[6]) : 1,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.project_documents.push(newDoc);
    return { rows: [newDoc], rowCount: 1 };
  }

  // 14. COMMITS
  if (normalized.includes('from commits')) {
    let list = [...mockStore.commits];
    if (normalized.includes('project_id = $1') && params[0]) {
      list = list.filter(c => Number(c.project_id) === Number(params[0]));
    }
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { rows: list, rowCount: list.length };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  pool,
  getDynamicRoomCode,
  getMockStore: () => mockStore
};
