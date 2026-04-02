import { useEffect, useState } from 'react'
import { Plus, Search, Phone, Mail, Building2, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/index.js'

function ContactModal({ contact, onSave, onClose }) {
  const [form, setForm] = useState({
    name: contact?.name || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    instagram: contact?.instagram || '',
    company: contact?.company || '',
    notes: contact?.notes || '',
    tags: contact?.tags?.join(', ') || '',
  })

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await onSave({
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">{contact ? 'Editar Contato' : 'Novo Contato'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input name="name" className="input" value={form.name} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefone (WhatsApp)</label>
              <input name="phone" className="input" placeholder="+5511999990000" value={form.phone} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" value={form.email} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Instagram (@usuario)</label>
              <input name="instagram" className="input" placeholder="@usuario" value={form.instagram} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Empresa</label>
              <input name="company" className="input" value={form.company} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">Tags (separadas por vírgula)</label>
            <input name="tags" className="input" placeholder="cliente, premium, lead" value={form.tags} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea name="notes" className="input resize-none" rows={3} value={form.notes} onChange={handleChange} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" className="btn-primary flex-1 justify-center">{contact ? 'Salvar' : 'Criar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContacts()
  }, [search])

  async function loadContacts() {
    try {
      const { data } = await api.get('/contacts', { params: { search } })
      setContacts(data)
    } catch {
      toast.error('Erro ao carregar contatos')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(data) {
    try {
      if (editContact) {
        await api.put(`/contacts/${editContact.id}`, data)
        toast.success('Contato atualizado')
      } else {
        await api.post('/contacts', data)
        toast.success('Contato criado')
      }
      setShowModal(false)
      setEditContact(null)
      loadContacts()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar contato')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este contato?')) return
    try {
      await api.delete(`/contacts/${id}`)
      toast.success('Contato removido')
      loadContacts()
    } catch {
      toast.error('Erro ao remover contato')
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Contatos</h1>
        <button
          onClick={() => { setEditContact(null); setShowModal(true) }}
          className="btn-primary"
        >
          <Plus size={16} /> Novo Contato
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Buscar por nome, telefone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">Contato</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 hidden lg:table-cell">Empresa</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 hidden lg:table-cell">Tags</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">Carregando...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">Nenhum contato encontrado.</td></tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-white">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="space-y-0.5">
                      {c.phone && <div className="flex items-center gap-1.5 text-slate-400"><Phone size={11} />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1.5 text-slate-400"><Mail size={11} />{c.email}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.company && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Building2 size={11} />{c.company}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditContact(c); setShowModal(true) }}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700 text-slate-500 hover:text-white"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ContactModal
          contact={editContact}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditContact(null) }}
        />
      )}
    </div>
  )
}
