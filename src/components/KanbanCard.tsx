import { CSS } from '@dnd-kit/utilities'
import { useDraggable } from '@dnd-kit/core'
import type { Deal } from '../types'
import { currency } from '../utils'
import { parseISO } from 'date-fns'

type KanbanCardProps = {
    deal: Deal
    onClick: () => void
}

export function KanbanCard({ deal, onClick }: KanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: deal.id,
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    }

    const dealTotal = (deal: Deal) =>
        deal.payments.reduce((sum, payment) => sum + payment.amount, 0)

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`cursor-grab active:cursor-grabbing`}
        >
            <button
                type="button"
                onClick={onClick}
                className={`w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${deal.stage !== 'FECHADO' &&
                    deal.payments.some((p) => {
                        const today = new Date()
                        const date = parseISO(p.date)
                        const diff =
                            (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                        return diff >= 0 && diff <= 15
                    })
                    ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-900/20 dark:border-amber-700/50'
                    : 'border-slate-100 bg-slate-50/70 hover:bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700'
                    }`}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {deal.client}
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                            {deal.industry && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    {deal.industry}
                                </span>
                            )}
                            {deal.dealType && (
                                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-50 dark:bg-brand-600">
                                    {deal.dealType === 'CONSULTORIA'
                                        ? 'Consultoria'
                                        : deal.dealType === 'PD'
                                            ? 'P&D'
                                            : 'SaaS'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="min-w-fit text-right">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            Total
                        </p>
                        <p className="whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                            {currency(dealTotal(deal))}
                        </p>
                    </div>
                </div>
                {deal.nextStep && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                        Próx. passo: {deal.nextStep}
                    </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                    {deal.payments.map((p) => (
                        <span
                            key={p.id}
                            className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        >
                            {p.label}
                        </span>
                    ))}
                </div>
            </button>
        </div>
    )
}
