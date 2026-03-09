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

// Registo de rotas
app.register(healthRoutes)

app.listen({ port: 3333, host: '0.0.0.0'}).then(() => {
  console.log('HTTP server running on http://localhost:3333')
  console.log('Docs available at http://localhost:3333/docs')
  console.log('Healthcheck available at http://localhost:3333/healthcheck')
})