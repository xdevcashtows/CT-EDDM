import React, { useState } from 'react'
import '../Settings.css'

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', description: 'Accept cash payments' },
  { id: 'manual_card', label: 'Manual Card Entry', description: 'Process card payments manually' },
  { id: 'payment_link', label: 'Payment Link', description: 'Stripe/Square payment links' },
  { id: 'venmo', label: 'Venmo', description: 'Venmo payment option' },
  { id: 'cash_app', label: 'Cash App', description: 'Cash App payment option' },
  { id: 'zelle', label: 'Zelle', description: 'Zelle payment option' }
]

function PaymentLinksSettings() {
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
  const handlePaymentMethodToggle = (methodId) => {
    setPaymentMethods(prev => {
      const updated = { ...prev, [methodId]: !prev[methodId] }
      localStorage.setItem('paymentMethods', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div className="settings-card payment-settings-card">
      <header className="settings-card-header">
        <h2>Payment Details</h2>
        <p>
          Configure payment methods available on invoices.
        </p>
      </header>

      {/* Payment Methods Toggles */}
      <div className="payment-methods-section">
        <div className="payment-methods-header">
          <h3>Payment Methods</h3>
          <p>Toggle payment methods on/off to control which options appear on invoices.</p>
        </div>
        <div className="payment-methods-grid">
          {PAYMENT_METHODS.map((method) => (
            <label 
              key={method.id} 
              className={`payment-method-toggle ${paymentMethods[method.id] ? 'active' : ''}`}
            >
              <div className="payment-method-info">
                <div className="payment-method-label">{method.label}</div>
                <div className="payment-method-description">{method.description}</div>
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

