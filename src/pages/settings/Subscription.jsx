import React from 'react'
import '../Settings.css'

function SubscriptionSettings() {
  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Subscription</h2>
        <p>Manage your plan, billing cadence, and workspace limits here.</p>
      </header>

      <div className="subscription-details">
        <div>
          <span>Plan</span>
          <strong>Growth</strong>
        </div>
        <div>
          <span>Billing</span>
          <strong>Monthly</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>Active</strong>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary">
          Manage subscription
        </button>
      </div>
    </div>
  )
}

export default SubscriptionSettings

