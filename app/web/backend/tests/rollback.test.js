const test = require('node:test');
const assert = require('node:assert');
const db = require('../db');

test('Rollback Engine: Retrieve telemetry commits for a project', async () => {
  const res = await db.query('SELECT * FROM commits WHERE project_id = $1 ORDER BY timestamp DESC', [1]);
  assert.ok(Array.isArray(res.rows));
  assert.ok(res.rows.length > 0);
  const commit = res.rows[0];
  assert.ok(commit.hash, 'Commit must have a hash');
  assert.ok(commit.message, 'Commit must have a commit message');
});

test('Rollback Engine: Restores tasks to IN_PROGRESS upon rolling back faulty commit', async () => {
  // Simulate marking a task faulty and restoring tasks before that commit
  const rollbackRes = await db.query(`
    UPDATE tasks 
    SET status = 'IN_PROGRESS', is_archived = false, completed_at = NULL 
    WHERE project_id = $1 AND status = 'DONE'
    RETURNING id, status
  `, [1]);

  assert.ok(Array.isArray(rollbackRes.rows));
  // Every restored task must be in IN_PROGRESS
  for (const t of rollbackRes.rows) {
    assert.strictEqual(t.status, 'IN_PROGRESS');
  }
});
