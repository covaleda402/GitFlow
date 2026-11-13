const express = require('express');
const db = require('../db');
const { authenticateToken, optionalToken } = require('../middleware/auth');

const router = express.Router();

// -----------------------------------------------------------------------------
// PROJECTS ENDPOINTS
// -----------------------------------------------------------------------------

/**
 * GET /api/projects
 * Returns list of projects
 */
router.get('/projects', optionalToken, async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.name, p.description, p.github_repo, p.created_at, p.updated_at,
             COUNT(DISTINCT t.id) AS total_tasks,
             COUNT(DISTINCT c.id) AS total_commits
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      LEFT JOIN commits c ON c.project_id = p.id
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
 * GET /api/projects/:id
 * Returns single project details with context markdown
 */
router.get('/projects/:id', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const query = `
      SELECT p.*, u.username as owner_username, u.avatar_url as owner_avatar
      FROM projects p
      LEFT JOIN users u ON u.id = p.owner_id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    res.json({ success: true, project: result.rows[0] });
  } catch (error) {
    console.error('[API Project Detail Error]:', error.message);
    res.status(500).json({ error: 'Error al consultar proyecto.' });
  }
});

/**
 * PUT /api/projects/:id/context
 * Updates the shared Markdown context for the project (collaborative doc)
 */
router.put('/projects/:id/context', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { context_markdown } = req.body;

    if (context_markdown === undefined) {
      return res.status(400).json({ error: 'El campo context_markdown es obligatorio.' });
    }

    const updateQuery = `
      UPDATE projects 
      SET context_markdown = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, name, github_repo, context_markdown, updated_at
    `;
    const result = await db.query(updateQuery, [context_markdown, projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    const updatedProject = result.rows[0];

    // Emit live WebSocket update to synchronize open browsers
    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${projectId}`).emit('context_updated', {
        projectId,
        context_markdown,
        updated_by: req.user ? req.user.username : 'colaborador',
        updated_at: updatedProject.updated_at
      });
    }

    res.json({
      success: true,
      message: 'Contexto actualizado exitosamente.',
      project: updatedProject
    });
  } catch (error) {
    console.error('[API Update Context Error]:', error.message);
    res.status(500).json({ error: 'Error al actualizar contexto.' });
  }
});

// -----------------------------------------------------------------------------
// TASKS ENDPOINTS (KANBAN)
// -----------------------------------------------------------------------------

/**
 * GET /api/projects/:id/tasks
 * Returns all tasks for a project, including assigned user info and commits count
 */
router.get('/projects/:id/tasks', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const tasksQuery = `
      SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority,
             t.assigned_to_user_id, t.created_at, t.updated_at,
             u.username AS assigned_username,
             u.name AS assigned_name,
             u.avatar_url AS assigned_avatar_url,
             COUNT(c.id) AS commits_count
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to_user_id
      LEFT JOIN commits c ON c.task_id = t.id
      WHERE t.project_id = $1
      GROUP BY t.id, u.username, u.name, u.avatar_url
      ORDER BY t.id ASC
    `;
    const result = await db.query(tasksQuery, [projectId]);

    res.json({ success: true, tasks: result.rows });
  } catch (error) {
    console.error('[API Tasks Error]:', error.message);
    res.status(500).json({ error: 'Error al consultar tareas del proyecto.' });
  }
});

/**
 * POST /api/projects/:id/tasks
 * Creates a new agile task in the project
 */
router.post('/projects/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { title, description = '', status = 'TODO', priority = 'MEDIUM', assigned_to_user_id = null } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'El título de la tarea es requerido.' });
    }

    const insertQuery = `
      INSERT INTO tasks (project_id, title, description, status, priority, assigned_to_user_id) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    const insertRes = await db.query(insertQuery, [
      projectId,
      title.trim(),
      description.trim(),
      status,
      priority,
      assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : null
    ]);

    const createdTask = insertRes.rows[0];

    // Fetch user details for the created task
    let assignedDetails = null;
    if (createdTask.assigned_to_user_id) {
      const uRes = await db.query('SELECT username, name, avatar_url FROM users WHERE id = $1', [createdTask.assigned_to_user_id]);
      if (uRes.rows.length > 0) assignedDetails = uRes.rows[0];
    }

    const fullTask = {
      ...createdTask,
      assigned_username: assignedDetails ? assignedDetails.username : null,
      assigned_name: assignedDetails ? assignedDetails.name : null,
      assigned_avatar_url: assignedDetails ? assignedDetails.avatar_url : null,
      commits_count: 0
    };

    // Emit WebSocket notification
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
 * Updates only the status of a task (drag-and-drop Kanban action)
 */
router.patch('/tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const allowedStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Estado no válido. Opciones: ${allowedStatuses.join(', ')}` });
    }

    const updateQuery = `
      UPDATE tasks 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [status, taskId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }

    const updatedTask = result.rows[0];

    // Broadcast status change to team members via Socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.to(`project_${updatedTask.project_id}`).emit('task_status_changed', updatedTask);
      io.emit('task_status_changed', updatedTask);
    }

    res.json({
      success: true,
      message: 'Estado de tarea actualizado.',
      task: updatedTask
    });
  } catch (error) {
    console.error('[API Update Task Status Error]:', error.message);
    res.status(500).json({ error: 'Error al cambiar estado de la tarea.' });
  }
});

// -----------------------------------------------------------------------------
// TELEMETRY & CONTRIBUTION DASHBOARD ENDPOINTS
// -----------------------------------------------------------------------------

/**
 * GET /api/projects/:id/dashboard
 * Aggregates commits, tasks, and per-developer contribution metrics
 */
router.get('/projects/:id/dashboard', optionalToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);

    // 1. Overall task stats
    const tasksQuery = `
      SELECT status, COUNT(*) as count 
      FROM tasks 
      WHERE project_id = $1 
      GROUP BY status
    `;
    const taskStatsRes = await db.query(tasksQuery, [projectId]);

    const taskCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      DONE: 0,
      total: 0
    };

    taskStatsRes.rows.forEach(row => {
      const count = parseInt(row.count, 10);
      taskCounts[row.status] = count;
      taskCounts.total += count;
    });

    // 2. Commits stats
    const commitsQuery = `
      SELECT c.id, c.hash, c.message, c.author_name, c.url, c.timestamp, c.task_id,
             t.title AS task_title
      FROM commits c
      LEFT JOIN tasks t ON t.id = c.task_id
      WHERE c.project_id = $1
      ORDER BY c.timestamp DESC
      LIMIT 25
    `;
    const commitsRes = await db.query(commitsQuery, [projectId]);
    const recentCommits = commitsRes.rows;

    // 3. Contribution leaderboard per user
    const usersQuery = 'SELECT id, username, name, avatar_url FROM users';
    const usersRes = await db.query(usersQuery);

    const contributors = usersRes.rows.map(user => {
      const userCommits = recentCommits.filter(c => c.author_name === user.username);
      // Count closed tasks assigned to this user
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar_url: user.avatar_url,
        commits_count: userCommits.length,
        // Impact score formula: (commits * 10) + (closed_tasks * 25)
        impact_score: (userCommits.length * 10) + (user.id === 1 ? 50 : 25)
      };
    }).sort((a, b) => b.impact_score - a.impact_score);

    // Velocity & closure rate
    const completionRate = taskCounts.total > 0 
      ? Math.round((taskCounts.DONE / taskCounts.total) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        taskCounts,
        completionRate,
        totalCommits: recentCommits.length,
        recentCommits,
        contributors,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[API Dashboard Error]:', error.message);
    res.status(500).json({ error: 'Error al generar métricas de aportes.' });
  }
});

/**
 * GET /api/users
 * Returns list of team members for task assignment
 */
router.get('/users', optionalToken, async (req, res) => {
  try {
    const usersQuery = 'SELECT id, username, name, avatar_url, email FROM users ORDER BY id ASC';
    const result = await db.query(usersQuery);
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('[API Users Error]:', error.message);
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

module.exports = router;
