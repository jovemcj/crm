import { useEffect, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/index.js'
import DealCard from '../components/Kanban/DealCard.jsx'
import KanbanColumn from '../components/Kanban/KanbanColumn.jsx'
import DealModal from '../components/Kanban/DealModal.jsx'

export default function KanbanPage() {
  const [pipelines, setPipelines] = useState([])
  const [activePipeline, setActivePipeline] = useState(null)
  const [activeDrag, setActiveDrag] = useState(null)
  const [showDealModal, setShowDealModal] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState(null)
  const [editDeal, setEditDeal] = useState(null)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    loadPipelines()
  }, [])

  async function loadPipelines() {
    try {
      const { data } = await api.get('/pipelines')
      setPipelines(data)
      if (data.length > 0) setActivePipeline(data[0])
    } catch {
      toast.error('Erro ao carregar pipeline')
    } finally {
      setLoading(false)
    }
  }

  function findDeal(dealId) {
    for (const stage of activePipeline?.stages || []) {
      const deal = stage.deals.find((d) => d.id === dealId)
      if (deal) return { deal, stageId: stage.id }
    }
    return null
  }

  function handleDragStart({ active }) {
    const result = findDeal(active.id)
    if (result) setActiveDrag(result.deal)
  }

  async function handleDragEnd({ active, over }) {
    setActiveDrag(null)
    if (!over || active.id === over.id) return

    const result = findDeal(active.id)
    const targetStageId = over.id

    if (!result || result.stageId === targetStageId) return

    // Optimistic update
    setPipelines((prev) =>
      prev.map((p) => ({
        ...p,
        stages: p.stages.map((s) => ({
          ...s,
          deals:
            s.id === result.stageId
              ? s.deals.filter((d) => d.id !== active.id)
              : s.id === targetStageId
              ? [...s.deals, result.deal]
              : s.deals,
        })),
      }))
    )

    try {
      await api.patch(`/deals/${active.id}/move`, { stageId: targetStageId })
    } catch {
      toast.error('Erro ao mover negócio')
      loadPipelines()
    }
  }

  function openNewDeal(stageId) {
    setSelectedStageId(stageId)
    setEditDeal(null)
    setShowDealModal(true)
  }

  function openEditDeal(deal) {
    setEditDeal(deal)
    setShowDealModal(true)
  }

  async function handleSaveDeal(data) {
    try {
      if (editDeal) {
        await api.put(`/deals/${editDeal.id}`, data)
        toast.success('Negócio atualizado')
      } else {
        await api.post('/deals', { ...data, stageId: selectedStageId })
        toast.success('Negócio criado')
      }
      setShowDealModal(false)
      loadPipelines()
    } catch {
      toast.error('Erro ao salvar negócio')
    }
  }

  async function handleDeleteDeal(dealId) {
    try {
      await api.delete(`/deals/${dealId}`)
      toast.success('Negócio removido')
      loadPipelines()
    } catch {
      toast.error('Erro ao remover negócio')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 text-sm">Carregando...</div>
      </div>
    )
  }

  const pipeline = activePipeline

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Kanban</h1>
          <div className="flex gap-2">
            {pipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePipeline(p)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  activePipeline?.id === p.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Board */}
      {pipeline ? (
        <div className="flex-1 overflow-x-auto p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full min-w-max">
              {pipeline.stages.map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  onAddDeal={() => openNewDeal(stage.id)}
                  onEditDeal={openEditDeal}
                  onDeleteDeal={handleDeleteDeal}
                />
              ))}
            </div>

            <DragOverlay>
              {activeDrag ? <DealCard deal={activeDrag} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Nenhum pipeline encontrado. Configure um no banco de dados.
        </div>
      )}

      {showDealModal && (
        <DealModal
          deal={editDeal}
          onSave={handleSaveDeal}
          onClose={() => setShowDealModal(false)}
        />
      )}
    </div>
  )
}
