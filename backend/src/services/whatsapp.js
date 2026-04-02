import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { prisma } from '../db/client.js'
import { emitQRCode, emitWhatsAppStatus } from '../socket.js'

const SESSION_DIR = './sessions/whatsapp'

let sock = null
let currentQR = null

export function getWhatsAppQR() {
  return currentQR
}

export async function initWhatsApp() {
  const integration = await prisma.integration.findUnique({ where: { channel: 'WHATSAPP' } })
  if (integration?.status === 'CONNECTED') {
    await connectWhatsApp()
  }
}

export async function connectWhatsApp() {
  if (!existsSync(SESSION_DIR)) {
    await mkdir(SESSION_DIR, { recursive: true })
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console),
    },
    printQRInTerminal: true,
    browser: ['CRM', 'Chrome', '124.0'],
    syncFullHistory: false,
  })

  await prisma.integration.upsert({
    where: { channel: 'WHATSAPP' },
    update: { status: 'CONNECTING' },
    create: { channel: 'WHATSAPP', status: 'CONNECTING' },
  })
  emitWhatsAppStatus(global.io, 'CONNECTING')

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      currentQR = qr
      emitQRCode(global.io, qr)
    }

    if (connection === 'open') {
      currentQR = null
      const phone = sock.user?.id?.split(':')[0] || null
      await prisma.integration.upsert({
        where: { channel: 'WHATSAPP' },
        update: { status: 'CONNECTED', phone },
        create: { channel: 'WHATSAPP', status: 'CONNECTED', phone },
      })
      emitWhatsAppStatus(global.io, 'CONNECTED')
      console.log('[WhatsApp] Conectado:', phone)
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode
        : null

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      console.log('[WhatsApp] Conexão fechada. Reconectar:', shouldReconnect)

      if (shouldReconnect) {
        setTimeout(() => connectWhatsApp(), 5000)
      } else {
        await prisma.integration.upsert({
          where: { channel: 'WHATSAPP' },
          update: { status: 'DISCONNECTED', phone: null },
          create: { channel: 'WHATSAPP', status: 'DISCONNECTED' },
        })
        emitWhatsAppStatus(global.io, 'DISCONNECTED')
        sock = null
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      if (msg.key.fromMe) continue

      const remoteJid = msg.key.remoteJid
      if (!remoteJid || remoteJid === 'status@broadcast') continue

      const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
      const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '[mídia]'

      const messageType = msg.message?.imageMessage
        ? 'IMAGE'
        : msg.message?.audioMessage
        ? 'AUDIO'
        : msg.message?.videoMessage
        ? 'VIDEO'
        : msg.message?.documentMessage
        ? 'DOCUMENT'
        : 'TEXT'

      // Find or create contact
      let contact = await prisma.contact.findUnique({ where: { phone: `+${phone}` } })
      if (!contact) {
        const pushName = msg.pushName || phone
        contact = await prisma.contact.create({
          data: { name: pushName, phone: `+${phone}` },
        })
      }

      // Find or create chat
      let chat = await prisma.chat.findUnique({
        where: { channel_remoteId: { channel: 'WHATSAPP', remoteId: remoteJid } },
      })
      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            channel: 'WHATSAPP',
            remoteId: remoteJid,
            contactId: contact.id,
          },
        })
      }

      const message = await prisma.message.create({
        data: {
          chatId: chat.id,
          contactId: contact.id,
          channel: 'WHATSAPP',
          direction: 'INBOUND',
          type: messageType,
          body,
          remotemsgId: msg.key.id,
          status: 'DELIVERED',
          sentAt: new Date((msg.messageTimestamp || Date.now()) * 1000),
        },
      })

      await prisma.chat.update({
        where: { id: chat.id },
        data: { unread: { increment: 1 }, lastMsgAt: new Date() },
      })

      global.io?.to(`chat:${chat.id}`).emit('message:new', message)
      global.io?.emit('chat:updated', { chatId: chat.id, lastMessage: message })
    }
  })
}

export async function sendWhatsAppMessage(remoteJid, text) {
  if (!sock) throw new Error('WhatsApp não está conectado')
  const result = await sock.sendMessage(remoteJid, { text })
  return result?.key?.id || null
}

export async function disconnectWhatsApp() {
  if (sock) {
    await sock.logout()
    sock = null
  }
  await prisma.integration.upsert({
    where: { channel: 'WHATSAPP' },
    update: { status: 'DISCONNECTED', phone: null },
    create: { channel: 'WHATSAPP', status: 'DISCONNECTED' },
  })
  emitWhatsAppStatus(global.io, 'DISCONNECTED')
}
