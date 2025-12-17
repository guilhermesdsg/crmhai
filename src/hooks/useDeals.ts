import { useCallback, useEffect, useState } from 'react'
import type { Deal } from '../types'
import * as api from '../services/api'

export function useDeals() {
    const [deals, setDeals] = useState<Deal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadDeals = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await api.fetchDeals()
            setDeals(data)
        } catch (e) {
            console.error(e)
            setError('Não foi possível carregar os clientes. Verifique se a API está rodando.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadDeals()
    }, [loadDeals])

    const createDeal = useCallback(
        async (deal: Parameters<typeof api.createDeal>[0]) => {
            await api.createDeal(deal)
            await loadDeals()
        },
        [loadDeals]
    )

    const updateDeal = useCallback(
        async (id: number, data: Parameters<typeof api.updateDeal>[1]) => {
            await api.updateDeal(id, data)
            await loadDeals()
        },
        [loadDeals]
    )

    const deleteDeal = useCallback(
        async (id: number) => {
            await api.deleteDeal(id)
            await loadDeals()
        },
        [loadDeals]
    )

    const updateStage = useCallback(
        async (id: number, stage: string) => {
            // Optimistic update
            setDeals((prev) =>
                prev.map((d) => (d.id === id ? { ...d, stage: stage as Deal['stage'] } : d))
            )
            try {
                await api.updateDeal(id, { stage })
            } catch (e) {
                // Rollback on error
                await loadDeals()
                throw e
            }
        },
        [loadDeals]
    )

    const replacePayments = useCallback(
        async (dealId: number, payments: Parameters<typeof api.replacePayments>[1]) => {
            await api.replacePayments(dealId, payments)
            await loadDeals()
        },
        [loadDeals]
    )

    return {
        deals,
        setDeals,
        loading,
        error,
        loadDeals,
        createDeal,
        updateDeal,
        deleteDeal,
        updateStage,
        replacePayments,
    }
}
