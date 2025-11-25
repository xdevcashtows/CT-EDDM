import './RouteAnalysisSummary.css'

function RouteAnalysisSummary({ data = [], residentialOnly, onResidentialOnlyChange, onSaveSelection, selectedData = [], onOptimize, activeTarget = null }) {
  const safeData = Array.isArray(data) ? data : []
  const safeSelectedData = Array.isArray(selectedData) ? selectedData : []

  // Calculate metrics from selected routes only
  const metrics = {
    residential: safeSelectedData.reduce((sum, r) => sum + (r?.residential || 0), 0),
    business: safeSelectedData.reduce((sum, r) => sum + (r?.business || 0), 0),
    total: safeSelectedData.reduce((sum, r) => sum + (r?.total || 0), 0),
    ageAvg: safeSelectedData.length > 0 
      ? (safeSelectedData.reduce((sum, r) => sum + (r?.age || 0), 0) / safeSelectedData.length).toFixed(1)
      : '0.0',
    sizeAvg: safeSelectedData.length > 0
      ? (safeSelectedData.reduce((sum, r) => sum + (r?.size || 0), 0) / safeSelectedData.length).toFixed(2)
      : '0.00',
    incomeAvg: safeSelectedData.length > 0
      ? Math.round(safeSelectedData.reduce((sum, r) => sum + (r?.income || 0), 0) / safeSelectedData.length)
      : 0,
    totalCost: safeSelectedData.reduce((sum, r) => sum + (r?.cost || 0), 0).toFixed(2)
  }

  // Calculate batch totals (handle PBOX routes - use total for PBOX, otherwise use residential if residentialOnly)
  const batch1 = safeSelectedData
    .filter(r => r.batchNumber === 1)
    .reduce((sum, r) => {
      const isPBOX = r.route?.includes("PBOX")
      if (isPBOX) {
        return sum + (r.total || 0)
      }
      return sum + (residentialOnly ? (r.residential || 0) : (r.total || 0))
    }, 0)
  
  const batch2 = safeSelectedData
    .filter(r => r.batchNumber === 2)
    .reduce((sum, r) => {
      const isPBOX = r.route?.includes("PBOX")
      if (isPBOX) {
        return sum + (r.total || 0)
      }
      return sum + (residentialOnly ? (r.residential || 0) : (r.total || 0))
    }, 0)
  
  const batch3 = safeSelectedData
    .filter(r => r.batchNumber === 3)
    .reduce((sum, r) => {
      const isPBOX = r.route?.includes("PBOX")
      if (isPBOX) {
        return sum + (r.total || 0)
      }
      return sum + (residentialOnly ? (r.residential || 0) : (r.total || 0))
    }, 0)

  const handleOptimize = (target) => {
    if (onOptimize) {
      onOptimize(target)
    }
  }

  const handleCopyToClipboard = () => {
    if (safeSelectedData.length === 0) return
    const text = safeSelectedData.map(r => 
      `${r?.route || ''}\t${r?.residential || 0}\t${r?.business || 0}\t${r?.total || 0}\t${r?.age || 0}\t${r?.size || 0}\t${r?.income || 0}\t${r?.cost || 0}`
    ).join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="route-analysis-summary">
      <div className="summary-header">
        <h2>Route Analysis Summary</h2>
        <div className="summary-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={residentialOnly}
              onChange={(e) => onResidentialOnlyChange(e.target.checked)}
            />
            Residential Only
          </label>
          <button 
            className="save-selection-button"
            onClick={onSaveSelection}
            disabled={selectedData.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
            </svg>
            Save Selection
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard icon="🏠" label="Residential" value={metrics.residential.toLocaleString()} />
        <MetricCard icon="🏢" label="Business" value={metrics.business.toLocaleString()} />
        <MetricCard icon="📍" label="Total" value={metrics.total.toLocaleString()} />
        <MetricCard icon="👥" label="Age 30-65%" value={`${metrics.ageAvg}%`} />
        <MetricCard icon="📊" label="Avg Size" value={metrics.sizeAvg} />
        <MetricCard icon="💰" label="Avg $ Income" value={`$${metrics.incomeAvg.toLocaleString()}`} />
        <MetricCard icon="📋" label="Total Cost" value={`$${metrics.totalCost}`} />
      </div>

      {(batch1 > 0 || batch2 > 0 || batch3 > 0) && (
        <div className="batch-details-section">
          <div className="batch-details-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor"/>
            </svg>
            <h3>Batch Details</h3>
          </div>
          <div className="batch-details-grid">
            {batch1 > 0 && (
              <div className="batch-card">
                <p className="batch-label">Batch 1</p>
                <p className="batch-value">{batch1.toLocaleString()} pieces</p>
              </div>
            )}
            {batch2 > 0 && (
              <div className="batch-card">
                <p className="batch-label">Batch 2</p>
                <p className="batch-value">{batch2.toLocaleString()} pieces</p>
              </div>
            )}
            {batch3 > 0 && (
              <div className="batch-card">
                <p className="batch-label">Batch 3</p>
                <p className="batch-value">{batch3.toLocaleString()} pieces</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="optimize-section">
        <div className="optimize-section-header">
          <h3>Quick Optimization</h3>
          <p className="optimize-section-description">Automatically select routes for target quantities</p>
        </div>
        <div className="optimize-buttons-grid">
          <button 
            className={`optimize-btn ${activeTarget === 2500 ? 'active' : ''}`} 
            onClick={() => handleOptimize(2500)}
          >
            <span className="optimize-btn-number">2,500</span>
            <span className="optimize-btn-label">Optimize</span>
          </button>
          <button 
            className={`optimize-btn ${activeTarget === 5000 ? 'active' : ''}`} 
            onClick={() => handleOptimize(5000)}
          >
            <span className="optimize-btn-number">5,000</span>
            <span className="optimize-btn-label">Optimize</span>
          </button>
          <button 
            className={`optimize-btn ${activeTarget === 10000 ? 'active' : ''}`} 
            onClick={() => handleOptimize(10000)}
          >
            <span className="optimize-btn-number">10,000</span>
            <span className="optimize-btn-label">2 x 5,000</span>
          </button>
          <button 
            className={`optimize-btn ${activeTarget === 15000 ? 'active' : ''}`} 
            onClick={() => handleOptimize(15000)}
          >
            <span className="optimize-btn-number">15,000</span>
            <span className="optimize-btn-label">3 x 5,000</span>
          </button>
        </div>
        <div className="action-buttons">
          <button className="copy-clipboard-button" onClick={handleCopyToClipboard}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
            </svg>
            Copy Selected to Clipboard
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  )
}

export default RouteAnalysisSummary

