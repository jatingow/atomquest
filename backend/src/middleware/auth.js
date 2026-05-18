// src/middleware/auth.js
import jwt from 'jsonwebtoken'

// ── Role constants ────────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
    EMPLOYEE: 'employee',
    MANAGER: 'manager',
    ADMIN: 'admin',
})

const RANK = { employee: 0, manager: 1, admin: 2 }

// ── Sign a token for a user row ───────────────────────────────────────────────
export function signToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            managerId: user.manager_id ?? null,
            department: user.department ?? null,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h', issuer: 'atomquest' }
    )
}

// ── authenticate: verify token, attach req.user ───────────────────────────────
export function authenticate(req, res, next) {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing Authorization header' })
    }

    try {
        const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, {
            issuer: 'atomquest',
        })
        req.user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            role: payload.role,
            managerId: payload.managerId,
            department: payload.department,
        }
        next()
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired — please log in again' })
        }
        return res.status(401).json({ error: 'Invalid token' })
    }
}

// ── authorize: allow only specific roles ──────────────────────────────────────
// Usage: authorize('manager', 'admin')
export function authorize(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role)) {
            return res.status(403).json({ error: `Access denied. Required: ${roles.join(', ')}` })
        }
        next()
    }
}

// ── hasMinRole: allow role AND anything above it ──────────────────────────────
// Usage: hasMinRole('manager')  →  allows manager + admin
export function hasMinRole(minRole) {
    return (req, res, next) => {
        if ((RANK[req.user?.role] ?? -1) < RANK[minRole]) {
            return res.status(403).json({ error: `Minimum role required: ${minRole}` })
        }
        next()
    }
}