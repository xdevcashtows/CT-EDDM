import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import { Settings as SettingsIcon } from 'lucide-react'
import './Settings.css'

const TAB_LINKS = [
  { id: 'account', label: 'Account', to: 'account', icon: '👤' },
  { id: 'notifications', label: 'Notifications', to: 'notifications', icon: '🔔' },
  { id: 'appearance', label: 'Appearance', to: 'appearance', icon: '🎨' },
  // { id: 'eddm-tools', label: 'EDDM Tools', to: 'eddm-tools', icon: '📮' },
  { id: 'subscription', label: 'Subscription', to: 'subscription', icon: '💳' },
  { id: 'payment-links', label: 'Payment Details', to: 'payment-links', icon: '💵' }
]

function Settings() {
  const location = useLocation()
  const currentPath = location.pathname.split('/').pop() || 'account'

  return (
    <PageLayout
      title="Settings"
      subtitle="Configure your CRM preferences and account settings."
      className="page-shell--fullwidth"
    >
      <div className="settings-container">
        <div className="settings-sidebar">
          <div className="settings-nav">
            {TAB_LINKS.map((tab) => {
              const isActive = currentPath === tab.to || (currentPath === 'settings' && tab.to === 'account')
              return (
                <NavLink
                  key={tab.id}
                  to={tab.to}
                  className={`settings-nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="settings-nav-icon">{tab.icon}</span>
                  <span className="settings-nav-label">{tab.label}</span>
                </NavLink>
              )
            })}
          </div>
        </div>

        <div className="settings-content">
          <Outlet />
        </div>
      </div>
    </PageLayout>
  )
}

export default Settings
