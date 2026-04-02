import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import DealCard from './DealCard.jsx'

export default function KanbanColumn({ stage, onAddDeal, onEditDeal, onDeleteDeal }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const total = stage.deals.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
          <span className="text-sm font-semibold text-slate-300">{stage.name}</span>
          <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
            {stage.deals.length}
          </span>
        </div>
        <button
          onClick={onAddDeal}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {total > 0 && (
        <p className="text-xs text-slate-600 mb-2">
          R$ {total.toLocaleString('pt-BR')}
        </p>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-32 rounded-xl p-2 space-y-2 transition-colors ${
          isOver ? 'bg-primary-500/5 ring-1 ring-primary-500/30' : 'bg-slate-900/50'
        }`}
      >
        <SortableContext items={stage.deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {stage.deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onEdit={() => onEditDeal(deal)}
              onDelete={() => onDeleteDeal(deal.id)}
            />
          ))}
        </SortableContext>

        {stage.deals.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-slate-700 border border-dashed border-slate-800 rounded-lg">
            Arraste aqui
          </div>
        )}
      </div>
    </div>
  )
}
