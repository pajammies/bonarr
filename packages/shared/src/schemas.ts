import { z } from 'zod';
export const TodoSchema = z.object({ id: z.number(), title: z.string() });
export const CreateTodoSchema = TodoSchema.omit({ id: true });
