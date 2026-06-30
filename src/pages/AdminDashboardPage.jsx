import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
}

export default function AdminDashboardPage() {
  const { profile, signOut } = useAuth()
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)

  async function loadPolls() {
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('polls')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setPolls(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPolls()
  }, [])

  async function createPoll() {
    setCreating(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from('polls')
      .insert({
        title: 'New poll',
        description: '',
        status: 'draft',
        created_by: profile?.id ?? null,
      })
      .select('id')
      .single()

    setCreating(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    window.location.href = `/admin/polls/${data.id}`
  }

  return (
    <div className="poll-page art-deco-border">
      <div className="admin-topbar">
        <div>
          <h1 className="poll-page-title">Admin</h1>
          <p className="poll-page-subtitle">
            Signed in as {profile?.display_name ?? 'organizer'}
          </p>
        </div>
        <button type="button" className="poll-button poll-button-secondary" onClick={signOut}>
          Sign out
        </button>
      </div>

      <div className="admin-actions">
        <Link to="/admin/photos" className="poll-button poll-button-secondary">
          Photo album
        </Link>
        <button
          type="button"
          className="poll-button poll-button-primary"
          onClick={createPoll}
          disabled={creating}
        >
          {creating ? 'Creating…' : '+ New poll'}
        </button>
      </div>

      {loading && <p className="poll-loading">Loading polls…</p>}
      {error && <p className="poll-message poll-message-error">{error}</p>}

      <ul className="poll-list">
        {polls.map((poll) => (
          <li key={poll.id} className="poll-list-item">
            <div className="poll-list-item-body">
              <h2 className="poll-list-item-title">{poll.title}</h2>
              <span className={`poll-status poll-status-${poll.status}`}>
                {STATUS_LABELS[poll.status] ?? poll.status}
                {poll.status === 'open' && ' · Live on home page'}
              </span>
            </div>
            <Link to={`/admin/polls/${poll.id}`} className="poll-button poll-button-secondary">
              Manage
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
