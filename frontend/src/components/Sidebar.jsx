import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from './ui'

const ROLE_CONFIG = {
    employee: {
        icon: '◎',
        color: 'cyan',
        name: 'Employee',
    },
    manager: {
        icon: '◈',
        color: 'purple',
        name: 'Manager',
    },
    admin: {
        icon: '⬡',
        color: 'green',
        name: 'Admin',
    },
}

const NAV = {
    employee: [
        { label: 'My Goals', path: '/employee/goals', icon: '🎯' },
    ],
    manager: [
        { label: 'Team Goals', path: '/manager/team', icon: '👥' },
    ],
    admin: [
        { label: 'Cycle Management', path: '/admin/cycles', icon: '⚙️' },
    ],
}

export default function Sidebar() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    if (!user) return null

    const links = NAV[user.role] ?? []
    const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.employee

    return (
        <aside className="w-72 h-screen sticky top-0 bg-gradient-to-b from-slate-950 to-dark-bg border-r border-dark-border flex flex-col">
            {/* Logo & Branding */}
            <div className="px-6 py-6 border-b border-dark-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${config.color}-500/30 to-${config.color}-500/10 border border-${config.color}-500/50 flex items-center justify-center text-lg font-bold`}>
                        ⚛
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-100 text-lg">AtomQuest</h1>
                        <p className="text-xs text-slate-500">{config.name}</p>
                    </div>
                </div>

                {/* User Info */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-dark-border">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Logged in as</p>
                    <p className="text-sm font-bold text-slate-100">{user.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{config.name} Role</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Navigation</p>
                {links.map((link) => {
                    const isActive = location.pathname === link.path
                    return (
                        <button
                            key={link.path}
                            onClick={() => navigate(link.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${isActive
                                    ? `bg-${config.color}-500/20 text-${config.color}-300 border border-${config.color}-500/30`
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                        >
                            <span className="text-lg">{link.icon}</span>
                            <span>{link.label}</span>
                            {isActive && <span className="ml-auto w-1.5 h-1.5 bg-current rounded-full" />}
                        </button>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-dark-border space-y-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                        logout()
                        navigate('/login')
                    }}
                >
                    🚪 Logout
                </Button>
                <p className="text-xs text-slate-600 px-4">v1.0.0 • Goal Portal</p>
            </div>
        </aside>
    )
}
