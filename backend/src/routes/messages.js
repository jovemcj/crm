import { prisma } from '../db/client.js'
import { sendWhatsAppMessage } from '../services/whatsapp.js'
import { sendInstagramMessage } from '../services/instagram.js'

export default async function messagesRoutes(fastify) {
  const auth = { onRequest: [fastify.authenticate] }

  // List chats
  fastify.get('/chats', auth, async () => {
    return prisma.chat.findMany({
      include: {
        contact: true,
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMsgAt: 'desc' },
    })
  })

  // Get messages from a chat
  fastify.get('/chats/:chatId', auth, async (request, reply) => {
    const { page = 1, limit = 50 } = request.query
    const skip = (page - 1) * limit

    const chat = await prisma.chat.findUnique({
      where: { id: request.params.chatId },
      include: { contact: true },
    })
    if (!chat) return reply.status(404).send({ error: 'Chat não encontrado' })

    const messages = await prisma.message.findMany({
      where: { chatId: request.params.chatId },
      orderBy: { sentAt: 'asc' },
      skip: Number(skip),
      take: Number(limit),
    })

    // Mark as read
    await prisma.chat.update({
      where: { id: request.params.chatId },
      data: { unread: 0 },
    })

    return { chat, messages }
  })

  // Send message
  fastify.post('/chats/:chatId/send', auth, async (request, reply) => {
    const { body, type = 'TEXT' } = request.body
    const chat = await prisma.chat.findUnique({ where: { id: request.params.chatId } })
    if (!chat) return reply.status(404).send({ error: 'Chat não encontrado' })

    let remoteMsgId = null
    try {
      if (chat.channel === 'WHATSAPP') {
        remoteMsgId = await sendWhatsAppMessage(chat.remoteId, body)
      } else if (chat.channel === 'INSTAGRAM') {
        remoteMsgId = await sendInstagramMessage(chat.remoteId, body)
      }
    } catch (err) {
      return reply.status(500).send({ error: `Falha ao enviar mensagem: ${err.message}` })
    }

    const message = await prisma.message.create({
      data: {
        chatId: chat.id,
        channel: chat.channel,
        direction: 'OUTBOUND',
        type,
        body,
        remotemsgId: remoteMsgId,
        status: 'SENT',
        userId: request.user.id,
      },
    })

    await prisma.chat.update({
      where: { id: chat.id },
      data: { lastMsgAt: new Date() },
    })

    global.io?.to(`chat:${chat.id}`).emit('message:new', message)
    global.io?.emit('chat:updated', { chatId: chat.id, lastMessage: message })

    return reply.status(201).send(message)
  })

  // Assign contact to chat
  fastify.patch('/chats/:chatId/contact', auth, async (request, reply) => {
    const { contactId } = request.body
    try {
      const chat = await prisma.chat.update({
        where: { id: request.params.chatId },
        data: { contactId },
        include: { contact: true },
      })
      return chat
    } catch {
      return reply.status(404).send({ error: 'Chat não encontrado' })
    }
  })
}
