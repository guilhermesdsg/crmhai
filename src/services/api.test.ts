import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('API Service', () => {
    beforeEach(() => {
        mockFetch.mockReset()
    })

    describe('fetchDeals', () => {
        it('should fetch and transform deals correctly', async () => {
            const mockDeals = [
                {
                    id: 1,
                    client: 'Test Client',
                    stage: 'PROSPECCAO',
                    payments: [{ id: 1, label: 'Payment 1', date: '2025-01-15', amount: '1000.00' }],
                },
            ]

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockDeals,
            })

            const result = await api.fetchDeals()

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/deals')
            expect(result).toHaveLength(1)
            expect(result[0].client).toBe('Test Client')
            expect(result[0].payments[0].amount).toBe(1000) // Should be number, not string
        })

        it('should throw error when fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            })

            await expect(api.fetchDeals()).rejects.toThrow('Erro ao carregar clientes')
        })
    })

    describe('createDeal', () => {
        it('should create a deal with correct payload', async () => {
            const newDeal = {
                client: 'New Client',
                stage: 'PROSPECCAO',
                payments: [{ label: 'Sinal', date: '2025-02-01', amount: 5000 }],
            }

            const mockResponse = { id: 2, ...newDeal }
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            })

            const result = await api.createDeal(newDeal)

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDeal),
            })
            expect(result.id).toBe(2)
        })
    })

    describe('updateDeal', () => {
        it('should update a deal with correct payload', async () => {
            const updateData = { client: 'Updated Client', stage: 'CONVERSA' }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 1, ...updateData }),
            })

            await api.updateDeal(1, updateData)

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/deals/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            })
        })
    })

    describe('deleteDeal', () => {
        it('should delete a deal', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true })

            await api.deleteDeal(1)

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/deals/1', {
                method: 'DELETE',
            })
        })
    })

    describe('replacePayments', () => {
        it('should replace all payments for a deal', async () => {
            const payments = [
                { label: 'Sinal', date: '2025-02-01', amount: 5000 },
                { label: 'Entrega', date: '2025-03-01', amount: 10000 },
            ]

            mockFetch.mockResolvedValueOnce({ ok: true })

            await api.replacePayments(1, payments)

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/deals/1/payments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payments),
            })
        })
    })
})
