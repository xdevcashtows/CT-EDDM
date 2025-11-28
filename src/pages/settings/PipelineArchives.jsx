import React from 'react'
import '../Settings.css'

function PipelineArchivesSettings() {
  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Pipeline archives</h2>
        <p>
          View the pipelines you previously archived, inspect their numbers, and bring one back into your current
          workflow whenever you are ready.
        </p>
      </header>

      <div className="form-actions">
        <button type="button" className="btn-secondary">
          View archived pipelines
        </button>
      </div>
    </div>
  )
}

export default PipelineArchivesSettings

