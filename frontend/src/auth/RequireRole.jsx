import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

const ROLE_HOME = {
    employee: '/employee/goals',
    manager: '/manager/team',
    admin: '/admin/cycles',
}

export function RequireRole({ roles = [], children }) {
    const { user } = useAuth()
    const location = useLocation()

    // Not logged in → go to login
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />

    // Wrong role → go to own dashboard (prevents URL-guessing into other portals)
    if (roles.length > 0 && !roles.includes(user.role)) {
        return <Navigate to={ROLE_HOME[user.role] ?? '/'} replace />
    }

    return children
}