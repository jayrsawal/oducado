import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPhotosPage from './pages/AdminPhotosPage'
import AdminPollPage from './pages/AdminPollPage'
import HomePage from './pages/HomePage'
import PollsPage from './pages/PollsPage'
import ResultsPage from './pages/ResultsPage'
import PhotoWallPage from './pages/PhotoWallPage'
import VotePage from './pages/VotePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="polls" element={<PollsPage />} />
            <Route path="vote" element={<VotePage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="photos" element={<Navigate to="/photos/wall" replace />} />
            <Route path="photos/upload" element={<Navigate to="/photos/wall" replace />} />
            <Route path="photos/wall" element={<PhotoWallPage />} />
            <Route path="photos/table/:tableId" element={<Navigate to="/photos/wall" replace />} />
            <Route
              path="photos/table/:tableId/upload"
              element={<Navigate to="/photos/wall" replace />}
            />
            <Route path="polls/:pollId" element={<Navigate to="/polls" replace />} />

            <Route path="admin/login" element={<AdminLoginPage />} />
            <Route path="admin" element={<AdminRoute />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="photos" element={<AdminPhotosPage />} />
              <Route path="polls/:pollId" element={<AdminPollPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
