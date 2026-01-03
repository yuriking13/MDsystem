import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string(),

  JWT_SECRET: z.string().min(20),
  DATABASE_URL: z.string().min(1),

  API_KEY_ENCRYPTION_SECRET: z.string().min(32),

  CROSSREF_MAILTO: z.string().email().optional().default(''),
});

export const env = EnvSchema.parse(process.env);
