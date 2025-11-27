import React from 'react'
import '../Settings.css'

function PipelineArchivesSettings() {
  return (
    <section className="settings-card pipeline-card">
      <header className="settings-card-header">
        <div>
          <h2>Pipeline archives</h2>
          <p>
            View the pipelines you previously archived, inspect their numbers, and bring one back into your current
            workflow whenever you are ready.
          </p>
        </div>
      </header>

      <div className="pipeline-actions">
        <button type="button">View archived pipelines</button>
      </div>
    </section>
  )
}

export default PipelineArchivesSettings

