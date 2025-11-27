import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import RoutesPage from './pages/Routes'
import Contacts from './pages/Contacts'
import Designs from './pages/Designs'
import Campaigns from './pages/Campaigns'
import EmailMarketing from './pages/EmailMarketing'
import PackingSlips from './pages/PackingSlips'
import Settings from './pages/Settings'
import AccountSettings from './pages/settings/Account'
import NotificationsSettings from './pages/settings/Notifications'
import AppearanceSettings from './pages/settings/Appearance'
import DataSettings from './pages/settings/Data'
import PipelineArchivesSettings from './pages/settings/PipelineArchives'
import SubscriptionSettings from './pages/settings/Subscription'
import PaymentLinksSettings from './pages/settings/PaymentLinks'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import DashboardLayout from './components/DashboardLayout'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="designs" element={<Designs />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="email-marketing" element={<EmailMarketing />} />
          <Route path="packing-slips" element={<PackingSlips />} />
          <Route path="settings" element={<Settings />}>
            <Route index element={<Navigate to="account" replace />} />
            <Route path="account" element={<AccountSettings />} />
            <Route path="notifications" element={<NotificationsSettings />} />
            <Route path="appearance" element={<AppearanceSettings />} />
            <Route path="data" element={<DataSettings />} />
            <Route path="pipeline-archives" element={<PipelineArchivesSettings />} />
            <Route path="subscription" element={<SubscriptionSettings />} />
            <Route path="payment-links" element={<PaymentLinksSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App

