import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { prisma } from './prisma'

const app = express()
app.use(cors())
app.use(express.json())

const stageEnum = ['PROSPECCAO', 'CONVERSA', 'PROPOSTA', 'FECHADO'] as const

const paymentSchema = z.object({
  label: z.string().min(1),
  date: z.coerce.date(),
  amount: z.coerce.number(),
})

const dealSchema = z.object({
  client: z.string().min(1),
  stage: z.enum(stageEnum).optional(),
  payments: z.array(paymentSchema).optional(),
})

const dealUpdateSchema = z.object({
  client: z.string().min(1).optional(),
  stage: z.enum(stageEnum).optional(),
})

const paymentUpdateSchema = z.object({
  label: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  amount: z.coerce.number().optional(),
})

const paymentsReplaceSchema = z.array(paymentSchema)

const serializeDeal = (deal: any) => ({
  ...deal,
  payments: deal.payments?.map((p: any) => ({
    ...p,
    amount: Number(p.amount),
  })),
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/deals', async (_req, res) => {
  const deals = await prisma.deal.findMany({
    include: { payments: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(deals.map(serializeDeal))
})

app.post('/deals', async (req, res) => {
  const parsed = dealSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { client, stage = 'PROSPECCAO', payments = [] } = parsed.data

  const created = await prisma.deal.create({
    data: {
      client,
      stage,
      payments: {
        create: payments.map((p) => ({
          label: p.label,
          date: p.date,
          amount: p.amount,
        })),
      },
    },
    include: { payments: true },
  })
  res.status(201).json(serializeDeal(created))
})

app.patch('/deals/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

  const parsed = dealUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const updated = await prisma.deal.update({
    where: { id },
    data: parsed.data,
    include: { payments: true },
  })
  res.json(serializeDeal(updated))
})

app.delete('/deals/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  await prisma.deal.delete({ where: { id } })
  res.status(204).send()
})

app.post('/deals/:id/payments', async (req, res) => {
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

app.patch('/payments/:id', async (req, res) => {
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

app.delete('/payments/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  await prisma.payment.delete({ where: { id } })
  res.status(204).send()
})

app.put('/deals/:id/payments', async (req, res) => {
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

app.get('/forecast', async (req, res) => {
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 13, 1)

  const from = req.query.from ? new Date(String(req.query.from)) : defaultFrom
  const to = req.query.to ? new Date(String(req.query.to)) : defaultTo

  const rows: Array<{
    key: string
    closed: any
    open: any
  }> = await prisma.$queryRaw`
    SELECT
      to_char(date_trunc('month', p.date), 'YYYY-MM') as key,
      SUM(CASE WHEN d.stage = 'FECHADO' THEN p.amount ELSE 0 END) as closed,
      SUM(CASE WHEN d.stage != 'FECHADO' THEN p.amount ELSE 0 END) as open
    FROM "Payment" p
    JOIN "Deal" d ON d.id = p."dealId"
    WHERE p.date BETWEEN ${from} AND ${to}
    GROUP BY 1
    ORDER BY 1;
  `

  res.json(
    rows.map((row) => ({
      key: row.key,
      closed: Number(row.closed),
      open: Number(row.open),
    })),
  )
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

