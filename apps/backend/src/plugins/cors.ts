import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../env.js';

export default fp(async (app) => {
  const cfg = String(env.CORS_ORIGIN || '').trim();
  let origin: any;
  if (!cfg || cfg === '*' ) {
    origin = true; // allow all
  } else if (cfg.includes(',')) {
    const allowed = cfg.split(',').map(s => s.trim()).filter(Boolean);
    origin = (reqOrigin: string, cb: any) => {
      // allow no-origin requests (e.g., curl, same-origin in some cases)
      if (!reqOrigin) return cb(null, true);
      cb(null, allowed.includes(reqOrigin));
    };
  } else {
    origin = cfg; // single origin string
  }
  await app.register(cors, { origin, credentials: true });
});
