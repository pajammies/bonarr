import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../env';
export default fp(async (app) => { await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true }); });
