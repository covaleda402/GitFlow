import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { app } = require('../backend/server');

// Vercel Serverless Function entry point for all subpaths (/api/*)
export default app;

