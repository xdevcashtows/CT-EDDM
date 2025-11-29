import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { User, Mail, Building, Save, CheckCircle, Phone, MapPin, Image as ImageIcon, Shield } from 'lucide-react'
import { profiles as profilesAPI } from '../../lib/api'
import { storage } from '../../lib/supabase'
import ImageUploader from '../../components/ImageUploader'
import '../Settings.css'

function AccountSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  
  // Account Contact Details
  const [accountDetails, setAccountDetails] = useState({
    fullName: '',
    email: '',
    role: '',
    address: ''
  })

  // Invoice Contact Details
  const [invoiceDetails, setInvoiceDetails] = useState({
    businessName: '',
    email: '',
    phone: '',
    address: '',
    logoUrl: ''
  })

  useEffect(() => {
    if (!user) return
    loadProfile()
  }, [user])

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(''), 3000)
    return () => clearTimeout(timer)
  }, [feedback])

  const loadProfile = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await profilesAPI.getById(user.id)
      
      if (error) {
        console.error('Failed to load profile:', error)
        // Initialize with user data if profile doesn't exist
        setAccountDetails({
          fullName: user.user_metadata?.full_name || '',
          email: user.email || '',
          role: '',
          address: ''
        })
        setInvoiceDetails({
          businessName: '',
          email: '',
          phone: '',
          address: '',
          logoUrl: ''
        })
      } else if (data) {
        // Set account contact details
        setAccountDetails({
          fullName: data.full_name || '',
          email: user.email || '', // Always use the sign-up email (non-editable)
          role: data.role || '',
          address: data.address || ''
        })

        // Set invoice contact details
        setInvoiceDetails({
          businessName: data.business_name || '',
          email: data.invoice_email || '',
          phone: data.invoice_phone || data.phone || '',
          address: data.invoice_address || '',
          logoUrl: data.logo_url || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccountChange = (field) => (event) => {
    setAccountDetails((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleInvoiceChange = (field) => (event) => {
    setInvoiceDetails((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleLogoUpload = async (file) => {
    if (!user?.id) return
    
    try {
      const { data, error } = await storage.uploadLogo(user.id, file)
      if (error) {
        throw new Error(error.message || 'Failed to upload logo')
      }
      setInvoiceDetails((prev) => ({ ...prev, logoUrl: data.url }))
    } catch (error) {
      throw error
    }
  }

  const handleLogoRemove = () => {
    setInvoiceDetails((prev) => ({ ...prev, logoUrl: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user?.id) return

    setSaving(true)
    setFeedback('')
    
    try {
      const updates = {
        full_name: accountDetails.fullName,
        role: accountDetails.role || null,
        address: accountDetails.address || null,
        business_name: invoiceDetails.businessName || null,
        invoice_email: invoiceDetails.email || null,
        invoice_phone: invoiceDetails.phone || null,
        invoice_address: invoiceDetails.address || null,
        logo_url: invoiceDetails.logoUrl || null
      }

      const { error } = await profilesAPI.update(user.id, updates)
      
      if (error) {
        throw new Error(error.message || 'Failed to save profile')
      }

      setFeedback('Contact information saved successfully')
    } catch (error) {
      console.error('Error saving profile:', error)
      setFeedback(`Error: ${error.message || 'Failed to save contact information'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="settings-card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid rgba(59, 130, 246, 0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
          <p style={{ marginTop: '16px', color: '#64748b' }}>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-card">
      <form onSubmit={handleSubmit}>
        {/* Account Contact Details Section */}
        <section style={{ marginBottom: '48px' }}>
          <header className="settings-card-header" style={{ marginBottom: '24px' }}>
            <h2>Account Contact Details</h2>
            <p>
              Your personal account information. The email address is the one you signed up with and cannot be changed.
            </p>
          </header>

          <div className="contact-input-grid">
            <label className="form-field">
              <span>Full Name</span>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={accountDetails.fullName}
                  onChange={handleAccountChange('fullName')}
                  placeholder="Your full name"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </label>

            <label className="form-field">
              <span>Email Address</span>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={accountDetails.email}
                  disabled
                  placeholder="you@example.com"
                  style={{ paddingLeft: '40px', backgroundColor: '#f8fafc', cursor: 'not-allowed' }}
                />
              </div>
              <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>This is your sign-up email and cannot be changed</small>
            </label>

            <label className="form-field">
              <span>Role</span>
              <div style={{ position: 'relative' }}>
                <Shield size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                <select
                  value={accountDetails.role}
                  onChange={handleAccountChange('role')}
                  style={{ paddingLeft: '40px', appearance: 'none' }}
                >
                  <option value="">Select a role</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="sales">Sales</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
            </label>

            <label className="form-field">
              <span>Address</span>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={accountDetails.address}
                  onChange={handleAccountChange('address')}
                  placeholder="Your address"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </label>
          </div>
        </section>

        {/* Invoice Contact Details Section */}
        <section>
          <header className="settings-card-header" style={{ marginBottom: '24px' }}>
            <h2>Invoice Contact Details</h2>
            <p>
              Business contact information that will appear on invoices and documents sent to clients.
            </p>
          </header>

          <div className="contact-input-grid">
            <label className="form-field">
              <span>Business Name</span>
              <div style={{ position: 'relative' }}>
                <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={invoiceDetails.businessName}
                  onChange={handleInvoiceChange('businessName')}
                  placeholder="Your business name"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </label>

            <label className="form-field">
              <span>Email</span>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={invoiceDetails.email}
                  onChange={handleInvoiceChange('email')}
                  placeholder="business@example.com"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </label>

            <label className="form-field">
              <span>Phone</span>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="tel"
                  value={invoiceDetails.phone}
                  onChange={handleInvoiceChange('phone')}
                  placeholder="(555) 123-4567"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </label>

            <label className="form-field">
              <span>Address</span>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={invoiceDetails.address}
                  onChange={handleInvoiceChange('address')}
                  placeholder="Business address"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </label>
          </div>

          <div style={{ marginTop: '24px' }}>
            <label className="form-field">
              <span>Logo</span>
              <ImageUploader
                onUpload={handleLogoUpload}
                onRemove={handleLogoRemove}
                currentImage={invoiceDetails.logoUrl}
                label="Upload Business Logo"
                maxSizeMB={5}
                width={200}
                height={200}
              />
              <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Upload your business logo to appear on invoices. Recommended size: 200x200px
              </small>
            </label>
          </div>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></span>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Contact Details
              </>
            )}
          </button>
          {feedback && (
            <span className="form-help" style={{ color: feedback.includes('Error') ? '#ef4444' : '#22c55e' }}>
              <CheckCircle size={16} />
              {feedback}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

export default AccountSettings
