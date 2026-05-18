// src/index.js
import express from 'express'
import 'dotenv/config'
import authRoutes from './routes/auth.js'
import goalRoutes from './routes/goals.js'

const app = express()

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(express.json())

// CORS — tighten origin in production
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api', goalRoutes)

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('[error]', err)
    res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))