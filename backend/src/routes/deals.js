import { prisma } from '../db/client.js'

export default async function dealsRoutes(fastify) {
  const auth = { onRequest: [fastify.authenticate] }

  fastify.get('/', auth, async (request) => {
    const { stageId, contactId } = request.query
    return prisma.deal.findMany({
      where: {
        ...(stageId ? { stageId } : {}),
        ...(contactId ? { contactId } : {}),
      },
      include: {
        contact: true,
        stage: true,
        owner: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  fastify.get('/:id', auth, async (request, reply) => {
    const deal = await prisma.deal.findUnique({
      where: { id: request.params.id },
      include: {
        contact: true,
        stage: { include: { pipeline: true } },
        owner: { select: { id: true, name: true, avatar: true } },
      },
    })
    if (!deal) return reply.status(404).send({ error: 'Negócio não encontrado' })
    return deal
  })

  fastify.post('/', auth, async (request, reply) => {
    const { title, value, probability, notes, stageId, contactId } = request.body
    const deal = await prisma.deal.create({
      data: {
        title,
        value: value || 0,
        probability: probability || 0,
        notes,
        stageId,
        contactId,
        ownerId: request.user.id,
      },
      include: { contact: true, stage: true },
    })
    return reply.status(201).send(deal)
  })

  fastify.put('/:id', auth, async (request, reply) => {
    const { title, value, probability, notes, stageId, closedAt } = request.body
    try {
      const deal = await prisma.deal.update({
        where: { id: request.params.id },
        data: { title, value, probability, notes, stageId, closedAt },
        include: { contact: true, stage: true },
      })
      // Emit kanban update
      global.io?.emit('deal:updated', deal)
      return deal
    } catch {
      return reply.status(404).send({ error: 'Negócio não encontrado' })
    }
  })

  // Move deal between stages (kanban drag)
  fastify.patch('/:id/move', auth, async (request, reply) => {
    const { stageId } = request.body
    try {
      const deal = await prisma.deal.update({
        where: { id: request.params.id },
        data: { stageId },
        include: { contact: true, stage: true },
      })
      global.io?.emit('deal:moved', { dealId: deal.id, stageId })
      return deal
    } catch {
      return reply.status(404).send({ error: 'Negócio não encontrado' })
    }
  })

  fastify.delete('/:id', auth, async (request, reply) => {
    try {
      await prisma.deal.delete({ where: { id: request.params.id } })
      return reply.status(204).send()
    } catch {
      return reply.status(404).send({ error: 'Negócio não encontrado' })
    }
  })
}
