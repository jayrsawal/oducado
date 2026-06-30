import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPollPage from './pages/AdminPollPage'
import PollsPage from './pages/PollsPage'
import ResultsPage from './pages/ResultsPage'
import VotePage from './pages/VotePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<PollsPage />} />
            <Route path="vote" element={<VotePage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="polls" element={<Navigate to="/" replace />} />
            <Route path="polls/:pollId" element={<Navigate to="/" replace />} />

            <Route path="admin/login" element={<AdminLoginPage />} />
            <Route path="admin" element={<AdminRoute />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="polls/:pollId" element={<AdminPollPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
