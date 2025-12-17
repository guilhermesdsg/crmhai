import { useMemo, useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { format, parseISO, startOfMonth } from 'date-fns'
import type { Deal, DealType, Stage } from '../types'
import { currency } from '../utils'

type MonthEntry = {
    key: string
    label: string
    closed: number
    open: number
    items: { deal: string; label: string; amount: number; stage: Stage; date: string; probability?: number }[]
}

type ForecastViewMode = 'custom' | 'semester' | 'year'
type ForecastValueMode = 'gross' | 'expected'



type ForecastPanelProps = {
    deals: Deal[]
}

export function ForecastPanel({ deals }: ForecastPanelProps) {
    const [forecastMode, setForecastMode] = useState<ForecastViewMode>('custom')
    const [forecastValueMode, setForecastValueMode] = useState<ForecastValueMode>('gross')
    const [forecastTypeFilter, setForecastTypeFilter] = useState<'ALL' | DealType>('ALL')
    const [customFrom, setCustomFrom] = useState<string>('')
    const [customTo, setCustomTo] = useState<string>('')
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [semesterFilter, setSemesterFilter] = useState<'1' | '2'>('1')
    const [onlyWithPO, setOnlyWithPO] = useState(false)

    const forecast = useMemo<MonthEntry[]>(() => {
        const months = new Map<string, MonthEntry>()

        deals.forEach((deal) => {
            deal.payments.forEach((payment) => {
                // Filter by PO if enabled
                if (onlyWithPO && !payment.purchaseOrderId) return

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
                    probability: deal.probability,
                })
            })
        })

        return Array.from(months.values()).sort((a, b) => (a.key < b.key ? -1 : 1))
    }, [deals])

    const forecastYears = useMemo(
        () =>
            Array.from(new Set(forecast.map((m) => m.key.slice(0, 4))))
                .map((y) => Number(y))
                .sort((a, b) => a - b),
        [forecast]
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
        const byType =
            forecastTypeFilter === 'ALL'
                ? forecast
                : forecast.map((entry) => ({
                    ...entry,
                    items: entry.items.filter((item) => {
                        const d = deals.find((x) => x.client === item.deal)
                        if (!d) return true
                        return d.dealType === forecastTypeFilter
                    }),
                }))

        const remapped = byType.map((m) => {
            const closed = m.items
                .filter((i) => i.stage === 'FECHADO')
                .reduce((sum, i) => sum + i.amount, 0)
            const open = m.items
                .filter((i) => i.stage !== 'FECHADO')
                .reduce((sum, i) => sum + i.amount, 0)
            return { ...m, closed, open }
        })

        if (forecastMode === 'custom') {
            return remapped.filter(
                (m) => (!customFrom || m.key >= customFrom) && (!customTo || m.key <= customTo)
            )
        }

        if (forecastMode === 'year') {
            const yearStr = String(yearFilter)
            return remapped.filter((m) => m.key.startsWith(`${yearStr}-`))
        }

        if (forecastMode === 'semester') {
            const yearStr = String(yearFilter)
            const from = semesterFilter === '1' ? `${yearStr}-01` : `${yearStr}-07`
            const to = semesterFilter === '1' ? `${yearStr}-06` : `${yearStr}-12`
            return remapped.filter((m) => m.key >= from && m.key <= to)
        }

        return remapped
    }, [forecast, forecastMode, customFrom, customTo, yearFilter, semesterFilter, forecastTypeFilter, deals, onlyWithPO])

    const totalsForPeriod = useMemo(() => {
        const raw = filteredForecast.reduce(
            (acc, m) => {
                acc.closed += m.closed
                acc.open += m.open
                return acc
            },
            { closed: 0, open: 0 }
        )

        if (forecastValueMode === 'gross') return raw

        return filteredForecast.reduce(
            (acc, m) => {
                m.items.forEach((item) => {
                    const prob = (item.probability ?? 0) / 100
                    if (item.stage === 'FECHADO') {
                        acc.closed += item.amount // Fechado is always 100% effectively, or we treat as full amount
                    } else {
                        acc.open += item.amount * prob
                    }
                })
                return acc
            },
            { closed: 0, open: 0 }
        )
    }, [filteredForecast, forecastValueMode])

    return (
        <section className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-brand-500">
                    2
                </div>
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Previsão Financeira
                    </p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        Fluxo de Caixa por Mês (datas exatas)
                    </p>
                </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Período:</span>
                <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-[11px] dark:bg-slate-900">
                    <button
                        onClick={() => setForecastMode('custom')}
                        className={`rounded-full px-3 py-1 transition-colors ${forecastMode === 'custom'
                            ? 'bg-slate-900 text-white dark:bg-brand-600'
                            : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                    >
                        Livre
                    </button>
                    <button
                        onClick={() => setForecastMode('semester')}
                        className={`rounded-full px-3 py-1 transition-colors ${forecastMode === 'semester'
                            ? 'bg-slate-900 text-white dark:bg-brand-600'
                            : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                    >
                        Semestre
                    </button>
                    <button
                        onClick={() => setForecastMode('year')}
                        className={`rounded-full px-3 py-1 transition-colors ${forecastMode === 'year'
                            ? 'bg-slate-900 text-white dark:bg-brand-600'
                            : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
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
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs dark:bg-slate-700 dark:border-slate-600"
                        />
                        <span>até</span>
                        <input
                            type="month"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs dark:bg-slate-700 dark:border-slate-600"
                        />
                    </div>
                )}

                {forecastMode === 'semester' && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span>Ano</span>
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(Number(e.target.value))}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs dark:bg-slate-700 dark:border-slate-600"
                        >
                            {forecastYears.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                        <select
                            value={semesterFilter}
                            onChange={(e) => setSemesterFilter(e.target.value === '1' ? '1' : '2')}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs dark:bg-slate-700 dark:border-slate-600"
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
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs dark:bg-slate-700 dark:border-slate-600"
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
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Valor:</span>
                    <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-[11px] dark:bg-slate-900">
                        <button
                            onClick={() => setForecastValueMode('gross')}
                            className={`rounded-full px-3 py-1 transition-colors ${forecastValueMode === 'gross'
                                ? 'bg-slate-900 text-white dark:bg-brand-600'
                                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                        >
                            Bruto
                        </button>
                        <button
                            onClick={() => setForecastValueMode('expected')}
                            className={`rounded-full px-3 py-1 transition-colors ${forecastValueMode === 'expected'
                                ? 'bg-slate-900 text-white dark:bg-brand-600'
                                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                        >
                            Esperado
                        </button>
                    </div>

                    <div className="w-full sm:w-auto">
                        <select
                            value={forecastTypeFilter}
                            onChange={(e) => setForecastTypeFilter(e.target.value as any)}
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs sm:w-auto dark:bg-slate-700 dark:border-slate-600"
                        >
                            <option value="ALL">Todos os tipos</option>
                            <option value="CONSULTORIA">Consultoria</option>
                            <option value="PD">P&D</option>
                            <option value="SAAS">SaaS</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
                <input
                    type="checkbox"
                    id="onlyPO"
                    checked={onlyWithPO}
                    onChange={(e) => setOnlyWithPO(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:focus:ring-brand-500"
                />
                <label htmlFor="onlyPO" className="text-sm text-slate-700 dark:text-slate-300">
                    Considerar apenas valores com Ordem de Compra (PO) emitida
                </label>
            </div>

            <div className="mb-2 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent dark:border-emerald-800">
                    <span className="font-semibold">Total fechado no período:</span>
                    <span className="font-bold">{currency(totalsForPeriod.closed)}</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-transparent dark:border-amber-800">
                    <span className="font-semibold">Total em proposta:</span>
                    <span className="font-bold">{currency(totalsForPeriod.open)}</span>
                </div>
            </div>

            <div className="space-y-3">
                {filteredForecast.map((month) => (
                    <div
                        key={month.key}
                        className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:bg-slate-800/90 dark:border-slate-700"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <CalendarDays size={16} />
                                <span className="font-semibold text-slate-900 dark:text-white">{month.label}</span>
                            </div>
                            <div className="flex gap-2 text-xs">
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-transparent dark:border-emerald-800">
                                    Fechado
                                </span>
                                <span className="rounded-full border border-dashed border-amber-300 px-2 py-1 text-amber-700 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-900/20">
                                    Proposta
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20 dark:border-emerald-800">
                                <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Fechado</p>
                                <p className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
                                    {currency(
                                        forecastValueMode === 'gross'
                                            ? month.closed
                                            : month.items
                                                .filter((i) => i.stage === 'FECHADO')
                                                .reduce((sum, i) => sum + i.amount, 0)
                                    )}
                                </p>
                            </div>
                            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2 dark:bg-amber-900/20 dark:border-amber-800">
                                <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">Proposta</p>
                                <p className="text-xl font-semibold text-amber-900 dark:text-amber-100">
                                    {currency(
                                        forecastValueMode === 'gross'
                                            ? month.open
                                            : month.items
                                                .filter((i) => i.stage !== 'FECHADO')
                                                .reduce((sum, i) => sum + i.amount * ((i.probability ?? 0) / 100), 0)
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 space-y-2">
                            {month.items.map((item, idx) => (
                                <div
                                    key={`${item.deal}-${item.label}-${idx}`}
                                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:bg-slate-700/50 dark:border-slate-700"
                                >
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{item.deal}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {item.label} • {format(parseISO(item.date), 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${item.stage === 'FECHADO'
                                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
                                            : 'border border-dashed border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
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
    )
}
