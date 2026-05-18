// src/seed/seed.js  —  run: npm run seed
import bcrypt from 'bcryptjs'
import pool from '../db/pool.js'
import 'dotenv/config'

const PASS = 'Demo@1234'

async function seed() {
    const hash = await bcrypt.hash(PASS, 12)
    const client = await pool.connect()

    try {
        // 1. Admin
        const { rows: [admin] } = await client.query(
            `INSERT INTO users (name, email, password, role, department)
       VALUES ('Rohan Das', 'admin@atomquest.dev', $1, 'admin', 'HR')
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
            [hash]
        )
        console.log('✓ Admin   ', admin.id)

        // 2. Manager
        const { rows: [manager] } = await client.query(
            `INSERT INTO users (name, email, password, role, department)
       VALUES ('Priya Mehta', 'manager@atomquest.dev', $1, 'manager', 'Engineering')
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
            [hash]
        )
        console.log('✓ Manager ', manager.id)

        // 3. Employee — linked to manager
        const { rows: [emp] } = await client.query(
            `INSERT INTO users (name, email, password, role, department, manager_id)
       VALUES ('Arjun Sharma', 'employee@atomquest.dev', $1, 'employee', 'Engineering', $2)
       ON CONFLICT (email) DO UPDATE SET manager_id = $2, updated_at = NOW()
       RETURNING id`,
            [hash, manager.id]
        )
        console.log('✓ Employee', emp.id)

        console.log(`\nAll accounts use password: ${PASS}`)
    } finally {
        client.release()
        await pool.end()
    }
}

seed().catch((e) => { console.error(e); process.exit(1) })