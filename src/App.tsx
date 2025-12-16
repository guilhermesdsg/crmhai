import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Info, Plus, Trash2, X } from 'lucide-react'
import { format, parseISO, startOfMonth } from 'date-fns'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'

type Payment = {
  id: number
  label: string
  date: string
  amount: number
}

type Deal = {
  id: number
  client: string
  stage: Stage
  industry?: string | null
  dealSize?: DealSize | null
  nextStep?: string | null
  decisionMaker?: string | null
  payments: Payment[]
}

type DealSize = 'SMALL' | 'MID' | 'ENTERPRISE'

type Stage = 'PROSPECCAO' | 'CONVERSA' | 'PROPOSTA' | 'FECHADO'

const stageLabels: Record<Stage, string> = {
  PROSPECCAO: 'Prospecção',
  CONVERSA: 'Conversa',
  PROPOSTA: 'Proposta',
  FECHADO: 'Fechado',
}

const currency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value,
  )

const columns: Stage[] = ['PROSPECCAO', 'CONVERSA', 'PROPOSTA', 'FECHADO']

type MonthEntry = {
  key: string
  label: string
  closed: number
  open: number
  items: { deal: string; label: string; amount: number; stage: Stage; date: string }[]
}

type ForecastViewMode = 'custom' | 'semester' | 'year'
type ForecastValueMode = 'gross' | 'expected'

const API_URL = 'http://localhost:4000'

function App() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [paymentsDraft, setPaymentsDraft] = useState<Payment[]>([])
  const [dealClientDraft, setDealClientDraft] = useState('')
  const [dealStageDraft, setDealStageDraft] = useState<Stage>('PROSPECCAO')
  const [dealIndustryDraft, setDealIndustryDraft] = useState('')
  const [dealSizeDraft, setDealSizeDraft] = useState<DealSize>('MID')
  const [dealNextStepDraft, setDealNextStepDraft] = useState('')
  const [dealDecisionMakerDraft, setDealDecisionMakerDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [forecastMode, setForecastMode] = useState<ForecastViewMode>('custom')
  const [forecastValueMode, setForecastValueMode] = useState<ForecastValueMode>('gross')
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo, setCustomTo] = useState<string>('')
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
  const [semesterFilter, setSemesterFilter] = useState<'1' | '2'>('1')

  const [isSavingDeal, setIsSavingDeal] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  const selectedDeal = deals.find((deal) => deal.id === selectedId) ?? null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_URL}/deals`)
        if (!res.ok) {
          throw new Error('Erro ao carregar clientes')
        }
        const data: Deal[] = await res.json()
        setDeals(
          data.map((deal) => ({
            ...deal,
            payments: deal.payments.map((p) => ({
              ...p,
              amount: Number(p.amount),
            })),
          })),
        )
      } catch (e) {
        console.error(e)
        const msg = 'Não foi possível carregar os clientes. Verifique se a API está rodando.'
        setError(msg)
        showToast('error', msg)
      } finally {
        setLoading(false)
      }
    }

    fetchDeals()
  }, [])

  useEffect(() => {
    if (selectedDeal && !isCreating) {
      setPaymentsDraft(selectedDeal.payments.map((p) => ({ ...p })))
      setDealClientDraft(selectedDeal.client)
      setDealStageDraft(selectedDeal.stage)
      setDealIndustryDraft(selectedDeal.industry ?? '')
      setDealSizeDraft(selectedDeal.dealSize ?? 'MID')
      setDealNextStepDraft(selectedDeal.nextStep ?? '')
      setDealDecisionMakerDraft(selectedDeal.decisionMaker ?? '')
    } else if (isCreating) {
      setPaymentsDraft([])
      setDealClientDraft('')
      setDealStageDraft('PROSPECCAO')
      setDealIndustryDraft('')
      setDealSizeDraft('MID')
      setDealNextStepDraft('')
      setDealDecisionMakerDraft('')
    }
  }, [selectedDeal, isCreating])

  const totalDraft = paymentsDraft.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  const updatePayment = (id: number, field: keyof Payment, value: string) => {
    setPaymentsDraft((prev) =>
      prev.map((payment) =>
        payment.id === id
          ? {
              ...payment,
              [field]: field === 'amount' ? Number(value) || 0 : value,
            }
          : payment,
      ),
    )
  }

  const addPayment = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    setPaymentsDraft((prev) => [
      ...prev,
      { id: Date.now(), label: 'Novo pagamento', date: today, amount: 0 },
    ])
  }

  const removePayment = (id: number) => {
    setPaymentsDraft((prev) => prev.filter((payment) => payment.id !== id))
  }

  const reloadDeals = async () => {
    try {
      const res = await fetch(`${API_URL}/deals`)
      if (!res.ok) return
      const data: Deal[] = await res.json()
      setDeals(
        data.map((deal) => ({
          ...deal,
          payments: deal.payments.map((p) => ({
            ...p,
            amount: Number(p.amount),
          })),
        })),
      )
    } catch (e) {
      console.error(e)
    }
  }

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
        await fetch(`${API_URL}/deals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: dealClientDraft.trim(),
            stage: dealStageDraft,
            industry: dealIndustryDraft.trim() || undefined,
            dealSize: dealSizeDraft,
            nextStep: dealNextStepDraft.trim() || undefined,
            decisionMaker: dealDecisionMakerDraft.trim() || undefined,
            payments: paymentsDraft.map((p) => ({
              label: p.label,
              date: p.date,
              amount: p.amount,
            })),
          }),
        })
      } else if (selectedDeal) {
        await fetch(`${API_URL}/deals/${selectedDeal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: dealClientDraft.trim(),
            stage: dealStageDraft,
            industry: dealIndustryDraft.trim() || undefined,
            dealSize: dealSizeDraft,
            nextStep: dealNextStepDraft.trim() || undefined,
            decisionMaker: dealDecisionMakerDraft.trim() || undefined,
          }),
        })

        await fetch(`${API_URL}/deals/${selectedDeal.id}/payments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            paymentsDraft.map((p) => ({
              label: p.label,
              date: p.date,
              amount: p.amount,
            })),
          ),
        })
      }
      await reloadDeals()
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
      `Tem certeza que deseja excluir o cliente "${selectedDeal.client}"?`,
    )
    if (!confirmDelete) return

    try {
      await fetch(`${API_URL}/deals/${selectedDeal.id}`, {
        method: 'DELETE',
      })
      await reloadDeals()
      closeModal()
      showToast('success', 'Cliente excluído com sucesso.')
    } catch (e) {
      console.error(e)
      showToast('error', 'Erro ao excluir o cliente.')
    }
  }

  const forecast = useMemo<MonthEntry[]>(() => {
    const months = new Map<string, MonthEntry>()

    deals.forEach((deal) => {
      deal.payments.forEach((payment) => {
        const date = parseISO(payment.date)
        if (Number.isNaN(date.getTime())) return

        const key = format(startOfMonth(date), 'yyyy-MM')
        if (!months.has(key)) {
          months.set(key, {
            key,
            label: format(date, 'MMM yyyy'),
            closed: 0,
            open: 0,
            items: [],
          })
        }

        const entry = months.get(key)!
        const bucket = deal.stage === 'FECHADO' ? 'closed' : 'open'
        entry[bucket] += payment.amount
        entry.items.push({
          deal: deal.client,
          label: payment.label,
          amount: payment.amount,
          stage: deal.stage,
          date: payment.date,
        })
      })
    })

    return Array.from(months.values()).sort((a, b) => (a.key < b.key ? -1 : 1))
  }, [deals])

const stageProbability: Record<Stage, number> = {
  PROSPECCAO: 0.1,
  CONVERSA: 0.3,
  PROPOSTA: 0.6,
  FECHADO: 1,
}

  const forecastYears = useMemo(
    () =>
      Array.from(new Set(forecast.map((m) => m.key.slice(0, 4))))
        .map((y) => Number(y))
        .sort((a, b) => a - b),
    [forecast],
  )

  useEffect(() => {
    if (forecast.length > 0 && !customFrom && !customTo) {
      const first = forecast[0]?.key
      const last = forecast[forecast.length - 1]?.key
      if (first && last) {
        setCustomFrom(first)
        setCustomTo(last)
      }
      if (forecastYears.length > 0) {
        setYearFilter(forecastYears[0])
      }
    }
  }, [forecast, customFrom, customTo, forecastYears])

  const filteredForecast = useMemo(() => {
    if (forecastMode === 'custom') {
      return forecast.filter(
        (m) =>
          (!customFrom || m.key >= customFrom) && (!customTo || m.key <= customTo),
      )
    }

    if (forecastMode === 'year') {
      const yearStr = String(yearFilter)
      return forecast.filter((m) => m.key.startsWith(`${yearStr}-`))
    }

    if (forecastMode === 'semester') {
      const yearStr = String(yearFilter)
      const from = semesterFilter === '1' ? `${yearStr}-01` : `${yearStr}-07`
      const to = semesterFilter === '1' ? `${yearStr}-06` : `${yearStr}-12`
      return forecast.filter((m) => m.key >= from && m.key <= to)
    }

    return forecast
  }, [forecast, forecastMode, customFrom, customTo, yearFilter, semesterFilter])

  const dealTotal = (deal: Deal) =>
    deal.payments.reduce((sum, payment) => sum + payment.amount, 0)

  const totalsForPeriod = useMemo(
    () => {
      const raw = filteredForecast.reduce(
        (acc, m) => {
          acc.closed += m.closed
          acc.open += m.open
          return acc
        },
        { closed: 0, open: 0 },
      )

      if (forecastValueMode === 'gross') return raw

      // expected: aplica probabilidade por estágio em cada item
      return filteredForecast.reduce(
        (acc, m) => {
          m.items.forEach((item) => {
            const prob = stageProbability[item.stage]
            if (item.stage === 'FECHADO') {
              acc.closed += item.amount * prob
            } else {
              acc.open += item.amount * prob
            }
          })
          return acc
        },
        { closed: 0, open: 0 },
      )
    },
    [filteredForecast, forecastValueMode],
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const dealId = Number(active.id)
    const targetStage = over.id as Stage
    if (Number.isNaN(dealId)) return

    const current = deals.find((d) => d.id === dealId)
    if (!current || current.stage === targetStage) return

    // Otimismo: atualiza local antes da API
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)),
    )

    try {
      await fetch(`${API_URL}/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      })
      showToast('success', `Cliente movido para ${stageLabels[targetStage]}.`)
    } catch (e) {
      console.error(e)
      showToast('error', 'Erro ao mover cliente. A coluna pode não ter sido atualizada.')
      // rollback simples
      reloadDeals()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">CRM</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              CRM HAI
            </h1>
            <p className="text-sm text-slate-500">
              Pagamentos por marcos, previsão mensal e pipeline Kanban.
            </p>
          </div>
          <div />
        </div>
      </header>

      <main className="mx-auto mt-8 grid max-w-6xl gap-8 px-4 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
              1
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Pipeline de Vendas
              </p>
              <p className="text-lg font-semibold text-slate-900">
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
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              <Plus size={14} />
              Novo cliente
            </button>
            {loading && (
              <span className="text-xs text-slate-500">Carregando clientes...</span>
            )}
            {!loading && error && (
              <span className="text-xs text-rose-600">{error}</span>
            )}
          </div>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {columns.map((column) => (
                <div
                  key={column}
                  id={column}
                  className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {stageLabels[column]}
                    </span>
                    <span className="text-xs text-slate-500">
                      {
                        deals.filter((deal) => deal.stage === column)
                          .length
                      }{' '}
                      deals
                    </span>
                  </div>
                  <div className="space-y-3">
                    {deals
                      .filter((deal) => deal.stage === column)
                      .map((deal) => (
                        <div
                          key={deal.id}
                          id={String(deal.id)}
                          data-deal-id={deal.id}
                          data-stage={column}
                          className="cursor-grab active:cursor-grabbing"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(deal.id))
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            const idStr = e.dataTransfer.getData('text/plain')
                            const dealId = Number(idStr)
                            if (!Number.isNaN(dealId) && deal.stage !== column) {
                              handleDragEnd({
                                active: { id: dealId } as any,
                                over: { id: column } as any,
                              })
                            }
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedId(deal.id)}
                            className={`w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm ${
                              deal.stage !== 'FECHADO' &&
                              deal.payments.some((p) => {
                                const today = new Date()
                                const date = parseISO(p.date)
                                const diff =
                                  (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                                return diff >= 0 && diff <= 15
                              })
                                ? 'border-amber-300 bg-amber-50/60'
                                : 'border-slate-100 bg-slate-50/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <p className="text-sm font-semibold text-slate-900">
                                  {deal.client}
                                </p>
                                <div className="flex flex-wrap items-center gap-1">
                                  {deal.industry && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                                      {deal.industry}
                                    </span>
                                  )}
                                  {deal.dealSize && (
                                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-50">
                                      {deal.dealSize === 'SMALL'
                                        ? 'Small'
                                        : deal.dealSize === 'MID'
                                          ? 'Mid'
                                          : 'Enterprise'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                  Total
                                </p>
                                <p className="text-sm font-bold text-slate-900">
                                  {currency(dealTotal(deal))}
                                </p>
                              </div>
                            </div>
                            {deal.nextStep && (
                              <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                                Próx. passo: {deal.nextStep}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {deal.payments.map((p) => (
                                <span
                                  key={p.id}
                                  className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700"
                                >
                                  {p.label}
                                </span>
                              ))}
                            </div>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </DndContext>
        </section>

        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
              2
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Previsão Financeira
              </p>
              <p className="text-lg font-semibold text-slate-900">
                Fluxo de Caixa por Mês (datas exatas)
              </p>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Período:</span>
            <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-[11px]">
              <button
                onClick={() => setForecastMode('custom')}
                className={`rounded-full px-3 py-1 ${
                  forecastMode === 'custom'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700'
                }`}
              >
                Livre
              </button>
              <button
                onClick={() => setForecastMode('semester')}
                className={`rounded-full px-3 py-1 ${
                  forecastMode === 'semester'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700'
                }`}
              >
                Semestre
              </button>
              <button
                onClick={() => setForecastMode('year')}
                className={`rounded-full px-3 py-1 ${
                  forecastMode === 'year'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700'
                }`}
              >
                Anual
              </button>
            </div>

            {forecastMode === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <span>De</span>
                <input
                  type="month"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                />
                <span>até</span>
                <input
                  type="month"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                />
              </div>
            )}

            {forecastMode === 'semester' && (
              <div className="flex flex-wrap items-center gap-2">
                <span>Ano</span>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(Number(e.target.value))}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                >
                  {forecastYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  value={semesterFilter}
                  onChange={(e) =>
                    setSemesterFilter(e.target.value === '1' ? '1' : '2')
                  }
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                >
                  <option value="1">1º semestre</option>
                  <option value="2">2º semestre</option>
                </select>
              </div>
            )}

            {forecastMode === 'year' && (
              <div className="flex flex-wrap items-center gap-2">
                <span>Ano</span>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(Number(e.target.value))}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                >
                  {forecastYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Valor:</span>
              <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-[11px]">
                <button
                  onClick={() => setForecastValueMode('gross')}
                  className={`rounded-full px-3 py-1 ${
                    forecastValueMode === 'gross'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700'
                  }`}
                >
                  Bruto
                </button>
                <button
                  onClick={() => setForecastValueMode('expected')}
                  className={`rounded-full px-3 py-1 ${
                    forecastValueMode === 'expected'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700'
                  }`}
                >
                  Esperado
                </button>
              </div>
            </div>
          </div>

          <div className="mb-2 flex items-center gap-3 text-xs text-slate-600">
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
              <span className="font-semibold">Total fechado no período:</span>
              <span className="font-bold">{currency(totalsForPeriod.closed)}</span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-800">
              <span className="font-semibold">Total em proposta:</span>
              <span className="font-bold">{currency(totalsForPeriod.open)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {filteredForecast.map((month) => (
              <div
                key={month.key}
                className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays size={16} />
                    <span className="font-semibold text-slate-900">{month.label}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      Fechado
                    </span>
                    <span className="rounded-full border border-dashed border-amber-300 px-2 py-1 text-amber-700">
                      Proposta
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-emerald-700">Fechado</p>
                    <p className="text-xl font-semibold text-emerald-900">
                      {currency(
                        forecastValueMode === 'gross'
                          ? month.closed
                          : month.items
                              .filter((i) => i.stage === 'FECHADO')
                              .reduce(
                                (sum, i) => sum + i.amount * stageProbability[i.stage],
                                0,
                              ),
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-amber-700">Proposta</p>
                    <p className="text-xl font-semibold text-amber-900">
                      {currency(
                        forecastValueMode === 'gross'
                          ? month.open
                          : month.items
                              .filter((i) => i.stage !== 'FECHADO')
                              .reduce(
                                (sum, i) => sum + i.amount * stageProbability[i.stage],
                                0,
                              ),
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {month.items.map((item, idx) => (
                    <div
                      key={`${item.deal}-${item.label}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900">{item.deal}</p>
                        <p className="text-xs text-slate-500">
                          {item.label} • {format(parseISO(item.date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.stage === 'FECHADO'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-dashed border-amber-300 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {currency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {(selectedDeal || isCreating) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Detalhes do cliente
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {isCreating ? 'Novo cliente' : selectedDeal?.client}
                </h2>
                <p className="text-sm text-slate-500">
                  Edite os marcos financeiros desta oportunidade.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500">Nome do cliente</label>
                  <input
                    value={dealClientDraft}
                    onChange={(e) => setDealClientDraft(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Ex: Cliente Atlas"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Estágio no pipeline</label>
                  <select
                    value={dealStageDraft}
                    onChange={(e) => setDealStageDraft(e.target.value as Stage)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {columns.map((stage) => (
                      <option key={stage} value={stage}>
                        {stageLabels[stage]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs text-slate-500">Setor / Indústria</label>
                  <input
                    value={dealIndustryDraft}
                    onChange={(e) => setDealIndustryDraft(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Ex: SaaS, Manufatura"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Tamanho do deal</label>
                  <select
                    value={dealSizeDraft}
                    onChange={(e) => setDealSizeDraft(e.target.value as DealSize)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="SMALL">Small</option>
                    <option value="MID">Mid</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Decisor principal</label>
                  <input
                    value={dealDecisionMakerDraft}
                    onChange={(e) => setDealDecisionMakerDraft(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Ex: Diretora de Operações"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-slate-500">Próximo passo combinado</label>
                <textarea
                  value={dealNextStepDraft}
                  onChange={(e) => setDealNextStepDraft(e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Ex: Enviar proposta revisada até sexta e agendar call com o decisor."
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Wallet2 size={16} />
                  Valor Total do Contrato
                </div>
                <div className="text-2xl font-bold text-slate-900">{currency(totalDraft)}</div>
              </div>

              <div className="mt-4 space-y-3">
                {paymentsDraft.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500">Descrição</label>
                        <input
                          value={payment.label}
                          onChange={(e) => updatePayment(payment.id, 'label', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          placeholder="Ex: Sinal"
                        />
                      </div>
                      <div className="w-36">
                        <label className="text-xs text-slate-500">Data Prevista</label>
                        <input
                          type="date"
                          value={payment.date}
                          onChange={(e) => updatePayment(payment.id, 'date', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div className="w-40">
                        <label className="text-xs text-slate-500">Valor (R$)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={payment.amount}
                          onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <button
                        onClick={() => removePayment(payment.id)}
                        className="self-start rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addPayment}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50"
                >
                  <Plus size={16} />
                  Adicionar pagamento
                </button>
              </div>
            </div>

            <div className="flex justify-between gap-2 border-t border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                {!isCreating && selectedDeal && (
                  <button
                    onClick={deleteDeal}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Excluir cliente
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveDealAndPayments}
                  disabled={isSavingDeal}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <CalendarDays size={16} />
                  {isSavingDeal ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-xs items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
          <div
            className={`mt-0.5 h-2 w-2 rounded-full ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1">
              <Info size={12} className="text-slate-500" />
              <span className="font-semibold text-slate-800">
                {toast.type === 'success' ? 'Tudo certo' : 'Algo deu errado'}
              </span>
            </div>
            <p className="text-slate-600">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

export default App

