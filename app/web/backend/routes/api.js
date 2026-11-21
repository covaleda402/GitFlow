const express = require('express');
const db = require('../db');
const { authenticateToken, optionalToken } = require('../middleware/auth');
const { sendRoomCreatedEmail, sendRoomJoinedEmail } = require('../utils/mailer');

const router = express.Router();

// -----------------------------------------------------------------------------
// 1. SALAS (ROOMS / PROJECTS) & DYNAMIC 5-MINUTE CODES
// -----------------------------------------------------------------------------

/**
 * GET /api/projects
 * Lists all active projects/rooms accessible (filters out permanently deleted rooms)
 */
router.get('/projects', optionalToken, async (req, res) => {
  try {
    // OWASP A01: Broken Access Control Defense
    // If user is not authenticated, DO NOT expose other users' rooms or repositories
    if (!req.user) {
      return res.json({ 
        success: true, 
        projects: [], 
        isGuest: true,
        message: 'Acceso privado. Inicia sesión para ver tus salas o únete ingresando un código temporal de 5 minutos.' 
      });
    }

    const userId = req.user.id;
    const query = `
      SELECT p.id, p.name, p.description, p.github_repo, p.owner_id, 
             COALESCE(p.status, 'ACTIVE') AS status, p.deleted_at, p.created_at, p.updated_at,
             COUNT(DISTINCT t.id) AS total_tasks,
             COUNT(DISTINCT c.id) AS total_commits,
             COUNT(DISTINCT m_all.id) AS total_members
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id AND t.is_archived = false
      LEFT JOIN commits c ON c.project_id = p.id
      LEFT JOIN project_members m_all ON m_all.project_id = p.id
      LEFT JOIN project_members m_user ON m_user.project_id = p.id AND m_user.user_id = $1
      WHERE (p.status IS NULL OR p.status != 'DELETED')
        AND (p.owner_id = $1 OR m_user.user_id IS NOT NULL)
      GROUP BY p.id
      ORDER BY p.id ASC
    `;
    const result = await db.query(query, [userId]);
    res.json({ success: true, projects: result.rows, isGuest: false });
  } catch (error) {
    console.error('[API Projects Error]:', error.message);
    res.status(500).json({ error: 'Error al obtener proyectos.' });
  }
});

/**
 * POST /api/projects
 * Creates a new Room (Sala). Current user becomes the OWNER.
 */
router.post('/projects', authenticateToken, async (req, res) => {
  try {
    const { name, description = '', github_repo, github_repos, context_markdown = '' } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la sala es obligatorio.' });
    }

    let finalRepo = 'edwin-esquivel-ADSO/GitFlow';
    if (Array.isArray(github_repos) && github_repos.length > 0) {
      finalRepo = github_repos.filter(Boolean).map(r => r.trim()).join(', ');
    } else if (github_repo && github_repo.trim()) {
      finalRepo = github_repo.trim();
    }

    const defaultMarkdown = context_markdown || `# ${name}\n\nDocumenta aquí las decisiones técnicas, arquitectura y requerimientos de esta sala.`;
    const insertProj = `
      INSERT INTO projects (name, description, github_repo, context_markdown, owner_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const projRes = await db.query(insertProj, [name.trim(), description.trim(), finalRepo, defaultMarkdown, req.user.id]);
    const project = projRes.rows[0];

    // Assign owner membership
    await db.query(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'OWNER')
    `, [project.id, req.user.id]);

    // Send room created confirmation email asynchronously
    const userEmail = req.user.email;
    const roomInfo = db.getDynamicRoomCode(project.id, project.room_seed);
    if (userEmail) {
      sendRoomCreatedEmail({
        email: userEmail,
        username: req.user.username,
        name: req.user.name,
        projectName: project.name,
        roomCode: roomInfo.code
      }).catch(e => console.warn('[Room Created Mailer Warn]:', e.message));
    } else {
      db.query('SELECT email, name, username FROM users WHERE id = $1', [req.user.id])
        .then(uRes => {
          if (uRes.rows[0]?.email) {
            sendRoomCreatedEmail({
              email: uRes.rows[0].email,
              username: uRes.rows[0].username,
              name: uRes.rows[0].name,
              projectName: project.name,
              roomCode: roomInfo.code
            }).catch(e => console.warn('[Room Created Mailer Warn]:', e.message));
          }
        }).catch(() => {});
    }

    const io = req.app.get('socketio');
    if (io) {
      io.emit('project_created', project);
    }

    res.status(201).json({
      success: true,
      message: 'Sala creada con éxito.',
      project
    });
  } catch (error) {
    console.error('[API Create Project Error]:', error.message);
    res.status(500).json({ error: 'Error al crear sala.' });
  }
});

/**
 * Helper to enforce that the requester is the OWNER or an accepted MEMBER of the room (OWASP A01)
 */
async function getRoomAccess(projectId, reqUser) {
  if (!reqUser) return { hasAccess: false, notMember: true, isOwner: false };
  const projRes = await db.query(
    "SELECT id, name, owner_id, status FROM projects WHERE id = $1 AND (status IS NULL OR status != 'DELETED')",
    [projectId]
  );
  if (projRes.rows.length === 0) return { hasAccess: false, notFound: true };
  const project = projRes.rows[0];
  if (project.owner_id === reqUser.id) {
    return { hasAccess: true, isOwner: true, role: 'OWNER', project };
  }
  const memberRes = await db.query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, reqUser.id]
  );
  if (memberRes.rows.length > 0) {
    return { hasAccess: true, isOwner: false, role: memberRes.rows[0].role, project };
  }
  return { hasAccess: false, notMember: true, isOwner: false, project };
}

/**
 * GET /api/projects/:id
 * Returns single room details, owner info and list of members
 */
router.get('/projects/:id', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const access = await getRoomAccess(projectId, req.user);

    if (access.notFound) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        error: 'Esta sala es privada y requiere autorización de membresía o un código de acceso temporal de 5 minutos.',
        notMember: true,
        projectId: access.project ? access.project.id : projectId,
        projectName: access.project ? access.project.name : 'Sala Privada'
      });
    }

    const query = `
      SELECT p.*, u.username as owner_username, COALESCE(u.custom_avatar, u.avatar_url) as owner_avatar
      FROM projects p
      LEFT JOIN users u ON u.id = p.owner_id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [projectId]);
    const project = result.rows[0];

    // Fetch members of this room
    const membersQuery = `
      SELECT m.id, m.role, m.joined_at, u.id as user_id, u.username, u.name, 
             COALESCE(u.custom_avatar, u.avatar_url) as avatar
      FROM project_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.project_id = $1
      ORDER BY m.joined_at ASC
    `;
    const membersRes = await db.query(membersQuery, [projectId]);

    const isOwner = access.isOwner;
    const rawRepo = project.github_repo || 'edwin-esquivel-ADSO/GitFlow';
    const reposList = rawRepo.split(',').map(r => r.trim()).filter(Boolean);
    const github_repos = reposList.length > 0 ? reposList : ['edwin-esquivel-ADSO/GitFlow'];

    res.json({
      success: true,
      project: {
        ...project,
        isOwner,
        userRole: access.role,
        github_repos,
        members: membersRes.rows
      }
    });
  } catch (error) {
    console.error('[API Project Detail Error]:', error.message);
    res.status(500).json({ error: 'Error al consultar sala.' });
  }
});

/**
 * POST /api/projects/:id/repos
 * Autonomously adds an additional connected repository to an existing room.
 */
router.post('/projects/:id/repos', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { repo } = req.body;
    if (!repo || !repo.trim()) {
      return res.status(400).json({ error: 'El nombre del repositorio es requerido (ej. usuario/repositorio).' });
    }
    const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '');
    const projRes = await db.query('SELECT github_repo FROM projects WHERE id = $1', [projectId]);
    if (projRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    const currentRepoStr = projRes.rows[0].github_repo || '';
    const existingList = currentRepoStr.split(',').map(r => r.trim()).filter(Boolean);
    if (!existingList.includes(cleanRepo)) {
      existingList.push(cleanRepo);
    }
    const updatedString = existingList.join(', ');
    await db.query('UPDATE projects SET github_repo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [updatedString, projectId]);

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${projectId}`).emit('repos_updated', { projectId, github_repos: existingList });
    }

    res.json({
      success: true,
      message: `Repositorio "${cleanRepo}" conectado exitosamente.`,
      github_repos: existingList,
      github_repo: updatedString
    });
  } catch (error) {
    console.error('[API Add Repo Error]:', error.message);
    res.status(500).json({ error: 'Error al conectar repositorio.' });
  }
});

/**
 * PATCH /api/projects/:id/status
 * Updates room status: 'ACTIVE', 'SUSPENDED', 'DELETED'
 * Preserves all completed task history in user profiles!
 */
router.patch('/projects/:id/status', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const allowed = ['ACTIVE', 'SUSPENDED', 'DELETED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Estado inválido: ${status}. Permitidos: ACTIVE, SUSPENDED, DELETED.` });
    }

    const updateQuery = `
      UPDATE projects 
      SET status = $1, 
          deleted_at = CASE WHEN $1 = 'DELETED' THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [status, projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    const updatedProject = result.rows[0];

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${projectId}`).emit('project_status_changed', {
        projectId,
        status: updatedProject.status,
        deleted_at: updatedProject.deleted_at
      });
    }

    res.json({
      success: true,
      message: status === 'DELETED' 
        ? 'Sala eliminada definitivamente. El historial de tareas se conserva intacto en los perfiles.'
        : `Estado de la sala actualizado a: ${status}`,
      project: updatedProject
    });
  } catch (error) {
    console.error('[API Project Status Error]:', error.message);
    res.status(500).json({ error: 'Error al cambiar estado de la sala.' });
  }
});

/**
 * DELETE /api/projects/:id
 * Permanently soft-deletes a room, preserving all tasks and history in user profiles
 */
router.delete('/projects/:id', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);

    const updateQuery = `
      UPDATE projects 
      SET status = 'DELETED', 
          deleted_at = CURRENT_TIMESTAMP, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${projectId}`).emit('project_status_changed', {
        projectId,
        status: 'DELETED',
        deleted_at: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Sala eliminada definitivamente. Todo el historial de tareas completadas se conserva en los perfiles de los usuarios.',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('[API Delete Project Error]:', error.message);
    res.status(500).json({ error: 'Error al eliminar la sala.' });
  }
});

/**
 * GET /api/projects/:id/security-code
 * Returns dynamic 5-minute rotating join code for the room
 */
router.get('/projects/:id/security-code', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const projRes = await db.query('SELECT id, room_seed, owner_id FROM projects WHERE id = $1', [projectId]);

    if (projRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    const project = projRes.rows[0];
    const { code, timeRemainingSeconds } = db.getDynamicRoomCode(project.id, project.room_seed);

    res.json({
      success: true,
      code,
      timeRemainingSeconds,
      rotatesEveryMinutes: 5,
      isOwner: project.owner_id === req.user.id
    });
  } catch (error) {
    console.error('[API Security Code Error]:', error.message);
    res.status(500).json({ error: 'Error al generar código de sala.' });
  }
});

/**
 * POST /api/projects/join
 * Join a room via the dynamic 5-minute code
 */
router.post('/projects/join', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || code.trim() === '') {
      return res.status(400).json({ error: 'Debes ingresar el código de la sala.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const allProjectsRes = await db.query('SELECT id, name, room_seed, owner_id FROM projects');

    let matchedProject = null;

    // Check code against current and previous 5-min window
    for (const p of allProjectsRes.rows) {
      const dynamic = db.getDynamicRoomCode(p.id, p.room_seed);
      if (dynamic.code === cleanCode || dynamic.prevCode === cleanCode) {
        matchedProject = p;
        break;
      }
    }

    if (!matchedProject) {
      return res.status(400).json({
        error: 'Código inválido o expirado. Recuerda que el código de sala rota cada 5 minutos por seguridad.'
      });
    }

    // Add user as MEMBER
    const addQuery = `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'MEMBER')
      ON CONFLICT (project_id, user_id) DO NOTHING
      RETURNING *
    `;
    await db.query(addQuery, [matchedProject.id, req.user.id]);

    // Send room joined confirmation email asynchronously
    const joinEmail = req.user.email;
    if (joinEmail) {
      sendRoomJoinedEmail({
        email: joinEmail,
        username: req.user.username,
        name: req.user.name,
        projectName: matchedProject.name,
        role: 'MEMBER'
      }).catch(e => console.warn('[Room Joined Mailer Warn]:', e.message));
    } else {
      db.query('SELECT email, name, username FROM users WHERE id = $1', [req.user.id])
        .then(uRes => {
          if (uRes.rows[0]?.email) {
            sendRoomJoinedEmail({
              email: uRes.rows[0].email,
              username: uRes.rows[0].username,
              name: uRes.rows[0].name,
              projectName: matchedProject.name,
              role: 'MEMBER'
            }).catch(e => console.warn('[Room Joined Mailer Warn]:', e.message));
          }
        }).catch(() => {});
    }

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${matchedProject.id}`).emit('member_joined', {
        projectId: matchedProject.id,
        user: req.user
      });
    }

    res.json({
      success: true,
      message: `¡Te has unido con éxito a la sala "${matchedProject.name}"!`,
      projectId: matchedProject.id
    });
  } catch (error) {
    console.error('[API Join Room Error]:', error.message);
    res.status(500).json({ error: 'Error al unirse a la sala.' });
  }
});

// -----------------------------------------------------------------------------
// 2. KANBAN TASKS & TASK PRIVACY (PERSONAL FOR MEMBERS, ALL FOR OWNER)
// -----------------------------------------------------------------------------

/**
 * GET /api/projects/:id/tasks
 * Creator/Owner sees ALL tasks.
 * Regular members see ONLY their assigned tasks (Personal View).
 */
router.get('/projects/:id/tasks', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const access = await getRoomAccess(projectId, req.user);

    if (access.notFound) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        error: 'No perteneces a esta sala.',
        notMember: true,
        tasks: []
      });
    }

    const userId = req.user ? req.user.id : null;
    const isOwner = access.isOwner;

    const scope = req.query.scope;
    let tasksQuery;
    let params;

    if (scope === 'personal' && userId && !isOwner) {
      // Personal scope request: regular member sees personal tasks only
      tasksQuery = `
        SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority,
               t.assigned_to_user_id, t.created_by_user_id, t.is_archived, t.created_at, t.updated_at,
               u.username AS assigned_username,
               u.name AS assigned_name,
               COALESCE(u.custom_avatar, u.avatar_url) AS assigned_avatar_url,
               COUNT(c.id) AS commits_count
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to_user_id
        LEFT JOIN commits c ON c.task_id = t.id
        WHERE t.project_id = $1 AND (t.assigned_to_user_id = $2 OR t.created_by_user_id = $2)
        GROUP BY t.id, u.username, u.name, u.custom_avatar, u.avatar_url
        ORDER BY t.id ASC
      `;
      params = [projectId, userId];
    } else {
      // Team-wide tasks list for collaborative agile board
      tasksQuery = `
        SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority,
               t.assigned_to_user_id, t.created_by_user_id, t.is_archived, t.created_at, t.updated_at,
               u.username AS assigned_username,
               u.name AS assigned_name,
               COALESCE(u.custom_avatar, u.avatar_url) AS assigned_avatar_url,
               COUNT(c.id) AS commits_count
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to_user_id
        LEFT JOIN commits c ON c.task_id = t.id
        WHERE t.project_id = $1
        GROUP BY t.id, u.username, u.name, u.custom_avatar, u.avatar_url
        ORDER BY t.id ASC
      `;
      params = [projectId];
    }

    const result = await db.query(tasksQuery, params);

    res.json({
      success: true,
      isOwnerView: isOwner,
      tasks: result.rows
    });
  } catch (error) {
    console.error('[API Tasks Error]:', error.message);
    res.status(500).json({ error: 'Error al consultar tareas.' });
  }
});

/**
 * POST /api/projects/:id/tasks
 * Create a new task
 */
router.post('/projects/:id/tasks', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { title, description = '', instructions = '', status = 'TODO', priority = 'MEDIUM', assigned_to_user_id } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'El título de la tarea es requerido.' });
    }

    const currentUserId = req.user ? req.user.id : 1;
    const assignedId = assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : currentUserId;

    const insertQuery = `
      INSERT INTO tasks (project_id, title, description, instructions, status, priority, assigned_to_user_id, created_by_user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `;
    const insertRes = await db.query(insertQuery, [
      projectId,
      title.trim(),
      description.trim(),
      instructions.trim(),
      status,
      priority,
      assignedId,
      currentUserId
    ]);

    const createdTask = insertRes.rows[0];

    // Assignee details
    const uRes = await db.query('SELECT username, name, avatar_url, custom_avatar FROM users WHERE id = $1', [createdTask.assigned_to_user_id]);
    const assignedUser = uRes.rows[0];

    const fullTask = {
      ...createdTask,
      assigned_username: assignedUser ? assignedUser.username : null,
      assigned_name: assignedUser ? assignedUser.name : null,
      assigned_avatar_url: assignedUser ? (assignedUser.custom_avatar || assignedUser.avatar_url) : null,
      commits_count: 0
    };

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${projectId}`).emit('task_created', fullTask);
      io.emit('task_created', fullTask);
    }

    res.status(201).json({
      success: true,
      message: 'Tarea creada con éxito.',
      task: fullTask
    });
  } catch (error) {
    console.error('[API Create Task Error]:', error.message);
    res.status(500).json({ error: 'Error al crear la tarea.' });
  }
});

/**
 * PATCH /api/tasks/:id/instructions
 * Updates step-by-step instructions for a task
 */
router.patch('/tasks/:id/instructions', optionalToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { instructions = '' } = req.body;

    const updateQuery = `
      UPDATE tasks 
      SET instructions = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [instructions.trim(), taskId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }

    const updatedTask = result.rows[0];

    const io = req.app.get('socketio');
    if (io && updatedTask.project_id) {
      io.to(`project_${updatedTask.project_id}`).emit('task_status_changed', updatedTask);
    }

    res.json({
      success: true,
      message: 'Instrucciones actualizadas con éxito.',
      task: updatedTask
    });
  } catch (error) {
    console.error('[API Task Instructions Error]:', error.message);
    res.status(500).json({ error: 'Error al actualizar instrucciones de la tarea.' });
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Transitions task through: TODO -> IN_PROGRESS -> REVIEW -> DONE
 * When marked as DONE, marks completed_at and moves to task history!
 */
router.patch('/tasks/:id/status', optionalToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { status, completion_notes } = req.body;

    const allowed = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Estado inválido: ${status}` });
    }

    const isDone = status === 'DONE';
    const notes = completion_notes !== undefined ? (completion_notes ? String(completion_notes).trim() : '') : null;
    const updateQuery = `
      UPDATE tasks 
      SET status = $1, 
          is_archived = $2, 
          completed_at = CASE WHEN $2 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
          completion_notes = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE completion_notes END,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $4 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [status, isDone, notes, taskId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }

    const updatedTask = result.rows[0];

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${updatedTask.project_id}`).emit('task_status_changed', updatedTask);
      io.emit('task_status_changed', updatedTask);
    }

    res.json({
      success: true,
      message: isDone ? 'Tarea completada y movida al Historial.' : 'Estado de tarea actualizado.',
      task: updatedTask
    });
  } catch (error) {
    console.error('[API Update Task Status Error]:', error.message);
    res.status(500).json({ error: 'Error al cambiar estado.' });
  }
});

/**
 * POST /api/tasks/:id/commit
 * Links a specific GitHub commit (hash, repo, message) to this task.
 */
router.post('/tasks/:id/commit', optionalToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { hash, message, repo } = req.body;

    if (!hash || !hash.trim()) {
      return res.status(400).json({ error: 'El hash o identificador del commit es requerido.' });
    }

    const cleanHash = hash.trim().replace(/^#/, '').substring(0, 7);
    const taskRes = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }
    const task = taskRes.rows[0];

    // Determine target repository
    const projRes = await db.query('SELECT github_repo FROM projects WHERE id = $1', [task.project_id]);
    let targetRepo = 'edwin-esquivel-ADSO/GitFlow';
    if (repo && repo.trim()) {
      targetRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '');
    } else if (projRes.rows.length > 0 && projRes.rows[0].github_repo) {
      targetRepo = projRes.rows[0].github_repo.split(',')[0].trim();
    }

    const commitUrl = `https://github.com/${targetRepo}/commit/${cleanHash}`;
    const authorUsername = req.user ? req.user.username : 'developer';
    const commitMsg = message && message.trim() ? message.trim() : `feat: avance en tarea #${taskId} [${targetRepo}]`;

    const insertCommitRes = await db.query(`
      INSERT INTO commits (project_id, task_id, user_id, hash, message, author_name, url, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [task.project_id, taskId, req.user ? req.user.id : 1, cleanHash, commitMsg, authorUsername, commitUrl]);

    const savedCommit = insertCommitRes.rows[0];

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${task.project_id}`).emit('new_commit', {
        commit: savedCommit,
        task_id: taskId,
        task
      });
      io.emit('new_commit', {
        commit: savedCommit,
        task_id: taskId,
        task
      });
    }

    res.json({
      success: true,
      message: `Commit #${cleanHash} vinculado exitosamente a la tarea.`,
      commit: savedCommit
    });
  } catch (error) {
    console.error('[API Link Task Commit Error]:', error.message);
    res.status(500).json({ error: 'Error al vincular commit a la tarea.' });
  }
});

/**
 * GET /api/projects/:id/history
 * Dedicated history of completed tasks (DONE)
 */
router.get('/projects/:id/history', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const access = await getRoomAccess(projectId, req.user);

    if (access.notFound) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        error: 'No perteneces a esta sala.',
        notMember: true,
        tasks: []
      });
    }

    const userId = req.user ? req.user.id : null;
    const isOwner = access.isOwner;

    let query;
    let params;

    if (isOwner || !userId) {
      query = `
        SELECT t.*, u.username as assigned_username, u.name as assigned_name,
               COALESCE(u.custom_avatar, u.avatar_url) as assigned_avatar_url,
               p.name as project_name, COALESCE(p.status, 'ACTIVE') as project_status
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to_user_id
        LEFT JOIN projects p ON p.id = t.project_id
        WHERE t.project_id = $1 AND (t.status = 'DONE' OR t.is_archived = true)
        ORDER BY t.completed_at DESC NULLS LAST
      `;
      params = [projectId];
    } else {
      query = `
        SELECT t.*, u.username as assigned_username, u.name as assigned_name,
               COALESCE(u.custom_avatar, u.avatar_url) as assigned_avatar_url,
               p.name as project_name, COALESCE(p.status, 'ACTIVE') as project_status
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to_user_id
        LEFT JOIN projects p ON p.id = t.project_id
        WHERE t.project_id = $1 AND (t.status = 'DONE' OR t.is_archived = true) AND t.assigned_to_user_id = $2
        ORDER BY t.completed_at DESC NULLS LAST
      `;
      params = [projectId, userId];
    }

    const result = await db.query(query, params);
    res.json({ success: true, history: result.rows, isOwner });
  } catch (error) {
    console.error('[API Task History Error]:', error.message);
    res.status(500).json({ error: 'Error al consultar historial de tareas.' });
  }
});

// -----------------------------------------------------------------------------
// 3. PROJECT DOCUMENTS & CONTEXT REPOSITORY (.MD, .PDF, .DOCX, IMG, FOLDERS)
// -----------------------------------------------------------------------------

/**
 * GET /api/projects/:id/documents
 * Returns documents organized by folder categories
 */
router.get('/projects/:id/documents', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const access = await getRoomAccess(projectId, req.user);

    if (access.notFound) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        error: 'No perteneces a esta sala.',
        notMember: true,
        documents: [],
        folders: {}
      });
    }

    const query = `
      SELECT d.*, u.username as author_username, u.name as author_name
      FROM project_documents d
      LEFT JOIN users u ON u.id = d.created_by_user_id
      WHERE d.project_id = $1
      ORDER BY d.folder_name ASC, d.id ASC
    `;
    const result = await db.query(query, [projectId]);

    // Group documents by folder
    const folders = {};
    result.rows.forEach(doc => {
      const folder = doc.folder_name || 'General';
      if (!folders[folder]) folders[folder] = [];
      folders[folder].push(doc);
    });

    res.json({
      success: true,
      documents: result.rows,
      folders
    });
  } catch (error) {
    console.error('[API Documents Error]:', error.message);
    res.status(500).json({ error: 'Error al consultar documentos del proyecto.' });
  }
});

/**
 * POST /api/projects/:id/documents
 * Add or upload a new project document or link
 */
router.post('/projects/:id/documents', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { folder_name = 'General', title, file_type = 'md', file_url = '', content_markdown = '' } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'El título del documento es obligatorio.' });
    }

    const insertQuery = `
      INSERT INTO project_documents (project_id, folder_name, title, file_type, file_url, content_markdown, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const insertRes = await db.query(insertQuery, [
      projectId,
      folder_name.trim(),
      title.trim(),
      file_type,
      file_url.trim(),
      content_markdown,
      req.user.id
    ]);

    const doc = insertRes.rows[0];

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${projectId}`).emit('document_added', doc);
    }

    res.status(201).json({
      success: true,
      message: 'Documento registrado con éxito.',
      document: doc
    });
  } catch (error) {
    console.error('[API Add Document Error]:', error.message);
    res.status(500).json({ error: 'Error al registrar documento.' });
  }
});

/**
 * PUT /api/projects/:id/context
 * Update shared live markdown context
 */
router.put('/projects/:id/context', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { context_markdown } = req.body;

    const updateQuery = `
      UPDATE projects 
      SET context_markdown = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name, github_repo, context_markdown, updated_at
    `;
    const result = await db.query(updateQuery, [context_markdown, projectId]);

    const updated = result.rows[0];
    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${projectId}`).emit('context_updated', {
        projectId,
        context_markdown,
        updated_by: req.user.username,
        updated_at: updated.updated_at
      });
    }

    res.json({ success: true, project: updated });
  } catch (error) {
    console.error('[API Update Context Error]:', error.message);
    res.status(500).json({ error: 'Error al actualizar contexto.' });
  }
});

// -----------------------------------------------------------------------------
// 4. USER PROFILE (MI PERFIL & PERSONAL HISTORY)
// -----------------------------------------------------------------------------

/**
 * GET /api/users/profile/me
 * Retrieves current user's profile, custom avatar, completed tasks, and telemetry
 */
router.get('/users/profile/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const userProfile = userRes.rows[0];

    // Personal completed tasks (preserves tasks even if the room is deleted or suspended)
    const completedTasksRes = await db.query(`
      SELECT t.*, p.name as project_name, COALESCE(p.status, 'ACTIVE') as project_status 
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.assigned_to_user_id = $1 AND (t.status = 'DONE' OR t.is_archived = true)
      ORDER BY t.completed_at DESC NULLS LAST
    `, [userId]);

    // Personal commits
    const commitsRes = await db.query(`
      SELECT * FROM commits WHERE user_id = $1 OR author_name = $2 ORDER BY timestamp DESC LIMIT 20
    `, [userId, userProfile.username]);

    const completedCount = completedTasksRes.rows.length;
    const commitsCount = commitsRes.rows.length;
    const impactScore = (commitsCount * 10) + (completedCount * 25);

    res.json({
      success: true,
      profile: {
        id: userProfile.id,
        username: userProfile.username,
        name: userProfile.name,
        email: userProfile.email,
        bio: userProfile.bio,
        avatar_url: userProfile.avatar_url,
        custom_avatar: userProfile.custom_avatar || userProfile.avatar_url,
        stats: {
          completedTasksCount: completedCount,
          commitsCount,
          impactScore
        },
        completedTasks: completedTasksRes.rows,
        recentCommits: commitsRes.rows
      }
    });
  } catch (error) {
    console.error('[API Profile Error]:', error.message);
    res.status(500).json({ error: 'Error al consultar perfil personal.' });
  }
});

/**
 * PATCH /api/users/profile/me
 * Updates custom avatar, photo/icon, display name and bio
 */
router.patch('/users/profile/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, custom_avatar, bio } = req.body;

    const updateQuery = `
      UPDATE users 
      SET name = COALESCE($1, name),
          custom_avatar = COALESCE($2, custom_avatar),
          bio = COALESCE($3, bio),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, username, name, email, avatar_url, custom_avatar, bio
    `;
    const result = await db.query(updateQuery, [name, custom_avatar, bio, userId]);

    res.json({
      success: true,
      message: 'Perfil actualizado con éxito.',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('[API Update Profile Error]:', error.message);
    res.status(500).json({ error: 'Error al actualizar perfil.' });
  }
});

// -----------------------------------------------------------------------------
// 5. ANALYTICS & DASHBOARD METRICS
// -----------------------------------------------------------------------------

router.get('/projects/:id/dashboard', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const access = await getRoomAccess(projectId, req.user);

    if (access.notFound) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        error: 'No perteneces a esta sala.',
        notMember: true
      });
    }

    const tasksRes = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM tasks 
      WHERE project_id = $1 
      GROUP BY status
    `, [projectId]);

    const taskCounts = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0, total: 0 };
    tasksRes.rows.forEach(r => {
      const c = parseInt(r.count, 10);
      taskCounts[r.status] = c;
      taskCounts.total += c;
    });

    const commitsRes = await db.query(`
      SELECT c.*, t.title as task_title 
      FROM commits c
      LEFT JOIN tasks t ON t.id = c.task_id
      WHERE c.project_id = $1
      ORDER BY c.timestamp DESC LIMIT 25
    `, [projectId]);

    const usersRes = await db.query('SELECT id, username, name, avatar_url, custom_avatar FROM users');
    const contributors = usersRes.rows.map(user => {
      const userCommits = commitsRes.rows.filter(c => c.author_name === user.username);
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar_url: user.custom_avatar || user.avatar_url,
        commits_count: userCommits.length,
        impact_score: (userCommits.length * 10) + (user.id === 1 ? 50 : 25)
      };
    }).sort((a, b) => b.impact_score - a.impact_score);

    const completionRate = taskCounts.total > 0 ? Math.round((taskCounts.DONE / taskCounts.total) * 100) : 0;

    res.json({
      success: true,
      data: {
        taskCounts,
        completionRate,
        totalCommits: commitsRes.rows.length,
        recentCommits: commitsRes.rows,
        contributors
      }
    });
  } catch (error) {
    console.error('[API Dashboard Error]:', error.message);
    res.status(500).json({ error: 'Error al calcular analítica.' });
  }
});

router.get('/users', optionalToken, async (req, res) => {
  try {
    const usersRes = await db.query('SELECT id, username, name, avatar_url, custom_avatar, email FROM users ORDER BY id ASC');
    res.json({ success: true, users: usersRes.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

// -----------------------------------------------------------------------------
// 6. ROOM AI CHATBOT (ASISTENTE INTELIGENTE INDEPENDIENTE POR SALA)
// -----------------------------------------------------------------------------

/**
 * POST /api/projects/:id/chatbot
 * Room-specific assistant that reads project context, documents, active tasks,
 * completed tasks, and telemetry to answer questions about the room and team members.
 */
router.post('/projects/:id/chatbot', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const access = await getRoomAccess(projectId, req.user);

    if (access.notFound) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        error: 'No perteneces a esta sala.',
        notMember: true
      });
    }

    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'El mensaje de la consulta es requerido.' });
    }

    const queryText = message.trim().toLowerCase();

    // 1. Fetch Room details
    const projRes = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }
    const project = projRes.rows[0];

    // 2. Fetch Tasks
    const tasksRes = await db.query(`
      SELECT t.*, u.username as assigned_username, u.name as assigned_name 
      FROM tasks t 
      LEFT JOIN users u ON u.id = t.assigned_to_user_id 
      WHERE t.project_id = $1
    `, [projectId]);
    const allTasks = tasksRes.rows;
    const activeTasks = allTasks.filter(t => t.status !== 'DONE' && !t.is_archived);
    const completedTasks = allTasks.filter(t => t.status === 'DONE' || t.is_archived);

    // 3. Fetch Documents
    const docsRes = await db.query('SELECT * FROM project_documents WHERE project_id = $1', [projectId]);
    const documents = docsRes.rows;

    // 4. Fetch Commits
    const commitsRes = await db.query('SELECT * FROM commits WHERE project_id = $1 ORDER BY timestamp DESC LIMIT 20', [projectId]);
    const commits = commitsRes.rows;

    // 5. Fetch Members
    const usersRes = await db.query('SELECT id, username, name FROM users');
    const allUsers = usersRes.rows;

    let reply = '';
    const suggestions = [];

    // CASE A: User checks specific team member (e.g., "edwin", "maria", "alex", or user by name)
    const targetUser = allUsers.find(u => 
      queryText.includes(u.username.toLowerCase()) || 
      (u.name && queryText.includes(u.name.toLowerCase().split(' ')[0]))
    );

    if (targetUser) {
      const userTasks = activeTasks.filter(t => t.assigned_to_user_id === targetUser.id);
      const userDone = completedTasks.filter(t => t.assigned_to_user_id === targetUser.id);
      const userCommits = commits.filter(c => c.author_name === targetUser.username || c.user_id === targetUser.id);

      reply = `### 👤 Reporte de Actividad: **${targetUser.name || targetUser.username}** (@${targetUser.username})\n\n`;

      if (userTasks.length > 0) {
        reply += `**📋 Tareas Pendientes / En Progreso (${userTasks.length}):**\n`;
        userTasks.forEach(t => {
          reply += `- **#${t.id} ${t.title}** · Estado: \`${t.status}\` · Prioridad: \`${t.priority}\`\n`;
        });
      } else {
        reply += `✅ **No tiene tareas pendientes** en esta sala actualmente.\n`;
      }

      if (userDone.length > 0) {
        reply += `\n**🏆 Tareas Completadas en Historial (${userDone.length}):**\n`;
        userDone.slice(0, 5).forEach(t => {
          reply += `- ~~#${t.id} ${t.title}~~ *(Cerrada con éxito)*\n`;
        });
      }

      if (userCommits.length > 0) {
        reply += `\n**📡 Commits Recientes Registrados (${userCommits.length}):**\n`;
        userCommits.slice(0, 4).forEach(c => {
          reply += `- \`${c.hash}\`: ${c.message}\n`;
        });
      } else {
        reply += `\n*No hay commits recientes asociados a este desarrollador en esta sala.*\n`;
      }

      suggestions.push('¿Qué tareas faltan en la sala?', '¿De qué trata esta sala?', 'Ver documentos de la sala');
    }
    // CASE B: About room purpose / topic ("de que trata", "objetivo", "resumen", "contexto")
    else if (queryText.includes('trata') || queryText.includes('objetivo') || queryText.includes('resumen') || queryText.includes('contexto') || queryText.includes('que es')) {
      reply = `### 🎯 Propósito de la Sala: **${project.name}**\n\n`;
      reply += `**Descripción:** ${project.description || 'Sala de desarrollo y telemetría ágil.'}\n\n`;
      reply += `**Repositorio de GitHub Conectado:** \`${project.github_repo}\`\n\n`;
      reply += `**Contexto Técnico Documentado:**\n`;
      reply += `${project.context_markdown ? project.context_markdown.substring(0, 400) + '...' : 'Contexto técnico en proceso de redacción.'}\n\n`;
      reply += `📊 **Resumen del Sprint:** Faltan **${activeTasks.length} tareas** por completar y se han archivado **${completedTasks.length} tareas** en el historial.`;

      suggestions.push('¿Qué tareas faltan por hacer?', '¿Qué ha hecho Edwin?', '¿Qué documentos hay?');
    }
    // CASE C: Pending tasks / What's missing ("que tareas faltan", "pendientes", "por hacer", "en progreso")
    else if (queryText.includes('tareas') || queryText.includes('falta') || queryText.includes('pendiente') || queryText.includes('progreso')) {
      reply = `### 📋 Tareas Pendientes en la Sala (${activeTasks.length} activas):\n\n`;

      if (activeTasks.length === 0) {
        reply += `🎉 ¡Excelente noticia! Todas las tareas de esta sala han sido completadas y movidas al historial.\n`;
      } else {
        activeTasks.forEach(t => {
          reply += `- **#${t.id} ${t.title}**\n  - Estado: \`${t.status}\` · Prioridad: \`${t.priority}\`\n  - Asignado a: **@${t.assigned_username || 'Sin asignar'}**\n`;
        });
        reply += `\n💡 *Tip: Puedes cerrar cualquier tarea automáticamente haciendo un commit con "fixes #${activeTasks[0]?.id}".*`;
      }

      suggestions.push('¿Qué ha hecho @edwin-esquivel?', '¿De qué trata esta sala?', '¿Cuáles fueron los últimos commits?');
    }
    // CASE D: Documents & Files ("documentos", "archivos", "carpetas", "pdf", "word")
    else if (queryText.includes('documento') || queryText.includes('archivo') || queryText.includes('carpeta') || queryText.includes('pdf') || queryText.includes('doc')) {
      reply = `### 📁 Repositorio de Documentos de la Sala (${documents.length} archivos):\n\n`;
      
      const folders = {};
      documents.forEach(d => {
        const f = d.folder_name || 'General';
        if (!folders[f]) folders[f] = [];
        folders[f].push(d);
      });

      Object.keys(folders).forEach(fName => {
        reply += `**📂 Carpeta: ${fName} (${folders[fName].length})**\n`;
        folders[fName].forEach(doc => {
          reply += `- [${doc.file_type.toUpperCase()}] **${doc.title}** *(Autor: @${doc.created_by_user_id === 1 ? 'edwin-esquivel' : 'equipo'})*\n`;
        });
        reply += `\n`;
      });

      suggestions.push('¿De qué trata esta sala?', '¿Qué tareas faltan?', '¿Qué commits hay?');
    }
    // CASE E: Commits ("commits", "telemetria", "pushes")
    else if (queryText.includes('commit') || queryText.includes('telemetria') || queryText.includes('push')) {
      reply = `### 📡 Telemetría de Commits Recientes (${commits.length} registrados):\n\n`;
      commits.slice(0, 5).forEach(c => {
        reply += `- \`${c.hash}\`: **${c.message}** · Autor: @${c.author_name}\n`;
      });
      suggestions.push('¿Qué ha hecho @edwin-esquivel?', '¿Qué tareas faltan?', '¿De qué trata esta sala?');
    }
    // DEFAULT CASE
    else {
      reply = `Hola, soy **GitBot**, el asistente inteligente de la sala **${project.name}**.\n\nPuedo responderte sobre:\n- 🎯 **De qué trata la sala y sus requerimientos técnicos**.\n- ⏳ **Cuáles tareas faltan por hacer y quién las tiene asignadas**.\n- 👤 **El trabajo, commits y tareas realizadas por cualquier desarrollador** (ej: *"¿Qué ha hecho Edwin?"*).\n- 📁 **La documentación y archivos guardados en las carpetas**.\n\n¿En qué te puedo ayudar?`;
      suggestions.push('¿De qué trata esta sala?', '¿Qué tareas faltan por hacer?', '¿Qué ha hecho @edwin-esquivel?');
    }

    res.json({
      success: true,
      reply,
      suggestions,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[API Chatbot Error]:', error.message);
    res.status(500).json({ error: 'Error al consultar el asistente de la sala.' });
  }
});

// -----------------------------------------------------------------------------
// 7. COMMIT HEALTH TRACKING & RESILIENT ROLLBACK ENGINE
// -----------------------------------------------------------------------------

/**
 * GET /api/projects/:id/commit-health
 * Evaluates commits health and identifies the last known healthy state
 */
router.get('/projects/:id/commit-health', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const access = await getRoomAccess(projectId, req.user);

    if (access.notFound) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        error: 'No perteneces a esta sala.',
        notMember: true,
        commits: []
      });
    }

    const commitsRes = await db.query('SELECT * FROM commits WHERE project_id = $1 ORDER BY timestamp DESC', [projectId]);
    const commits = commitsRes.rows;

    // Evaluate health of each commit
    const evaluatedCommits = commits.map(c => {
      const msg = (c.message || '').toLowerCase();
      const isFaulty = msg.includes('broken') || 
                       msg.includes('error') || 
                       msg.includes('fallo') || 
                       msg.includes('dañino') || 
                       msg.includes('fail') || 
                       c.is_faulty === true;
      return {
        ...c,
        is_faulty: isFaulty,
        health_status: isFaulty ? 'FAULTY' : 'HEALTHY'
      };
    });

    const healthyCommits = evaluatedCommits.filter(c => !c.is_faulty);
    const lastStable = healthyCommits.length > 0 ? healthyCommits[0] : (commits[0] || null);
    const faultyCommits = evaluatedCommits.filter(c => c.is_faulty);

    res.json({
      success: true,
      totalTracked: commits.length,
      lastStableCommit: lastStable,
      faultyCommits,
      evaluatedCommits: evaluatedCommits.slice(0, 10),
      hasErrors: faultyCommits.length > 0,
      status: faultyCommits.length > 0 ? 'WARNING' : 'OPTIMAL'
    });
  } catch (error) {
    console.error('[Commit Health Error]:', error.message);
    res.status(500).json({ error: 'Error al evaluar salud de commits.' });
  }
});

/**
 * POST /api/projects/:id/commits/:hash/toggle-faulty
 * Flags or unflags a specific commit as faulty/harmful (dañino).
 */
router.post('/projects/:id/commits/:hash/toggle-faulty', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { hash } = req.params;
    const { is_faulty } = req.body;

    // Check if commit exists
    const commitRes = await db.query('SELECT * FROM commits WHERE project_id = $1 AND hash = $2', [projectId, hash]);
    if (commitRes.rows.length === 0) {
      return res.status(404).json({ error: 'Commit no encontrado en esta sala.' });
    }

    const currentCommit = commitRes.rows[0];
    const newFaultyStatus = typeof is_faulty === 'boolean' ? is_faulty : !currentCommit.is_faulty;

    await db.query(`
      UPDATE commits 
      SET is_faulty = $1 
      WHERE project_id = $2 AND hash = $3
    `, [newFaultyStatus, projectId, hash]);

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${projectId}`).emit('commit_health_changed', {
        projectId,
        hash,
        is_faulty: newFaultyStatus
      });
    }

    res.json({
      success: true,
      message: newFaultyStatus 
        ? `Commit #${hash} marcado como dañino / con falla.` 
        : `Commit #${hash} marcado como saludable / funcional.`,
      hash,
      is_faulty: newFaultyStatus
    });
  } catch (error) {
    console.error('[Toggle Faulty Commit Error]:', error.message);
    res.status(500).json({ error: 'Error al actualizar estado del commit.' });
  }
});

/**
 * POST /api/projects/:id/rollback
 * Restores project tasks to the last verified stable checkpoint
 */
router.post('/projects/:id/rollback', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);

    // Rollback any erroneous 'DONE' or broken tasks to stable 'TODO' or 'IN_PROGRESS'
    await db.query(`
      UPDATE tasks 
      SET status = 'IN_PROGRESS', is_archived = false, updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $1 AND status = 'DONE' AND completed_at > NOW() - INTERVAL '30 minutes'
    `, [projectId]);

    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${projectId}`).emit('project_rolled_back', {
        projectId,
        rolledBackBy: req.user.username,
        timestamp: new Date()
      });
      io.emit('project_rolled_back', { projectId });
    }

    res.json({
      success: true,
      message: '¡Punto de restauración aplicado exitosamente! Las tareas y el estado de la sala han vuelto al último punto estable verificado.'
    });
  } catch (error) {
    console.error('[Rollback Error]:', error.message);
    res.status(500).json({ error: 'Error al ejecutar restauración.' });
  }
});

module.exports = router;


