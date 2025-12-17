import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'

export const purchaseOrdersRouter = Router()

const purchaseOrderSchema = z.object({
    dealId: z.number().int().positive(),
    number: z.string().min(1).transform((v) => v.trim()),
    type: z.enum(['NF', 'Invoice']),
    paymentTerms: z.number().int().min(0).default(30),
    paymentIds: z.array(z.number().int().positive()).optional(),
})

const purchaseOrderUpdateSchema = z.object({
    number: z.string().min(1).transform((v) => v.trim()).optional(),
    type: z.enum(['NF', 'Invoice']).optional(),
    paymentTerms: z.number().int().min(0).optional(),
    paymentIds: z.array(z.number().int().positive()).optional(),
})

purchaseOrdersRouter.post('/', async (req, res) => {
    const parsed = purchaseOrderSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() })
    }
    const { dealId, number, type, paymentTerms, paymentIds = [] } = parsed.data

    try {
        const po = await prisma.purchaseOrder.create({
            data: {
                dealId,
                number,
                type,
                paymentTerms,
                payments: {
                    connect: paymentIds.map((id) => ({ id })),
                },
            },
            include: { payments: true },
        })
        res.status(201).json(po)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Erro ao criar PO' })
    }
})

purchaseOrdersRouter.patch('/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

    const parsed = purchaseOrderUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() })
    }

    const { paymentIds, ...data } = parsed.data

    try {
        const po = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                ...data,
                payments: paymentIds
                    ? {
                        set: paymentIds.map((id) => ({ id })),
                    }
                    : undefined,
            },
            include: { payments: true },
        })
        res.json(po)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Erro ao atualizar PO' })
    }
})

purchaseOrdersRouter.delete('/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

    try {
        await prisma.purchaseOrder.delete({ where: { id } })
        res.status(204).send()
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Erro ao excluir PO' })
    }
})
