import { useEffect, useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { io } from 'socket.io-client'
import { Phone, Instagram, CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/index.js'
import { useAuthStore } from '../store/auth.js'

const WS_URL = import.meta.env.VITE_WS_URL || ''

function StatusBadge({ status }) {
  if (status === 'CONNECTED') return (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full font-medium">
      <CheckCircle size={12} /> Conectado
    </span>
  )
  if (status === 'CONNECTING') return (
    <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full font-medium">
      <Loader size={12} className="animate-spin" /> Conectando...
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full font-medium">
      <XCircle size={12} /> Desconectado
    </span>
  )
}

function WhatsAppCard() {
  const [status, setStatus] = useState('DISCONNECTED')
  const [phone, setPhone] = useState(null)
  const [qr, setQr] = useState(null)
  const [loading, setLoading] = useState(false)
  const token = useAuthStore((s) => s.token)
  const socketRef = useRef(null)

  useEffect(() => {
    loadStatus()
    const socket = io(WS_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('whatsapp:status', ({ status: s }) => {
      setStatus(s)
      if (s === 'CONNECTED') setQr(null)
      loadStatus()
    })
    socket.on('whatsapp:qr', ({ qr: q }) => {
      setQr(q)
      setStatus('CONNECTING')
    })

    return () => socket.disconnect()
  }, [])

  async function loadStatus() {
    try {
      const { data } = await api.get('/integrations/whatsapp/status')
      setStatus(data.status)
      setPhone(data.phone)
    } catch {}
  }

  async function handleConnect() {
    setLoading(true)
    try {
      await api.post('/integrations/whatsapp/connect')
      toast.success('Aguarde o QR Code...')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao conectar')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    setLoading(true)
    try {
      await api.post('/integrations/whatsapp/disconnect')
      setQr(null)
      toast.success('WhatsApp desconectado')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao desconectar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Phone size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">WhatsApp</h3>
            <p className="text-xs text-slate-500">Conexão não oficial via Baileys</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {phone && status === 'CONNECTED' && (
        <div className="text-sm text-slate-400 bg-slate-800 px-3 py-2 rounded-lg">
          Número: <span className="text-white font-medium">{phone}</span>
        </div>
      )}

      {qr && status !== 'CONNECTED' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-slate-400">Escaneie o QR Code com o WhatsApp do seu celular:</p>
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={qr} size={200} />
          </div>
          <p className="text-xs text-slate-600">Abra o WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo</p>
        </div>
      )}

      <div className="flex gap-3">
        {status !== 'CONNECTED' ? (
          <button
            onClick={handleConnect}
            disabled={loading || status === 'CONNECTING'}
            className="btn-primary"
          >
            {loading || status === 'CONNECTING' ? (
              <><Loader size={14} className="animate-spin" /> Conectando...</>
            ) : (
              <><RefreshCw size={14} /> Conectar</>
            )}
          </button>
        ) : (
          <button onClick={handleDisconnect} disabled={loading} className="btn-danger">
            Desconectar
          </button>
        )}
      </div>

      <div className="text-xs text-slate-600 bg-slate-800/50 rounded-lg p-3">
        <strong className="text-amber-400">Aviso:</strong> Esta integração utiliza a API não oficial do WhatsApp Web.
        O uso pode resultar no banimento da conta. Use com cautela e por sua conta e risco.
      </div>
    </div>
  )
}

function InstagramCard() {
  const [status, setStatus] = useState('DISCONNECTED')
  const [username, setUsername] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })
  const [showForm, setShowForm] = useState(false)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    loadStatus()
    const socket = io(WS_URL, { auth: { token } })
    socket.on('instagram:status', ({ status: s }) => {
      setStatus(s)
      loadStatus()
    })
    return () => socket.disconnect()
  }, [])

  async function loadStatus() {
    try {
      const { data } = await api.get('/integrations/instagram/status')
      setStatus(data.status)
      setUsername(data.username)
    } catch {}
  }

  async function handleConnect(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/integrations/instagram/connect', form)
      toast.success('Instagram conectado!')
      setShowForm(false)
      setForm({ username: '', password: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao conectar Instagram')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    setLoading(true)
    try {
      await api.post('/integrations/instagram/disconnect')
      toast.success('Instagram desconectado')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Instagram size={20} className="text-pink-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Instagram DM</h3>
            <p className="text-xs text-slate-500">Conexão via API privada do Instagram</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {username && status === 'CONNECTED' && (
        <div className="text-sm text-slate-400 bg-slate-800 px-3 py-2 rounded-lg">
          Conta: <span className="text-white font-medium">@{username}</span>
        </div>
      )}

      {status !== 'CONNECTED' && (
        <>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Instagram size={14} /> Conectar
            </button>
          ) : (
            <form onSubmit={handleConnect} className="space-y-3">
              <div>
                <label className="label">Usuário Instagram</label>
                <input
                  className="input"
                  placeholder="@usuario"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Senha</label>
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <><Loader size={14} className="animate-spin" /> Conectando...</> : 'Entrar'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {status === 'CONNECTED' && (
        <button onClick={handleDisconnect} disabled={loading} className="btn-danger">
          Desconectar
        </button>
      )}

      <div className="text-xs text-slate-600 bg-slate-800/50 rounded-lg p-3">
        <strong className="text-amber-400">Aviso:</strong> Esta integração usa a API privada do Instagram.
        Pode resultar em suspensão temporária ou permanente da conta. Use uma conta dedicada para testes.
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-white">Integrações</h1>
      <WhatsAppCard />
      <InstagramCard />
    </div>
  )
}
