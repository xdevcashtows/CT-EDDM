import React, { useState } from 'react'
import '../Settings.css'

function AppearanceSettings() {
  const [darkMode, setDarkMode] = useState(false)

  const toggleMode = () => {
    setDarkMode((prev) => !prev)
  }

  return (
    <section className="settings-card dark-mode-card">
      <header className="settings-card-header">
        <div>
          <h2>Appearance</h2>
          <p>Dark mode changes the CRM palette. Pick the vibe that feels best for your workflow.</p>
        </div>
      </header>

      <div className="dark-mode-toggle">
        <div className="dark-mode-status">
          <strong>{darkMode ? 'Dark mode' : 'Light mode'}</strong>
          <p>{darkMode ? 'Every screen uses a darker palette now.' : 'Light appearance is set everywhere.'}</p>
        </div>
        <button type="button" className="toggle-button" onClick={toggleMode}>
          {darkMode ? 'Turn off dark mode' : 'Turn on dark mode'}
        </button>
      </div>
    </section>
  )
}

export default AppearanceSettings

