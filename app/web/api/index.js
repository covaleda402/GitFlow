import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { app } = require('../backend/server');

// Vercel Serverless Function entry point for /api
export default app;

