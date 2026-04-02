export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Cliente conectado: ${socket.id}`)

    socket.on('join:chat', (chatId) => {
      socket.join(`chat:${chatId}`)
    })

    socket.on('leave:chat', (chatId) => {
      socket.leave(`chat:${chatId}`)
    })

    socket.on('disconnect', () => {
      console.log(`[Socket] Cliente desconectado: ${socket.id}`)
    })
  })
}

// Helpers para emitir eventos globalmente
export function emitNewMessage(io, chatId, message) {
  io.to(`chat:${chatId}`).emit('message:new', message)
  io.emit('chat:updated', { chatId, lastMessage: message })
}

export function emitQRCode(io, qr) {
  io.emit('whatsapp:qr', { qr })
}

export function emitWhatsAppStatus(io, status) {
  io.emit('whatsapp:status', { status })
}

export function emitInstagramStatus(io, status) {
  io.emit('instagram:status', { status })
}
