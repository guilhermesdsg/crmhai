import { CalendarDays, Plus, Trash2, Wallet2, X } from 'lucide-react'
import type { Deal, DealType, Payment, Stage } from '../types'
import { currency } from '../utils'
import { PurchaseOrderManager } from './PurchaseOrderManager'

const stageLabels: Record<Stage, string> = {
    PROSPECCAO: 'Prospecção',
    CONVERSA: 'Conversa',
    PROPOSTA: 'Proposta',
    FECHADO: 'Fechado',
}

const columns: Stage[] = ['PROSPECCAO', 'CONVERSA', 'PROPOSTA', 'FECHADO']

type DealModalProps = {
    deal: Deal | null
    isCreating: boolean
    isSaving: boolean
    // Draft state
    clientDraft: string
    setClientDraft: (v: string) => void
    stageDraft: Stage
    setStageDraft: (v: Stage) => void
    industryDraft: string
    setIndustryDraft: (v: string) => void
    typeDraft: DealType
    setTypeDraft: (v: DealType) => void
    probabilityDraft: number
    setProbabilityDraft: (v: number) => void
    nextStepDraft: string
    setNextStepDraft: (v: string) => void
    decisionMakerDraft: string
    setDecisionMakerDraft: (v: string) => void
    paymentsDraft: Payment[]
    setPaymentsDraft: React.Dispatch<React.SetStateAction<Payment[]>>
    // Actions
    onClose: () => void
    onSave: () => void
    onDelete: () => void
    onUpdateDeal: () => void // New callback to refresh deal data
}

export function DealModal({
    deal,
    isCreating,
    isSaving,
    clientDraft,
    setClientDraft,
    stageDraft,
    setStageDraft,
    industryDraft,
    setIndustryDraft,
    typeDraft,
    setTypeDraft,
    probabilityDraft,
    setProbabilityDraft,
    nextStepDraft,
    setNextStepDraft,
    decisionMakerDraft,
    setDecisionMakerDraft,
    paymentsDraft,
    setPaymentsDraft,
    onClose,
    onSave,
    onDelete,
    onUpdateDeal,
}: DealModalProps) {
    const totalDraft = paymentsDraft.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const updatePayment = (id: number, field: keyof Payment, value: string) => {
        setPaymentsDraft((prev) =>
            prev.map((payment) =>
                payment.id === id
                    ? {
                        ...payment,
                        [field]: field === 'amount' ? Number(value) || 0 : value,
                    }
                    : payment
            )
        )
    }

    const addPayment = () => {
        const today = new Date().toISOString().split('T')[0]
        setPaymentsDraft((prev) => [
            ...prev,
            { id: Date.now(), label: 'Novo pagamento', date: today, amount: 0 },
        ])
    }

    const removePayment = (id: number) => {
        setPaymentsDraft((prev) => prev.filter((payment) => payment.id !== id))
    }

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
            <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            Detalhes do cliente
                        </p>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {isCreating ? 'Novo cliente' : deal?.client}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-400"
                    >
                        <X />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
                    <div className="mb-4 grid gap-3 md:grid-cols-3">
                        <div className="md:col-span-2">
                            <label className="text-xs text-slate-500 dark:text-slate-400">Nome do cliente</label>
                            <input
                                value={clientDraft}
                                onChange={(e) => setClientDraft(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Estágio</label>
                            <select
                                value={stageDraft}
                                onChange={(e) => setStageDraft(e.target.value as Stage)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
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
                            <label className="text-xs text-slate-500 dark:text-slate-400">Indústria</label>
                            <input
                                value={industryDraft}
                                onChange={(e) => setIndustryDraft(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Tipo de deal</label>
                            <select
                                value={typeDraft}
                                onChange={(e) => setTypeDraft(e.target.value as DealType)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            >
                                <option value="CONSULTORIA">Consultoria</option>
                                <option value="PD">P&D</option>
                                <option value="SAAS">SaaS</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">
                                Probabilidade ({probabilityDraft}%)
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={probabilityDraft}
                                onChange={(e) => setProbabilityDraft(Number(e.target.value))}
                                className="mt-2 w-full accent-brand-600 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="mb-4 grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Decisor principal</label>
                            <input
                                value={decisionMakerDraft}
                                onChange={(e) => setDecisionMakerDraft(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                placeholder="Ex: Diretora de Operações"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Próximo passo</label>
                            <input
                                value={nextStepDraft}
                                onChange={(e) => setNextStepDraft(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                        </div>
                    </div>

                    {!isCreating && deal && (
                        <div className="mb-6">
                            <PurchaseOrderManager
                                dealId={deal.id}
                                existingPurchaseOrders={deal.purchaseOrders}
                                payments={deal.payments} // Use real payments from deal, not drafts, to ensure ID integrity
                                onUpdate={onUpdateDeal}
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:bg-slate-800/50 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Wallet2 size={16} />
                            Valor Total do Contrato
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{currency(totalDraft)}</div>
                    </div>

                    <div className="mt-4 space-y-3">
                        {paymentsDraft.map((payment) => (
                            <div
                                key={payment.id}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:bg-slate-800 dark:border-slate-700"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                    <div className="flex-1">
                                        <input
                                            value={payment.label}
                                            onChange={(e) => updatePayment(payment.id, 'label', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            placeholder="Descrição"
                                        />
                                    </div>
                                    <div className="w-36">
                                        <input
                                            type="date"
                                            value={payment.date}
                                            onChange={(e) => updatePayment(payment.id, 'date', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        />
                                    </div>
                                    <div className="w-40">
                                        <input
                                            type="number"
                                            value={payment.amount}
                                            onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        />
                                    </div>
                                    <button onClick={() => removePayment(payment.id)} className="text-slate-400 hover:text-rose-600">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addPayment}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-900/20"
                        >
                            <Plus size={16} />
                            Adicionar pagamento
                        </button>
                    </div>
                </div>

                <div className="flex justify-between gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        {!isCreating && deal && (
                            <button
                                onClick={onDelete}
                                className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            >
                                Excluir
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-70"
                        >
                            <CalendarDays size={16} />
                            {isSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </div >
    )
}
