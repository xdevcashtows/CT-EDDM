import React, { useEffect, useState } from 'react'
import { Bell, Mail, AlertTriangle, Save, CheckCircle } from 'lucide-react'
import '../Settings.css'

function NotificationsSettings() {
  const [feedback, setFeedback] = useState('')
  const [pipelineUpdates, setPipelineUpdates] = useState(true)
  const [invoicePayments, setInvoicePayments] = useState(true)
  const [duplicateAlerts, setDuplicateAlerts] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(''), 3000)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleSave = async () => {
    setSaving(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setFeedback('Notification preferences saved successfully')
    setSaving(false)
  }

  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Notifications</h2>
        <p>Control how the CRM keeps you in the loop about leads, campaigns, and invoices.</p>
      </header>

      <div className="notification-list">
        <label className="form-field checkbox-field">
          <input
            type="checkbox"
            checked={pipelineUpdates}
            onChange={() => setPipelineUpdates((prev) => !prev)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Bell size={18} style={{ color: '#3b82f6' }} />
            <div>
              <span style={{ display: 'block', fontWeight: 600 }}>Pipeline Activity Updates</span>
              <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Send email updates for new pipeline activity
              </span>
            </div>
          </div>
        </label>
        <label className="form-field checkbox-field">
          <input
            type="checkbox"
            checked={invoicePayments}
            onChange={() => setInvoicePayments((prev) => !prev)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Mail size={18} style={{ color: '#22c55e' }} />
            <div>
              <span style={{ display: 'block', fontWeight: 600 }}>Invoice Payments</span>
              <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Notify me when clients pay invoices
              </span>
            </div>
          </div>
        </label>
        <label className="form-field checkbox-field">
          <input
            type="checkbox"
            checked={duplicateAlerts}
            onChange={() => setDuplicateAlerts((prev) => !prev)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
            <div>
              <span style={{ display: 'block', fontWeight: 600 }}>Duplicate Alerts</span>
              <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Alert me about duplicate contact suggestions
              </span>
            </div>
          </div>
        </label>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></span>
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Notification Preferences
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
    </div>
  )
}

export default NotificationsSettings
