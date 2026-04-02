import { useEffect, useState, useRef } from 'react'
import { Send, MessageSquare, Instagram, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import api from '../api/index.js'
import { useAuthStore } from '../store/auth.js'

const WS_URL = import.meta.env.VITE_WS_URL || ''

function ChannelBadge({ channel }) {
  if (channel === 'WHATSAPP') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
        <Phone size={10} /> WhatsApp
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-pink-400 bg-pink-400/10 px-2 py-0.5 rounded-full">
      <Instagram size={10} /> Instagram
    </span>
  )
}

function MessageBubble({ msg }) {
  const isOut = msg.direction === 'OUTBOUND'
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm ${
          isOut
            ? 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-slate-800 text-slate-100 rounded-bl-sm'
        }`}
      >
        <p className="leading-relaxed">{msg.body}</p>
        <p className={`text-xs mt-1 ${isOut ? 'text-primary-200' : 'text-slate-500'}`}>
          {new Date(msg.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    loadChats()

    const socket = io(WS_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('chat:updated', ({ chatId, lastMessage }) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, lastMsgAt: lastMessage.sentAt, unread: c.unread + 1 } : c
        )
      )
    })

    socket.on('message:new', (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })

    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if (!activeChat) return
    const socket = socketRef.current
    socket?.emit('join:chat', activeChat.id)
    loadMessages(activeChat.id)

    return () => socket?.emit('leave:chat', activeChat.id)
  }, [activeChat?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadChats() {
    try {
      const { data } = await api.get('/messages/chats')
      setChats(data)
    } catch {}
  }

  async function loadMessages(chatId) {
    setLoadingMsgs(true)
    try {
      const { data } = await api.get(`/messages/chats/${chatId}`)
      setMessages(data.messages)
    } catch {
      toast.error('Erro ao carregar mensagens')
    } finally {
      setLoadingMsgs(false)
    }
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim() || !activeChat || sending) return

    const body = text.trim()
    setText('')
    setSending(true)

    // Optimistic
    const optimistic = {
      id: `tmp-${Date.now()}`,
      body,
      direction: 'OUTBOUND',
      sentAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      await api.post(`/messages/chats/${activeChat.id}/send`, { body })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar mensagem')
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setText(body)
    } finally {
      setSending(false)
    }
  }

  const sortedChats = [...chats].sort(
    (a, b) => new Date(b.lastMsgAt || b.createdAt) - new Date(a.lastMsgAt || a.createdAt)
  )

  return (
    <div className="flex h-full">
      {/* Chat list */}
      <div className="w-72 shrink-0 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <h1 className="font-bold text-white">Mensagens</h1>
          <p className="text-xs text-slate-500 mt-0.5">{chats.length} conversas</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-sm gap-2">
              <MessageSquare size={28} className="opacity-30" />
              <p>Nenhuma conversa</p>
            </div>
          ) : (
            sortedChats.map((chat) => {
              const lastMsg = chat.messages?.[0]
              return (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${
                    activeChat?.id === chat.id ? 'bg-slate-800' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-sm font-bold text-slate-300">
                        {(chat.contact?.name || chat.remoteId)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {chat.contact?.name || chat.remoteId}
                        </p>
                        <ChannelBadge channel={chat.channel} />
                      </div>
                    </div>
                    {chat.unread > 0 && (
                      <span className="shrink-0 text-xs bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-slate-600 truncate mt-1.5 pl-11">{lastMsg.body}</p>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat window */}
      {activeChat ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
              {(activeChat.contact?.name || activeChat.remoteId)[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white">
                {activeChat.contact?.name || activeChat.remoteId}
              </p>
              <ChannelBadge channel={activeChat.channel} />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMsgs ? (
              <div className="text-center text-sm text-slate-600">Carregando...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-slate-600 mt-8">Sem mensagens ainda.</div>
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-3 border-t border-slate-800">
            <input
              className="input flex-1"
              placeholder="Digite uma mensagem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3">
          <MessageSquare size={40} className="opacity-20" />
          <p className="text-sm">Selecione uma conversa</p>
        </div>
      )}
    </div>
  )
}
