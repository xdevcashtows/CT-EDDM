import { useState } from 'react'
import './EDDMCampaignSummary.css'

function EDDMCampaignSummary({ selectedData = [] }) {
  const safeData = Array.isArray(selectedData) ? selectedData : []
  const totalReach = safeData.reduce((sum, r) => sum + (r?.total || 0), 0)
  const totalBusiness = safeData.reduce((sum, r) => sum + (r?.business || 0), 0)

  // Extract ZIP code from first route (first 5 characters of route number)
  const zipCode = safeData.length > 0 && safeData[0]?.route
    ? safeData[0].route.slice(0, 5)
    : ''

  const metrics = {
    totalReach: totalReach,
    age25_34: safeData.length > 0
      ? (safeData.reduce((sum, r) => sum + (r?.age || 0), 0) / safeData.length).toFixed(1)
      : '0.0',
    averageIncome: safeData.length > 0
      ? Math.round(safeData.reduce((sum, r) => sum + (r?.income || 0), 0) / safeData.length)
      : 0,
    businessMix: safeData.length > 0 && totalReach > 0
      ? ((totalBusiness / totalReach) * 100).toFixed(1)
      : '0.0'
  }

  return (
    <div className="eddm-campaign-summary">
      <div className="section-header">
        <div>
          <h2>EDDM® Campaign Summary</h2>
          {zipCode && <p className="zip-code-display">For ZIP Code: {zipCode}</p>}
        </div>
      </div>

      <div className="campaign-metrics-grid">
        <CampaignMetricCard 
          icon="👥" 
          label="Total Reach" 
          value={metrics.totalReach.toLocaleString()}
          color="blue"
        />
        <CampaignMetricCard 
          icon="👥" 
          label="Age 25-34" 
          value={`${metrics.age25_34}%`}
          color="purple"
        />
        <CampaignMetricCard 
          icon="💰" 
          label="Average Income" 
          value={`$${metrics.averageIncome.toLocaleString()}`}
          color="green"
        />
        <CampaignMetricCard 
          icon="🏢" 
          label="Business Mix" 
          value={`${metrics.businessMix}%`}
          color="orange"
        />
      </div>
    </div>
  )
}

function CampaignMetricCard({ icon, label, value, color = 'blue' }) {
  return (
    <div className={`campaign-metric-card campaign-metric-card-${color}`}>
      <div className="campaign-metric-icon">{icon}</div>
      <div className="campaign-metric-content">
        <div className="campaign-metric-label">{label}</div>
        <div className="campaign-metric-value">{value}</div>
      </div>
    </div>
  )
}

export default EDDMCampaignSummary

