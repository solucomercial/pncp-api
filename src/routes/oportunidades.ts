import { createHash, timingSafeEqual } from 'node:crypto'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { oportunidades } from '../db/schema'
import { oportunidadesEnv } from '../lib/oportunidades-env'

const oportunidadeWebhookBodySchema = z.object({
  numeroControlePNCP: z.string().min(1).max(120),
  titulo: z.string().min(1),
  orgao: z.string().min(1),
  uf: z.string().length(2).optional(),
  municipio: z.string().min(1).optional(),
  valorEstimado: z.coerce.number().nonnegative().optional(),
  dataPublicacao: z.coerce.date().optional(),
  dataLimiteProposta: z.coerce.date().optional(),
  linkEdital: z.url().optional(),
  objetoResumo: z.string().min(1).optional(),
  payloadBruto: z.unknown().optional(),
})

const webhookResponseSchema = z.object({
  status: z.literal('ok'),
  action: z.enum(['created', 'updated']),
  numeroControlePNCP: z.string(),
  id: z.string().uuid(),
})

const webhookUnauthorizedResponseSchema = z.object({
  status: z.literal('error'),
  message: z.literal('Unauthorized'),
})

const hashApiKey = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest()

const isApiKeyValid = (receivedKey: string | undefined) => {
  if (!receivedKey) {
    return false
  }

  const expectedHash = hashApiKey(oportunidadesEnv.WEBHOOK_API_KEY)
  const receivedHash = hashApiKey(receivedKey)

  return timingSafeEqual(expectedHash, receivedHash)
}

export async function oportunidadesRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/oportunidades/webhook',
    {
      schema: {
        summary: 'Recebe oportunidades filtradas pelo n8n',
        tags: ['Oportunidades'],
        body: oportunidadeWebhookBodySchema,
        response: {
          200: webhookResponseSchema,
          401: webhookUnauthorizedResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const apiKey = request.headers['x-api-key']
      const receivedApiKey = Array.isArray(apiKey) ? apiKey[0] : apiKey

      if (!isApiKeyValid(receivedApiKey)) {
        return reply.status(401).send({
          status: 'error',
          message: 'Unauthorized',
        })
      }

      const parsedBody = oportunidadeWebhookBodySchema.parse(request.body)
      const numeroControleNormalizado = parsedBody.numeroControlePNCP.trim()
      const db = getDb()

      const [upserted] = await db
        .insert(oportunidades)
        .values({
          numeroControlePNCP: numeroControleNormalizado,
          titulo: parsedBody.titulo,
          orgao: parsedBody.orgao,
          uf: parsedBody.uf?.toUpperCase(),
          municipio: parsedBody.municipio,
          valorEstimado: parsedBody.valorEstimado?.toString(),
          dataPublicacao: parsedBody.dataPublicacao,
          dataLimiteProposta: parsedBody.dataLimiteProposta,
          linkEdital: parsedBody.linkEdital,
          objetoResumo: parsedBody.objetoResumo,
          payloadBruto: parsedBody.payloadBruto ?? parsedBody,
        })
        .onConflictDoUpdate({
          target: oportunidades.numeroControlePNCP,
          set: {
            titulo: parsedBody.titulo,
            orgao: parsedBody.orgao,
            uf: parsedBody.uf?.toUpperCase(),
            municipio: parsedBody.municipio,
            valorEstimado: parsedBody.valorEstimado?.toString(),
            dataPublicacao: parsedBody.dataPublicacao,
            dataLimiteProposta: parsedBody.dataLimiteProposta,
            linkEdital: parsedBody.linkEdital,
            objetoResumo: parsedBody.objetoResumo,
            payloadBruto: parsedBody.payloadBruto ?? parsedBody,
            updatedAt: sql`now()`,
            ingestedAt: sql`now()`,
            versaoIngestao: sql`${oportunidades.versaoIngestao} + 1`,
          },
        })
        .returning({
          id: oportunidades.id,
          numeroControlePNCP: oportunidades.numeroControlePNCP,
          versaoIngestao: oportunidades.versaoIngestao,
        })

      return reply.status(200).send({
        status: 'ok',
        action: upserted.versaoIngestao > 1 ? 'updated' : 'created',
        numeroControlePNCP: upserted.numeroControlePNCP,
        id: upserted.id,
      })
    },
  )
}
