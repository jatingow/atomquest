import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('aq_token'))
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('aq_user') ?? 'null') }
        catch { return null }
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Keep localStorage in sync
    useEffect(() => {
        token ? localStorage.setItem('aq_token', token) : localStorage.removeItem('aq_token')
    }, [token])
    useEffect(() => {
        user ? localStorage.setItem('aq_user', JSON.stringify(user)) : localStorage.removeItem('aq_user')
    }, [user])

    const login = useCallback(async (email, password) => {
        setLoading(true); setError(null)
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Login failed')
            setToken(data.token)
            setUser(data.user)
            return data.user
        } catch (err) {
            setError(err.message); throw err
        } finally {
            setLoading(false)
        }
    }, [])

    const logout = useCallback(() => {
        setToken(null); setUser(null); setError(null)
    }, [])

    const switchRole = useCallback(async (role) => {
        setLoading(true); setError(null)
        try {
            const res = await fetch('/api/auth/role-switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Switch failed')
            setToken(data.token)
            setUser(data.user)
        } catch (err) {
            setError(err.message); throw err
        } finally {
            setLoading(false)
        }
    }, [])

    // Drop-in fetch() replacement that adds the Bearer token automatically
    const authFetch = useCallback(async (path, options = {}) => {
        const res = await fetch(path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
        })
        if (res.status === 401) { logout(); throw new Error('Session expired') }
        return res
    }, [token, logout])

    return (
        <AuthContext.Provider value={{ user, token, loading, error, login, logout, switchRole, authFetch }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be inside <AuthProvider>')
    return ctx
}