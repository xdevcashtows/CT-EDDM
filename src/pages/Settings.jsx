import React, { useEffect, useMemo, useState } from 'react'
import { UserPlus, Users as UsersIcon } from 'lucide-react'
import './Settings.css'
import PageLayout from '../components/PageLayout'
import { useAuth } from '../hooks/useAuth'
import { accountMembers } from '../lib/api'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' }
]

const STATUS_LABELS = {
  active: 'Access granted',
  invited: 'Invite pending'
}

const formatTimestamp = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch (error) {
    return '—'
  }
}

const capitalize = (value) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value

function Settings() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })
  const [processingInvite, setProcessingInvite] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  useEffect(() => {
    if (!user) return
    loadMembers()
  }, [user])

  const loadMembers = async () => {
    setLoadingMembers(true)
    const { data, error } = await accountMembers.listForOwner(user.id)
    if (error) {
      console.error('Unable to load team members', error)
    } else {
      setMembers(data || [])
    }
    setLoadingMembers(false)
  }

  const handleInviteSubmit = async (event) => {
    event.preventDefault()
    setFeedback({ type: '', message: '' })

    const trimmedEmail = inviteForm.email.trim().toLowerCase()
    if (!trimmedEmail) {
      setFeedback({ type: 'error', message: 'Enter a valid email before sending an invite.' })
      return
    }

    if (!user) return

    setProcessingInvite(true)
    const payload = {
      email: trimmedEmail,
      role: inviteForm.role || 'member'
    }

    try {
      const { data, error } = await accountMembers.invite(user.id, payload)
      if (error) {
        setFeedback({ type: 'error', message: error.message || 'Unable to send invite.' })
        return
      }
      setMembers((prev) => [data, ...prev])
      setInviteForm((prev) => ({ ...prev, email: '' }))
      setFeedback({
        type: 'success',
        message: `${data.email} has been invited as ${capitalize(data.role)}.`
      })
    } catch (err) {
      console.error(err)
      setFeedback({ type: 'error', message: err?.message || 'Unable to send invite.' })
    } finally {
      setProcessingInvite(false)
    }
  }

  const activeCount = useMemo(
    () => members.filter((member) => member.status === 'active').length,
    [members]
  )
  const pendingCount = useMemo(
    () => members.filter((member) => member.status === 'invited').length,
    [members]
  )

  return (
    <PageLayout
      title="Settings"
      subtitle="Control who has access to this workspace."
      tip="Invite teammates with their own credentials so everyone signs in individually."
      className="page-shell--fullwidth"
    >
      <div className="settings-page">
        <section className="settings-card settings-card-access">
          <div className="settings-card-header">
            <div>
              <h2>Account access</h2>
              <p>Invite collaborators and give them roles that match their responsibilities.</p>
            </div>
            {user && (
              <div className="settings-owner-pill">
                <UsersIcon size={16} />
                <span>Account owner</span>
                <strong>{user.email}</strong>
              </div>
            )}
          </div>

          <div className="settings-card-body">
            <form className="invite-form" onSubmit={handleInviteSubmit}>
              {feedback.message && (
                <div className={`form-feedback form-feedback-${feedback.type}`}>
                  {feedback.message}
                </div>
              )}

              <label className="form-field">
                <span>Email</span>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="colleague@example.com"
                />
              </label>

              <label className="form-field">
                <span>Role</span>
                <select
                  value={inviteForm.role}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, role: event.target.value }))
                  }
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button className="invite-button" type="submit" disabled={processingInvite}>
                <UserPlus size={16} />
                {processingInvite ? 'Sending invite…' : 'Invite teammate'}
              </button>
            </form>

            <div className="invite-note">
              <h3>Each teammate signs in with their own credentials</h3>
              <p>
                We send them an email invitation. Once they accept, their account is linked to this workspace
                and they will appear below.
              </p>
            </div>
          </div>
        </section>

        <section className="settings-card settings-card-members">
          <div className="settings-card-header">
            <div>
              <h2>Team members</h2>
              <p>Track pending invites and active collaborators.</p>
            </div>
            <div className="settings-card-counts">
              <div>
                <span>Active</span>
                <strong>{activeCount}</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>{pendingCount}</strong>
              </div>
            </div>
          </div>

          <div className="settings-card-content">
            {loadingMembers ? (
              <div className="member-loading">
                <span className="spinner-small" />
                Loading team members…
              </div>
            ) : members.length === 0 ? (
              <div className="empty-state">
                <p>No teammates invited yet.</p>
                <p>Use the invite form above to grant access.</p>
              </div>
            ) : (
              <div className="member-table">
                {members.map((member) => (
                  <div className="member-row" key={member.id}>
                    <div className="member-meta">
                      <strong>{member.profile?.full_name || member.email}</strong>
                      <span>{member.email}</span>
                    </div>
                    <div className="member-role">{capitalize(member.role)}</div>
                    <div className="member-status">
                      <span className={`status-badge status-${member.status}`}>
                        {STATUS_LABELS[member.status] || capitalize(member.status)}
                      </span>
                    </div>
                    <div className="member-date">
                      {formatTimestamp(member.joined_at || member.invited_at || member.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  )
}

export default Settings

