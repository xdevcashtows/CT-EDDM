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
  const { user, loading, signIn, resetPassword, signInWithGoogle } = useAuth()
  const [googleProcessing, setGoogleProcessing] = useState(false)

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

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleProcessing(true)
    try {
      const { error } = await signInWithGoogle('/home')
      if (error) {
        setError(error.message || 'Unable to sign in with Google')
        setGoogleProcessing(false)
      }
      // Note: On success, user will be redirected by Supabase OAuth flow
    } catch (err) {
      setError(err?.message || 'Unable to sign in with Google')
      setGoogleProcessing(false)
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
          
          <button 
            type="button" 
            className="auth-button google-button" 
            onClick={handleGoogleSignIn}
            disabled={googleProcessing || processing}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {googleProcessing ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>
          
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

