const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * 1. POST /api/webhook/github
 * Listens for GitHub Webhook events (Push, Ping)
 */
router.post('/github', async (req, res) => {
  const event = req.headers['x-github-event'] || 'push';
  const payload = req.body;

  // Handle GitHub Ping event
  if (event === 'ping') {
    console.log('[GitHub Webhook] Received Ping event. Webhook is healthy.');
    return res.status(200).json({ message: 'Pong! Webhook configured successfully on GitFlow.' });
  }

  if (event !== 'push') {
    return res.status(200).json({ message: `Ignored event: ${event}` });
  }

  try {
    const io = req.app.get('socketio');
    const repoFullName = payload.repository ? payload.repository.full_name : null;
    const commits = payload.commits || [];

    if (commits.length === 0) {
      return res.status(200).json({ message: 'No commits in payload to process.' });
    }

    // Find the associated project in DB
    let projectResult;
    if (repoFullName) {
      projectResult = await db.query('SELECT * FROM projects WHERE github_repo = $1', [repoFullName]);
    }

    let projectId = 1; // Default to main project if not matched
    if (projectResult && projectResult.rows.length > 0) {
      projectId = projectResult.rows[0].id;
    }

    const processed = [];

    // Process each commit
    for (const commit of commits) {
      const commitHash = (commit.id || commit.sha || 'hash_' + Date.now()).substring(0, 7);
      const commitMessage = commit.message || 'Sin mensaje de commit';
      const commitUrl = commit.url || (payload.repository ? `${payload.repository.html_url}/commit/${commit.id}` : '');
      const authorUsername = (commit.author && (commit.author.username || commit.author.name)) || 'developer';
      const commitTimestamp = commit.timestamp ? new Date(commit.timestamp) : new Date();

      // Find user id in DB
      let userId = null;
      const userRes = await db.query('SELECT id FROM users WHERE username = $1', [authorUsername]);
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
      }

      // Extract Task ID from commit message via RegEx
      // Examples: "feat: login integrado #12", "fixes #5", "close #3", "task #7"
      const taskRegex = /#(\d+)/i;
      const match = commitMessage.match(taskRegex);

      let taskId = null;
      let updatedTask = null;

      if (match && match[1]) {
        const extractedTaskId = parseInt(match[1], 10);
        const taskCheck = await db.query('SELECT * FROM tasks WHERE id = $1 AND project_id = $2', [extractedTaskId, projectId]);

        if (taskCheck.rows.length > 0) {
          taskId = extractedTaskId;
          const currentTask = taskCheck.rows[0];

          // Check if message indicates closure (e.g., "fix #1", "closes #1", "resolves #1")
          const closeRegex = /(?:fix|fixes|fixed|close|closes|closed|resolve|resolves|resolvido)\s+#\d+/i;
          if (closeRegex.test(commitMessage) && currentTask.status !== 'DONE') {
            const updateStatusQuery = `
              UPDATE tasks 
              SET status = 'DONE', updated_at = CURRENT_TIMESTAMP 
              WHERE id = $1 
              RETURNING *
            `;
            const updatedTaskRes = await db.query(updateStatusQuery, [taskId]);
            updatedTask = updatedTaskRes.rows[0];
          } else if (currentTask.status === 'TODO') {
            // Auto-advance from TODO to IN_PROGRESS on initial commit
            const advanceTaskQuery = `
              UPDATE tasks 
              SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP 
              WHERE id = $1 
              RETURNING *
            `;
            const advancedTaskRes = await db.query(advanceTaskQuery, [taskId]);
            updatedTask = advancedTaskRes.rows[0];
          }
        }
      }

      // Insert commit record in PostgreSQL using Prepared Statement
      const insertCommitQuery = `
        INSERT INTO commits (project_id, task_id, user_id, hash, message, author_name, url, timestamp) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
      `;
      const commitInsertRes = await db.query(insertCommitQuery, [
        projectId,
        taskId,
        userId,
        commitHash,
        commitMessage,
        authorUsername,
        commitUrl,
        commitTimestamp
      ]);

      const savedCommit = commitInsertRes.rows[0];
      processed.push(savedCommit);

      // Emit real-time WebSocket events to all subscribers
      if (io) {
        const eventPayload = {
          commit: savedCommit,
          task_id: taskId,
          task: updatedTask,
          author: {
            username: authorUsername,
            avatar_url: `https://github.com/${authorUsername}.png`
          },
          repo: repoFullName,
          received_at: new Date()
        };

        // Broadcast to general room and project specific room
        io.emit('new_commit', eventPayload);
        io.to(`project_${projectId}`).emit('new_commit', eventPayload);

        if (updatedTask) {
          io.emit('task_status_changed', updatedTask);
          io.to(`project_${projectId}`).emit('task_status_changed', updatedTask);
        }
      }
    }

    console.log(`[GitHub Webhook] Processed ${processed.length} commit(s) successfully.`);

    return res.status(200).json({
      success: true,
      message: `${processed.length} commit(s) vinculados y telemetría transmitida.`,
      commits: processed
    });
  } catch (error) {
    console.error('[GitHub Webhook Error]:', error.message);
    return res.status(500).json({
      error: 'Error al procesar el webhook de GitHub.',
      details: error.message
    });
  }
});

/**
 * 2. POST /api/webhook/simulate
 * Developer endpoint to simulate GitHub commits without configuring ngrok/smee.
 */
router.post('/simulate', async (req, res) => {
  const {
    message = 'feat: telemetría en tiempo real #3',
    author = 'edwin-esquivel',
    repo = 'edwin-esquivel-ADSO/GitFlow',
    taskId = 3
  } = req.body;

  const mockPayload = {
    repository: {
      full_name: repo,
      html_url: `https://github.com/${repo}`
    },
    commits: [
      {
        id: Math.random().toString(16).substring(2, 9) + 'f0a1',
        message: message.includes('#') ? message : `${message} #${taskId}`,
        timestamp: new Date().toISOString(),
        url: `https://github.com/${repo}/commit/sim_${Date.now()}`,
        author: {
          username: author,
          name: author
        }
      }
    ]
  };

  req.body = mockPayload;
  req.headers['x-github-event'] = 'push';

  // Delegate to webhook handler
  return router.handle(req, res);
});

module.exports = router;
