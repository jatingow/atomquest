import { useAuth } from '../../auth/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Card, Button, Badge, StatCard, Avatar } from '../../components/ui'

const STATUS = {
    draft: { label: 'Draft', color: 'orange' },
    submitted: { label: 'Submitted', color: 'cyan' },
    approved: { label: 'Approved', color: 'green' },
    rework: { label: 'Rework', color: 'red' },
}

export default function TeamPage() {
    const { user, authFetch } = useAuth()

    const [sheets, setSheets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [selected, setSelected] = useState(null)
    const [sheetGoals, setSheetGoals] = useState([])
    const [loadingGoals, setLoadingGoals] = useState(false)
    const [comment, setComment] = useState('')
    const [reworkReason, setReworkReason] = useState('')
    const [showRework, setShowRework] = useState(false)
    const [acting, setActing] = useState(false)

    const loadSheets = useCallback(async () => {
        setLoading(true); setError(null)
        try {
            const res = await authFetch('/api/team-sheets')
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSheets(data.sheets)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [authFetch])

    useEffect(() => { loadSheets() }, [loadSheets])

    const selectSheet = async (sheet) => {
        if (selected?.id === sheet.id) { setSelected(null); setSheetGoals([]); return }
        setSelected(sheet)
        setComment('')
        setReworkReason('')
        setLoadingGoals(true)
        try {
            const res = await authFetch(`/api/team-sheets/${sheet.id}`)
            const data = await res.json()
            if (res.ok) setSheetGoals(data.goals)
        } finally {
            setLoadingGoals(false)
        }
    }

    const approve = async () => {
        setActing(true)
        try {
            const res = await authFetch(`/api/team-sheets/${selected.id}/approve`, { method: 'PATCH', body: JSON.stringify({}) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            // Save check-in comment if written
            if (comment.trim()) {
                await authFetch('/api/checkins', {
                    method: 'POST',
                    body: JSON.stringify({ sheet_id: selected.id, quarter: 'Q2', comment }),
                })
            }
            setSheets(p => p.map(s => s.id === selected.id ? { ...s, status: 'approved', is_locked: true } : s))
            setSelected(null); setSheetGoals([]); setComment('')
        } catch (e) { alert(e.message) }
        finally { setActing(false) }
    }

    const sendRework = async () => {
        if (!reworkReason.trim()) return alert('Please enter a rework reason')
        setActing(true)
        try {
            const res = await authFetch(`/api/team-sheets/${selected.id}/rework`, {
                method: 'PATCH',
                body: JSON.stringify({ reason: reworkReason }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSheets(p => p.map(s => s.id === selected.id ? { ...s, status: 'rework' } : s))
            setSelected(null); setSheetGoals([]); setReworkReason(''); setShowRework(false)
        } catch (e) { alert(e.message) }
        finally { setActing(false) }
    }

    const saveCheckin = async () => {
        if (!comment.trim()) return
        setActing(true)
        try {
            const res = await authFetch('/api/checkins', {
                method: 'POST',
                body: JSON.stringify({ sheet_id: selected.id, quarter: 'Q2', comment }),
            })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
            setComment('')
            alert('Check-in comment saved!')
        } catch (e) { alert(e.message) }
        finally { setActing(false) }
    }

    const counts = Object.fromEntries(
        Object.keys(STATUS).map(s => [s, sheets.filter(m => m.status === s).length])
    )

    if (loading) return <div className="flex items-center justify-center py-24 text-slate-400">Loading team…</div>
    if (error) return <div className="p-6 text-red-400 bg-red-900/20 rounded-xl border border-red-500/20">{error}</div>

    return (
        <div className="space-y-8">
            <PageHeader
                label="Active Cycle · Engineering"
                title="Team Goal Tracker"
                description={`Manager: ${user.name}`}
            />

            {/* Status cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(STATUS).map(([key, meta]) => (
                    <StatCard key={key} label={meta.label} value={String(counts[key])}
                        icon={key === 'draft' ? '📝' : key === 'submitted' ? '📤' : key === 'approved' ? '✅' : '🔄'}
                        color={meta.color} />
                ))}
            </div>

            {/* Team list */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-dark-border flex justify-between items-center">
                    <h2 className="font-bold text-slate-100">Direct Reports ({sheets.length})</h2>
                    <p className="text-xs text-slate-500">Click a row to review goals</p>
                </div>

                {sheets.length === 0 && (
                    <div className="p-12 text-center text-slate-500">No team members have created goal sheets yet.</div>
                )}

                <div className="divide-y divide-dark-border">
                    {sheets.map((sheet) => {
                        const st = STATUS[sheet.status]
                        const isSelected = selected?.id === sheet.id
                        return (
                            <div key={sheet.id}>
                                <button
                                    onClick={() => selectSheet(sheet)}
                                    className={`w-full p-4 hover:bg-slate-900/50 transition-colors duration-200 flex items-center gap-4 text-left ${isSelected ? 'bg-purple-500/10' : ''}`}
                                >
                                    <Avatar initials={sheet.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '?'} color="cyan" />

                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-100">{sheet.name}</p>
                                        <p className="text-xs text-slate-500">{sheet.department}</p>
                                    </div>

                                    <div className="text-center">
                                        <p className="font-bold text-slate-100 font-mono">{sheet.goal_count}</p>
                                        <p className="text-xs text-slate-500">goals</p>
                                    </div>

                                    <div className="text-center">
                                        <p className={`font-bold font-mono ${Number(sheet.total_weight) === 100 ? 'text-green-400' : 'text-orange-400'}`}>
                                            {sheet.total_weight}%
                                        </p>
                                        <p className="text-xs text-slate-500">weight</p>
                                    </div>

                                    <div className="text-center min-w-max">
                                        <p className="text-xs text-slate-500 font-mono mb-1">
                                            {sheet.submitted_at ? new Date(sheet.submitted_at).toLocaleDateString() : '—'}
                                        </p>
                                        <Badge variant={st.color}>{st.label}</Badge>
                                    </div>

                                    {sheet.is_locked && <span className="text-yellow-500 text-xs">🔒</span>}
                                </button>

                                {/* Expanded review panel */}
                                {isSelected && (
                                    <div className="bg-slate-900/30 p-6 border-t border-dark-border space-y-4">
                                        {/* Goal items */}
                                        {loadingGoals ? (
                                            <p className="text-slate-500 text-sm">Loading goals…</p>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="label mb-2">Goal Items</p>
                                                {sheetGoals.map((g, i) => (
                                                    <div key={g.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                                                        <span className="font-mono text-xs text-slate-500 w-6">{String(i + 1).padStart(2, '0')}</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-200">{g.title}</p>
                                                            <p className="text-xs text-slate-500">{g.thrust_area} · {g.uom_type} · Target: {g.target} · Weight: {g.weightage}%</p>
                                                        </div>
                                                        {g.is_locked && <span className="text-yellow-500 text-xs">🔒</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Rework reason if applicable */}
                                        {sheet.rework_reason && (
                                            <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-lg text-sm text-red-300">
                                                <strong>Previous rework reason:</strong> {sheet.rework_reason}
                                            </div>
                                        )}

                                        {/* Check-in comment */}
                                        <div>
                                            <label className="label">Check-in Comment</label>
                                            <textarea
                                                placeholder="Add feedback or check-in notes…"
                                                value={comment}
                                                onChange={e => setComment(e.target.value)}
                                                className="input min-h-20 resize-none"
                                            />
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-3 flex-wrap">
                                            {sheet.status === 'submitted' ? (
                                                <>
                                                    <Button variant="primary" size="sm" className="flex-1" onClick={approve} disabled={acting}>
                                                        {acting ? '…' : '✓ Approve & Lock'}
                                                    </Button>
                                                    <Button variant="danger" size="sm" className="flex-1" onClick={() => setShowRework(true)}>
                                                        ↻ Request Rework
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button variant="secondary" size="sm" onClick={saveCheckin} disabled={acting || !comment.trim()}>
                                                    Save Comment
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Card>

            {/* Rework reason modal */}
            {showRework && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-slate-100">Request Rework</h3>
                        <p className="text-sm text-slate-400">Explain what needs to be changed. The employee will see this reason.</p>
                        <div>
                            <label className="label">Rework Reason</label>
                            <textarea
                                placeholder="e.g. Please increase the weightage for Innovation goals…"
                                value={reworkReason}
                                onChange={e => setReworkReason(e.target.value)}
                                className="input min-h-24 resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" className="flex-1" onClick={() => setShowRework(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1" onClick={sendRework} disabled={acting || !reworkReason.trim()}>
                                {acting ? 'Sending…' : 'Send for Rework'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}