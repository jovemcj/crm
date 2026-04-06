import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import staticFiles from '@fastify/static'
import { createServer } from 'http'
import { Server as SocketIO } from 'socket.io'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { prisma } from './db/client.js'

import contactsRoutes from './routes/contacts.js'
import dealsRoutes from './routes/deals.js'
import pipelinesRoutes from './routes/pipelines.js'
import messagesRoutes from './routes/messages.js'
import integrationsRoutes from './routes/integrations.js'
import authRoutes from './routes/auth.js'
import { setupSocketIO } from './socket.js'
import { initWhatsApp } from './services/whatsapp.js'
import { initInstagram } from './services/instagram.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'

const app = Fastify({
  logger: isProd
    ? true
    : { transport: { target: 'pino-pretty' } },
})

await app.register(cors, {
  origin: true,
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret_dev_key',
})

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

// Routes
app.register(authRoutes, { prefix: '/api/auth' })
app.register(contactsRoutes, { prefix: '/api/contacts' })
app.register(dealsRoutes, { prefix: '/api/deals' })
app.register(pipelinesRoutes, { prefix: '/api/pipelines' })
app.register(messagesRoutes, { prefix: '/api/messages' })
app.register(integrationsRoutes, { prefix: '/api/integrations' })

app.get('/api/health', async () => ({ status: 'ok' }))

// Serve frontend build in production
const frontendDist = join(__dirname, '../../frontend/dist')
if (isProd && existsSync(frontendDist)) {
  await app.register(staticFiles, { root: frontendDist, prefix: '/' })
  // SPA fallback — todas as rotas não-API retornam o index.html
  app.setNotFoundHandler((req, reply) => {
    if (!req.url.startsWith('/api') && !req.url.startsWith('/socket.io')) {
      return reply.sendFile('index.html')
    }
    reply.status(404).send({ error: 'Not found' })
  })
}

const httpServer = createServer(app.server ? undefined : app.callback?.() ?? undefined)

// Socket.IO
const io = new SocketIO(app.server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

setupSocketIO(io)

// Inject io globally
app.decorate('io', io)
global.io = io

const PORT = process.env.PORT || 3333

app.listen({ port: PORT, host: '0.0.0.0' }, async (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`CRM Backend rodando na porta ${PORT}`)

  // Init integrations if already connected
  await initWhatsApp()
  await initInstagram()
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
