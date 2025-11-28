import './RouteAnalysisSummary.css'

const QUICK_TARGETS = [
  { value: 2500, label: '2,500', detail: 'pieces' },
  { value: 5000, label: '5,000', detail: 'pieces' },
  { value: 10000, label: '10,000', detail: 'pieces' },
  { value: 15000, label: '15,000', detail: 'pieces' }
]

function RouteAnalysisSummary({
  data = [],
  residentialOnly,
  onResidentialOnlyChange,
  selectedData = [],
  onOptimize,
  activeTarget = null
}) {
  const safeData = Array.isArray(data) ? data : []
  const safeSelectedData = Array.isArray(selectedData) ? selectedData : []

  // Extract age range from selected data (should be same across all routes)
  const ageRange = safeSelectedData.length > 0 
    ? safeSelectedData.find(r => r?.ageRange)?.ageRange || '30-65'
    : '30-65'

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
  const mixRatio = metrics.residential + metrics.business
  const ratioPercent = mixRatio > 0 ? ((metrics.residential / mixRatio) * 100).toFixed(1) : '—'

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

  const hasBatches = batch1 > 0 || batch2 > 0 || batch3 > 0

  return (
    <div className="route-analysis-summary">
      <div className="metrics-grid">
        <MetricCard icon="🏠" label="Residential" value={metrics.residential.toLocaleString()} />
        <MetricCard icon="🏢" label="Business" value={metrics.business.toLocaleString()} />
        <MetricCard icon="⚖️" label="Residential share" value={ratioPercent === '—' ? '—' : `${ratioPercent}%`} />
        <MetricCard icon="📍" label="Total" value={metrics.total.toLocaleString()} />
        <MetricCard icon="👥" label={`Age ${ageRange}`} value={`${metrics.ageAvg}%`} />
        <MetricCard icon="📊" label="Avg Size" value={metrics.sizeAvg} />
        <MetricCard icon="💰" label="Avg $ Income" value={`$${metrics.incomeAvg.toLocaleString()}`} />
        <MetricCard icon="📋" label="Total Cost" value={`$${metrics.totalCost}`} />
      </div>

      <div className="batch-optimization-row">
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
            {!hasBatches && (
              <div className="batch-empty">
                <p>Select routes or run a quick optimization to see batch totals.</p>
              </div>
            )}
          </div>
        </div>
        <div className="quick-optimization-inline">
          <div className="quick-optimization-header">
          <div>
            <p className="quick-optimization-title">Quick Optimization</p>
          </div>
            <label className="quick-optimization-toggle">
              <input
                type="checkbox"
                checked={residentialOnly}
                onChange={(e) => onResidentialOnlyChange?.(e.target.checked)}
              />
              Residential only
            </label>
          </div>
          <div className="quick-optimization-buttons">
            {QUICK_TARGETS.map((target) => (
              <button
                key={target.value}
                type="button"
                className={`quick-optimization-btn ${activeTarget === target.value ? 'active' : ''}`}
                onClick={() => onOptimize?.(target.value)}
              >
                <span className="quick-optimization-value">{target.label}</span>
                <span className="quick-optimization-detail">{target.detail}</span>
              </button>
            ))}
          </div>
          <p className="quick-optimization-note">
            {selectedData.length.toLocaleString()} routes selected
          </p>
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

