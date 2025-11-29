import React from 'react'
import { CreditCard, Calendar, CheckCircle, ExternalLink } from 'lucide-react'
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
          <span>Billing Cycle</span>
          <strong>Monthly</strong>
        </div>
        <div>
          <span>Status</span>
          <strong style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={18} />
            Active
          </strong>
        </div>
        <div>
          <span>Next Billing Date</span>
          <strong>Jan 15, 2025</strong>
        </div>
      </div>

      <div style={{ 
        marginTop: '24px', 
        padding: '20px', 
        background: '#f8fafc', 
        borderRadius: '12px', 
        border: '1.5px solid #e2e8f0' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <CreditCard size={18} style={{ color: '#3b82f6' }} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Billing Information</h3>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
          Your subscription is active and will automatically renew on the next billing date. 
          You can update your payment method or cancel your subscription at any time.
        </p>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-primary">
          <ExternalLink size={16} />
          Manage Subscription
        </button>
        <button type="button" className="btn-secondary">
          <Calendar size={16} />
          View Billing History
        </button>
      </div>
    </div>
  )
}

export default SubscriptionSettings
