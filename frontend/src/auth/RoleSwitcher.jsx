import { useAuth } from './AuthContext'

const ROLES = [
    { role: 'employee', label: 'Employee', color: '#22D3EE' },
    { role: 'manager', label: 'Manager', color: '#A78BFA' },
    { role: 'admin', label: 'Admin', color: '#34D399' },
]

export function RoleSwitcher() {
    const { user, switchRole, loading } = useAuth()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1E293B', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 2px 2px' }}>Switch Role</div>
            <div style={{ display: 'flex', gap: 4 }}>
                {ROLES.map(({ role, label, color }) => {
                    const active = user?.role === role
                    return (
                        <button key={role}
                            onClick={() => switchRole(role)}
                            disabled={loading || active}
                            style={{
                                flex: 1, padding: '5px 4px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                border: active ? `1px solid ${color}60` : '1px solid rgba(255,255,255,0.06)',
                                background: active ? `${color}20` : 'rgba(255,255,255,0.03)',
                                color: active ? color : '#334155',
                                cursor: active ? 'default' : 'pointer',
                                opacity: loading && !active ? 0.4 : 1,
                                transition: 'all 0.15s',
                                letterSpacing: '0.03em',
                            }}>
                            {label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}