import { useAuth } from '../../auth/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Card, Button, Badge, StatCard, ProgressBar } from '../../components/ui'

export default function CyclesPage() {
    const { user, authFetch } = useAuth()

    const [cycles, setCycles] = useState([])
    const [auditLog, setAuditLog] = useState([])
    const [stats, setStats] = useState({ employees: 0, submitted: 0, pending: 0, approved: 0 })
    const [loading, setLoading] = useState(true)
    const [showNew, setShowNew] = useState(false)
    const [showAudit, setShowAudit] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: '', start_date: '', end_date: '' })

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [cRes, aRes] = await Promise.all([
                authFetch('/api/cycles'),
                authFetch('/api/audit-log'),
            ])
            const cData = await cRes.json()
            const aData = await aRes.json()
            if (cRes.ok) setCycles(cData.cycles)
            if (aRes.ok) setAuditLog(aData.logs)
        } finally {
            setLoading(false)
        }
    }, [authFetch])

    // Load team sheet stats for active cycle
    const loadStats = useCallback(async () => {
        try {
            const res = await authFetch('/api/team-sheets')
            const data = await res.json()
            if (res.ok) {
                const sheets = data.sheets
                setStats({
                    employees: sheets.length,
                    submitted: sheets.filter(s => s.status === 'submitted').length,
                    pending: sheets.filter(s => s.status === 'draft').length,
                    approved: sheets.filter(s => s.status === 'approved').length,
                })
            }
        } catch { }
    }, [authFetch])

    useEffect(() => { load(); loadStats() }, [load, loadStats])

    const createCycle = async () => {
        if (!form.name || !form.start_date || !form.end_date) return alert('All fields required')
        setSaving(true)
        try {
            const res = await authFetch('/api/cycles', {
                method: 'POST',
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setCycles(p => [data.cycle, ...p])
            setForm({ name: '', start_date: '', end_date: '' })
            setShowNew(false)
        } catch (e) { alert(e.message) }
        finally { setSaving(false) }
    }

    const activateCycle = async (cycleId) => {
        if (!confirm('This will deactivate all other cycles. Continue?')) return
        try {
            const res = await authFetch(`/api/cycles/${cycleId}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: true }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setCycles(p => p.map(c => ({ ...c, is_active: c.id === cycleId })))
        } catch (e) { alert(e.message) }
    }

    const closeCycle = async (cycleId) => {
        if (!confirm('Close this cycle?')) return
        try {
            const res = await authFetch(`/api/cycles/${cycleId}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: false, phase: 'Closed' }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setCycles(p => p.map(c => c.id === cycleId ? { ...c, is_active: false, phase: 'Closed' } : c))
        } catch (e) { alert(e.message) }
    }

    const completionRate = stats.employees > 0
        ? Math.round(((stats.submitted + stats.approved) / stats.employees) * 100)
        : 0

    const ORG = [
        { label: 'Total Employees', value: String(stats.employees), icon: '👤', color: 'cyan' },
        { label: 'Submitted', value: String(stats.submitted), icon: '📋', color: 'purple' },
        { label: 'Pending / Draft', value: String(stats.pending), icon: '⏳', color: 'orange' },
        { label: 'Approved', value: String(stats.approved), icon: '✅', color: 'green' },
    ]

    if (loading) return <div className="flex items-center justify-center py-24 text-slate-400">Loading…</div>

    return (
        <div className="space-y-8">
            <PageHeader
                label="Admin Panel"
                title="Cycle Management"
                description={`Logged in as ${user.name} · HR Admin`}
                action={
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setShowAudit(!showAudit)}>
                            {showAudit ? 'Hide Audit Log' : 'Audit Log'}
                        </Button>
                        <Button variant="primary" onClick={() => setShowNew(true)} icon="+">New Cycle</Button>
                    </div>
                }
            />

            {/* Org stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {ORG.map(s => <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} />)}
            </div>

            {/* Cycles list */}
            <div className="space-y-4">
                {cycles.length === 0 && (
                    <Card className="p-12 text-center">
                        <div className="text-4xl mb-4">📅</div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-2">No Cycles Yet</h3>
                        <p className="text-slate-400 mb-6">Create your first performance cycle to get started</p>
                        <Button variant="primary" onClick={() => setShowNew(true)}>+ Create First Cycle</Button>
                    </Card>
                )}

                {cycles.map(cycle => (
                    <Card key={cycle.id} className={`p-6 border ${cycle.is_active ? 'border-green-500/40' : ''}`}>
                        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-bold text-slate-100">{cycle.name}</h3>
                                    {cycle.is_active && <Badge variant="green">ACTIVE</Badge>}
                                </div>
                                <p className="text-sm text-slate-400">
                                    <span className="font-mono">{cycle.start_date?.slice(0, 10)}</span>
                                    <span className="text-slate-600"> → </span>
                                    <span className="font-mono">{cycle.end_date?.slice(0, 10)}</span>
                                    <span className="text-slate-600"> · </span>
                                    <span>{cycle.phase}</span>
                                </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {cycle.is_active ? (
                                    <Button variant="danger" size="sm" onClick={() => closeCycle(cycle.id)}>Close Cycle</Button>
                                ) : (
                                    <Button variant="secondary" size="sm" onClick={() => activateCycle(cycle.id)}>Activate</Button>
                                )}
                            </div>
                        </div>

                        {/* Completion bar — only meaningful for active cycle */}
                        {cycle.is_active && (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Completion Rate</span>
                                    <span className="text-sm font-mono font-bold text-green-400">{completionRate}%</span>
                                </div>
                                <ProgressBar value={completionRate} color="green" />
                            </>
                        )}
                    </Card>
                ))}
            </div>

            {/* Audit log */}
            {showAudit && (
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-dark-border">
                        <h2 className="font-bold text-slate-100">Audit Trail</h2>
                        <p className="text-xs text-slate-500 mt-1">Last 100 changes to goal sheets and items</p>
                    </div>
                    <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
                        {auditLog.length === 0 && (
                            <div className="p-8 text-center text-slate-500 text-sm">No audit entries yet.</div>
                        )}
                        {auditLog.map(log => (
                            <div key={log.id} className="p-4 flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center text-xs">
                                    {log.action === 'approved' ? '✅' : log.action === 'rework' ? '🔄' : '🔓'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-200">
                                        <span className="font-semibold">{log.changed_by_name ?? 'System'}</span>
                                        {' '}<span className="text-slate-500">{log.action}</span>{' '}
                                        <span className="text-slate-400">{log.entity_type}</span>
                                    </p>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                        {new Date(log.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* New cycle modal */}
            {showNew && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-slate-100">Create New Cycle</h3>
                        <div>
                            <label className="label">Cycle Name</label>
                            <input type="text" placeholder="e.g. FY 2024-25 Q3" value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Start Date</label>
                                <input type="date" value={form.start_date}
                                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="input" />
                            </div>
                            <div>
                                <label className="label">End Date</label>
                                <input type="date" value={form.end_date}
                                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="input" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
                            <Button variant="primary" className="flex-1" onClick={createCycle} disabled={saving}>
                                {saving ? 'Creating…' : 'Create Cycle'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}