import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import axios from 'axios'
import { transporter, env } from '../lib/mail'

// Schema de resposta para o healthcheck
const healthResponseSchema = z.object({
  status: z.string(),
  pncp: z.string(),
  timestamp: z.string(),
})

const errorResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  timestamp: z.string(),
})

export async function healthRoutes(app: FastifyInstance) {
  // Função auxiliar para auditar erros do PNCP
  const auditPncpError = (context: string, error: any) => {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const auditData = {
      msg: 'Falha na auditoria do PNCP',
      context,
      error: errorMessage,
      code: error?.code,
      url: error?.config?.url,
      status: error.response?.status || 'Unknown',
      timestamp: new Date().toISOString(),
    }
    app.log.error(auditData)
    return auditData
  }

  // Rota GET /healthcheck - Monitora a disponibilidade do PNCP
  app.withTypeProvider<ZodTypeProvider>().get(
    '/healthcheck',
    {
      schema: {
        summary: 'Verifica a saúde da integração com o PNCP',
        tags: ['Health'],
        response: {
          200: healthResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        // Tentamos acessar um endpoint simples e leve do PNCP
        // Definimos um timeout de 5 segundos para não travar nossa API
        await axios.get('https://pncp.gov.br/api/pncp/v1/modalidades', {
          timeout: 5000,
        })

        return {
          status: 'OK',
          pncp: 'Online',
          timestamp: new Date().toISOString(),
        }
      } catch (error: any) {
        // Se entrar aqui, o PNCP falhou ou demorou demais
        const details = auditPncpError('Healthcheck', error)

        // Enviar alerta por e-mail
        await transporter.sendMail({
          from: `"Monitor PNCP" <${env.SMTP_USER}>`,
          to: env.EMAIL_RECEIVER,
          subject: '⚠️ ALERTA: PNCP Indisponível',
          text: `O sistema detectou que o PNCP não está respondendo em ${new Date().toLocaleString(
            'pt-BR',
          )}.\n\nErro: ${details.error}`,
          html: `
            <h1>🚨 PNCP Fora do Ar</h1>
            <p><strong>Erro detectado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Detalhes:</strong> ${details.error}</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">Este é um alerta automático do monitor de saúde da API.</p>
          `,
        })

        return reply.status(503).send({
          status: 'Error',
          message: 'PNCP inacessível. Alerta enviado por e-mail.',
          timestamp: new Date().toISOString(),
        })
      }
    },
  )
}
