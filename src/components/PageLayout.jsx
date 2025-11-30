import React from 'react'
import './PageLayout.css'

function PageLayout({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`page-shell ${className}`}>
      <header className="page-shell-header">
        <div className="page-shell-title-block">
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

