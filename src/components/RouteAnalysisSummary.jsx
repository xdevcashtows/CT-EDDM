import './RouteAnalysisSummary.css'
import { Zap } from 'lucide-react'

const QUICK_TARGETS = [
  { value: 2500, label: '2,500' },
  { value: 5000, label: '5,000' },
  { value: 10000, label: '10,000' },
  { value: 15000, label: '15,000' }
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

  // Calculate batch totals and route counts (handle PBOX routes - use total for PBOX, otherwise use residential if residentialOnly)
  const batch1Data = safeSelectedData.filter(r => r.batchNumber === 1)
  const batch1 = batch1Data.reduce((sum, r) => {
    const isPBOX = r.route?.includes("PBOX")
    if (isPBOX) {
      return sum + (r.total || 0)
    }
    return sum + (residentialOnly ? (r.residential || 0) : (r.total || 0))
  }, 0)
  const batch1Routes = batch1Data.length
  
  const batch2Data = safeSelectedData.filter(r => r.batchNumber === 2)
  const batch2 = batch2Data.reduce((sum, r) => {
    const isPBOX = r.route?.includes("PBOX")
    if (isPBOX) {
      return sum + (r.total || 0)
    }
    return sum + (residentialOnly ? (r.residential || 0) : (r.total || 0))
  }, 0)
  const batch2Routes = batch2Data.length
  
  const batch3Data = safeSelectedData.filter(r => r.batchNumber === 3)
  const batch3 = batch3Data.reduce((sum, r) => {
    const isPBOX = r.route?.includes("PBOX")
    if (isPBOX) {
      return sum + (r.total || 0)
    }
    return sum + (residentialOnly ? (r.residential || 0) : (r.total || 0))
  }, 0)
  const batch3Routes = batch3Data.length

  const batches = [
    { number: 1, pieces: batch1, routes: batch1Routes },
    { number: 2, pieces: batch2, routes: batch2Routes },
    { number: 3, pieces: batch3, routes: batch3Routes }
  ].filter(b => b.pieces > 0)

  const hasBatches = batches.length > 0
  const activeOptimizationIndex = QUICK_TARGETS.findIndex(opt => opt.value === activeTarget)

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

      <div className="batch-optimization-grid">
        {/* Batch Details */}
        {hasBatches && batches.map((batch, index) => (
          <div 
            key={batch.number}
            className="batch-detail-card"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="batch-detail-header">
              <div className="batch-detail-title-group">
                <div className="batch-detail-dot"></div>
                <h3 className="batch-detail-title">Batch {batch.number}</h3>
              </div>
              <div className="batch-detail-badge">
                <span className="batch-detail-badge-text">{batch.routes} routes</span>
              </div>
            </div>
            <div className="batch-detail-content">
              <div className="batch-detail-number">{batch.pieces.toLocaleString()}</div>
              <div className="batch-detail-label">pieces selected</div>
            </div>
          </div>
        ))}
        {!hasBatches && (
          <div className="batch-detail-card batch-empty-card">
            <div className="batch-detail-header">
              <div className="batch-detail-title-group">
                <div className="batch-detail-dot"></div>
                <h3 className="batch-detail-title">Batch Details</h3>
              </div>
            </div>
            <div className="batch-detail-content">
              <p className="batch-empty-text">Select routes or run a quick optimization to see batch totals.</p>
            </div>
          </div>
        )}

        {/* Quick Optimization */}
        <div className="quick-optimization-card">
          <div className="quick-optimization-header-new">
            <div className="quick-optimization-title-group">
              <div className="quick-optimization-icon">
                <Zap size={14} />
              </div>
              <h3 className="quick-optimization-title-new">Quick Optimization</h3>
            </div>
            <label className="quick-optimization-toggle-new">
              <input
                type="checkbox"
                checked={residentialOnly}
                onChange={(e) => onResidentialOnlyChange?.(e.target.checked)}
                className="quick-optimization-toggle-input"
              />
              <div className="quick-optimization-toggle-wrapper">
                <div className="quick-optimization-toggle-slider"></div>
              </div>
              <span className="quick-optimization-toggle-label">Res. only</span>
            </label>
          </div>

          {/* Segmented Control */}
          <div className="quick-optimization-segmented">
            <div className="quick-optimization-segmented-bg">
              <div 
                className="quick-optimization-segmented-indicator"
                style={{
                  left: activeOptimizationIndex >= 0 ? `${activeOptimizationIndex * 25 + 0.5}%` : '0.5%',
                  width: 'calc(25% - 4px)'
                }}
              />
            </div>
            <div className="quick-optimization-segmented-buttons">
              {QUICK_TARGETS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onOptimize?.(option.value)}
                  className={`quick-optimization-segmented-btn ${activeTarget === option.value ? 'active' : ''}`}
                >
                  <div className="quick-optimization-segmented-value">{option.label}</div>
                  <div className="quick-optimization-segmented-unit">pcs</div>
                </button>
              ))}
            </div>
          </div>
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

