import { useState } from 'react'
import './RouteSelectionSummary.css'

function RouteSelectionSummary({ selectedData }) {
  const [showRouteDetails, setShowRouteDetails] = useState(true)
  const [agencyName, setAgencyName] = useState('')
  const [displayMetrics, setDisplayMetrics] = useState({
    totalReach: true,
    averageIncome: true,
    ageMix: true,
    businessMix: true
  })

  const handlePrint = () => {
    window.print()
  }

  const handleGetAreaInsights = () => {
    // TODO: Implement area insights feature
  }

  const handleMetricToggle = (metric) => {
    setDisplayMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }))
  }

  return (
    <div className="route-selection-summary">
      <div className="section-header">
        <h2>Route Selection Summary</h2>
        <div className="header-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showRouteDetails}
              onChange={(e) => setShowRouteDetails(e.target.checked)}
            />
            Show Route Details in Print
          </label>
          <button className="insights-button" onClick={handleGetAreaInsights}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
            </svg>
            Get Area Insights
          </button>
          <button className="print-button" onClick={handlePrint}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" fill="currentColor"/>
            </svg>
            Print Summary
          </button>
        </div>
      </div>

      <div className="summary-content">
        <div className="agency-input">
          <label>Agency Name (optional):</label>
          <input
            type="text"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="e.g., Dade Local, Rocky Mtn Marketing"
          />
        </div>

        <div className="display-metrics">
          <label>Display Metrics:</label>
          <div className="metrics-checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={displayMetrics.totalReach}
                onChange={() => handleMetricToggle('totalReach')}
              />
              Total Reach
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={displayMetrics.averageIncome}
                onChange={() => handleMetricToggle('averageIncome')}
              />
              Average Income
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={displayMetrics.ageMix}
                onChange={() => handleMetricToggle('ageMix')}
              />
              Age Mix
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={displayMetrics.businessMix}
                onChange={() => handleMetricToggle('businessMix')}
              />
              Business Mix
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RouteSelectionSummary

