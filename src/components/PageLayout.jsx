import React from 'react'
import './PageLayout.css'

function PageLayout({ title, subtitle, tip, actions, children }) {
  return (
    <section className="page-shell">
      <header className="page-shell-header">
        <div className="page-shell-title-block">
          {tip && <p className="page-shell-tip">{tip}</p>}
          <h1>{title}</h1>
          {subtitle && <p className="page-shell-subtitle">{subtitle}</p>}
        </div>
        {actions && (
          <div className="page-shell-actions">
            {actions}
          </div>
        )}
      </header>

      <div className="page-shell-content">
        {children}
      </div>
    </section>
  )
}

export default PageLayout

