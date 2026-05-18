// backend/src/routes/goals.js
import { Router } from 'express'
import pool from '../db/pool.js'
import { authenticate, authorize, hasMinRole, ROLES } from '../middleware/auth.js'

const router = Router()

// ─── helpers ──────────────────────────────────────────────────────────────────

// Score calculator per UoM type
function calcScore(uomType, target, actual) {
    if (actual === null || actual === undefined) return null
    if (Number(target) === 0) return 0
    switch (uomType) {
        case 'Percentage':
        case 'Numeric':
            return Math.min((Number(actual) / Number(target)) * 100, 100)
        case 'Timeline':
            // actual = days taken, target = days allowed. Lower is better.
            return Math.min((Number(target) / Number(actual)) * 100, 100)
        case 'Zero/One':
            return Number(actual) === 0 ? 0 : 100
        default:
            return null
    }
}

// Audit logger
async function audit(client, entityType, entityId, action, changedBy, before, after) {
    await client.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, before_json, after_json)
     VALUES ($1,$2,$3,$4,$5,$6)`,
        [entityType, entityId, action, changedBy, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]
    )
}

// ─── CYCLES ───────────────────────────────────────────────────────────────────

// GET /api/cycles — get all cycles (any logged-in user)
router.get('/cycles', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, phase, start_date, end_date, is_active, created_at
       FROM cycles ORDER BY created_at DESC`
        )
        res.json({ cycles: rows })
    } catch (err) { next(err) }
})

// GET /api/cycles/active — get the current active cycle
router.get('/cycles/active', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, phase, start_date, end_date, is_active
       FROM cycles WHERE is_active = TRUE LIMIT 1`
        )
        res.json({ cycle: rows[0] ?? null })
    } catch (err) { next(err) }
})

// POST /api/cycles — admin creates a cycle
router.post('/cycles', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
    try {
        const { name, phase = 'Goal Setting', start_date, end_date } = req.body
        if (!name || !start_date || !end_date) {
            return res.status(400).json({ error: 'name, start_date, end_date required' })
        }
        const { rows } = await pool.query(
            `INSERT INTO cycles (name, phase, start_date, end_date, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [name, phase, start_date, end_date, req.user.id]
        )
        res.status(201).json({ cycle: rows[0] })
    } catch (err) { next(err) }
})

// PATCH /api/cycles/:id — admin activates/closes a cycle
router.patch('/cycles/:id', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
    try {
        const { is_active, phase } = req.body
        if (is_active) {
            // Deactivate all others first
            await pool.query('UPDATE cycles SET is_active = FALSE')
        }
        const { rows } = await pool.query(
            `UPDATE cycles SET is_active = COALESCE($1, is_active), phase = COALESCE($2, phase)
       WHERE id = $3 RETURNING *`,
            [is_active ?? null, phase ?? null, req.params.id]
        )
        res.json({ cycle: rows[0] })
    } catch (err) { next(err) }
})

// ─── GOAL SHEETS ──────────────────────────────────────────────────────────────

// GET /api/my-sheet — employee gets their sheet for the active cycle
router.get('/my-sheet', authenticate, authorize(ROLES.EMPLOYEE), async (req, res, next) => {
    try {
        // Find active cycle
        const { rows: cycles } = await pool.query(
            'SELECT id FROM cycles WHERE is_active = TRUE LIMIT 1'
        )
        if (!cycles[0]) return res.json({ sheet: null, goals: [], cycle: null })

        const cycleId = cycles[0].id

        // Find or auto-create a sheet for this employee
        let { rows: sheets } = await pool.query(
            'SELECT * FROM goal_sheets WHERE user_id = $1 AND cycle_id = $2',
            [req.user.id, cycleId]
        )
        if (!sheets[0]) {
            const { rows: newSheet } = await pool.query(
                `INSERT INTO goal_sheets (user_id, cycle_id) VALUES ($1,$2) RETURNING *`,
                [req.user.id, cycleId]
            )
            sheets = newSheet
        }

        const sheet = sheets[0]

        // Get goal items
        const { rows: goals } = await pool.query(
            'SELECT * FROM goal_items WHERE sheet_id = $1 ORDER BY created_at ASC',
            [sheet.id]
        )

        // Get cycle info
        const { rows: cycleRows } = await pool.query(
            'SELECT * FROM cycles WHERE id = $1', [cycleId]
        )

        res.json({ sheet, goals, cycle: cycleRows[0] })
    } catch (err) { next(err) }
})

// POST /api/goals — employee adds a goal item
router.post('/goals', authenticate, authorize(ROLES.EMPLOYEE), async (req, res, next) => {
    try {
        const { sheet_id, thrust_area, title, description, uom_type, target, weightage } = req.body

        // Validate min weightage
        if (Number(weightage) < 10) {
            return res.status(400).json({ error: 'Minimum weightage per goal is 10%' })
        }

        // Check sheet isn't locked
        const { rows: sheets } = await pool.query(
            'SELECT * FROM goal_sheets WHERE id = $1 AND user_id = $2',
            [sheet_id, req.user.id]
        )
        if (!sheets[0]) return res.status(404).json({ error: 'Sheet not found' })
        if (sheets[0].is_locked) return res.status(403).json({ error: 'Goal sheet is locked after approval' })

        // Check max 8 goals
        const { rows: count } = await pool.query(
            'SELECT COUNT(*) FROM goal_items WHERE sheet_id = $1', [sheet_id]
        )
        if (Number(count[0].count) >= 8) {
            return res.status(400).json({ error: 'Maximum 8 goals per sheet' })
        }

        const { rows } = await pool.query(
            `INSERT INTO goal_items (sheet_id, thrust_area, title, description, uom_type, target, weightage)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [sheet_id, thrust_area, title, description ?? null, uom_type, target, weightage]
        )
        res.status(201).json({ goal: rows[0] })
    } catch (err) { next(err) }
})

// DELETE /api/goals/:id — employee deletes a draft goal
router.delete('/goals/:id', authenticate, authorize(ROLES.EMPLOYEE), async (req, res, next) => {
    try {
        // Verify ownership and sheet not locked
        const { rows } = await pool.query(
            `SELECT gi.*, gs.is_locked, gs.user_id
       FROM goal_items gi JOIN goal_sheets gs ON gs.id = gi.sheet_id
       WHERE gi.id = $1`,
            [req.params.id]
        )
        if (!rows[0]) return res.status(404).json({ error: 'Goal not found' })
        if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your goal' })
        if (rows[0].is_locked) return res.status(403).json({ error: 'Cannot delete locked goal' })

        await pool.query('DELETE FROM goal_items WHERE id = $1', [req.params.id])
        res.json({ message: 'Goal deleted' })
    } catch (err) { next(err) }
})

// POST /api/my-sheet/submit — employee submits sheet for approval
router.post('/my-sheet/submit', authenticate, authorize(ROLES.EMPLOYEE), async (req, res, next) => {
    try {
        const { sheet_id } = req.body

        // Verify ownership
        const { rows: sheets } = await pool.query(
            'SELECT * FROM goal_sheets WHERE id = $1 AND user_id = $2',
            [sheet_id, req.user.id]
        )
        if (!sheets[0]) return res.status(404).json({ error: 'Sheet not found' })
        if (sheets[0].is_locked) return res.status(403).json({ error: 'Sheet is already locked' })

        // Validate total weightage = 100
        const { rows: wt } = await pool.query(
            'SELECT SUM(weightage) AS total FROM goal_items WHERE sheet_id = $1',
            [sheet_id]
        )
        if (Number(wt[0].total) !== 100) {
            return res.status(400).json({ error: `Total weightage must be 100% (currently ${wt[0].total}%)` })
        }

        // Validate at least 1 goal
        const { rows: ct } = await pool.query(
            'SELECT COUNT(*) FROM goal_items WHERE sheet_id = $1', [sheet_id]
        )
        if (Number(ct[0].count) === 0) {
            return res.status(400).json({ error: 'Add at least one goal before submitting' })
        }

        const { rows } = await pool.query(
            `UPDATE goal_sheets SET status = 'submitted', submitted_at = NOW()
       WHERE id = $1 RETURNING *`,
            [sheet_id]
        )
        res.json({ sheet: rows[0] })
    } catch (err) { next(err) }
})

// ─── MANAGER ROUTES ───────────────────────────────────────────────────────────

// GET /api/team-sheets — manager gets all sheets for their direct reports
router.get('/team-sheets', authenticate, authorize(ROLES.MANAGER, ROLES.ADMIN), async (req, res, next) => {
    try {
        const isAdmin = req.user.role === ROLES.ADMIN

        const { rows } = await pool.query(
            `SELECT
         gs.id, gs.status, gs.is_locked, gs.submitted_at, gs.approved_at, gs.rework_reason,
         u.id AS user_id, u.name, u.role AS user_role, u.department,
         c.id AS cycle_id, c.name AS cycle_name,
         COUNT(gi.id) AS goal_count,
         COALESCE(SUM(gi.weightage), 0) AS total_weight
       FROM goal_sheets gs
       JOIN users u ON u.id = gs.user_id
       JOIN cycles c ON c.id = gs.cycle_id
       LEFT JOIN goal_items gi ON gi.sheet_id = gs.id
       WHERE c.is_active = TRUE
         AND ($1 OR u.manager_id = $2)
       GROUP BY gs.id, u.id, u.name, u.role, u.department, c.id, c.name
       ORDER BY gs.submitted_at DESC NULLS LAST`,
            [isAdmin, req.user.id]
        )
        res.json({ sheets: rows })
    } catch (err) { next(err) }
})

// GET /api/team-sheets/:sheetId — manager views a specific sheet with goals
router.get('/team-sheets/:sheetId', authenticate, authorize(ROLES.MANAGER, ROLES.ADMIN), async (req, res, next) => {
    try {
        const { rows: sheets } = await pool.query(
            `SELECT gs.*, u.name, u.email, u.department
       FROM goal_sheets gs JOIN users u ON u.id = gs.user_id
       WHERE gs.id = $1`,
            [req.params.sheetId]
        )
        if (!sheets[0]) return res.status(404).json({ error: 'Sheet not found' })

        const { rows: goals } = await pool.query(
            'SELECT * FROM goal_items WHERE sheet_id = $1 ORDER BY created_at ASC',
            [req.params.sheetId]
        )
        res.json({ sheet: sheets[0], goals })
    } catch (err) { next(err) }
})

// PATCH /api/team-sheets/:sheetId/approve — manager approves and LOCKS the sheet
router.patch('/team-sheets/:sheetId/approve', authenticate, authorize(ROLES.MANAGER, ROLES.ADMIN), async (req, res, next) => {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        const { rows: sheets } = await client.query(
            'SELECT * FROM goal_sheets WHERE id = $1', [req.params.sheetId]
        )
        if (!sheets[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Sheet not found' }) }

        const before = sheets[0]

        // Approve + lock sheet
        const { rows } = await client.query(
            `UPDATE goal_sheets
       SET status = 'approved', is_locked = TRUE, approved_at = NOW(), approved_by = $1, rework_reason = NULL
       WHERE id = $2 RETURNING *`,
            [req.user.id, req.params.sheetId]
        )

        // Lock all goal items
        await client.query(
            'UPDATE goal_items SET is_locked = TRUE WHERE sheet_id = $1',
            [req.params.sheetId]
        )

        // Audit
        await audit(client, 'goal_sheet', req.params.sheetId, 'approved', req.user.id, before, rows[0])

        await client.query('COMMIT')
        res.json({ sheet: rows[0] })
    } catch (err) {
        await client.query('ROLLBACK')
        next(err)
    } finally {
        client.release()
    }
})

// PATCH /api/team-sheets/:sheetId/rework — manager returns sheet for rework
router.patch('/team-sheets/:sheetId/rework', authenticate, authorize(ROLES.MANAGER, ROLES.ADMIN), async (req, res, next) => {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        const { reason } = req.body
        if (!reason) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Rework reason required' }) }

        const { rows: before } = await client.query('SELECT * FROM goal_sheets WHERE id = $1', [req.params.sheetId])

        const { rows } = await client.query(
            `UPDATE goal_sheets SET status = 'rework', is_locked = FALSE, rework_reason = $1
       WHERE id = $2 RETURNING *`,
            [reason, req.params.sheetId]
        )

        // Unlock goal items so employee can edit
        await client.query('UPDATE goal_items SET is_locked = FALSE WHERE sheet_id = $1', [req.params.sheetId])

        await audit(client, 'goal_sheet', req.params.sheetId, 'rework', req.user.id, before[0], rows[0])
        await client.query('COMMIT')
        res.json({ sheet: rows[0] })
    } catch (err) {
        await client.query('ROLLBACK')
        next(err)
    } finally {
        client.release()
    }
})

// ─── CHECK-INS & ACHIEVEMENTS ─────────────────────────────────────────────────

// POST /api/checkins — manager adds check-in comment
router.post('/checkins', authenticate, hasMinRole(ROLES.MANAGER), async (req, res, next) => {
    try {
        const { sheet_id, quarter, comment } = req.body
        if (!sheet_id || !quarter || !comment) {
            return res.status(400).json({ error: 'sheet_id, quarter and comment required' })
        }
        const { rows } = await pool.query(
            `INSERT INTO checkins (sheet_id, manager_id, quarter, comment) VALUES ($1,$2,$3,$4) RETURNING *`,
            [sheet_id, req.user.id, quarter, comment]
        )
        res.status(201).json({ checkin: rows[0] })
    } catch (err) { next(err) }
})

// POST /api/achievements — employee enters actual achievement value
router.post('/achievements', authenticate, authorize(ROLES.EMPLOYEE), async (req, res, next) => {
    try {
        const { goal_item_id, quarter, actual_value, planned_value } = req.body

        // Check goal item belongs to this employee
        const { rows: items } = await pool.query(
            `SELECT gi.*, gs.user_id FROM goal_items gi JOIN goal_sheets gs ON gs.id = gi.sheet_id
       WHERE gi.id = $1`,
            [goal_item_id]
        )
        if (!items[0]) return res.status(404).json({ error: 'Goal not found' })
        if (items[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your goal' })

        const score = calcScore(items[0].uom_type, items[0].target, actual_value)

        // Upsert achievement
        const { rows } = await pool.query(
            `INSERT INTO achievements (goal_item_id, quarter, actual_value, planned_value, score, status)
       VALUES ($1,$2,$3,$4,$5,'submitted')
       ON CONFLICT (goal_item_id, quarter)
         DO UPDATE SET actual_value=$3, planned_value=$4, score=$5, status='submitted', updated_at=NOW()
       RETURNING *`,
            [goal_item_id, quarter, actual_value, planned_value ?? null, score]
        )
        res.status(201).json({ achievement: rows[0] })
    } catch (err) { next(err) }
})

// GET /api/achievements/:sheetId — get all achievements for a sheet
router.get('/achievements/:sheetId', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT a.*, gi.title, gi.uom_type, gi.target, gi.weightage, gi.thrust_area
       FROM achievements a
       JOIN goal_items gi ON gi.id = a.goal_item_id
       WHERE gi.sheet_id = $1
       ORDER BY gi.created_at ASC, a.quarter ASC`,
            [req.params.sheetId]
        )
        res.json({ achievements: rows })
    } catch (err) { next(err) }
})

// ─── ADMIN ────────────────────────────────────────────────────────────────────

// POST /api/goal-items/:itemId/unlock — admin unlocks a single locked goal
router.post('/goal-items/:itemId/unlock', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        const { rows: before } = await client.query('SELECT * FROM goal_items WHERE id = $1', [req.params.itemId])
        if (!before[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Goal not found' }) }

        const { rows } = await client.query(
            'UPDATE goal_items SET is_locked = FALSE WHERE id = $1 RETURNING *',
            [req.params.itemId]
        )
        await audit(client, 'goal_item', req.params.itemId, 'unlock', req.user.id, before[0], rows[0])
        await client.query('COMMIT')
        res.json({ goal: rows[0] })
    } catch (err) {
        await client.query('ROLLBACK')
        next(err)
    } finally {
        client.release()
    }
})

// GET /api/audit-log — admin views audit trail
router.get('/audit-log', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT al.*, u.name AS changed_by_name
       FROM audit_log al LEFT JOIN users u ON u.id = al.changed_by
       ORDER BY al.created_at DESC LIMIT 100`
        )
        res.json({ logs: rows })
    } catch (err) { next(err) }
})

export default router