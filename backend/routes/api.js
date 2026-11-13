const express = require('express');
const db = require('../db');
const { authenticateToken, optionalToken } = require('../middleware/auth');

const router = express.Router();

// -----------------------------------------------------------------------------
// 1. SALAS (ROOMS / PROJECTS) & DYNAMIC 5-MINUTE CODES
// -----------------------------------------------------------------------------

/**
 * GET /api/projects
 * Lists all projects/rooms accessible
 */
router.get('/projects', optionalToken, async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.name, p.description, p.github_repo, p.owner_id, p.created_at, p.updated_at,
             COUNT(DISTINCT t.id) AS total_tasks,
             COUNT(DISTINCT c.id) AS total_commits,
             COUNT(DISTINCT m.id) AS total_members
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id AND t.is_archived = false
      LEFT JOIN commits c ON c.project_id = p.id
      LEFT JOIN project_members m ON m.project_id = p.id
      GROUP BY p.id
      ORDER BY p.id ASC
    `;
    const result = await db.query(query);
    res.json({ success: true, projects: result.rows });
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
    const { name, description = '', github_repo = 'edwin-esquivel-ADSO/GitFlow', context_markdown = '' } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la sala es obligatorio.' });
    }

    const defaultMarkdown = context_markdown || `# ${name}\n\nDocumenta aquí las decisiones técnicas, arquitectura y requerimientos de esta sala.`;
    const insertProj = `
      INSERT INTO projects (name, description, github_repo, context_markdown, owner_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const projRes = await db.query(insertProj, [name.trim(), description.trim(), github_repo.trim(), defaultMarkdown, req.user.id]);
    const project = projRes.rows[0];

    // Assign owner membership
    await db.query(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'OWNER')
    `, [project.id, req.user.id]);

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
 * GET /api/projects/:id
 * Returns single room details, owner info and list of members
 */
router.get('/projects/:id', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const query = `
      SELECT p.*, u.username as owner_username, COALESCE(u.custom_avatar, u.avatar_url) as owner_avatar
      FROM projects p
      LEFT JOIN users u ON u.id = p.owner_id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

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

    const currentUserId = req.user ? req.user.id : null;
    const isOwner = project.owner_id === currentUserId;

    res.json({
      success: true,
      project: {
        ...project,
        isOwner,
        members: membersRes.rows
      }
    });
  } catch (error) {
    console.error('[API Project Detail Error]:', error.message);
    res.status(500).json({ error: 'Error al consultar sala.' });
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
    const userId = req.user ? req.user.id : null;

    // Check if user is owner
    const projRes = await db.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    const isOwner = projRes.rows.length > 0 && userId && projRes.rows[0].owner_id === userId;

    let tasksQuery;
    let params;

    if (isOwner || !userId) {
      // Owner or unauthenticated preview sees active tasks
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
        WHERE t.project_id = $1 AND t.is_archived = false
        GROUP BY t.id, u.username, u.name, u.custom_avatar, u.avatar_url
        ORDER BY t.id ASC
      `;
      params = [projectId];
    } else {
      // Regular Member sees personal tasks only
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
        WHERE t.project_id = $1 AND t.is_archived = false AND (t.assigned_to_user_id = $2 OR t.created_by_user_id = $2)
        GROUP BY t.id, u.username, u.name, u.custom_avatar, u.avatar_url
        ORDER BY t.id ASC
      `;
      params = [projectId, userId];
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
router.post('/projects/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { title, description = '', status = 'TODO', priority = 'MEDIUM', assigned_to_user_id } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'El título de la tarea es requerido.' });
    }

    const assignedId = assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : req.user.id;

    const insertQuery = `
      INSERT INTO tasks (project_id, title, description, status, priority, assigned_to_user_id, created_by_user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `;
    const insertRes = await db.query(insertQuery, [
      projectId,
      title.trim(),
      description.trim(),
      status,
      priority,
      assignedId,
      req.user.id
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
 * PATCH /api/tasks/:id/status
 * Transitions task through: TODO -> IN_PROGRESS -> REVIEW -> DONE
 * When marked as DONE, marks completed_at and moves to task history!
 */
router.patch('/tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const allowed = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Estado inválido: ${status}` });
    }

    const isDone = status === 'DONE';
    const updateQuery = `
      UPDATE tasks 
      SET status = $1, 
          is_archived = $2, 
          completed_at = CASE WHEN $2 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [status, isDone, taskId]);

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
 * GET /api/projects/:id/history
 * Dedicated history of completed tasks (DONE)
 */
router.get('/projects/:id/history', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const userId = req.user ? req.user.id : null;

    const projRes = await db.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    const isOwner = projRes.rows.length > 0 && userId && projRes.rows[0].owner_id === userId;

    let query;
    let params;

    if (isOwner || !userId) {
      query = `
        SELECT t.*, u.username as assigned_username, u.name as assigned_name,
               COALESCE(u.custom_avatar, u.avatar_url) as assigned_avatar_url
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to_user_id
        WHERE t.project_id = $1 AND (t.status = 'DONE' OR t.is_archived = true)
        ORDER BY t.completed_at DESC NULLS LAST
      `;
      params = [projectId];
    } else {
      query = `
        SELECT t.*, u.username as assigned_username, u.name as assigned_name,
               COALESCE(u.custom_avatar, u.avatar_url) as assigned_avatar_url
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to_user_id
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

    // Personal completed tasks
    const completedTasksRes = await db.query(`
      SELECT t.*, p.name as project_name 
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
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

module.exports = router;
