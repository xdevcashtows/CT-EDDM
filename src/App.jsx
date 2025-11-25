import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import RoutesPage from './pages/Routes'
import Contacts from './pages/Contacts'
import Designs from './pages/Designs'
import Campaigns from './pages/Campaigns'
import EmailMarketing from './pages/EmailMarketing'
import PackingSlips from './pages/PackingSlips'
import DashboardLayout from './components/DashboardLayout'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="designs" element={<Designs />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="email-marketing" element={<EmailMarketing />} />
          <Route path="packing-slips" element={<PackingSlips />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App

