const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const db = require('../db');

test('Auth: JWT signing and verification', () => {
  const payload = {
    id: 4,
    username: 'covaleda402',
    name: 'Jose Esneider Covaleda',
    email: 'covaleda402@omnicode.tech'
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  assert.ok(token, 'Token should be generated');

  const decoded = jwt.verify(token, JWT_SECRET);
  assert.strictEqual(decoded.username, 'covaleda402');
  assert.strictEqual(decoded.name, 'Jose Esneider Covaleda');
  assert.strictEqual(decoded.id, 4);
});

test('Auth: Rejects invalid or tampered JWT', () => {
  assert.throws(() => {
    jwt.verify('invalid.token.here', JWT_SECRET);
  }, /jwt malformed|invalid token/i);
});

test('Auth: Seeded teammates exist in database / mock store', async () => {
  const res = await db.query('SELECT id, username, name FROM users WHERE username = $1', ['covaleda402']);
  assert.ok(res.rows.length > 0, 'covaleda402 user should be found');
  assert.strictEqual(res.rows[0].username, 'covaleda402');
  assert.ok(res.rows[0].name.includes('Covaleda'));
});

test('Auth: Edwin Esquivel user exists and has tech lead profile', async () => {
  const res = await db.query('SELECT id, username, name FROM users WHERE username = $1', ['edwin-esquivel']);
  assert.ok(res.rows.length > 0, 'edwin-esquivel should be found');
  assert.strictEqual(res.rows[0].username, 'edwin-esquivel');
});

test('Auth Middleware: authenticateToken rejects missing token with 401', () => {
  const { authenticateToken } = require('../middleware/auth');
  let statusSent = null;
  let jsonSent = null;

  const req = { headers: {} };
  const res = {
    status: (s) => {
      statusSent = s;
      return {
        json: (j) => { jsonSent = j; }
      };
    }
  };
  const next = () => {};

  authenticateToken(req, res, next);
  assert.strictEqual(statusSent, 401);
  assert.ok(jsonSent.error.includes('no autorizado'));
});

test('Auth Middleware: authenticateToken accepts valid Bearer token and sets req.user', () => {
  const { authenticateToken } = require('../middleware/auth');
  const validToken = jwt.sign({ id: 4, username: 'covaleda402' }, JWT_SECRET);

  let nextCalled = false;
  const req = { headers: { authorization: `Bearer ${validToken}` } };
  const res = {};
  const next = () => { nextCalled = true; };

  authenticateToken(req, res, next);
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.username, 'covaleda402');
});

test('Auth Middleware: optionalToken proceeds with or without token', () => {
  const { optionalToken } = require('../middleware/auth');

  // Without token
  let nextCalled1 = false;
  const req1 = { headers: {} };
  optionalToken(req1, {}, () => { nextCalled1 = true; });
  assert.strictEqual(nextCalled1, true);
  assert.strictEqual(req1.user, undefined);

  // With token
  let nextCalled2 = false;
  const validToken = jwt.sign({ id: 1, username: 'edwin-esquivel' }, JWT_SECRET);
  const req2 = { headers: { authorization: `Bearer ${validToken}` } };
  optionalToken(req2, {}, () => { nextCalled2 = true; });
  assert.strictEqual(nextCalled2, true);
  assert.strictEqual(req2.user.username, 'edwin-esquivel');
});
