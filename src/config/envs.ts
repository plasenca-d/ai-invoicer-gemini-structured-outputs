import 'dotenv/config';
import * as z from 'zod';

const envSchema = z.object({
  MONGO_URI: z.string(),
  GEMINI_API_KEY: z.string(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
});

const { success, data, error } = envSchema.safeParse(process.env);

if (!success) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const envs = data;
