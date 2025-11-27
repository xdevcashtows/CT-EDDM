import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import './Settings.css'

const TAB_LINKS = [
  { id: 'account', label: 'Account', to: 'account' },
  { id: 'notifications', label: 'Notifications', to: 'notifications' },
  { id: 'appearance', label: 'Appearance', to: 'appearance' },
  { id: 'data', label: 'Data', to: 'data' },
  { id: 'pipeline-archives', label: 'Pipeline Archives', to: 'pipeline-archives' },
  { id: 'subscription', label: 'Subscription', to: 'subscription' },
  { id: 'payment-links', label: 'Payment Links', to: 'payment-links' }
]

function Settings() {
  return (
    <PageLayout
      title="Settings"
      subtitle="Configure the brain behind your CRM before using the other features."
      tip="Welcome to the 9x12 Method CRM settings. Set these preferences first."
    >
      <div className="settings-page">
        <p className="settings-intro">
          Everything you change on this screen controls how clients see your brand, how data behaves, and which
          payment links you share with them. Configure it before touching any other feature.
        </p>

        <div className="settings-tabs">
          {TAB_LINKS.map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.to}
              className={({ isActive }) => `settings-tab${isActive ? ' active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <Outlet />
      </div>
    </PageLayout>
  )
}

export default Settings
