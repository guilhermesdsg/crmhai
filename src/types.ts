export type PurchaseOrder = {
    id: number
    number: string
    type: 'NF' | 'Invoice'
    paymentTerms: number
    dealId: number
}

export type Payment = {
    id: number
    label: string
    date: string
    amount: number
    purchaseOrderId?: number | null
}

export type DealType = 'CONSULTORIA' | 'PD' | 'SAAS'

export type Stage = 'PROSPECCAO' | 'CONVERSA' | 'PROPOSTA' | 'FECHADO'

export type Deal = {
    id: number
    client: string
    stage: Stage
    industry?: string | null
    dealType?: DealType | null
    probability?: number
    nextStep?: string | null
    decisionMaker?: string | null
    payments: Payment[]
    purchaseOrders?: PurchaseOrder[]
}
