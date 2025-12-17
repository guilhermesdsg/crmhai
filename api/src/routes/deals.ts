import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'

const router = Router()

const stageEnum = ['PROSPECCAO', 'CONVERSA', 'PROPOSTA', 'FECHADO'] as const
const dealSizeEnum = ['SMALL', 'MID', 'ENTERPRISE'] as const

const paymentSchema = z.object({
    label: z.string().min(1),
    date: z.coerce.date(),
    amount: z.coerce.number().nonnegative(),
})

const dealSchema = z.object({
    client: z.string().min(1).transform((v) => v.trim()),
    stage: z.enum(stageEnum).optional(),
    industry: z.string().min(1).transform((v) => v.trim()).optional(),
    dealSize: z.enum(dealSizeEnum).optional(),
    dealType: z.string().optional(),
    probability: z.coerce.number().min(0).max(100).optional(),
    nextStep: z.string().min(1).transform((v) => v.trim()).optional(),
    decisionMaker: z.string().min(1).transform((v) => v.trim()).optional(),
    payments: z.array(paymentSchema).optional(),
})

const dealUpdateSchema = z.object({
    client: z.string().min(1).transform((v) => v.trim()).optional(),
    stage: z.enum(stageEnum).optional(),
    industry: z.string().min(1).transform((v) => v.trim()).optional(),
    dealSize: z.enum(dealSizeEnum).optional(),
    dealType: z.string().optional(),
    probability: z.coerce.number().min(0).max(100).optional(),
    nextStep: z.string().min(1).transform((v) => v.trim()).optional(),
    decisionMaker: z.string().min(1).transform((v) => v.trim()).optional(),
})

export const serializeDeal = (deal: any) => ({
    ...deal,
    payments: deal.payments?.map((p: any) => ({
        ...p,
        amount: Number(p.amount),
    })),
})

router.get('/', async (_req, res) => {
    const deals = await prisma.deal.findMany({
        include: { payments: true, purchaseOrders: true },
        orderBy: { createdAt: 'desc' },
    })
    res.json(deals.map(serializeDeal))
})

router.post('/', async (req, res) => {
    const parsed = dealSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() })
    }
    const {
        client,
        stage = 'PROSPECCAO',
        industry,
        dealSize,
        dealType,
        probability = 50,
        nextStep,
        decisionMaker,
        payments = [],
    } = parsed.data

    const created = await prisma.deal.create({
        data: {
            client,
            stage,
            industry,
            dealSize,
            dealType,
            probability,
            nextStep,
            decisionMaker,
            payments: {
                create: payments.map((p) => ({
                    label: p.label,
                    date: p.date,
                    amount: p.amount,
                })),
            },
        },
        include: { payments: true, purchaseOrders: true },
    })
    res.status(201).json(serializeDeal(created))
})

router.patch('/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

    const parsed = dealUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() })
    }

    const updated = await prisma.deal.update({
        where: { id },
        data: parsed.data,
        include: { payments: true, purchaseOrders: true },
    })
    res.json(serializeDeal(updated))
})

router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
    await prisma.deal.delete({ where: { id } })
    res.status(204).send()
})

export default router
