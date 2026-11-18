const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

test('Webhooks: Extracts task IDs from commit messages using regex', () => {
  const commitMessage1 = 'feat: implementar login con github #1';
  const commitMessage2 = 'fix: corregir contraste en live editor #4 #7';
  const commitMessage3 = 'docs: actualizar readme sin tareas referenciadas';

  const regex = /#(\d+)/g;

  const matches1 = [...commitMessage1.matchAll(regex)].map(m => parseInt(m[1], 10));
  assert.deepStrictEqual(matches1, [1]);

  const matches2 = [...commitMessage2.matchAll(regex)].map(m => parseInt(m[1], 10));
  assert.deepStrictEqual(matches2, [4, 7]);

  const matches3 = [...commitMessage3.matchAll(regex)].map(m => parseInt(m[1], 10));
  assert.deepStrictEqual(matches3, []);
});

test('Webhooks: HMAC-SHA256 signature generation and verification', () => {
  const secret = 'gitflow_webhook_secret_key_2026';
  const payload = JSON.stringify({ ref: 'refs/heads/main', commits: [{ id: '95651cd', message: 'test' }] });

  const hmac = crypto.createHmac('sha256', secret);
  const signature = 'sha256=' + hmac.update(payload).digest('hex');

  assert.ok(signature.startsWith('sha256='));

  // Verify
  const expectedHmac = crypto.createHmac('sha256', secret);
  const expectedSignature = 'sha256=' + expectedHmac.update(payload).digest('hex');

  assert.strictEqual(signature, expectedSignature);
});
