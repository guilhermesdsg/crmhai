import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'

const router = Router()

const paymentSchema = z.object({
    label: z.string().min(1),
    date: z.coerce.date(),
    amount: z.coerce.number().nonnegative(),
})

const paymentUpdateSchema = z.object({
    label: z.string().min(1).optional(),
    date: z.coerce.date().optional(),
    amount: z.coerce.number().optional(),
})

const paymentsReplaceSchema = z.array(paymentSchema)

// POST /deals/:id/payments - Add a payment to a deal
router.post('/deals/:id/payments', async (req, res) => {
    const dealId = Number(req.params.id)
    if (Number.isNaN(dealId)) return res.status(400).json({ error: 'Invalid id' })
    const parsed = paymentSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() })
    }
    const created = await prisma.payment.create({
        data: { ...parsed.data, dealId },
    })
    res.status(201).json({ ...created, amount: Number(created.amount) })
})

// PATCH /payments/:id - Update a payment
router.patch('/payments/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
    const parsed = paymentUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() })
    }
    const updated = await prisma.payment.update({
        where: { id },
        data: parsed.data,
    })
    res.json({ ...updated, amount: Number(updated.amount) })
})

// DELETE /payments/:id - Delete a payment
router.delete('/payments/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
    await prisma.payment.delete({ where: { id } })
    res.status(204).send()
})

// PUT /deals/:id/payments - Replace all payments for a deal
router.put('/deals/:id/payments', async (req, res) => {
    const dealId = Number(req.params.id)
    if (Number.isNaN(dealId)) return res.status(400).json({ error: 'Invalid id' })

    const parsed = paymentsReplaceSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() })
    }

    await prisma.$transaction([
        prisma.payment.deleteMany({ where: { dealId } }),
        prisma.payment.createMany({
            data: parsed.data.map((p) => ({
                label: p.label,
                date: p.date,
                amount: p.amount,
                dealId,
            })),
        }),
    ])

    return res.status(204).send()
})

export default router
