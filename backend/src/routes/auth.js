// src/routes/auth.js
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../db/pool.js'
import { signToken, authenticate } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password required' })
        }

        const { rows } = await pool.query(
            `SELECT id, email, name, password, role, manager_id, department, is_active
       FROM users WHERE email = $1`,
            [email.toLowerCase().trim()]
        )

        const user = rows[0]
        // Always run bcrypt to prevent timing-based email enumeration
        const dummy = '$2a$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
        const valid = user
            ? await bcrypt.compare(password, user.password)
            : await bcrypt.compare(password, dummy).then(() => false)

        if (!user || !valid) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account deactivated — contact HR' })
        }

        res.json({ token: signToken(user), user: sanitize(user) })
    } catch (err) { next(err) }
})

// GET /api/auth/me  — returns current user from token (no DB hit)
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user })
})

// POST /api/auth/role-switch  — DEMO ONLY, disabled in production
router.post('/role-switch', async (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' })
    }
    try {
        const { role } = req.body
        const emailMap = {
            employee: 'employee@atomquest.dev',
            manager: 'manager@atomquest.dev',
            admin: 'admin@atomquest.dev',
        }
        if (!emailMap[role]) {
            return res.status(400).json({ error: 'role must be employee | manager | admin' })
        }

        const { rows } = await pool.query(
            `SELECT id, email, name, role, manager_id, department
       FROM users WHERE email = $1`,
            [emailMap[role]]
        )
        if (!rows[0]) {
            return res.status(404).json({ error: 'Seed user not found — run npm run seed' })
        }

        res.json({ token: signToken(rows[0]), user: rows[0] })
    } catch (err) { next(err) }
})

function sanitize(user) {
    const { password, ...safe } = user
    return safe
}

export default router