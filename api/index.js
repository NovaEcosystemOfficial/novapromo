/**
 * Vercel serverless entry — default export dell'app Express (senza listen).
 * Route /api/*, /uploads/*, /health e / sono riscritte qui da vercel.json.
 */
import app from '../backend/src/app.js';
import { getDb } from '../backend/src/db/index.js';

getDb();

export default app;
