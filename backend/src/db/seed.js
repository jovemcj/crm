import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(pw) {
  return createHash('sha256').update(pw).digest('hex')
}

async function main() {
  // Admin user
  const user = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@crm.com',
      password: hashPassword('admin123'),
    },
  })

  // Default pipeline
  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Vendas',
      stages: {
        create: [
          { name: 'Novo Lead', order: 0, color: '#6366f1' },
          { name: 'Qualificado', order: 1, color: '#8b5cf6' },
          { name: 'Proposta', order: 2, color: '#f59e0b' },
          { name: 'Negociação', order: 3, color: '#f97316' },
          { name: 'Fechado', order: 4, color: '#22c55e' },
        ],
      },
    },
    include: { stages: true },
  })

  // Sample contacts
  const contacts = await Promise.all([
    prisma.contact.upsert({
      where: { phone: '+5511999990001' },
      update: {},
      create: {
        name: 'João Silva',
        phone: '+5511999990001',
        email: 'joao@exemplo.com',
        company: 'Empresa A',
        tags: ['cliente', 'premium'],
      },
    }),
    prisma.contact.upsert({
      where: { phone: '+5511999990002' },
      update: {},
      create: {
        name: 'Maria Santos',
        phone: '+5511999990002',
        email: 'maria@exemplo.com',
        company: 'Empresa B',
        tags: ['lead'],
      },
    }),
  ])

  // Sample deals
  const firstStage = pipeline.stages[0]
  await prisma.deal.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'Proposta Empresa A',
        value: 5000,
        probability: 60,
        stageId: pipeline.stages[2].id,
        contactId: contacts[0].id,
        ownerId: user.id,
      },
      {
        title: 'Lead Empresa B',
        value: 1200,
        probability: 20,
        stageId: firstStage.id,
        contactId: contacts[1].id,
        ownerId: user.id,
      },
    ],
  })

  console.log('Seed concluído com sucesso!')
  console.log('Login: admin@crm.com | Senha: admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
