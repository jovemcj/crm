import { IgApiClient } from 'instagram-private-api'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { prisma } from '../db/client.js'
import { emitInstagramStatus } from '../socket.js'

const SESSION_FILE = './ig_session.json'
const POLL_INTERVAL_MS = 15_000 // 15s

let ig = null
let pollTimer = null
let lastSeqId = null

export async function initInstagram() {
  const integration = await prisma.integration.findUnique({ where: { channel: 'INSTAGRAM' } })
  if (integration?.status === 'CONNECTED' && existsSync(SESSION_FILE)) {
    const { username } = integration
    if (username) {
      await restoreSession(username)
    }
  }
}

async function restoreSession(username) {
  try {
    const sessionData = JSON.parse(await readFile(SESSION_FILE, 'utf-8'))
    ig = new IgApiClient()
    ig.state.generateDevice(username)
    await ig.state.deserialize(sessionData)
    await prisma.integration.upsert({
      where: { channel: 'INSTAGRAM' },
      update: { status: 'CONNECTED' },
      create: { channel: 'INSTAGRAM', status: 'CONNECTED', username },
    })
    emitInstagramStatus(global.io, 'CONNECTED')
    startPolling()
    console.log('[Instagram] Sessão restaurada para:', username)
  } catch (err) {
    console.error('[Instagram] Falha ao restaurar sessão:', err.message)
  }
}

export async function connectInstagram(username, password) {
  ig = new IgApiClient()
  ig.state.generateDevice(username)

  await prisma.integration.upsert({
    where: { channel: 'INSTAGRAM' },
    update: { status: 'CONNECTING', username },
    create: { channel: 'INSTAGRAM', status: 'CONNECTING', username },
  })
  emitInstagramStatus(global.io, 'CONNECTING')

  try {
    await ig.simulate.preLoginFlow()
    await ig.account.login(username, password)
    await ig.simulate.postLoginFlow()

    const serialized = await ig.state.serialize()
    await writeFile(SESSION_FILE, JSON.stringify(serialized))

    await prisma.integration.update({
      where: { channel: 'INSTAGRAM' },
      data: { status: 'CONNECTED' },
    })
    emitInstagramStatus(global.io, 'CONNECTED')
    console.log('[Instagram] Conectado como:', username)

    startPolling()
  } catch (err) {
    await prisma.integration.update({
      where: { channel: 'INSTAGRAM' },
      data: { status: 'DISCONNECTED' },
    })
    emitInstagramStatus(global.io, 'DISCONNECTED')
    throw new Error(`Falha no login Instagram: ${err.message}`)
  }
}

export async function disconnectInstagram() {
  stopPolling()
  ig = null
  if (existsSync(SESSION_FILE)) {
    const { unlink } = await import('fs/promises')
    await unlink(SESSION_FILE).catch(() => {})
  }
  await prisma.integration.upsert({
    where: { channel: 'INSTAGRAM' },
    update: { status: 'DISCONNECTED', username: null },
    create: { channel: 'INSTAGRAM', status: 'DISCONNECTED' },
  })
  emitInstagramStatus(global.io, 'DISCONNECTED')
}

export async function sendInstagramMessage(threadId, text) {
  if (!ig) throw new Error('Instagram não está conectado')
  const thread = ig.entity.directThread([threadId])
  await thread.broadcastText(text)
  return null
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(pollDirectMessages, POLL_INTERVAL_MS)
  pollDirectMessages()
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollDirectMessages() {
  if (!ig) return
  try {
    const inbox = ig.feed.directInbox()
    const threads = await inbox.items()

    for (const thread of threads) {
      const threadId = thread.thread_id
      const lastItem = thread.items?.[0]
      if (!lastItem) continue

      // Skip messages sent by us
      const myPk = ig.state.cookieUserId
      if (String(lastItem.user_id) === String(myPk)) continue

      // Deduplicate by item_id
      if (lastSeqId === lastItem.item_id) continue

      const senderPk = String(lastItem.user_id)
      const senderUser = thread.users?.find((u) => String(u.pk) === senderPk)
      const senderUsername = senderUser?.username || senderPk
      const body =
        lastItem.text ||
        (lastItem.media ? '[imagem]' : null) ||
        (lastItem.voice_media ? '[áudio]' : null) ||
        '[mensagem]'

      const messageType = lastItem.media
        ? 'IMAGE'
        : lastItem.voice_media
        ? 'AUDIO'
        : 'TEXT'

      // Find or create contact
      let contact = await prisma.contact.findFirst({
        where: { instagram: senderUsername },
      })
      if (!contact) {
        contact = await prisma.contact.create({
          data: { name: senderUsername, instagram: senderUsername },
        })
      }

      // Find or create chat
      let chat = await prisma.chat.findUnique({
        where: { channel_remoteId: { channel: 'INSTAGRAM', remoteId: threadId } },
      })
      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            channel: 'INSTAGRAM',
            remoteId: threadId,
            contactId: contact.id,
          },
        })
      }

      // Check if message already stored
      const existing = await prisma.message.findFirst({
        where: { chatId: chat.id, remotemsgId: lastItem.item_id },
      })
      if (existing) continue

      const message = await prisma.message.create({
        data: {
          chatId: chat.id,
          contactId: contact.id,
          channel: 'INSTAGRAM',
          direction: 'INBOUND',
          type: messageType,
          body,
          remotemsgId: lastItem.item_id,
          status: 'DELIVERED',
          sentAt: new Date(Number(lastItem.timestamp) / 1000),
        },
      })

      await prisma.chat.update({
        where: { id: chat.id },
        data: { unread: { increment: 1 }, lastMsgAt: new Date() },
      })

      global.io?.to(`chat:${chat.id}`).emit('message:new', message)
      global.io?.emit('chat:updated', { chatId: chat.id, lastMessage: message })
    }

    if (threads[0]?.items?.[0]?.item_id) {
      lastSeqId = threads[0].items[0].item_id
    }
  } catch (err) {
    console.error('[Instagram] Erro no polling:', err.message)
  }
}
