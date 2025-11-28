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

function PaymentLinksSettings() {
  const [paymentLinks, setPaymentLinks] = useState(() =>
    DEFAULT_PAYMENT_LINKS.map((link) => ({ ...link }))
  )
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

  const handleSubmit = (event) => {
    event.preventDefault()
    setFeedback('Payment links saved. Ready to attach to invoices.')
  }

  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Payment links</h2>
        <p>
          Drop Stripe, Square, or any payment link here so your invoices always come with an actionable “pay”
          experience for your clients.
        </p>
      </header>

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

export default PaymentLinksSettings

