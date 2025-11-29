import React, { useEffect, useState } from 'react'
import '../Settings.css'

const DEFAULT_PAYMENT_LINKS = [
  {
    id: 1,
    name: 'Single ad',
    buttonLabel: 'Buy single ad',
    amount: '500',
    url: '',
    provider: 'Stripe'
  },
  {
    id: 2,
    name: 'Double ad',
    buttonLabel: 'Buy double ad',
    amount: '950',
    url: '',
    provider: 'Stripe'
  }
]

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', description: 'Accept cash payments' },
  { id: 'manual_card', label: 'Manual Card Entry', description: 'Process card payments manually' },
  { id: 'payment_link', label: 'Payment Link', description: 'Stripe/Square payment links' },
  { id: 'venmo', label: 'Venmo', description: 'Venmo payment option' },
  { id: 'cash_app', label: 'Cash App', description: 'Cash App payment option' },
  { id: 'zelle', label: 'Zelle', description: 'Zelle payment option' }
]

function PaymentLinksSettings() {
  const [paymentLinks, setPaymentLinks] = useState(() =>
    DEFAULT_PAYMENT_LINKS.map((link) => ({ ...link }))
  )
  const [paymentMethods, setPaymentMethods] = useState(() => {
    // Load from localStorage or default to all enabled
    const saved = localStorage.getItem('paymentMethods')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        return PAYMENT_METHODS.reduce((acc, method) => ({ ...acc, [method.id]: true }), {})
      }
    }
    return PAYMENT_METHODS.reduce((acc, method) => ({ ...acc, [method.id]: true }), {})
  })
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(''), 3000)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleChange = (id, field) => (event) => {
    const value = event.target.value
    setPaymentLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, [field]: value } : link))
    )
  }

  const addPaymentLink = () => {
    setPaymentLinks((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: '',
        buttonLabel: '',
        amount: '',
        url: '',
        provider: 'Stripe'
      }
    ])
  }

  const removePaymentLink = (id) => {
    setPaymentLinks((prev) => prev.filter((link) => link.id !== id))
  }

  const handlePaymentMethodToggle = (methodId) => {
    setPaymentMethods(prev => {
      const updated = { ...prev, [methodId]: !prev[methodId] }
      localStorage.setItem('paymentMethods', JSON.stringify(updated))
      return updated
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    localStorage.setItem('paymentMethods', JSON.stringify(paymentMethods))
    setFeedback('Payment settings saved successfully.')
  }

  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Payment Details</h2>
        <p>
          Configure payment methods available on invoices and manage payment links for your clients.
        </p>
      </header>

      {/* Payment Methods Toggles */}
      <div className="payment-methods-section">
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
          Payment Methods
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
          Toggle payment methods on/off to control which options appear on invoices.
        </p>
        <div className="payment-methods-grid">
          {PAYMENT_METHODS.map((method) => (
            <label key={method.id} className="payment-method-toggle">
              <div className="payment-method-info">
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {method.label}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {method.description}
                </div>
              </div>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={paymentMethods[method.id] || false}
                  onChange={() => handlePaymentMethodToggle(method.id)}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Payment Links Section */}
      <div className="payment-links-section" style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
          Payment Links
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
          Drop Stripe, Square, or any payment link here so your invoices always come with an actionable "pay"
          experience for your clients.
        </p>

      <form className="payment-form" onSubmit={handleSubmit}>
        <div className="payment-links-list">
          {paymentLinks.map((link) => (
            <div className="payment-link-card" key={link.id}>
              <div className="payment-link-title">
                <strong>{link.name || 'New payment link'}</strong>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => removePaymentLink(link.id)}
                  aria-label="Remove payment link"
                >
                  Remove
                </button>
              </div>
              <div className="payment-link-fields">
                <label className="form-field">
                  <span>Link name</span>
                  <input
                    type="text"
                    value={link.name}
                    onChange={handleChange(link.id, 'name')}
                    placeholder="Single ad"
                  />
                </label>
                <label className="form-field">
                  <span>Button label</span>
                  <input
                    type="text"
                    value={link.buttonLabel}
                    onChange={handleChange(link.id, 'buttonLabel')}
                    placeholder="Buy single ad"
                  />
                </label>
                <label className="form-field">
                  <span>Amount (USD)</span>
                  <input
                    type="text"
                    value={link.amount}
                    onChange={handleChange(link.id, 'amount')}
                    placeholder="500"
                  />
                </label>
                <label className="form-field">
                  <span>Stripe / Square link</span>
                  <input
                    type="url"
                    value={link.url}
                    onChange={handleChange(link.id, 'url')}
                    placeholder="https://buy.stripe.com/..."
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions payment-form-actions">
          <button type="button" className="btn-secondary" onClick={addPaymentLink}>
            Add payment link
          </button>
          <button type="submit" className="btn-primary">
            Save payment links
          </button>
        </div>

        {feedback && <p className="form-help">{feedback}</p>}
      </form>
    </div>
  )
}

// Export payment methods for use in invoice generation
export { PAYMENT_METHODS }
export const getEnabledPaymentMethods = () => {
  const saved = localStorage.getItem('paymentMethods')
  if (saved) {
    try {
      const methods = JSON.parse(saved)
      return PAYMENT_METHODS.filter(method => methods[method.id])
    } catch (e) {
      return PAYMENT_METHODS
    }
  }
  return PAYMENT_METHODS
}

export default PaymentLinksSettings

