import { prisma } from '../db/client.js'
import { connectWhatsApp, disconnectWhatsApp, getWhatsAppQR } from '../services/whatsapp.js'
import { connectInstagram, disconnectInstagram } from '../services/instagram.js'

export default async function integrationsRoutes(fastify) {
  const auth = { onRequest: [fastify.authenticate] }

  fastify.get('/', auth, async () => {
    return prisma.integration.findMany()
  })

  // ──── WhatsApp ────────────────────────────────────────────────
  fastify.post('/whatsapp/connect', auth, async (request, reply) => {
    try {
      await connectWhatsApp()
      return { message: 'Conectando WhatsApp... aguarde o QR Code via WebSocket' }
    } catch (err) {
      return reply.status(500).send({ error: err.message })
    }
  })

  fastify.post('/whatsapp/disconnect', auth, async (request, reply) => {
    try {
      await disconnectWhatsApp()
      return { message: 'WhatsApp desconectado' }
    } catch (err) {
      return reply.status(500).send({ error: err.message })
    }
  })

  fastify.get('/whatsapp/qr', auth, async (request, reply) => {
    const qr = getWhatsAppQR()
    if (!qr) return reply.status(404).send({ error: 'QR Code não disponível no momento' })
    return { qr }
  })

  fastify.get('/whatsapp/status', auth, async () => {
    const integration = await prisma.integration.findUnique({
      where: { channel: 'WHATSAPP' },
    })
    return { status: integration?.status || 'DISCONNECTED', phone: integration?.phone }
  })

  // ──── Instagram ───────────────────────────────────────────────
  fastify.post('/instagram/connect', auth, async (request, reply) => {
    const { username, password } = request.body
    if (!username || !password) {
      return reply.status(400).send({ error: 'username e password são obrigatórios' })
    }
    try {
      await connectInstagram(username, password)
      return { message: 'Instagram conectado com sucesso' }
    } catch (err) {
      return reply.status(500).send({ error: err.message })
    }
  })

  fastify.post('/instagram/disconnect', auth, async (request, reply) => {
    try {
      await disconnectInstagram()
      return { message: 'Instagram desconectado' }
    } catch (err) {
      return reply.status(500).send({ error: err.message })
    }
  })

  fastify.get('/instagram/status', auth, async () => {
    const integration = await prisma.integration.findUnique({
      where: { channel: 'INSTAGRAM' },
    })
    return { status: integration?.status || 'DISCONNECTED', username: integration?.username }
  })
}
