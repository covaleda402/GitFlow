const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * 1. GET /api/auth/github
 * Initiates GitHub OAuth authorization flow by redirecting the user to GitHub
 */
router.get('/github', (req, res) => {
  if (!GITHUB_CLIENT_ID || GITHUB_CLIENT_ID === 'your_github_client_id_here') {
    return res.redirect(`${FRONTEND_URL}/login?notice=github_oauth_unconfigured`);
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
  const scope = 'read:user user:email repo';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

  res.redirect(githubAuthUrl);
});

/**
 * 2. GET /api/auth/github/callback
 * GitHub redirects here with a temporary authorization code
 */
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=missing_code`);
  }

  try {
    // A) Exchange temporary code for GitHub access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      console.error('[OAuth Error] No access token received from GitHub:', tokenResponse.data);
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_token_exchange_failed`);
    }

    // B) Fetch User Profile from GitHub API
    const userProfileResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'GitFlow-Platform'
      }
    });

    const ghUser = userProfileResponse.data;
    const githubId = String(ghUser.id);
    const username = ghUser.login;
    const name = ghUser.name || ghUser.login;
    const avatarUrl = ghUser.avatar_url;
    let email = ghUser.email;

    // Optional: If email is private, fetch primary email
    if (!email) {
      try {
        const emailsResponse = await axios.get('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'GitFlow-Platform'
          }
        });
        const primary = emailsResponse.data.find(e => e.primary);
        if (primary) email = primary.email;
      } catch (e) {
        console.warn('[OAuth] Could not fetch private email:', e.message);
      }
    }

    // C) Upsert user in Neon DB using Prepared Statements
    const checkUserQuery = 'SELECT id, github_id, username, name, avatar_url, email FROM users WHERE github_id = $1';
    const checkResult = await db.query(checkUserQuery, [githubId]);

    let user;

    if (checkResult.rows.length > 0) {
      // Update existing user with latest GitHub profile details
      const updateUserQuery = `
        UPDATE users 
        SET username = $2, name = $3, avatar_url = $4, email = $5, updated_at = CURRENT_TIMESTAMP 
        WHERE github_id = $1 
        RETURNING id, github_id, username, name, avatar_url, email
      `;
      const updateResult = await db.query(updateUserQuery, [githubId, username, name, avatarUrl, email]);
      user = updateResult.rows[0];
    } else {
      // Insert new user
      const insertUserQuery = `
        INSERT INTO users (github_id, username, name, avatar_url, email) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id, github_id, username, name, avatar_url, email
      `;
      const insertResult = await db.query(insertUserQuery, [githubId, username, name, avatarUrl, email]);
      user = insertResult.rows[0];
    }

    // D) Sign application JWT
    const payload = {
      id: user.id,
      github_id: user.github_id,
      username: user.username,
      name: user.name,
      avatar_url: user.avatar_url,
      email: user.email
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // E) Redirect back to Frontend with JWT
    res.redirect(`${FRONTEND_URL}/login?token=${token}`);
  } catch (error) {
    console.error('[OAuth Exception]:', error.response ? error.response.data : error.message);
    res.redirect(`${FRONTEND_URL}/login?error=authentication_failed`);
  }
});

/**
 * 3. GET /api/auth/me
 * Retrieves current user profile from verified JWT token
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userQuery = 'SELECT id, github_id, username, name, avatar_url, email, created_at FROM users WHERE id = $1';
    const result = await db.query(userQuery, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('[Auth Profile Error]:', error.message);
    res.status(500).json({ error: 'Error al recuperar perfil de usuario.' });
  }
});

/**
 * 4. POST /api/auth/demo-login
 * Instant developer login without requiring GitHub OAuth registration
 */
router.post('/demo-login', async (req, res) => {
  try {
    const { username = 'edwin-esquivel', name: customName, avatar_url: customAvatar } = req.body;

    // Sanitize username
    const cleanUsername = String(username).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'developer';

    // Map known teammates
    const knownUsers = {
      'edwin-esquivel': { 
        name: 'Edwin Esquivel', 
        role: 'Lead Full-Stack Developer & DevOps', 
        avatar: 'https://avatars.githubusercontent.com/u/10101?v=4' 
      },
      'covaleda402': { 
        name: 'Jose Esneider Covaleda', 
        role: 'Full-Stack Developer & Quality Assurance', 
        avatar: 'https://avatars.githubusercontent.com/u/108304918?v=4' 
      },
      'maria-dev': { 
        name: 'Maria Gomez', 
        role: 'Backend & Telemetry Engineer', 
        avatar: 'https://avatars.githubusercontent.com/u/20202?v=4' 
      },
      'alex-coder': { 
        name: 'Alex Rivera', 
        role: 'Frontend & UX Specialist', 
        avatar: 'https://avatars.githubusercontent.com/u/30303?v=4' 
      }
    };

    // Fetch real GitHub public profile if available
    let ghAvatar = null;
    let ghName = null;
    let ghBio = null;
    try {
      const ghRes = await axios.get(`https://api.github.com/users/${cleanUsername}`, {
        headers: { 'User-Agent': 'GitFlow-Platform' },
        timeout: 2500
      });
      if (ghRes.data) {
        ghAvatar = ghRes.data.avatar_url;
        ghName = ghRes.data.name;
        ghBio = ghRes.data.bio;
      }
    } catch (e) {
      // User not on GitHub or public rate limit, use resilient fallback
    }

    const userProfile = knownUsers[cleanUsername] || {
      name: customName || ghName || cleanUsername.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      role: ghBio || 'Full-Stack Developer',
      avatar: customAvatar || ghAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`
    };

    // Look for user in db
    let userResult = await db.query('SELECT * FROM users WHERE username = $1', [cleanUsername]);

    let user;
    if (userResult.rows.length === 0) {
      const insertQuery = `
        INSERT INTO users (github_id, username, name, avatar_url, email, bio)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, github_id, username, name, avatar_url, email, bio
      `;
      const insertRes = await db.query(insertQuery, [
        'demo_' + cleanUsername + '_' + Date.now().toString(36),
        cleanUsername,
        customName || userProfile.name,
        customAvatar || userProfile.avatar,
        `${cleanUsername}@omnicode.tech`,
        userProfile.role
      ]);
      user = insertRes.rows[0];
    } else {
      user = userResult.rows[0];
      if (customName && customName !== user.name) {
        const updateRes = await db.query(
          'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, github_id, username, name, avatar_url, email',
          [customName, user.id]
        );
        if (updateRes.rows.length > 0) user = updateRes.rows[0];
      }
    }

    const payload = {
      id: user.id,
      github_id: user.github_id,
      username: user.username,
      name: user.name,
      avatar_url: user.custom_avatar || user.avatar_url,
      email: user.email
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: payload
    });
  } catch (error) {
    console.error('[Demo Login Error]:', error.message);
    res.status(500).json({ error: 'Error en inicio de sesión demo.' });
  }
});

module.exports = router;
