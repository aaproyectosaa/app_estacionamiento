import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import authRoutes from '../src/routes/auth.js'
import municipioRoutes from '../src/routes/municipios.js'
import zonaRoutes from '../src/routes/zonas.js'
import plazaRoutes from '../src/routes/plazas.js'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())
app.locals.prisma = prisma

app.use('/api/auth', authRoutes)
app.use('/api/municipios', municipioRoutes)
app.use('/api/zonas', zonaRoutes)
app.use('/api/plazas', plazaRoutes)

describe('API Health', () => {
  it('GET /api/health returns ok', async () => {
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' })
    })
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

describe('Municipios', () => {
  it('GET /api/municipios returns list', async () => {
    const res = await request(app).get('/api/municipios')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('Auth', () => {
  it('POST /api/auth/register creates user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123',
      })
    expect(res.status).toBe(201)
    expect(res.body.user).toBeDefined()
    expect(res.body.token).toBeDefined()
  })

  it('POST /api/auth/login returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'test123',
      })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('POST /api/auth/guest creates guest user', async () => {
    const res = await request(app)
      .post('/api/auth/guest')
      .send({ name: 'Guest User', patente: 'ABC123' })
    expect(res.status).toBe(201)
    expect(res.body.user).toBeDefined()
    expect(res.body.token).toBeDefined()
  })
})

describe('Plazas', () => {
  it('GET /api/plazas/:id returns 404 for non-existent', async () => {
    const res = await request(app).get('/api/plazas/nonexistent')
    expect(res.status).toBe(404)
  })
})
