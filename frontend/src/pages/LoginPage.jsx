import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button, Input, Label } from '../components/ui'

const ROLE_HOME = {
    employee: '/employee/goals',
    manager: '/manager/team',
    admin: '/admin/cycles',
}

export default function LoginPage() {
    const { login, loading, error } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [form, setForm] = useState({ email: '', password: '' })

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const user = await login(form.email, form.password)
            const dest = location.state?.from?.pathname ?? ROLE_HOME[user.role] ?? '/'
            navigate(dest, { replace: true })
        } catch { /* error shown via context */ }
    }

    return (
        <div className="min-h-screen flex bg-dark-bg">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex flex-1 items-center justify-center p-8 bg-gradient-to-br from-slate-950 via-dark-bg to-slate-900 relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
                </div>

                {/* Content */}
                <div className="relative z-10 text-center max-w-md">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 border border-cyan-500/40 mb-6">
                        <span className="text-4xl">⚛</span>
                    </div>
                    <h1 className="text-4xl font-bold text-slate-100 mb-4">AtomQuest</h1>
                    <p className="text-lg text-slate-400 mb-8">Goal Management & Performance Tracking System</p>

                    <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 backdrop-blur">
                        <p className="text-sm text-slate-300 mb-4">Demo Credentials</p>
                        <div className="space-y-3 text-left text-xs">
                            <div>
                                <span className="text-slate-500">Employee: </span>
                                <code className="text-cyan-400 font-mono">employee@atomquest.dev / Demo@1234</code>
                            </div>
                            <div>
                                <span className="text-slate-500">Manager: </span>
                                <code className="text-purple-400 font-mono">manager@atomquest.dev / Demo@1234</code>
                            </div>
                            <div>
                                <span className="text-slate-500">Admin: </span>
                                <code className="text-green-400 font-mono">admin@atomquest.dev / Demo@1234</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
                <div className="w-full max-w-sm">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 border border-cyan-500/40 mb-4">
                            <span className="text-3xl">⚛</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-100">AtomQuest</h1>
                        <p className="text-xs text-slate-500 mt-1">Goal Portal</p>
                    </div>

                    {/* Form */}
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">Welcome back</h2>
                        <p className="text-sm text-slate-400 mb-6">Sign in to your goal management portal</p>

                        {error && (
                            <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm">
                                <div className="flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label>Email Address</Label>
                                <Input
                                    type="email"
                                    required
                                    placeholder="you@atomquest.dev"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>

                            <div>
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="w-full mt-6"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-slate-800">
                            <p className="text-xs text-slate-500 text-center">
                                Version 1.0.0 • Goal Portal Beta
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}