import Fastify from 'fastify';
import corsPlugin from './plugins/cors.js';
import { env } from './env.js';
import healthRoutes from './routes/health.js';
import todoRoutes from './routes/todos.js';
import qbittorrentRoutes from './routes/qbittorrent.js';
import fastifyStatic from '@fastify/static';
import formbody from '@fastify/formbody';
import { join } from 'node:path';

const app = Fastify({ logger: true });
app.register(corsPlugin);
app.register(formbody);

// Serve frontend static files from /app/public (populated by Docker image)
const publicDir = join(process.cwd(), 'public');
app.register(fastifyStatic, { root: publicDir, prefix: '/' });

// API routes
app.register(healthRoutes);
app.register(todoRoutes);
app.register(qbittorrentRoutes);

// SPA fallback for non-API routes using notFound handler to avoid route conflicts
app.setNotFoundHandler((req, reply) => {
  // If it's an API route, return JSON 404
  if (req.url.startsWith('/api')) {
    reply.code(404).send({ message: 'Not Found' });
    return;
  }
  // Otherwise, serve the SPA index.html
  (reply as any).type('text/html');
  (reply as any).sendFile('index.html');
});

app.listen({ port: Number(env.PORT), host: '0.0.0.0' })
  .then(() => app.log.info('API on http://localhost:' + env.PORT))
  .catch((err) => { app.log.error(err); process.exit(1); });
