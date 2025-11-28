import React, { useEffect, useState } from 'react'
import '../Settings.css'

function DataSettings() {
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    if (!actionMessage) return
    const timeout = setTimeout(() => setActionMessage(''), 2600)
    return () => clearTimeout(timeout)
  }, [actionMessage])

  const handleAction = (label) => () => {
    setActionMessage(`${label} ready. Continue in the relevant workspace.`)
  }

  return (
    <div className="settings-card">
      <header className="settings-card-header">
        <h2>Data</h2>
        <p>Import contacts, export data, and let the CRM surface duplicate suggestions.</p>
      </header>

      <div className="data-grid">
        <article className="data-tile">
          <h3>Import & export</h3>
          <p>
            Import contacts here or follow the tutorial inside the Contacts section. Export creates a CSV that you
            can move into other systems whenever you need.
          </p>
          <div className="tile-actions">
            <button type="button" className="btn-secondary" onClick={handleAction('Import')}>
              Import contacts
            </button>
            <button type="button" className="btn-secondary" onClick={handleAction('Export')}>
              Export CSV
            </button>
          </div>
        </article>
        <article className="data-tile">
          <h3>Duplicate management</h3>
          <p>
            The CRM watches your entries for matching names and emails so you can clean duplicates from one view.
          </p>
          <div className="tile-actions">
            <button type="button" className="btn-secondary" onClick={handleAction('Find duplicates')}>
              Scan duplicates
            </button>
          </div>
        </article>
      </div>

      <div className="danger-zone">
        <h3>Danger zone</h3>
        <p>
          Clicking this deletes every contact, pipeline, and setting in this workspace. Only use it when you are sure
          you want to start over. This cannot be undone.
        </p>
        <button type="button" className="btn-danger" onClick={handleAction('Delete all data')}>
          Delete all CRM data
        </button>
      </div>

      {actionMessage && <p className="form-help">{actionMessage}</p>}
    </div>
  )
}

export default DataSettings

