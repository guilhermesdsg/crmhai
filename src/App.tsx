import { useEffect, useState } from 'react'
import { Moon, Plus, Sun } from 'lucide-react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DealType, Payment, Stage } from './types'
import { KanbanCard } from './components/KanbanCard'
import { KanbanColumn } from './components/KanbanColumn'
import { DealModal } from './components/DealModal'
import { ForecastPanel } from './components/ForecastPanel'
import { Toast } from './components/Toast'
import { useDeals } from './hooks/useDeals'
import { useTheme } from './hooks/useTheme'
import * as api from './services/api'

const stageLabels: Record<Stage, string> = {
  PROSPECCAO: 'Prospecção',
  CONVERSA: 'Conversa',
  PROPOSTA: 'Proposta',
  FECHADO: 'Fechado',
}

const columns: Stage[] = ['PROSPECCAO', 'CONVERSA', 'PROPOSTA', 'FECHADO']

function App() {
  const { deals, loading, error, loadDeals, updateStage } = useDeals()
  const { theme, toggleTheme } = useTheme()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSavingDeal, setIsSavingDeal] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Draft state for modal
  const [paymentsDraft, setPaymentsDraft] = useState<Payment[]>([])
  const [dealClientDraft, setDealClientDraft] = useState('')
  const [dealStageDraft, setDealStageDraft] = useState<Stage>('PROSPECCAO')
  const [dealIndustryDraft, setDealIndustryDraft] = useState('')
  const [dealTypeDraft, setDealTypeDraft] = useState<DealType>('CONSULTORIA')
  const [dealProbabilityDraft, setDealProbabilityDraft] = useState<number>(50)
  const [dealNextStepDraft, setDealNextStepDraft] = useState('')
  const [dealDecisionMakerDraft, setDealDecisionMakerDraft] = useState('')

  const selectedDeal = deals.find((deal) => deal.id === selectedId) ?? null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (selectedDeal && !isCreating) {
      setPaymentsDraft(selectedDeal.payments.map((p) => ({ ...p, date: p.date.split('T')[0] })))
      setDealClientDraft(selectedDeal.client)
      setDealStageDraft(selectedDeal.stage)
      setDealIndustryDraft(selectedDeal.industry ?? '')
      setDealTypeDraft(selectedDeal.dealType ?? 'CONSULTORIA')
      setDealProbabilityDraft(selectedDeal.probability ?? 50)
      setDealNextStepDraft(selectedDeal.nextStep ?? '')
      setDealDecisionMakerDraft(selectedDeal.decisionMaker ?? '')
    } else if (isCreating) {
      setPaymentsDraft([])
      setDealClientDraft('')
      setDealStageDraft('PROSPECCAO')
      setDealIndustryDraft('')
      setDealTypeDraft('CONSULTORIA')
      setDealProbabilityDraft(50)
      setDealNextStepDraft('')
      setDealDecisionMakerDraft('')
    }
  }, [selectedDeal, isCreating])

  const closeModal = () => {
    setSelectedId(null)
    setIsCreating(false)
    setPaymentsDraft([])
  }

  const saveDealAndPayments = async () => {
    if (!dealClientDraft.trim()) return
    setIsSavingDeal(true)
    try {
      if (isCreating) {
        await api.createDeal({
          client: dealClientDraft.trim(),
          stage: dealStageDraft,
          industry: dealIndustryDraft.trim() || undefined,
          dealType: dealTypeDraft,
          probability: dealProbabilityDraft,
          nextStep: dealNextStepDraft.trim() || undefined,
          decisionMaker: dealDecisionMakerDraft.trim() || undefined,
          payments: paymentsDraft.map((p) => ({
            label: p.label,
            date: p.date,
            amount: p.amount,
          })),
        })
      } else if (selectedDeal) {
        await api.updateDeal(selectedDeal.id, {
          client: dealClientDraft.trim(),
          stage: dealStageDraft,
          industry: dealIndustryDraft.trim() || undefined,
          dealType: dealTypeDraft,
          probability: dealProbabilityDraft,
          nextStep: dealNextStepDraft.trim() || undefined,
          decisionMaker: dealDecisionMakerDraft.trim() || undefined,
        })

        await api.replacePayments(
          selectedDeal.id,
          paymentsDraft.map((p) => ({
            label: p.label,
            date: p.date,
            amount: p.amount,
          }))
        )
      }
      await loadDeals()
      closeModal()
      showToast('success', isCreating ? 'Cliente criado com sucesso.' : 'Cliente atualizado.')
    } catch (e) {
      console.error(e)
      showToast('error', 'Erro ao salvar o cliente. Verifique a API.')
    } finally {
      setIsSavingDeal(false)
    }
  }

  const deleteDeal = async () => {
    if (!selectedDeal || isCreating) {
      closeModal()
      return
    }
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o cliente "${selectedDeal.client}"?`
    )
    if (!confirmDelete) return

    try {
      await api.deleteDeal(selectedDeal.id)
      await loadDeals()
      closeModal()
      showToast('success', 'Cliente excluído com sucesso.')
    } catch (e) {
      console.error(e)
      showToast('error', 'Erro ao excluir o cliente.')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const dealId = Number(active.id)
    const targetStage = over.id as Stage
    if (Number.isNaN(dealId)) return

    const current = deals.find((d) => d.id === dealId)
    if (!current || current.stage === targetStage) return

    try {
      await updateStage(dealId, targetStage)
      showToast('success', `Cliente movido para ${stageLabels[targetStage]}.`)
    } catch (e) {
      console.error(e)
      showToast('error', 'Erro ao mover cliente. A coluna pode não ter sido atualizada.')
    }
  }

  return (
    <div
      className={`min-h-screen pb-12 transition-colors duration-300 ${theme === 'dark' ? 'dark bg-slate-900' : 'bg-slate-50'
        }`}
    >
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <img src="/hai-logo.png" alt="HAI Logo" className="h-10 w-auto" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                CRM
              </p>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">CRM HAI</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pagamentos por marcos, previsão mensal e pipeline Kanban.
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="mx-auto mt-8 grid max-w-6xl gap-8 px-4 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-brand-500">
              1
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Pipeline de Vendas
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                Kanban com Work Packages
              </p>
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => {
                setIsCreating(true)
                setSelectedId(null)
                setDealClientDraft('')
                setDealStageDraft('PROSPECCAO')
                setPaymentsDraft([])
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Plus size={14} />
              Novo cliente
            </button>
            {loading && <span className="text-xs text-slate-500">Carregando clientes...</span>}
            {!loading && error && <span className="text-xs text-rose-600">{error}</span>}
          </div>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {columns.map((column) => (
                <KanbanColumn
                  key={column}
                  stage={column}
                  label={stageLabels[column]}
                  count={deals.filter((deal) => deal.stage === column).length}
                >
                  {deals
                    .filter((deal) => deal.stage === column)
                    .map((deal) => (
                      <KanbanCard key={deal.id} deal={deal} onClick={() => setSelectedId(deal.id)} />
                    ))}
                </KanbanColumn>
              ))}
            </div>
          </DndContext>
        </section>

        <ForecastPanel deals={deals} />
      </main>

      {(selectedDeal || isCreating) && (
        <DealModal
          deal={selectedDeal}
          isCreating={isCreating}
          isSaving={isSavingDeal}
          clientDraft={dealClientDraft}
          setClientDraft={setDealClientDraft}
          stageDraft={dealStageDraft}
          setStageDraft={setDealStageDraft}
          industryDraft={dealIndustryDraft}
          setIndustryDraft={setDealIndustryDraft}
          typeDraft={dealTypeDraft}
          setTypeDraft={setDealTypeDraft}
          probabilityDraft={dealProbabilityDraft}
          setProbabilityDraft={setDealProbabilityDraft}
          nextStepDraft={dealNextStepDraft}
          setNextStepDraft={setDealNextStepDraft}
          decisionMakerDraft={dealDecisionMakerDraft}
          setDecisionMakerDraft={setDealDecisionMakerDraft}
          paymentsDraft={paymentsDraft}
          setPaymentsDraft={setPaymentsDraft}
          onClose={closeModal}
          onSave={saveDealAndPayments}
          onDelete={deleteDeal}
          onUpdateDeal={loadDeals}
        />
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}

export default App
