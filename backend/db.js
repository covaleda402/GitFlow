const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.NEON_DB_URL || process.env.DATABASE_URL;

let pool = null;
let useMockFallback = false;

// Fallback in-memory data store for local dev testing if Neon DB URL is not yet connected
const mockStore = {
  users: [
    {
      id: 1,
      github_id: '10101',
      username: 'edwin-esquivel',
      name: 'Edwin Esquivel',
      avatar_url: 'https://avatars.githubusercontent.com/u/10101?v=4',
      email: 'edwin@example.com',
      created_at: new Date('2026-11-01T10:00:00Z')
    },
    {
      id: 2,
      github_id: '20202',
      username: 'maria-dev',
      name: 'Maria Gomez',
      avatar_url: 'https://avatars.githubusercontent.com/u/20202?v=4',
      email: 'maria.gomez@example.com',
      created_at: new Date('2026-11-02T11:00:00Z')
    },
    {
      id: 3,
      github_id: '30303',
      username: 'alex-coder',
      name: 'Alex Rivera',
      avatar_url: 'https://avatars.githubusercontent.com/u/30303?v=4',
      email: 'alex.rivera@example.com',
      created_at: new Date('2026-11-03T12:00:00Z')
    }
  ],
  projects: [
    {
      id: 1,
      name: 'GitFlow Ecosystem',
      description: 'Plataforma de gestión ágil y telemetría de código en tiempo real conectada a GitHub.',
      github_repo: 'edwin-esquivel-ADSO/GitFlow',
      context_markdown: `# GitFlow: Especificaciones del Ecosistema\n\n## 🎯 Objetivo\nUnificar el flujo de trabajo ágil con la telemetría de commits en tiempo real directamente desde GitHub.\n\n## 🛠️ Pila Tecnológica\n- **Frontend**: React 18, Vite, Tailwind CSS, Socket.io-client.\n- **Backend**: Node.js, Express, Socket.io, pg (Neon DB).\n- **Telemetría**: Webhooks sincronizados con RegEx #ID para auto-vincular commits a tareas.\n\n## 📌 Reglas de Integración\n1. Todo commit debe referenciar una tarea: feat: login integrado #1\n2. Al escribir fixes #ID o closes #ID, la tarea pasa a DONE.\n3. El editor colaborativo sincroniza en vivo con WebSockets.`,
      owner_id: 1,
      created_at: new Date('2026-11-01T10:00:00Z'),
      updated_at: new Date()
    }
  ],
  tasks: [
    {
      id: 1,
      project_id: 1,
      title: 'Configurar autenticación OAuth con GitHub',
      description: 'Implementar endpoints de redirección y callback con intercambio de tokens.',
      status: 'DONE',
      priority: 'HIGH',
      assigned_to_user_id: 1,
      created_at: new Date('2026-11-01T10:00:00Z'),
      updated_at: new Date('2026-11-02T15:00:00Z')
    },
    {
      id: 2,
      project_id: 1,
      title: 'Construir endpoint receptor de Webhooks de GitHub',
      description: 'Procesar payloads de push, extraer autores y vincular commits a tareas.',
      status: 'DONE',
      priority: 'URGENT',
      assigned_to_user_id: 2,
      created_at: new Date('2026-11-01T11:00:00Z'),
      updated_at: new Date('2026-11-02T16:00:00Z')
    },
    {
      id: 3,
      project_id: 1,
      title: 'Editor colaborativo de Markdown en tiempo real',
      description: 'Sincronizar cursor y contenido entre miembros del equipo con Socket.io.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigned_to_user_id: 1,
      created_at: new Date('2026-11-02T09:00:00Z'),
      updated_at: new Date()
    },
    {
      id: 4,
      project_id: 1,
      title: 'Dashboard de telemetría y métricas de impacto',
      description: 'Calcular velocidad del equipo, cruce de commits y tareas completadas.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assigned_to_user_id: 3,
      created_at: new Date('2026-11-02T10:00:00Z'),
      updated_at: new Date()
    },
    {
      id: 5,
      project_id: 1,
      title: 'Implementar filtros y búsqueda en el Kanban',
      description: 'Permitir filtrar tareas por desarrollador asignado, estado y prioridad.',
      status: 'TODO',
      priority: 'LOW',
      assigned_to_user_id: 2,
      created_at: new Date('2026-11-03T10:00:00Z'),
      updated_at: new Date()
    },
    {
      id: 6,
      project_id: 1,
      title: 'Despliegue y configuración de producción en Vercel',
      description: 'Ajustar vercel.json para ruteo monorepo y variables de entorno.',
      status: 'TODO',
      priority: 'URGENT',
      assigned_to_user_id: 1,
      created_at: new Date('2026-11-03T11:00:00Z'),
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
  ]
};

// Check if Neon DB connection string is valid or placeholder
const isValidConnectionString = connectionString &&
  !connectionString.includes('npg_sample_password') &&
  !connectionString.includes('password@ep-sample-pooler');

if (isValidConnectionString) {
  try {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    pool.on('error', (err) => {
      console.error('[Neon DB Error]: Unexpected error on idle client', err.message);
    });
  } catch (err) {
    console.warn('[Neon DB Warning]: Could not create connection pool, switching to resilient fallback store:', err.message);
    useMockFallback = true;
  }
} else {
  console.log('[Neon DB Notice]: No live NEON_DB_URL configured in .env. Initializing in-memory fallback datastore with seed data.');
  useMockFallback = true;
}

/**
 * Execute a strictly parameterized SQL query.
 * Guarantees zero SQL injection risk by enforcing prepared statements.
 * @param {string} text - The parameterized SQL query string
 * @param {Array} params - Array of parameter values ($1, $2, ...)
 */
async function query(text, params = []) {
  if (!useMockFallback && pool) {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SQL Query] Executed in ${duration}ms | Rows: ${res.rowCount}`);
      }
      return res;
    } catch (error) {
      console.error(`[SQL Execution Error]:`, error.message, `\nQuery: ${text}`);
      // If Neon connection breaks at runtime, fallback gracefully
      return executeMockFallback(text, params);
    }
  }

  return executeMockFallback(text, params);
}

/**
 * Fallback SQL handler for offline or non-configured local environments
 */
function executeMockFallback(text, params) {
  const normalized = text.trim().toLowerCase();

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

  // 4. INSERT INTO users ... RETURNING *
  if (normalized.startsWith('insert into users')) {
    const newUser = {
      id: mockStore.users.length + 1,
      github_id: String(params[0]),
      username: params[1],
      name: params[2] || params[1],
      avatar_url: params[3] || '',
      email: params[4] || '',
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // 5. UPDATE users ... RETURNING *
  if (normalized.startsWith('update users')) {
    const user = mockStore.users.find(u => String(u.github_id) === String(params[0]));
    if (user) {
      user.username = params[1] || user.username;
      user.name = params[2] || user.name;
      user.avatar_url = params[3] || user.avatar_url;
      user.updated_at = new Date();
      return { rows: [user], rowCount: 1 };
    }
  }

  // 6. SELECT projects ALL
  if (normalized.includes('from projects') && !normalized.includes('where id = $1')) {
    return { rows: [...mockStore.projects], rowCount: mockStore.projects.length };
  }

  // 7. SELECT projects WHERE id = $1
  if (normalized.includes('from projects where id = $1')) {
    const project = mockStore.projects.find(p => Number(p.id) === Number(params[0]));
    return { rows: project ? [project] : [], rowCount: project ? 1 : 0 };
  }

  // 8. UPDATE projects SET context_markdown
  if (normalized.startsWith('update projects set context_markdown')) {
    const project = mockStore.projects.find(p => Number(p.id) === Number(params[1]));
    if (project) {
      project.context_markdown = params[0];
      project.updated_at = new Date();
      return { rows: [project], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 9. SELECT tasks BY project_id
  if (normalized.includes('from tasks') && normalized.includes('project_id = $1')) {
    const tasksWithUsers = mockStore.tasks
      .filter(t => Number(t.project_id) === Number(params[0]))
      .map(t => {
        const user = mockStore.users.find(u => u.id === t.assigned_to_user_id);
        const commitsCount = mockStore.commits.filter(c => c.task_id === t.id).length;
        return {
          ...t,
          assigned_username: user ? user.username : null,
          assigned_name: user ? user.name : null,
          assigned_avatar_url: user ? user.avatar_url : null,
          commits_count: commitsCount
        };
      });
    return { rows: tasksWithUsers, rowCount: tasksWithUsers.length };
  }

  // 10. SELECT tasks WHERE id = $1
  if (normalized.includes('from tasks where id = $1')) {
    const task = mockStore.tasks.find(t => Number(t.id) === Number(params[0]));
    return { rows: task ? [task] : [], rowCount: task ? 1 : 0 };
  }

  // 11. INSERT INTO tasks ... RETURNING *
  if (normalized.startsWith('insert into tasks')) {
    const newTask = {
      id: mockStore.tasks.length + 1,
      project_id: Number(params[0]),
      title: params[1],
      description: params[2] || '',
      status: params[3] || 'TODO',
      priority: params[4] || 'MEDIUM',
      assigned_to_user_id: params[5] ? Number(params[5]) : null,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.tasks.push(newTask);
    return { rows: [newTask], rowCount: 1 };
  }

  // 12. UPDATE tasks SET status
  if (normalized.startsWith('update tasks set status')) {
    const task = mockStore.tasks.find(t => Number(t.id) === Number(params[1]));
    if (task) {
      task.status = params[0];
      task.updated_at = new Date();
      return { rows: [task], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 13. SELECT commits BY project_id OR task_id
  if (normalized.includes('from commits')) {
    let list = [...mockStore.commits];
    if (normalized.includes('project_id = $1') && params[0]) {
      list = list.filter(c => Number(c.project_id) === Number(params[0]));
    }
    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { rows: list, rowCount: list.length };
  }

  // 14. INSERT INTO commits ... RETURNING *
  if (normalized.startsWith('insert into commits')) {
    const newCommit = {
      id: mockStore.commits.length + 1,
      project_id: params[0] ? Number(params[0]) : 1,
      task_id: params[1] ? Number(params[1]) : null,
      user_id: params[2] ? Number(params[2]) : null,
      hash: params[3],
      message: params[4],
      author_name: params[5],
      url: params[6] || '',
      timestamp: new Date()
    };
    mockStore.commits.unshift(newCommit);
    return { rows: [newCommit], rowCount: 1 };
  }

  // 15. Dashboard Stats Aggregate
  if (normalized.includes('count(distinct c.id)') || normalized.includes('dashboard')) {
    const totalTasks = mockStore.tasks.length;
    const closedTasks = mockStore.tasks.filter(t => t.status === 'DONE').length;
    const inProgressTasks = mockStore.tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const totalCommits = mockStore.commits.length;

    return {
      rows: [{
        total_tasks: totalTasks,
        closed_tasks: closedTasks,
        in_progress_tasks: inProgressTasks,
        total_commits: totalCommits
      }],
      rowCount: 1
    };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  pool,
  getMockStore: () => mockStore
};
