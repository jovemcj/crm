import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function DealCard({ deal, onEdit, onDelete, isDragging }) {
  const [showMenu, setShowMenu] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } =
    useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={isDragging ? {} : style}
      {...(isDragging ? {} : { ...attributes, ...listeners })}
      className={`card p-3 cursor-grab active:cursor-grabbing select-none group relative ${
        isDragging ? 'shadow-2xl ring-1 ring-primary-500/50 rotate-1' : 'hover:border-slate-700'
      }`}
    >
      {/* Title */}
      <p className="text-sm font-medium text-white leading-tight mb-2">{deal.title}</p>

      {/* Contact */}
      {deal.contact && (
        <p className="text-xs text-slate-500 mb-2">{deal.contact.name}</p>
      )}

      {/* Value + actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-400">
          {deal.value > 0 ? `R$ ${deal.value.toLocaleString('pt-BR')}` : '—'}
        </span>

        {!isDragging && (
          <div className="relative">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v) }}
              className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <MoreHorizontal size={13} />
            </button>

            {showMenu && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute right-0 top-7 z-50 w-36 card shadow-xl py-1"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit?.() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete?.() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-slate-800"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {deal.probability > 0 && (
        <div className="mt-2">
          <div className="h-1 rounded-full bg-slate-800">
            <div
              className="h-1 rounded-full bg-primary-500 transition-all"
              style={{ width: `${deal.probability}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
