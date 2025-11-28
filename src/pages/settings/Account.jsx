import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import '../Settings.css'

const DEFAULT_COMPANY = '9x12 Method'

function AccountSettings() {
  const { user } = useAuth()
  const [contactDetails, setContactDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: DEFAULT_COMPANY
  })
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!user) return
    const metadata = user.user_metadata || {}
    const tokens = (metadata.full_name || '').trim().split(/\s+/).filter(Boolean)
    const firstName = tokens.shift() || ''
    const lastName = tokens.join(' ')
    setContactDetails((prev) => ({
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || lastName,
      email: prev.email || user.email || '',
      company: prev.company || metadata.company || DEFAULT_COMPANY
    }))
  }, [user])

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(''), 3000)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleChange = (field) => (event) => {
    setContactDetails((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setFeedback('Contact information saved. These values will show on invoices.')
  }

  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Contact details</h2>
        <p>
          Your name, email, and company appear on invoices and documents. Update them here if you want something
          different from the sign-up information to show up for clients.
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="contact-input-grid">
          <label className="form-field">
            <span>First name</span>
            <input
              type="text"
              value={contactDetails.firstName}
              onChange={handleChange('firstName')}
              placeholder="First name"
            />
          </label>
          <label className="form-field">
            <span>Last name</span>
            <input
              type="text"
              value={contactDetails.lastName}
              onChange={handleChange('lastName')}
              placeholder="Last name"
            />
          </label>
          <label className="form-field">
            <span>Email address</span>
            <input
              type="email"
              value={contactDetails.email}
              onChange={handleChange('email')}
              placeholder="you@example.com"
            />
          </label>
          <label className="form-field">
            <span>Company</span>
            <input
              type="text"
              value={contactDetails.company}
              onChange={handleChange('company')}
              placeholder="9x12 Method"
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Save contact details
          </button>
          {feedback && <span className="form-help">{feedback}</span>}
        </div>
      </form>
    </div>
  )
}

export default AccountSettings

