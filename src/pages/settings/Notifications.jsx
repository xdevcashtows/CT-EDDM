import React, { useEffect, useState } from 'react'
import '../Settings.css'

function NotificationsSettings() {
  const [feedback, setFeedback] = useState('')
  const [pipelineUpdates, setPipelineUpdates] = useState(true)
  const [invoicePayments, setInvoicePayments] = useState(true)
  const [duplicateAlerts, setDuplicateAlerts] = useState(false)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(''), 3000)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleSave = () => {
    setFeedback('Notification preferences saved.')
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
          <span>Send email updates for new pipeline activity</span>
        </label>
        <label className="form-field checkbox-field">
          <input
            type="checkbox"
            checked={invoicePayments}
            onChange={() => setInvoicePayments((prev) => !prev)}
          />
          <span>Notify me when clients pay invoices</span>
        </label>
        <label className="form-field checkbox-field">
          <input
            type="checkbox"
            checked={duplicateAlerts}
            onChange={() => setDuplicateAlerts((prev) => !prev)}
          />
          <span>Alert me about duplicate contact suggestions</span>
        </label>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={handleSave}>
          Save notification preferences
        </button>
        {feedback && <span className="form-help">{feedback}</span>}
      </div>
    </div>
  )
}

export default NotificationsSettings

