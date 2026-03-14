import 'dotenv/config'
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
import { healthRoutes } from './routes/health'
import { oportunidadesRoutes } from './routes/oportunidades'

const isProduction = process.env.NODE_ENV === 'production'

const app = fastify({
  ignoreTrailingSlash: true,
  logger: isProduction
    ? true
    : {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          colorize: true,
        },
      },
    },
}).withTypeProvider<ZodTypeProvider>()

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

app.register(healthRoutes)
app.register(oportunidadesRoutes)

app.listen({ port: 3333, host: '0.0.0.0'}).then(() => {
  app.log.info('HTTP server running on http://localhost:3333')
  app.log.info('Docs available at http://localhost:3333/docs')
  app.log.info('Healthcheck available at http://localhost:3333/healthcheck')
})