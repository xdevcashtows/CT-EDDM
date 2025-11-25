import React, { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { 
  Home, 
  Map, 
  Users, 
  Palette, 
  Package, 
  Mail, 
  FileText,
  Settings,
  LogOut
} from 'lucide-react'
import './DashboardLayout.css'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { path: '/home', label: 'Dashboard', icon: Home },
  { path: '/routes', label: 'Routes', icon: Map },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/designs', label: 'Designs', icon: Palette },
  { path: '/campaigns', label: 'Campaigns', icon: Package },
  { path: '/email-marketing', label: 'Email Marketing', icon: Mail },
  { path: '/packing-slips', label: 'Packing Slips', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings }
]

function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin', { replace: true })
    }
  }, [loading, user, navigate])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Loading session...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/signin'
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">CT EDDM Pro</h1>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              <div className="user-avatar">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}
          <button className="sign-out-btn" onClick={handleSignOut}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout
