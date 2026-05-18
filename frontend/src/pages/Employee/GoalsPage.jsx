import { useAuth } from '../../auth/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Card, Button, Badge, ProgressBar } from '../../components/ui'

const THRUST_AREAS = ['Business', 'People', 'Process', 'Innovation']
const UOM_TYPES = ['Numeric', 'Percentage', 'Timeline', 'Zero/One']

const STATUS = {
    draft: { label: 'Draft', color: 'orange' },
    submitted: { label: 'Submitted', color: 'cyan' },
    approved: { label: 'Approved', color: 'green' },
    rework: { label: 'Rework', color: 'red' },
}

const THRUST_ICON = {
    Business: '💼', People: '👥', Process: '⚙️', Innovation: '💡',
}

export default function GoalsPage() {
    const { authFetch } = useAuth()

    const [sheet, setSheet] = useState(null)
    const [goals, setGoals] = useState([])
    const [cycle, setCycle] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formErr, setFormErr] = useState(null)
    const [newGoal, setNewGoal] = useState({
        thrust_area: 'Business', title: '', description: '',
        uom_type: 'Numeric', target: '', weightage: '',
    })

    // Check-in state
    const [showCheckin, setShowCheckin] = useState(false)
    const [checkinGoal, setCheckinGoal] = useState(null)
    const [actualValue, setActualValue] = useState('')
    const [checkinSaving, setCheckinSaving] = useState(false)

    const loadSheet = useCallback(async () => {
        setLoading(true); setError(null)
        try {
            const res = await authFetch('/api/my-sheet')
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSheet(data.sheet)
            setGoals(data.goals)
            setCycle(data.cycle)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [authFetch])

    useEffect(() => { loadSheet() }, [loadSheet])

    const totalWeight = goals.reduce((s, g) => s + Number(g.weightage), 0)
    const weightOk = totalWeight === 100
    const overWeight = totalWeight > 100
    const isLocked = sheet?.is_locked

    // ── Add goal ──────────────────────────────────────────────────────────────
    const addGoal = async () => {
        setFormErr(null)
        if (!newGoal.title || !newGoal.target || !newGoal.weightage) {
            return setFormErr('Title, target and weightage are required')
        }
        if (Number(newGoal.weightage) < 10) {
            return setFormErr('Minimum weightage per goal is 10%')
        }
        if (goals.length >= 8) {
            return setFormErr('Maximum 8 goals allowed')
        }
        setSaving(true)
        try {
            const res = await authFetch('/api/goals', {
                method: 'POST',
                body: JSON.stringify({ ...newGoal, sheet_id: sheet.id, target: Number(newGoal.target), weightage: Number(newGoal.weightage) }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setGoals(p => [...p, data.goal])
            setNewGoal({ thrust_area: 'Business', title: '', description: '', uom_type: 'Numeric', target: '', weightage: '' })
            setShowForm(false)
        } catch (e) {
            setFormErr(e.message)
        } finally {
            setSaving(false)
        }
    }

    // ── Delete goal ───────────────────────────────────────────────────────────
    const deleteGoal = async (goalId) => {
        if (!confirm('Delete this goal?')) return
        try {
            const res = await authFetch(`/api/goals/${goalId}`, { method: 'DELETE' })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
            setGoals(p => p.filter(g => g.id !== goalId))
        } catch (e) { alert(e.message) }
    }

    // ── Submit sheet ──────────────────────────────────────────────────────────
    const submitSheet = async () => {
        if (!weightOk) return
        setSubmitting(true)
        try {
            const res = await authFetch('/api/my-sheet/submit', {
                method: 'POST',
                body: JSON.stringify({ sheet_id: sheet.id }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSheet(data.sheet)
        } catch (e) { alert(e.message) }
        finally { setSubmitting(false) }
    }

    // ── Enter achievement ─────────────────────────────────────────────────────
    const saveCheckin = async () => {
        if (!actualValue) return
        setCheckinSaving(true)
        try {
            const res = await authFetch('/api/achievements', {
                method: 'POST',
                body: JSON.stringify({
                    goal_item_id: checkinGoal.id,
                    quarter: cycle?.phase ?? 'Q2',
                    actual_value: Number(actualValue),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setShowCheckin(false)
            setActualValue('')
            setCheckinGoal(null)
            alert('Achievement saved!')
        } catch (e) { alert(e.message) }
        finally { setCheckinSaving(false) }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-24 text-slate-400">Loading your goal sheet…</div>
    )
    if (error) return (
        <div className="p-6 text-red-400 bg-red-900/20 rounded-xl border border-red-500/20">{error}</div>
    )
    if (!cycle) return (
        <div className="p-6 text-slate-400 bg-slate-900/40 rounded-xl border border-slate-700">
            No active cycle found. Ask your Admin to create one.
        </div>
    )

    const sheetStatus = sheet?.status ?? 'draft'
    const st = STATUS[sheetStatus]

    return (
        <div className="space-y-8">
            <PageHeader
                label={`${cycle.name} · ${cycle.phase}`}
                title="My Goal Sheet"
                description={`Status: ${st?.label ?? sheetStatus}`}
                action={
                    !isLocked && sheetStatus === 'draft' || sheetStatus === 'rework' ? (
                        <Button variant="primary" onClick={() => setShowForm(true)} disabled={goals.length >= 8} icon="+">
                            Add Goal
                        </Button>
                    ) : null
                }
            />

            {/* Rework reason */}
            {sheetStatus === 'rework' && sheet?.rework_reason && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                    <strong>Rework required:</strong> {sheet.rework_reason}
                </div>
            )}

            {/* Weightage tracker */}
            <Card className="p-6">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="label">Total Weightage</label>
                        <span className={`text-sm font-mono font-bold ${weightOk ? 'text-green-400' : overWeight ? 'text-red-400' : 'text-orange-400'}`}>
                            {totalWeight}% / 100%
                        </span>
                    </div>
                    <ProgressBar value={Math.min(totalWeight, 100)} max={100} color={weightOk ? 'green' : overWeight ? 'red' : 'orange'} />
                    <p className={`text-xs ${weightOk ? 'text-green-400' : overWeight ? 'text-red-400' : 'text-orange-400'}`}>
                        {weightOk ? '✓ Weightage balanced — ready to submit'
                            : overWeight ? '⚠ Exceeds 100% — reduce weightage'
                                : `⚠ ${100 - totalWeight}% remaining`}
                    </p>
                </div>
            </Card>

            {/* Goals list */}
            <div className="space-y-3">
                {goals.length === 0 && (
                    <Card className="p-12 text-center">
                        <div className="text-4xl mb-4">📝</div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-2">No Goals Yet</h3>
                        <p className="text-slate-400 mb-6">Add your first goal to get started</p>
                        <Button variant="primary" onClick={() => setShowForm(true)}>+ Add Your First Goal</Button>
                    </Card>
                )}

                {goals.map((g, i) => {
                    const gst = STATUS[g.status] ?? STATUS.draft
                    return (
                        <Card key={g.id} className="p-4">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center font-mono text-slate-400 text-xs">
                                    {String(i + 1).padStart(2, '0')}
                                </div>
                                <div className="flex-shrink-0 text-2xl">{THRUST_ICON[g.thrust_area]}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <Badge variant="orange">{g.thrust_area}</Badge>
                                        <Badge variant="purple">{g.uom_type}</Badge>
                                    </div>
                                    <h3 className="font-semibold text-slate-100 mb-1">{g.title}</h3>
                                    {g.description && <p className="text-xs text-slate-500 mb-2">{g.description}</p>}
                                    <div className="flex gap-6 text-sm">
                                        <span><span className="text-slate-500">Target: </span><span className="font-mono font-bold text-slate-300">{g.target}</span></span>
                                        <span><span className="text-slate-500">Weight: </span><span className="font-mono font-bold text-slate-300">{g.weightage}%</span></span>
                                        {g.is_locked && <span className="text-yellow-500 text-xs">🔒 Locked</span>}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    {/* Check-in button — only for approved/locked goals during check-in phase */}
                                    {g.is_locked && cycle?.phase === 'Check-in Open' && (
                                        <Button variant="secondary" size="sm" onClick={() => { setCheckinGoal(g); setShowCheckin(true) }}>
                                            Enter Achievement
                                        </Button>
                                    )}
                                    {/* Delete — only for unlocked draft goals */}
                                    {!g.is_locked && (sheetStatus === 'draft' || sheetStatus === 'rework') && (
                                        <Button variant="danger" size="sm" onClick={() => deleteGoal(g.id)}>✕</Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Submit button */}
            {(sheetStatus === 'draft' || sheetStatus === 'rework') && (
                <div className="flex justify-end gap-4 items-center">
                    {!weightOk && (
                        <span className="text-xs text-orange-400">
                            Total weightage must equal 100% before submitting
                        </span>
                    )}
                    <Button
                        variant="primary"
                        onClick={submitSheet}
                        disabled={!weightOk || submitting || goals.length === 0}
                    >
                        {submitting ? 'Submitting…' : 'Submit for Approval →'}
                    </Button>
                </div>
            )}

            {sheetStatus === 'submitted' && (
                <div className="p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-xl text-cyan-300 text-sm text-center">
                    ✓ Submitted — waiting for manager approval
                </div>
            )}

            {sheetStatus === 'approved' && (
                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl text-green-300 text-sm text-center">
                    ✓ Goal sheet approved and locked
                    {cycle?.phase === 'Check-in Open' && ' — you can now enter achievements'}
                </div>
            )}

            {/* Add goal modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-slate-100">Add New Goal</h3>

                        {formErr && <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded-lg">{formErr}</div>}

                        <div>
                            <label className="label">Thrust Area</label>
                            <select value={newGoal.thrust_area} onChange={e => setNewGoal(p => ({ ...p, thrust_area: e.target.value }))} className="input">
                                {THRUST_AREAS.map(a => <option key={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Goal Title</label>
                            <input type="text" placeholder="e.g. Reduce page load time by 30%" value={newGoal.title}
                                onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} className="input" />
                        </div>
                        <div>
                            <label className="label">Description (optional)</label>
                            <input type="text" placeholder="Any additional context" value={newGoal.description}
                                onChange={e => setNewGoal(p => ({ ...p, description: e.target.value }))} className="input" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Unit of Measure</label>
                                <select value={newGoal.uom_type} onChange={e => setNewGoal(p => ({ ...p, uom_type: e.target.value }))} className="input">
                                    {UOM_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Target Value</label>
                                <input type="number" placeholder="e.g. 30" value={newGoal.target}
                                    onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))} className="input" />
                            </div>
                        </div>
                        <div>
                            <label className="label">Weightage % (min 10)</label>
                            <input type="number" min="10" max="100" placeholder="e.g. 25" value={newGoal.weightage}
                                onChange={e => setNewGoal(p => ({ ...p, weightage: e.target.value }))} className="input" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={() => { setShowForm(false); setFormErr(null) }}>Cancel</Button>
                            <Button variant="primary" className="flex-1" onClick={addGoal} disabled={saving}>
                                {saving ? 'Saving…' : 'Create Goal'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Achievement entry modal */}
            {showCheckin && checkinGoal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-slate-100">Enter Achievement</h3>
                        <div className="p-3 bg-slate-900/50 rounded-lg text-sm text-slate-300">
                            <strong>{checkinGoal.title}</strong>
                            <div className="text-slate-500 mt-1">Target: {checkinGoal.target} · {checkinGoal.uom_type}</div>
                        </div>
                        <div>
                            <label className="label">Actual Value Achieved</label>
                            <input type="number" placeholder={`Target was ${checkinGoal.target}`} value={actualValue}
                                onChange={e => setActualValue(e.target.value)} className="input" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={() => { setShowCheckin(false); setActualValue('') }}>Cancel</Button>
                            <Button variant="primary" className="flex-1" onClick={saveCheckin} disabled={checkinSaving || !actualValue}>
                                {checkinSaving ? 'Saving…' : 'Save Achievement'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}