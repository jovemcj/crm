import { createHash } from 'crypto'
import { prisma } from '../db/client.js'

function hashPassword(pw) {
  return createHash('sha256').update(pw).digest('hex')
}

export default async function authRoutes(fastify) {
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.password !== hashPassword(password)) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const token = fastify.jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      { expiresIn: '7d' }
    )

    return { token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } }
  })

  fastify.post('/register', async (request, reply) => {
    const { name, email, password } = request.body

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return reply.status(409).send({ error: 'Email já cadastrado' })
    }

    const user = await prisma.user.create({
      data: { name, email, password: hashPassword(password) },
    })

    const token = fastify.jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      { expiresIn: '7d' }
    )

    return { token, user: { id: user.id, name: user.name, email: user.email } }
  })

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true },
    })
    return user
  })
}
