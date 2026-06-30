import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminLoginPage() {
  const { session, isAdmin, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (session && isAdmin) {
    return <Navigate to="/admin" replace />
  }

  const unauthorized = session && !isAdmin

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message ?? 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="poll-page art-deco-border poll-page-narrow">
      <Link to="/" className="poll-back-link">
        ← All polls
      </Link>

      <header className="poll-page-header">
        <h1 className="poll-page-title">Admin Login</h1>
        <p className="poll-page-subtitle">Reunion organizers only</p>
      </header>

      <form className="poll-form" onSubmit={handleSubmit}>
        <label className="poll-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>

        <label className="poll-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {unauthorized && (
          <p className="poll-message poll-message-error">
            This account is not an admin. Ask an organizer to set{' '}
            <code>is_admin = true</code> on your profile.
          </p>
        )}
        {error && <p className="poll-message poll-message-error">{error}</p>}

        <button
          type="submit"
          className="poll-button poll-button-primary"
          disabled={submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
