import React, { useState } from 'react'
import { Sun, Moon, Palette } from 'lucide-react'
import '../Settings.css'

function AppearanceSettings() {
  const [darkMode, setDarkMode] = useState(false)

  const toggleMode = () => {
    setDarkMode((prev) => !prev)
    // Here you would typically update the theme in your app
  }

  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Appearance</h2>
        <p>Customize the look and feel of your CRM. Choose between light and dark mode.</p>
      </header>

      <div className="appearance-toggle">
        <div className="appearance-toggle-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            {darkMode ? (
              <Moon size={20} style={{ color: '#3b82f6' }} />
            ) : (
              <Sun size={20} style={{ color: '#f59e0b' }} />
            )}
            <h3>{darkMode ? 'Dark Mode' : 'Light Mode'}</h3>
          </div>
          <p>
            {darkMode 
              ? 'Every screen uses a darker palette for reduced eye strain in low-light conditions.' 
              : 'Light appearance is set everywhere for a clean, bright interface.'}
          </p>
        </div>
        <button type="button" className="btn-toggle" onClick={toggleMode}>
          {darkMode ? (
            <>
              <Sun size={16} />
              Switch to Light
            </>
          ) : (
            <>
              <Moon size={16} />
              Switch to Dark
            </>
          )}
        </button>
      </div>

      <div style={{ 
        marginTop: '24px', 
        padding: '20px', 
        background: '#f8fafc', 
        borderRadius: '12px', 
        border: '1.5px solid #e2e8f0' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <Palette size={18} style={{ color: '#8b5cf6' }} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Theme Preview</h3>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          {darkMode 
            ? 'Dark mode provides a comfortable viewing experience in low-light environments and reduces eye strain during extended use.'
            : 'Light mode offers a clean, professional appearance that works well in bright environments and maintains excellent readability.'}
        </p>
      </div>
    </div>
  )
}

export default AppearanceSettings
