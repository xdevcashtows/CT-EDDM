import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { CheckCircle, XCircle, Loader, ExternalLink } from 'lucide-react'
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
  const { user } = useAuth()
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
  const [paymentConnections, setPaymentConnections] = useState({
    stripe: null,
    square: null,
    paypal: null
  })
  const [loadingConnections, setLoadingConnections] = useState(true)
  const [connecting, setConnecting] = useState(null) // 'stripe' or 'square'

  useEffect(() => {
    if (user?.id) {
      loadPaymentConnections()
    }
  }, [user])

  // Check for OAuth callback success/error in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    
    if (connected) {
      loadPaymentConnections()
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    if (error) {
      alert(`Failed to connect payment provider: ${error}`)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const loadPaymentConnections = async () => {
    if (!user?.id) return
    
    setLoadingConnections(true)
    try {
      const isDev = import.meta.env.DEV
      const apiBase = isDev ? 'http://localhost:8888' : ''
      
      const response = await fetch(`${apiBase}/.netlify/functions/get-payment-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (response.ok) {
        const data = await response.json()
        setPaymentConnections({
          stripe: data.stripe || null,
          square: data.square || null,
          paypal: data.paypal || null
        })
      }
    } catch (error) {
      console.error('Error loading payment connections:', error)
    } finally {
      setLoadingConnections(false)
    }
  }

  const handleConnectStripe = async () => {
    if (!user?.id) return
    
    setConnecting('stripe')
    try {
      const isDev = import.meta.env.DEV
      const apiBase = isDev ? 'http://localhost:8888' : ''
      
      const response = await fetch(`${apiBase}/.netlify/functions/connect-stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          returnUrl: window.location.href
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Stripe OAuth URL
        window.location.href = data.authUrl
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to initiate Stripe connection')
        setConnecting(null)
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      alert('Failed to connect Stripe account. Please try again.')
      setConnecting(null)
    }
  }

  const handleConnectSquare = async () => {
    if (!user?.id) return
    
    setConnecting('square')
    try {
      const isDev = import.meta.env.DEV
      const apiBase = isDev ? 'http://localhost:8888' : ''
      
      const response = await fetch(`${apiBase}/.netlify/functions/connect-square`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          returnUrl: window.location.href
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Square OAuth URL
        window.location.href = data.authUrl
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to initiate Square connection')
        setConnecting(null)
      }
    } catch (error) {
      console.error('Error connecting Square:', error)
      alert('Failed to connect Square account. Please try again.')
      setConnecting(null)
    }
  }

  const handleConnectPayPal = async () => {
    if (!user?.id) return
    
    setConnecting('paypal')
    try {
      const isDev = import.meta.env.DEV
      const apiBase = isDev ? 'http://localhost:8888' : ''
      
      const response = await fetch(`${apiBase}/.netlify/functions/connect-paypal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          returnUrl: window.location.href
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to PayPal OAuth URL
        window.location.href = data.authUrl
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to initiate PayPal connection')
        setConnecting(null)
      }
    } catch (error) {
      console.error('Error connecting PayPal:', error)
      alert('Failed to connect PayPal account. Please try again.')
      setConnecting(null)
    }
  }

  const handleDisconnect = async (provider) => {
    if (!user?.id) return
    if (!confirm(`Are you sure you want to disconnect your ${provider} account?`)) return

    try {
      const isDev = import.meta.env.DEV
      const apiBase = isDev ? 'http://localhost:8888' : ''
      
      const response = await fetch(`${apiBase}/.netlify/functions/disconnect-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          provider: provider
        })
      })

      if (response.ok) {
        setPaymentConnections(prev => ({
          ...prev,
          [provider]: null
        }))
        alert(`${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected successfully`)
      } else {
        const error = await response.json()
        alert(error.error || `Failed to disconnect ${provider} account`)
      }
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error)
      alert(`Failed to disconnect ${provider} account. Please try again.`)
    }
  }

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
          Connect your payment provider accounts and configure which payment methods appear on invoices.
        </p>
      </header>

      {/* Payment Provider Connections */}
      <div className="payment-providers-section" style={{ marginBottom: '32px' }}>
        <div className="payment-methods-header">
          <h3>Payment Provider Accounts</h3>
          <p>Connect your Stripe, Square, or PayPal account to enable payment links on invoices.</p>
        </div>
        
        <div className="payment-providers-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '16px',
          marginTop: '16px'
        }}>
          {/* Stripe Connection */}
          <div className="payment-provider-card" style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
            background: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #635BFF 0%, #0A2540 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  S
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Stripe</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Credit card processing</p>
                </div>
              </div>
              {loadingConnections ? (
                <Loader size={18} className="spinner" />
              ) : paymentConnections.stripe ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 500 }}>Connected</span>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: '#64748b' }}>Not connected</span>
              )}
            </div>
            
            {paymentConnections.stripe ? (
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                  Account: {paymentConnections.stripe.account_name || paymentConnections.stripe.account_id || 'Connected'}
                </p>
                <button
                  onClick={() => handleDisconnect('stripe')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectStripe}
                disabled={connecting === 'stripe'}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: connecting === 'stripe' ? '#cbd5e1' : '#635BFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: connecting === 'stripe' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {connecting === 'stripe' ? (
                  <>
                    <Loader size={16} className="spinner" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    Connect Stripe
                  </>
                )}
              </button>
            )}
          </div>

          {/* Square Connection */}
          <div className="payment-provider-card" style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
            background: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  □
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Square</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Payment processing</p>
                </div>
              </div>
              {loadingConnections ? (
                <Loader size={18} className="spinner" />
              ) : paymentConnections.square ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 500 }}>Connected</span>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: '#64748b' }}>Not connected</span>
              )}
            </div>
            
            {paymentConnections.square ? (
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                  Account: {paymentConnections.square.account_name || paymentConnections.square.account_id || 'Connected'}
                </p>
                <button
                  onClick={() => handleDisconnect('square')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectSquare}
                disabled={connecting === 'square'}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: connecting === 'square' ? '#cbd5e1' : '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: connecting === 'square' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {connecting === 'square' ? (
                  <>
                    <Loader size={16} className="spinner" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    Connect Square
                  </>
                )}
              </button>
            )}
          </div>

          {/* PayPal Connection */}
          <div className="payment-provider-card" style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
            background: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0070BA 0%, #003087 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  P
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>PayPal</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>PayPal payments</p>
                </div>
              </div>
              {loadingConnections ? (
                <Loader size={18} className="spinner" />
              ) : paymentConnections.paypal ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 500 }}>Connected</span>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: '#64748b' }}>Not connected</span>
              )}
            </div>
            
            {paymentConnections.paypal ? (
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                  Account: {paymentConnections.paypal.account_name || paymentConnections.paypal.account_id || 'Connected'}
                </p>
                <button
                  onClick={() => handleDisconnect('paypal')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectPayPal}
                disabled={connecting === 'paypal'}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: connecting === 'paypal' ? '#cbd5e1' : '#0070BA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: connecting === 'paypal' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {connecting === 'paypal' ? (
                  <>
                    <Loader size={16} className="spinner" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    Connect PayPal
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

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

