import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.js'
import Layout from './components/Layout/Layout.jsx'
import LoginPage from './pages/Login.jsx'
import DashboardPage from './pages/Dashboard.jsx'
import KanbanPage from './pages/Kanban.jsx'
import ContactsPage from './pages/Contacts.jsx'
import MessagesPage from './pages/Messages.jsx'
import SettingsPage from './pages/Settings.jsx'

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="kanban" element={<KanbanPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
