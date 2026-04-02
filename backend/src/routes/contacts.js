import { prisma } from '../db/client.js'

export default async function contactsRoutes(fastify) {
  const auth = { onRequest: [fastify.authenticate] }

  fastify.get('/', auth, async (request) => {
    const { search, tag } = request.query
    return prisma.contact.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { phone: { contains: search } },
                  { email: { contains: search, mode: 'insensitive' } },
                  { company: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          tag ? { tags: { has: tag } } : {},
        ],
      },
      include: {
        _count: { select: { deals: true, messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  fastify.get('/:id', auth, async (request, reply) => {
    const contact = await prisma.contact.findUnique({
      where: { id: request.params.id },
      include: {
        deals: { include: { stage: true } },
        chats: { include: { messages: { orderBy: { sentAt: 'desc' }, take: 1 } } },
      },
    })
    if (!contact) return reply.status(404).send({ error: 'Contato não encontrado' })
    return contact
  })

  fastify.post('/', auth, async (request, reply) => {
    const { name, phone, email, instagram, company, tags, notes } = request.body
    const contact = await prisma.contact.create({
      data: { name, phone, email, instagram, company, tags: tags || [], notes },
    })
    return reply.status(201).send(contact)
  })

  fastify.put('/:id', auth, async (request, reply) => {
    const { name, phone, email, instagram, company, tags, notes } = request.body
    try {
      const contact = await prisma.contact.update({
        where: { id: request.params.id },
        data: { name, phone, email, instagram, company, tags, notes },
      })
      return contact
    } catch {
      return reply.status(404).send({ error: 'Contato não encontrado' })
    }
  })

  fastify.delete('/:id', auth, async (request, reply) => {
    try {
      await prisma.contact.delete({ where: { id: request.params.id } })
      return reply.status(204).send()
    } catch {
      return reply.status(404).send({ error: 'Contato não encontrado' })
    }
  })
}
