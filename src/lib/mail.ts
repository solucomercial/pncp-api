import 'dotenv/config'
import { z } from 'zod'
import nodemailer from 'nodemailer'

// Validação das variáveis de ambiente
const envSchema = z.object({
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string(),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  EMAIL_RECEIVER: z.string().email(),
  PNCP_BASE_URL: z
    .string()
    .url()
    .transform((url) => url.replace(/\/+$/, '')),
})

export const env = envSchema.parse(process.env)

// Configuração do Nodemailer
export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})
