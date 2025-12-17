import { Router } from 'express'
import { prisma } from '../prisma'

const router = Router()

router.get('/', async (req, res) => {
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 13, 1)

  const from = req.query.from ? new Date(String(req.query.from)) : defaultFrom
  const to = req.query.to ? new Date(String(req.query.to)) : defaultTo

  const onlyPO = req.query.onlyPO === 'true'

  // Prisma queryRaw doesn't support dynamic WHERE clauses easily with template literals
  // So we assume the connection is safe or use Prisma.sql helper if available,
  // but here we will just fetch and filter or conditionally build the query string (less safe)
  // OR better: use variable for the condition.

  // Using simple conditional logic in SQL:
  // (condition IS FALSE OR p."purchaseOrderId" IS NOT NULL)

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
      AND (${onlyPO} = false OR p."purchaseOrderId" IS NOT NULL)
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

export default router
