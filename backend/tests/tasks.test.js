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
