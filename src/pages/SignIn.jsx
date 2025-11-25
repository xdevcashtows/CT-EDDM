import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail } from 'lucide-react'
import './Auth.css'
import { useAuth } from '../hooks/useAuth'

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotProcessing, setForgotProcessing] = useState(false)
  const navigate = useNavigate()
  const { user, loading, signIn, resetPassword } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true })
    }
  }, [loading, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setError('')
    setProcessing(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message || 'Unable to sign in')
        return
      }
      navigate('/home')
    } catch (err) {
      setError(err?.message || 'Unable to sign in')
    } finally {
      setProcessing(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setForgotMessage('Enter the email tied to your account')
      return
    }

    setForgotProcessing(true)
    setForgotMessage('')

    try {
      const redirectTo = import.meta.env.VITE_PASSWORD_RESET_REDIRECT ||
        (typeof window !== 'undefined' ? `${window.location.origin}/signin` : undefined)
      const { error } = await resetPassword(forgotEmail, redirectTo)
      if (error) {
        setForgotMessage(error.message || 'Unable to send reset instructions')
        return
      }
      setForgotMessage('If that email is registered we sent a password reset link.')
    } catch (err) {
      setForgotMessage(err?.message || 'Unable to send reset instructions')
    } finally {
      setForgotProcessing(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
            </svg>
            <h1>Cash Tows EDDM Pro</h1>
          </div>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button primary" disabled={processing}>
            {processing ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="forgot-section">
          {forgotMode ? (
            <div className="forgot-panel">
              <div className="forgot-header">
                <Mail size={16} />
                <p>Need to reset your password?</p>
              </div>
              <div className="form-group">
                <label htmlFor="forgotEmail">Email</label>
                <input
                  type="email"
                  id="forgotEmail"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Email associated with your account"
                />
              </div>
              {forgotMessage && <div className="forgot-message">{forgotMessage}</div>}
              <div className="forgot-actions">
                <button
                  type="button"
                  className="auth-button secondary"
                  onClick={handleForgotPassword}
                  disabled={forgotProcessing}
                >
                  {forgotProcessing ? 'Sending…' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => {
                    setForgotMode(false)
                    setForgotMessage('')
                    setForgotEmail('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="auth-link-button"
              onClick={() => setForgotMode(true)}
            >
              Forgot password?
            </button>
          )}
        </div>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignIn

