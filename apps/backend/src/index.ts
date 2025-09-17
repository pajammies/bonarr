import Fastify from 'fastify';
import corsPlugin from './plugins/cors';
import { env } from './env';
import healthRoutes from './routes/health';
import todoRoutes from './routes/todos';
import qbittorrentRoutes from './routes/qbittorrent';
const app = Fastify({ logger: true });
app.register(corsPlugin);

// Friendly root route
app.get('/', async () => ({ service: 'backend', status: 'ok' }));
app.register(healthRoutes);
app.register(todoRoutes);
app.register(qbittorrentRoutes);
app.listen({ port: Number(env.PORT), host: '0.0.0.0' })
  .then(() => app.log.info('API on http://localhost:' + env.PORT))
  .catch((err) => { app.log.error(err); process.exit(1); });
