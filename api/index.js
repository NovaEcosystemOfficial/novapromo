/**
 * Vercel serverless entry — Express app senza listen() né scheduler.
 * Tutte le route /api/* sono riscritte qui da vercel.json.
 */
import { createApp } from '../backend/src/app.js';
import { getDb } from '../backend/src/db/index.js';

getDb();

export default createApp();
