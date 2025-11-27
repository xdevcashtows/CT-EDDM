import React from 'react'
import '../Settings.css'

function SubscriptionSettings() {
  return (
    <section className="settings-card subscription-card">
      <header className="settings-card-header">
        <div>
          <h2>Subscription</h2>
          <p>Manage your plan, billing cadence, and workspace limits here.</p>
        </div>
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

      <div className="pipeline-actions">
        <button type="button">Manage subscription</button>
      </div>
    </section>
  )
}

export default SubscriptionSettings

