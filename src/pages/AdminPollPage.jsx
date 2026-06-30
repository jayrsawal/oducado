import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PollBallot from '../components/PollBallot'
import AdminRosterEditor from '../components/AdminRosterEditor'
import AdminVoteList from '../components/AdminVoteList'
import OptionPhotoCapture from '../components/OptionPhotoCapture'
import PollResults from '../components/PollResults'
import { useAuth } from '../context/AuthContext'
import { POLL_SELECT, sortPollCategories, supabase } from '../lib/supabase'

const TABS = ['details', 'roster', 'categories', 'results', 'votes', 'proxy']

export default function AdminPollPage() {
  const { pollId } = useParams()
  const { session } = useAuth()
  const [poll, setPoll] = useState(null)
  const [tab, setTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [proxyName, setProxyName] = useState('')
  const [proxyVoterId, setProxyVoterId] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('polls')
      .select(POLL_SELECT)
      .eq('id', pollId)
      .single()

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setPoll(sortPollCategories(data))
    }
    setLoading(false)
  }, [pollId])

  useEffect(() => {
    load()
  }, [load])

  async function savePoll(fields) {
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('polls')
      .update(fields)
      .eq('id', pollId)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    await load()
  }

  async function openPoll() {
    setSaving(true)
    setError(null)

    const { error: closeError } = await supabase
      .from('polls')
      .update({ status: 'closed', closes_at: new Date().toISOString() })
      .eq('status', 'open')
      .neq('id', pollId)

    if (closeError) {
      setSaving(false)
      setError(closeError.message)
      return
    }

    await savePoll({ status: 'open', opens_at: new Date().toISOString() })
  }

  async function reopenPoll() {
    setSaving(true)
    setError(null)

    const { error: closeError } = await supabase
      .from('polls')
      .update({ status: 'closed', closes_at: new Date().toISOString() })
      .eq('status', 'open')
      .neq('id', pollId)

    if (closeError) {
      setSaving(false)
      setError(closeError.message)
      return
    }

    await savePoll({ status: 'open', opens_at: new Date().toISOString(), closes_at: null })
  }

  async function addCategory() {
    const order = poll.poll_categories?.length ?? 0
    const { error: insertError } = await supabase.from('poll_categories').insert({
      poll_id: pollId,
      name: 'New category',
      min_selections: 1,
      display_order: order,
    })
    if (insertError) setError(insertError.message)
    else await load()
  }

  async function updateCategory(categoryId, fields) {
    const { error: updateError } = await supabase
      .from('poll_categories')
      .update(fields)
      .eq('id', categoryId)
    if (updateError) setError(updateError.message)
    else await load()
  }

  async function deleteCategory(categoryId) {
    if (!confirm('Delete this category and all its options?')) return
    const { error: deleteError } = await supabase
      .from('poll_categories')
      .delete()
      .eq('id', categoryId)
    if (deleteError) setError(deleteError.message)
    else await load()
  }

  async function addOption(categoryId) {
    const category = poll.poll_categories.find((c) => c.id === categoryId)
    const order = category?.poll_options?.length ?? 0
    const { error: insertError } = await supabase.from('poll_options').insert({
      category_id: categoryId,
      label: 'New option',
      display_order: order,
    })
    if (insertError) setError(insertError.message)
    else await load()
  }

  async function updateOption(optionId, fields) {
    const { error: updateError } = await supabase
      .from('poll_options')
      .update(fields)
      .eq('id', optionId)
    if (updateError) setError(updateError.message)
    else await load()
  }

  async function deleteOption(optionId) {
    if (!confirm('Delete this option?')) return
    const { error: deleteError } = await supabase
      .from('poll_options')
      .delete()
      .eq('id', optionId)
    if (deleteError) setError(deleteError.message)
    else await load()
  }

  function handleOptionPhotoChange(optionId, imageUrl) {
    setPoll((prev) =>
      sortPollCategories({
        ...prev,
        poll_categories: prev.poll_categories.map((category) => ({
          ...category,
          poll_options: category.poll_options.map((option) =>
            option.id === optionId
              ? {
                  ...option,
                  image_url: imageUrl,
                  image_updated_at: imageUrl ? new Date().toISOString() : null,
                }
              : option
          ),
        })),
      })
    )
  }

  async function startProxyVoter() {
    if (!proxyName.trim()) return
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('create_proxy_voter', {
      p_poll_id: pollId,
      p_display_name: proxyName.trim(),
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setProxyVoterId(data)
  }

  async function submitProxyVote(optionIds) {
    const { error: submitError } = await supabase.rpc('submit_poll_ballot', {
      p_poll_id: pollId,
      p_voter_id: proxyVoterId,
      p_option_ids: optionIds,
      p_cast_by: session.user.id,
      p_device_id: null,
    })
    if (submitError) throw submitError
    setProxyName('')
    setProxyVoterId(null)
  }

  if (loading) {
    return <p className="poll-loading">Loading poll…</p>
  }

  if (error && !poll) {
    return (
      <div className="poll-page art-deco-border">
        <p className="poll-message poll-message-error">{error}</p>
        <Link to="/admin" className="poll-back-link">
          ← Back to admin
        </Link>
      </div>
    )
  }

  return (
    <div className="poll-page art-deco-border">
      <Link to="/admin" className="poll-back-link">
        ← Back to admin
      </Link>

      <header className="poll-page-header">
        <h1 className="poll-page-title">{poll.title}</h1>
        <span className={`poll-status poll-status-${poll.status}`}>{poll.status}</span>
      </header>

      <div className="poll-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`poll-tab${tab === t ? ' poll-tab-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="poll-message poll-message-error">{error}</p>}

      {tab === 'details' && (
        <section className="poll-section">
          <PollDetailsForm poll={poll} saving={saving} onSave={savePoll} />
          <div className="admin-status-actions">
            {poll.status === 'draft' && (
              <button
                type="button"
                className="poll-button poll-button-primary"
                disabled={saving}
                onClick={openPoll}
              >
                Open poll
              </button>
            )}
            {poll.status === 'open' && (
              <button
                type="button"
                className="poll-button poll-button-secondary"
                disabled={saving}
                onClick={() =>
                  savePoll({ status: 'closed', closes_at: new Date().toISOString() })
                }
              >
                Close poll
              </button>
            )}
            {poll.status === 'closed' && (
              <button
                type="button"
                className="poll-button poll-button-secondary"
                disabled={saving}
                onClick={reopenPoll}
              >
                Reopen poll
              </button>
            )}
          </div>
          <p className="poll-hint">
            Opening this poll closes any other open poll. Guests see the active poll on the{' '}
            <a href="/">home page</a>.
          </p>
        </section>
      )}

      {tab === 'roster' && (
        <section className="poll-section">
          <AdminRosterEditor pollId={pollId} />
        </section>
      )}

      {tab === 'categories' && (
        <section className="poll-section">
          <button type="button" className="poll-button poll-button-primary" onClick={addCategory}>
            + Add category
          </button>

          {poll.poll_categories?.map((category) => (
            <div key={category.id} className="admin-category-card">
              <div className="admin-category-header">
                <input
                  className="poll-input poll-input-title"
                  value={category.name}
                  onChange={(e) =>
                    setPoll((prev) => ({
                      ...prev,
                      poll_categories: prev.poll_categories.map((c) =>
                        c.id === category.id ? { ...c, name: e.target.value } : c
                      ),
                    }))
                  }
                  onBlur={(e) => updateCategory(category.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="poll-button poll-button-danger poll-button-small"
                  onClick={() => deleteCategory(category.id)}
                >
                  Delete
                </button>
              </div>

              <div className="admin-category-meta">
                <label className="poll-field poll-field-inline">
                  <span>Min selections</span>
                  <input
                    type="number"
                    min="0"
                    value={category.min_selections}
                    onChange={(e) =>
                      updateCategory(category.id, {
                        min_selections: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </label>
                <label className="poll-field poll-field-inline">
                  <span>Max selections</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="No limit"
                    value={category.max_selections ?? ''}
                    onChange={(e) =>
                      updateCategory(category.id, {
                        max_selections: e.target.value
                          ? parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                  />
                </label>
                <label className="poll-field poll-field-inline">
                  <span>Order</span>
                  <input
                    type="number"
                    value={category.display_order}
                    onChange={(e) =>
                      updateCategory(category.id, {
                        display_order: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </label>
              </div>

              <ul className="admin-options-list">
                {category.poll_options?.map((option) => (
                  <li key={option.id} className="admin-option-card">
                    <div className="admin-option-row">
                      <input
                        className="poll-input"
                        value={option.label}
                        onChange={(e) =>
                          setPoll((prev) => ({
                            ...prev,
                            poll_categories: prev.poll_categories.map((c) =>
                              c.id === category.id
                                ? {
                                    ...c,
                                    poll_options: c.poll_options.map((o) =>
                                      o.id === option.id
                                        ? { ...o, label: e.target.value }
                                        : o
                                    ),
                                  }
                                : c
                            ),
                          }))
                        }
                        onBlur={(e) => updateOption(option.id, { label: e.target.value })}
                      />
                      <button
                        type="button"
                        className="poll-button poll-button-danger poll-button-small"
                        onClick={() => deleteOption(option.id)}
                      >
                        ×
                      </button>
                    </div>
                    <OptionPhotoCapture
                      pollId={pollId}
                      optionId={option.id}
                      optionLabel={option.label}
                      imageUrl={option.image_url}
                      onPhotoChange={handleOptionPhotoChange}
                    />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="poll-button poll-button-secondary poll-button-small"
                onClick={() => addOption(category.id)}
              >
                + Add option
              </button>
            </div>
          ))}
        </section>
      )}

      {tab === 'results' && (
        <section className="poll-section">
          <PollResults pollId={pollId} />
        </section>
      )}

      {tab === 'votes' && (
        <section className="poll-section">
          <AdminVoteList pollId={pollId} />
        </section>
      )}

      {tab === 'proxy' && (
        <section className="poll-section">
          <p className="poll-hint">
            Cast a vote on behalf of someone who does not have a device handy.
          </p>

          {!proxyVoterId ? (
            <div className="poll-form poll-form-inline">
              <label className="poll-field">
                <span>Person&apos;s name</span>
                <input
                  value={proxyName}
                  onChange={(e) => setProxyName(e.target.value)}
                  placeholder="e.g. Aunt Maria"
                />
              </label>
              <button
                type="button"
                className="poll-button poll-button-primary"
                onClick={startProxyVoter}
                disabled={!proxyName.trim()}
              >
                Start ballot
              </button>
            </div>
          ) : (
            <>
              <p className="poll-hint">
                Voting for <strong>{proxyName}</strong>
              </p>
              <PollBallot
                poll={poll}
                submitLabel="Submit proxy vote"
                onSubmit={submitProxyVote}
              />
              <button
                type="button"
                className="poll-button poll-button-secondary"
                onClick={() => {
                  setProxyVoterId(null)
                  setProxyName('')
                }}
              >
                Cancel
              </button>
            </>
          )}
        </section>
      )}
    </div>
  )
}

function PollDetailsForm({ poll, saving, onSave }) {
  const [title, setTitle] = useState(poll.title)
  const [description, setDescription] = useState(poll.description ?? '')

  useEffect(() => {
    setTitle(poll.title)
    setDescription(poll.description ?? '')
  }, [poll.title, poll.description])

  function handleBlur() {
    if (title !== poll.title || description !== (poll.description ?? '')) {
      onSave({ title, description })
    }
  }

  return (
    <form
      className="poll-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ title, description })
      }}
    >
      <label className="poll-field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleBlur} />
      </label>
      <label className="poll-field">
        <span>Description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleBlur}
        />
      </label>
      <button type="submit" className="poll-button poll-button-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save details'}
      </button>
    </form>
  )
}
