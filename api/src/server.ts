import express from 'express'
import cors from 'cors'
import * as routes from './routes'

const app = express()
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Mount routers
app.use('/deals', routes.dealsRouter)
app.use('/payments', routes.paymentsRouter)
app.use('/forecast', routes.forecastRouter)
app.use('/purchase-orders', routes.purchaseOrdersRouter)

const port = 4000
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`)
})
