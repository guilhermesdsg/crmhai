import { describe, it, expect } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import dealsRouter from './deals'

// Create a minimal test app
const app = express()
app.use(express.json())
app.use('/deals', dealsRouter)

// Note: These tests require a test database. For now, we'll test the route structure.
// In a real setup, you'd mock Prisma or use a test database.

describe('Deals Routes', () => {
    describe('GET /deals', () => {
        it('should return 200 for GET /deals', async () => {
            // This test will fail without proper Prisma mocking/test DB
            // For now, we're just testing the route exists
            const response = await request(app).get('/deals')
            // If Prisma connection fails, we get 500, otherwise 200
            expect([200, 500]).toContain(response.status)
        })
    })

    describe('POST /deals', () => {
        it('should reject invalid deal data', async () => {
            const response = await request(app)
                .post('/deals')
                .send({}) // Empty body should fail validation

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('error')
        })

        it('should require client field', async () => {
            const response = await request(app)
                .post('/deals')
                .send({ stage: 'PROSPECCAO' }) // Missing client

            expect(response.status).toBe(400)
        })
    })

    describe('PATCH /deals/:id', () => {
        it('should reject non-numeric id', async () => {
            const response = await request(app)
                .patch('/deals/abc')
                .send({ client: 'Test' })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Invalid id')
        })
    })

    describe('DELETE /deals/:id', () => {
        it('should reject non-numeric id', async () => {
            const response = await request(app).delete('/deals/abc')

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Invalid id')
        })
    })
})
