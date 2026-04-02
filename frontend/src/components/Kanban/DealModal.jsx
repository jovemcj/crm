import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import api from '../../api/index.js'

export default function DealModal({ deal, onSave, onClose }) {
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState({
    title: deal?.title || '',
    value: deal?.value || '',
    probability: deal?.probability || 0,
    notes: deal?.notes || '',
    contactId: deal?.contactId || '',
  })

  useEffect(() => {
    api.get('/contacts').then(({ data }) => setContacts(data)).catch(() => {})
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">{deal ? 'Editar Negócio' : 'Novo Negócio'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Título *</label>
            <input name="title" className="input" value={form.title} onChange={handleChange} required />
          </div>

          <div>
            <label className="label">Contato</label>
            <select name="contactId" className="input" value={form.contactId} onChange={handleChange}>
              <option value="">Selecionar contato</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$)</label>
              <input
                name="value"
                type="number"
                min="0"
                className="input"
                value={form.value}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">Probabilidade (%)</label>
              <input
                name="probability"
                type="number"
                min="0"
                max="100"
                className="input"
                value={form.probability}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              name="notes"
              className="input resize-none"
              rows={3}
              value={form.notes}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.title}
            className="btn-primary flex-1 justify-center"
          >
            {deal ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
