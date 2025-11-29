import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { User, Mail, Building, Save, CheckCircle } from 'lucide-react'
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
  const [saving, setSaving] = useState(false)

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setFeedback('Contact information saved successfully')
    setSaving(false)
  }

  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Contact Details</h2>
        <p>
          Your name, email, and company appear on invoices and documents. Update them here if you want something
          different from the sign-up information to show up for clients.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="contact-input-grid">
          <label className="form-field">
            <span>First Name</span>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={contactDetails.firstName}
                onChange={handleChange('firstName')}
                placeholder="First name"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </label>
          <label className="form-field">
            <span>Last Name</span>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={contactDetails.lastName}
                onChange={handleChange('lastName')}
                placeholder="Last name"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </label>
          <label className="form-field">
            <span>Email Address</span>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="email"
                value={contactDetails.email}
                onChange={handleChange('email')}
                placeholder="you@example.com"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </label>
          <label className="form-field">
            <span>Company</span>
            <div style={{ position: 'relative' }}>
              <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={contactDetails.company}
                onChange={handleChange('company')}
                placeholder="9x12 Method"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></span>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Contact Details
              </>
            )}
          </button>
          {feedback && (
            <span className="form-help">
              <CheckCircle size={16} />
              {feedback}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

export default AccountSettings
