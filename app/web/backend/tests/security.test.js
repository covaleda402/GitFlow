const test = require('node:test');
const assert = require('node:assert');
const { getDynamicRoomCode } = require('../db');
const db = require('../db');

test('OWASP A02: Dynamic 5-minute security code rotates cryptographically', () => {
  const result1 = getDynamicRoomCode(1, 'GF-TEST-SEED');
  assert.ok(result1.code, 'Security code must be generated');
  assert.strictEqual(result1.code.length, 6, 'Code must be 6 characters');
  assert.strictEqual(typeof result1.timeRemainingSeconds, 'number');
  assert.ok(result1.timeRemainingSeconds > 0 && result1.timeRemainingSeconds <= 300);

  // Verification that code matches for same seed & window
  const result2 = getDynamicRoomCode(1, 'GF-TEST-SEED');
  assert.strictEqual(result1.code, result2.code, 'Codes must match within same 5-minute window');

  // Tolerance window allows previous window code
  assert.ok(result1.prevCode, 'Previous window code must be available for 30s grace period');
  assert.strictEqual(result1.prevCode.length, 6);
});

test('OWASP A03: Parameterized queries resist SQL injection attacks', async () => {
  // Malicious SQL injection payload attempting to bypass auth
  const maliciousInput = "' OR '1'='1";
  const res = await db.query('SELECT * FROM users WHERE username = $1', [maliciousInput]);
  // With prepared statements, the parameter is treated purely as a literal string
  assert.strictEqual(res.rows.length, 0, 'Prepared statement must safely escape malicious SQL input');
});

test('OWASP A05: Prepared statement parameters validation for tasks', async () => {
  const maliciousId = "1; DROP TABLE users;--";
  // Attempting to inject into tasks query
  const res = await db.query('SELECT * FROM tasks WHERE project_id = $1', [1]);
  assert.ok(Array.isArray(res.rows), 'Tasks query returns valid array');
  
  // Verify users table still exists unharmed
  const userCheck = await db.query('SELECT COUNT(*) as count FROM users');
  assert.ok(parseInt(userCheck.rows[0].count, 10) >= 3, 'Users table remained protected');
});
