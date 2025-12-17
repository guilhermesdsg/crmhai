import { useState } from 'react'
import { Check, FileText, Plus, Trash2 } from 'lucide-react'
import type { Payment, PurchaseOrder } from '../types'
import { createPurchaseOrder, deletePurchaseOrder } from '../services/api'
import { currency } from '../utils'

type PurchaseOrderManagerProps = {
    dealId: number
    existingPurchaseOrders?: PurchaseOrder[]
    payments: Payment[]
    onUpdate: () => void
}

export function PurchaseOrderManager({
    dealId,
    existingPurchaseOrders = [],
    payments,
    onUpdate,
}: PurchaseOrderManagerProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [number, setNumber] = useState('')
    const [type, setType] = useState<'NF' | 'Invoice'>('NF')
    const [paymentTerms, setPaymentTerms] = useState(30)
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([])

    const availablePayments = payments.filter((p) => !p.purchaseOrderId)

    const handleCreate = async () => {
        if (!number.trim()) return
        try {
            await createPurchaseOrder({
                dealId,
                number,
                type,
                paymentTerms,
                paymentIds: selectedPaymentIds,
            })
            setIsCreating(false)
            setNumber('')
            setSelectedPaymentIds([])
            onUpdate()
        } catch (e) {
            console.error(e)
            alert('Erro ao criar PO')
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Excluir esta PO?')) return
        try {
            await deletePurchaseOrder(id)
            onUpdate()
        } catch (e) {
            console.error(e)
            alert('Erro ao excluir PO')
        }
    }

    const togglePayment = (id: number) => {
        setSelectedPaymentIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    return (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:bg-slate-800/50 dark:border-slate-700">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <FileText size={18} />
                    Ordens de Compra
                </h3>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                        <Plus size={14} />
                        Nova PO
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="rounded-lg border border-indigo-100 bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-600">
                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Número</label>
                            <input
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                placeholder="Ex: PO-1234"
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Tipo</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            >
                                <option value="NF">Nota Fiscal</option>
                                <option value="Invoice">Invoice</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Prazo (dias)</label>
                            <input
                                type="number"
                                value={paymentTerms}
                                onChange={(e) => setPaymentTerms(Number(e.target.value))}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            Vincular Pagamentos Disponíveis:
                        </p>
                        {availablePayments.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Nenhum pagamento disponível.</p>
                        ) : (
                            <div className="space-y-2">
                                {availablePayments.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => togglePayment(p.id)}
                                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${selectedPaymentIds.includes(p.id)
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
                                            : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`flex h-4 w-4 items-center justify-center rounded border ${selectedPaymentIds.includes(p.id)
                                                    ? 'border-indigo-500 bg-indigo-500 text-white'
                                                    : 'border-slate-300 bg-white dark:bg-slate-700 dark:border-slate-500'
                                                    }`}
                                            >
                                                {selectedPaymentIds.includes(p.id) && <Check size={10} />}
                                            </div>
                                            <span className="text-slate-700 dark:text-slate-300">
                                                {p.label} - {currency(p.amount)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">{p.date.split('T')[0]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!number.trim()}
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Salvar PO
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {existingPurchaseOrders.map((po) => (
                    <div
                        key={po.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:bg-slate-800 dark:border-slate-700"
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 dark:text-white">PO: {po.number}</span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    {po.type}
                                </span>
                                <span className="text-xs text-slate-500">{po.paymentTerms} dias</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {payments
                                    .filter((p) => p.purchaseOrderId === po.id)
                                    .map((p) => (
                                        <span
                                            key={p.id}
                                            className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                        >
                                            {p.label} ({currency(p.amount)})
                                        </span>
                                    ))}
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(po.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
