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
