import { prisma } from '../db/client.js'

export default async function pipelinesRoutes(fastify) {
  const auth = { onRequest: [fastify.authenticate] }

  fastify.get('/', auth, async () => {
    return prisma.pipeline.findMany({
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            deals: {
              include: { contact: true, owner: { select: { id: true, name: true, avatar: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    })
  })

  fastify.post('/', auth, async (request, reply) => {
    const { name, color } = request.body
    const pipeline = await prisma.pipeline.create({ data: { name, color } })
    return reply.status(201).send(pipeline)
  })

  fastify.post('/:pipelineId/stages', auth, async (request, reply) => {
    const { name, color, order } = request.body
    const stage = await prisma.stage.create({
      data: { name, color, order, pipelineId: request.params.pipelineId },
    })
    return reply.status(201).send(stage)
  })

  fastify.delete('/stages/:stageId', auth, async (request, reply) => {
    try {
      await prisma.stage.delete({ where: { id: request.params.stageId } })
      return reply.status(204).send()
    } catch {
      return reply.status(404).send({ error: 'Estágio não encontrado' })
    }
  })
}
