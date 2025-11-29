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
  { id: 'payment-links', label: 'Payment Details', to: 'payment-links' }
]

function Settings() {
  return (
    <PageLayout
      title="Settings"
      subtitle="Configure the brain behind your CRM before using the other features."
      tip="Welcome to the 9x12 Method CRM settings. Set these preferences first."
    >
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="settings-page">
          {/* Removed settings-intro paragraph */}

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
      </div>
    </PageLayout>
  )
}

export default Settings
