import type { Deal, PurchaseOrder } from '../types'

const API_URL = 'http://localhost:4000'

export async function fetchDeals(): Promise<Deal[]> {
    const res = await fetch(`${API_URL}/deals`)
    if (!res.ok) {
        throw new Error('Erro ao carregar clientes')
    }
    const data: Deal[] = await res.json()
    return data.map((deal) => ({
        ...deal,
        payments: deal.payments.map((p) => ({
            ...p,
            amount: Number(p.amount),
        })),
    }))
}

// Purchase Orders
export const createPurchaseOrder = async (data: {
    dealId: number
    number: string
    type: 'NF' | 'Invoice'
    paymentTerms: number
    paymentIds: number[]
}): Promise<PurchaseOrder> => {
    const res = await fetch(`${API_URL}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Erro ao criar PO')
    return res.json()
}

export const updatePurchaseOrder = async (
    id: number,
    data: {
        number?: string
        type?: 'NF' | 'Invoice'
        paymentTerms?: number
        paymentIds?: number[]
    }
): Promise<PurchaseOrder> => {
    const res = await fetch(`${API_URL}/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Erro ao atualizar PO')
    return res.json()
}

export const deletePurchaseOrder = async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/purchase-orders/${id}`, {
        method: 'DELETE',
    })
    if (!res.ok) throw new Error('Erro ao excluir PO')
}

export async function createDeal(deal: {
    client: string
    stage: string
    industry?: string
    dealType?: string
    probability?: number
    nextStep?: string
    decisionMaker?: string
    payments: Array<{ label: string; date: string; amount: number }>
}): Promise<Deal> {
    const res = await fetch(`${API_URL}/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deal),
    })
    if (!res.ok) {
        throw new Error('Erro ao criar cliente')
    }
    return res.json()
}

export async function updateDeal(
    id: number,
    data: {
        client?: string
        stage?: string
        industry?: string
        dealType?: string
        probability?: number
        nextStep?: string
        decisionMaker?: string
    }
): Promise<Deal> {
    const res = await fetch(`${API_URL}/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        throw new Error('Erro ao atualizar cliente')
    }
    return res.json()
}

export async function deleteDeal(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/deals/${id}`, {
        method: 'DELETE',
    })
    if (!res.ok) {
        throw new Error('Erro ao excluir cliente')
    }
}

export async function replacePayments(
    dealId: number,
    payments: Array<{ label: string; date: string; amount: number }>
): Promise<void> {
    const res = await fetch(`${API_URL}/deals/${dealId}/payments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payments),
    })
    if (!res.ok) {
        throw new Error('Erro ao atualizar pagamentos')
    }
}
