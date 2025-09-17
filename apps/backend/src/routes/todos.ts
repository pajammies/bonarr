import { FastifyInstance } from 'fastify';
import type { Todo } from 'shared/src/types';
export default async function todoRoutes(app: FastifyInstance) {
  const mem: Todo[] = [{ id: 1, title: 'Learn Full‑Stack' }];
  app.get('/api/todos', async () => mem);
  app.post('/api/todos', async (req, reply) => {
    const body = req.body as any;
    if (!body?.title) { reply.code(400); return { message: 'title is required' }; }
    const newTodo: Todo = { id: mem.length + 1, title: String(body.title) };
    mem.push(newTodo); reply.code(201); return newTodo;
  });
}
