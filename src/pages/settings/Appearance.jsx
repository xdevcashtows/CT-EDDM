import React, { useState } from 'react'
import '../Settings.css'

function AppearanceSettings() {
  const [darkMode, setDarkMode] = useState(false)

  const toggleMode = () => {
    setDarkMode((prev) => !prev)
  }

  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Appearance</h2>
        <p>Dark mode changes the CRM palette. Pick the vibe that feels best for your workflow.</p>
      </header>

      <div className="flex items-center justify-between">
        <div>
          <strong>{darkMode ? 'Dark mode' : 'Light mode'}</strong>
          <p className="text-sm text-gray-600 mt-1">{darkMode ? 'Every screen uses a darker palette now.' : 'Light appearance is set everywhere.'}</p>
        </div>
        <button type="button" className="btn-toggle" onClick={toggleMode}>
          {darkMode ? 'Turn off dark mode' : 'Turn on dark mode'}
        </button>
      </div>
    </div>
  )
}

export default AppearanceSettings

