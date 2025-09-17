import { config } from 'dotenv';
import { z } from 'zod';
config();
const EnvSchema = z.object({ PORT: z.string().default('3005'), NODE_ENV: z.enum(['development','test','production']).default('development'), DATABASE_URL: z.string().optional(), CORS_ORIGIN: z.string().default('http://localhost:6789'), JWT_SECRET: z.string().min(32).default('change-me-to-a-strong-secret-32chars-min'), ACCESS_TOKEN_TTL: z.string().default('15m'), REFRESH_TOKEN_TTL: z.string().default('7d') });
export const env = EnvSchema.parse(process.env);
