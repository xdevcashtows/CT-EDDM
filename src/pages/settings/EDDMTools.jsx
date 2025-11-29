import React from 'react'
import '../Settings.css'

function EDDMTools() {
  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>EDDM Tools</h2>
        <p>Manage your Every Door Direct Mail tools and preferences.</p>
      </header>

      <div style={{ 
        marginTop: '24px', 
        padding: '20px', 
        background: '#f8fafc', 
        borderRadius: '12px', 
        border: '1.5px solid #e2e8f0' 
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          EDDM Tools settings will be available here.
        </p>
      </div>
    </div>
  )
}

export default EDDMTools

