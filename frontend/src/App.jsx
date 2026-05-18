import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { RequireRole } from './auth/RequireRole'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import EmployeeGoalsPage from './pages/Employee/GoalsPage'
import ManagerTeamPage from './pages/manager/TeamPage'
import AdminCyclesPage from './pages/admin/CyclesPage'

const ROLE_HOME = {
  employee: '/employee/goals',
  manager: '/manager/team',
  admin: '/admin/cycles',
}

function RootRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to={ROLE_HOME[user.role] ?? '/login'} replace /> : <Navigate to="/login" replace />
}

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-dark-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 md:p-10 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Layout><RootRedirect /></Layout>} />
          <Route path="/employee/goals" element={
            <RequireRole roles={['employee']}><Layout><EmployeeGoalsPage /></Layout></RequireRole>
          } />
          <Route path="/manager/team" element={
            <RequireRole roles={['manager', 'admin']}><Layout><ManagerTeamPage /></Layout></RequireRole>
          } />
          <Route path="/admin/cycles" element={
            <RequireRole roles={['admin']}><Layout><AdminCyclesPage /></Layout></RequireRole>
          } />
          <Route path="*" element={<Layout><p style={{ color: '#334155' }}>Page not found.</p></Layout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}