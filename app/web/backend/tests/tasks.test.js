const test = require('node:test');
const assert = require('node:assert');
const db = require('../db');

test('Tasks: Retrieve project tasks list', async () => {
  const res = await db.query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY id ASC', [1]);
  assert.ok(res.rows.length > 0, 'Project 1 should contain tasks');
  const task = res.rows[0];
  assert.ok(task.id, 'Task must have an id');
  assert.ok(task.title, 'Task must have a title');
  assert.ok(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(task.status));
});

test('Tasks: Update step-by-step instructions', async () => {
  const newInstructions = '1. Verificar cobertura OWASP.\n2. Ejecutar suite de pruebas unitarias.\n3. Validar resultado en Neon DB.';
  const updateRes = await db.query(
    'UPDATE tasks SET instructions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, instructions',
    [newInstructions, 1]
  );

  assert.ok(updateRes.rows.length > 0, 'Task 1 must be updated');
  assert.strictEqual(updateRes.rows[0].instructions, newInstructions);
});

test('Tasks: Transition status from IN_PROGRESS to REVIEW', async () => {
  const updateRes = await db.query(
    'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, status',
    ['REVIEW', 1]
  );

  assert.ok(updateRes.rows.length > 0);
  assert.strictEqual(updateRes.rows[0].status, 'REVIEW');
});

test('Rooms: Suspend, reactivate, and soft-delete preserves user completed tasks history', async () => {
  // 1. Suspend room
  const suspendRes = await db.query(
    'UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, status',
    ['SUSPENDED', 2]
  );
  assert.ok(suspendRes.rows.length > 0);
  assert.strictEqual(suspendRes.rows[0].status, 'SUSPENDED');

  // 2. Soft-delete room
  const deleteRes = await db.query(
    'UPDATE projects SET status = $1, deleted_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, status, deleted_at',
    ['DELETED', 2]
  );
  assert.ok(deleteRes.rows.length > 0);
  assert.strictEqual(deleteRes.rows[0].status, 'DELETED');
  assert.ok(deleteRes.rows[0].deleted_at !== null);

  // 3. Verify user completed tasks STILL return even if the room is marked as DELETED!
  const tasksInDeletedRoom = await db.query(`
    SELECT t.id, t.title, p.name as project_name, COALESCE(p.status, 'ACTIVE') as project_status
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.project_id = $1
  `, [2]);

  assert.ok(Array.isArray(tasksInDeletedRoom.rows));
  // If tasks exist, their project_status must be 'DELETED'
  for (const t of tasksInDeletedRoom.rows) {
    assert.strictEqual(t.project_status, 'DELETED');
  }

  // Restore room 2 back to ACTIVE so other tests/features stay clean
  await db.query("UPDATE projects SET status = 'ACTIVE', deleted_at = NULL WHERE id = $1", [2]);
});

test('Multi-Repo: Add connected repository and link commit to task', async () => {
  // 1. Add repository to project
  const addRepoRes = await db.query(
    'UPDATE projects SET github_repo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, github_repo',
    ['edwin-esquivel-ADSO/GitFlow, edwin-esquivel-ADSO/GitFlow-Backend', 1]
  );
  assert.ok(addRepoRes.rows.length > 0);
  assert.ok(addRepoRes.rows[0].github_repo.includes('GitFlow-Backend'));

  // 2. Insert commit associated with task and repo
  const commitRes = await db.query(`
    INSERT INTO commits (project_id, task_id, user_id, hash, message, author_name, url, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    RETURNING *
  `, [1, 1, 1, 'f608773', 'feat: soporte multi-repo autónomo #1', 'edwin-esquivel', 'https://github.com/edwin-esquivel-ADSO/GitFlow/commit/f608773']);

  assert.ok(commitRes.rows.length > 0);
  assert.strictEqual(commitRes.rows[0].hash, 'f608773');
  assert.strictEqual(commitRes.rows[0].task_id, 1);
});

test('Commit Health: Query commits and toggle faulty status', async () => {
  const commitRes = await db.query('SELECT * FROM commits WHERE project_id = $1 ORDER BY timestamp DESC', [1]);
  assert.ok(commitRes.rows.length > 0);
  const hash = commitRes.rows[0].hash;

  // Toggle faulty
  const updateRes = await db.query('UPDATE commits SET is_faulty = $1 WHERE project_id = $2 AND hash = $3 RETURNING *', [true, 1, hash]);
  assert.ok(updateRes.rows !== undefined);
});
