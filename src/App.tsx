import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, Trash2, Wallet2, X } from 'lucide-react'
import { format, parseISO, startOfMonth } from 'date-fns'

type Payment = {
  id: number
  label: string
  date: string
  amount: number
}

type Deal = {
  id: number
  client: string
  stage: 'Prospecção' | 'Conversa' | 'Proposta' | 'Fechado'
  payments: Payment[]
}

const currency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value,
  )

const mockDeals: Deal[] = [
  {
    id: 1,
    client: 'Cliente Atlas',
    stage: 'Prospecção',
    payments: [
      { id: 11, label: 'Sinal', date: '2025-01-10', amount: 5000 },
      { id: 12, label: 'Entrega do Design', date: '2025-02-05', amount: 12000 },
    ],
  },
  {
    id: 2,
    client: 'Cliente Boreal',
    stage: 'Conversa',
    payments: [
      { id: 21, label: 'Descoberta', date: '2025-01-22', amount: 3500 },
      { id: 22, label: 'Entrega Final', date: '2025-03-15', amount: 18500 },
    ],
  },
  {
    id: 3,
    client: 'Cliente Croma',
    stage: 'Proposta',
    payments: [
      { id: 31, label: 'Entrada', date: '2024-12-18', amount: 8000 },
      { id: 32, label: 'Go-live', date: '2025-02-28', amount: 22000 },
    ],
  },
  {
    id: 4,
    client: 'Cliente Delta',
    stage: 'Fechado',
    payments: [
      { id: 41, label: 'Sinal', date: '2024-11-10', amount: 7000 },
      { id: 42, label: 'Sprint 1', date: '2024-12-10', amount: 14000 },
      { id: 43, label: 'Entrega Final', date: '2025-01-20', amount: 18000 },
    ],
  },
]

const columns: Deal['stage'][] = ['Prospecção', 'Conversa', 'Proposta', 'Fechado']

type MonthEntry = {
  key: string
  label: string
  closed: number
  open: number
  items: { deal: string; label: string; amount: number; stage: Deal['stage']; date: string }[]
}

function App() {
  const [deals, setDeals] = useState<Deal[]>(mockDeals)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [paymentsDraft, setPaymentsDraft] = useState<Payment[]>([])

  const selectedDeal = deals.find((deal) => deal.id === selectedId) ?? null

  useEffect(() => {
    if (selectedDeal) {
      setPaymentsDraft(selectedDeal.payments.map((p) => ({ ...p })))
    }
  }, [selectedDeal])

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

  const savePayments = () => {
    if (!selectedDeal) return
    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === selectedDeal.id ? { ...deal, payments: paymentsDraft } : deal,
      ),
    )
    setSelectedId(null)
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
        const bucket = deal.stage === 'Fechado' ? 'closed' : 'open'
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

  const dealTotal = (deal: Deal) =>
    deal.payments.reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">CRM</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              CRM Consultivo com Work Packages
            </h1>
            <p className="text-sm text-slate-500">
              Pagamentos por marcos, previsão mensal e pipeline Kanban.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            <Wallet2 size={16} />
            Work Packages
          </div>
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((column) => (
              <div
                key={column}
                className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{column}</span>
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
                      <button
                        key={deal.id}
                        onClick={() => setSelectedId(deal.id)}
                        className="w-full rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                      >
                        <p className="text-sm font-semibold text-slate-900">{deal.client}</p>
                        <p className="text-xs text-slate-500">Total contrato</p>
                        <p className="text-sm font-bold text-slate-900">{currency(dealTotal(deal))}</p>
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
                    ))}
                </div>
              </div>
            ))}
          </div>
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
          <div className="space-y-3">
            {forecast.map((month) => (
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
                    <p className="text-xl font-semibold text-emerald-900">{currency(month.closed)}</p>
                  </div>
                  <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-amber-700">Proposta</p>
                    <p className="text-xl font-semibold text-amber-900">{currency(month.open)}</p>
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
                          item.stage === 'Fechado'
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

      {selectedDeal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Work Packages
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedDeal.client}
                </h2>
                <p className="text-sm text-slate-500">
                  Edite os marcos financeiros desta oportunidade.
                </p>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
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

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={savePayments}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <CalendarDays size={16} />
                Salvar cronograma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

