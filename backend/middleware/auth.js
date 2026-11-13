const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gitflow_super_secret_jwt_key_2026_secure_random_hash';

/**
 * Middleware to verify JWT tokens from Authorization header or cookie/query.
 * Protects internal REST API routes.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token JWT no proporcionado.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Token inválido o expirado. Por favor inicia sesión nuevamente.'
      });
    }

    req.user = user;
    next();
  });
}

/**
 * Optional authentication: if token is present, populates req.user, but does not block.
 */
function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) {
      req.user = user;
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  optionalToken,
  JWT_SECRET
};
