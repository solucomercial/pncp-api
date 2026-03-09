import 'dotenv/config'
import { z } from 'zod'
import { fastify } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider
} from 'fastify-type-provider-zod'
import { fastifySwagger } from '@fastify/swagger'
import { fastifyCors } from '@fastify/cors'
import ScalarApiReference from '@scalar/fastify-api-reference'
import axios from 'axios'
import nodemailer from 'nodemailer'

// Validação das variáveis de ambiente
const envSchema = z.object({
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string(),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  EMAIL_RECEIVER: z.string().email(),
})

const env = envSchema.parse(process.env)

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})


const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // credentials: true,
})

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'PNCP API',
      description: 'This is the API documentation for the PNCP API.',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
})

app.register(ScalarApiReference, {
  routePrefix: '/docs',
})

// Rota de Healthcheck - Monitora a disponibilidade do PNCP
app.get('/healthcheck', async (request, reply) => {
  try {
    // Tentamos acessar um endpoint simples e leve do PNCP
    // Definimos um timeout de 5 segundos para não travar nossa API
    await axios.get('https://pncp.gov.br/api/consulta/v1/modalidades', { timeout: 5000 })
    
    return { status: 'OK', pncp: 'Online', timestamp: new Date().toISOString() }

  } catch (error) {
    // Se entrar aqui, o PNCP falhou ou demorou demais
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    await transporter.sendMail({
      from: `"Monitor PNCP" <${env.SMTP_USER}>`,
      to: env.EMAIL_RECEIVER,
      subject: "⚠️ ALERTA: PNCP Indisponível",
      text: `O sistema detectou que o PNCP não está respondendo em ${new Date().toLocaleString('pt-BR')}.\n\nErro: ${errorMessage}`,
      html: `
        <h1>🚨 PNCP Fora do Ar</h1>
        <p><strong>Erro detectado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Detalhes:</strong> ${errorMessage}</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Este é um alerta automático do monitor de saúde da API.</p>
      `
    })

    return reply.status(503).send({ 
      status: 'Error', 
      message: 'PNCP inacessível. Alerta enviado por e-mail.',
      timestamp: new Date().toISOString()
    })
  }
})

app.listen({ port: 3333, host: '0.0.0.0'}).then(() => {
  console.log('HTTP server running on http://localhost:3333')
  console.log('Docs available at http://localhost:3333/docs')
  console.log('Healthcheck available at http://localhost:3333/healthcheck')
})