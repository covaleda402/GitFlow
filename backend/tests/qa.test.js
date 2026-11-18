const test = require('node:test');
const assert = require('node:assert');
const db = require('../db');

test('QA Review: Approve task moves it to DONE with notes and timestamp', async () => {
  const approvalNote = 'Aprobado en QA: Todas las pruebas pasaron satisfactoriamente.';
  const updateRes = await db.query(`
    UPDATE tasks 
    SET status = 'DONE', 
        is_archived = true, 
        completed_at = CURRENT_TIMESTAMP,
        completion_notes = $1,
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING id, status, is_archived, completed_at, completion_notes
  `, [approvalNote, 2]);

  assert.ok(updateRes.rows.length > 0);
  const task = updateRes.rows[0];
  assert.strictEqual(task.status, 'DONE');
  assert.strictEqual(task.is_archived, true);
  assert.ok(task.completed_at !== null);
  assert.strictEqual(task.completion_notes, approvalNote);
});

test('QA Review: Reject/Return task sends it back to IN_PROGRESS with requested changes', async () => {
  const feedback = 'Ajustes solicitados: Corregir contraste en modo claro.';
  const updateRes = await db.query(`
    UPDATE tasks 
    SET status = 'IN_PROGRESS', 
        is_archived = false, 
        completed_at = NULL,
        completion_notes = $1,
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING id, status, is_archived, completed_at, completion_notes
  `, [feedback, 2]);

  assert.ok(updateRes.rows.length > 0);
  const task = updateRes.rows[0];
  assert.strictEqual(task.status, 'IN_PROGRESS');
  assert.strictEqual(task.is_archived, false);
  assert.strictEqual(task.completed_at, null);
  assert.strictEqual(task.completion_notes, feedback);
});
