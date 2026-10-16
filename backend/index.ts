import type express from 'express';
import app from './src/index';
// Vercel searches root entries before src/app.ts, which is our application factory.
export default app satisfies express.Express;
