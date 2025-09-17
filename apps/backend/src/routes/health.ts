import { FastifyInstance } from 'fastify';
export default async function healthRoutes(app: FastifyInstance) { app.get('/api/health', async () => ({ status: 'ok' })); }
