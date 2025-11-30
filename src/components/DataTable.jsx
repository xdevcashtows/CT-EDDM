import { useState } from 'react'
import './DataTable.css'

function DataTable({ data = [], selectedRoutes = new Set(), onRouteToggle, onSelectAll, onBatchChange }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const safeData = Array.isArray(data) ? data : []
  
  // Extract age range from data (should be the same for all routes from same import)
  const ageRange = safeData.length > 0 && safeData[0]?.ageRange ? safeData[0].ageRange : null
  
  // Calculate residential percentage for each route
  const dataWithPercent = safeData.map(route => ({
    ...route,
    residentialPercent: route.total > 0 ? (route.residential / route.total) * 100 : 0
  }))

  // Calculate metrics from selected routes only
  const selectedData = dataWithPercent.filter(route => selectedRoutes.has(route.id))
  const metrics = {
    residential: selectedData.reduce((sum, r) => sum + (r?.residential || 0), 0),
    business: selectedData.reduce((sum, r) => sum + (r?.business || 0), 0),
    total: selectedData.reduce((sum, r) => sum + (r?.total || 0), 0),
    ageAvg: selectedData.length > 0 
      ? (selectedData.reduce((sum, r) => sum + (r?.age || 0), 0) / selectedData.length).toFixed(1)
      : '0.0',
    sizeAvg: selectedData.length > 0
      ? (selectedData.reduce((sum, r) => sum + (r?.size || 0), 0) / selectedData.length).toFixed(2)
      : '0.00',
    incomeAvg: selectedData.length > 0
      ? Math.round(selectedData.reduce((sum, r) => sum + (r?.income || 0), 0) / selectedData.length)
      : 0,
    totalCost: selectedData.reduce((sum, r) => sum + (parseFloat(r?.cost) || 0), 0).toFixed(2)
  }
  const mixRatio = metrics.residential + metrics.business
  const residentialSharePercent = mixRatio > 0 ? ((metrics.residential / mixRatio) * 100).toFixed(1) : '0.0'
  
  // Sort by user's sort config if they've selected a column
  const sortedData = [...dataWithPercent].sort((a, b) => {
    if (sortConfig.key) {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
    }
    
    return 0
  })

  const allSelected = safeData.length > 0 && selectedRoutes.size === safeData.length
  const someSelected = selectedRoutes.size > 0 && selectedRoutes.size < safeData.length

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <span className="sort-icon">↑↓</span>
    }
    return <span className="sort-icon">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </th>
            <th onClick={() => handleSort('batchNumber')} className="sortable">
              <div className="th-label-row">
                <span className="th-label">BATCH</span>
                <SortIcon columnKey="batchNumber" />
              </div>
            </th>
            <th onClick={() => handleSort('route')} className="sortable">
              <div className="th-label-row">
                <span className="th-label">ROUTE</span>
                <SortIcon columnKey="route" />
              </div>
            </th>
            <th onClick={() => handleSort('residential')} className="sortable">
              <div className="th-content">
                <span className="th-metric">{metrics.residential.toLocaleString()}</span>
                <div className="th-label-row">
                  <span className="th-label">RES.</span>
                  <SortIcon columnKey="residential" />
                </div>
              </div>
            </th>
            <th onClick={() => handleSort('business')} className="sortable">
              <div className="th-content">
                <span className="th-metric">{metrics.business.toLocaleString()}</span>
                <div className="th-label-row">
                  <span className="th-label">BUS.</span>
                  <SortIcon columnKey="business" />
                </div>
              </div>
            </th>
            <th onClick={() => handleSort('total')} className="sortable">
              <div className="th-content">
                <span className="th-metric">{metrics.total.toLocaleString()}</span>
                <div className="th-label-row">
                  <span className="th-label">TOTAL</span>
                  <SortIcon columnKey="total" />
                </div>
              </div>
            </th>
            <th onClick={() => handleSort('residentialPercent')} className="sortable">
              <div className="th-content">
                <span className="th-metric">{residentialSharePercent}%</span>
                <div className="th-label-row">
                  <span className="th-label">RES. %</span>
                  <SortIcon columnKey="residentialPercent" />
                </div>
              </div>
            </th>
            <th onClick={() => handleSort('age')} className="sortable">
              <div className="th-content">
                <span className="th-metric">{metrics.ageAvg}%</span>
                <div className="th-label-row">
                  <span className="th-label">{ageRange ? `Age ${ageRange}` : 'AGE %'}</span>
                  <SortIcon columnKey="age" />
                </div>
              </div>
            </th>
            <th onClick={() => handleSort('size')} className="sortable">
              <div className="th-content">
                <span className="th-metric">{metrics.sizeAvg}</span>
                <div className="th-label-row">
                  <span className="th-label">SIZE</span>
                  <SortIcon columnKey="size" />
                </div>
              </div>
            </th>
            <th onClick={() => handleSort('income')} className="sortable">
              <div className="th-content">
                <span className="th-metric">${metrics.incomeAvg.toLocaleString()}</span>
                <div className="th-label-row">
                  <span className="th-label">INCOME</span>
                  <SortIcon columnKey="income" />
                </div>
              </div>
            </th>
            <th onClick={() => handleSort('cost')} className="sortable">
              <div className="th-content">
                <span className="th-metric">${metrics.totalCost}</span>
                <div className="th-label-row">
                  <span className="th-label">COST</span>
                  <SortIcon columnKey="cost" />
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr className="empty-row">
              <td colSpan="11" className="empty-state">
                No route data. Import data to get started.
              </td>
            </tr>
          ) : (
            sortedData.map((route, idx) => (
              <tr key={route.id} className={selectedRoutes.has(route.id) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRoutes.has(route.id)}
                    onChange={() => onRouteToggle(route.id)}
                  />
                </td>
                <td>
                  <select
                    value={route.batchNumber ?? ''}
                    onChange={(e) => onBatchChange?.(route.id, e.target.value)}
                    className="batch-select"
                    disabled={!selectedRoutes.has(route.id)}
                  >
                    <option value="">-</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </td>
                <td>{route.route}</td>
                <td>{route.residential.toLocaleString()}</td>
                <td>{route.business.toLocaleString()}</td>
                <td>{route.total.toLocaleString()}</td>
                <td>{route.residentialPercent.toFixed(1)}%</td>
                <td>{route.age.toFixed(1)}%</td>
                <td>{route.size.toFixed(2)}</td>
                <td>${route.income.toLocaleString()}</td>
                <td>${route.cost.toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable

