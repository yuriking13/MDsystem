import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  JWT_SECRET: z.string().min(20, 'JWT_SECRET must be at least 20 chars'),

  DATABASE_URL: z.string().min(1),

  PUBMED_API_KEY: z.string().optional().default(''),
  CROSSREF_MAILTO: z.string().email().optional().default(''),
  WILEY_TDM_TOKEN: z.string().optional().default(''),

  TRANSLATE_PROVIDER: z.string().optional().default(''),
  TRANSLATE_API_KEY: z.string().optional().default('')
});

export const env = EnvSchema.parse(process.env);
