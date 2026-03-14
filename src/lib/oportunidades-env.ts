import 'dotenv/config'
import { z } from 'zod'

const oportunidadesEnvSchema = z.object({
  WEBHOOK_API_KEY: z.string().min(16),
})

export const oportunidadesEnv = oportunidadesEnvSchema.parse(process.env)
