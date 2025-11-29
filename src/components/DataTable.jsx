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
  
  // Calculate residential percentage for each route
  const dataWithPercent = safeData.map(route => ({
    ...route,
    residentialPercent: route.total > 0 ? (route.residential / route.total) * 100 : 0
  }))
  
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
              BATCH <SortIcon columnKey="batchNumber" />
            </th>
            <th onClick={() => handleSort('route')} className="sortable">
              ROUTE <SortIcon columnKey="route" />
            </th>
            <th onClick={() => handleSort('residential')} className="sortable">
              RES. <SortIcon columnKey="residential" />
            </th>
            <th onClick={() => handleSort('business')} className="sortable">
              BUS. <SortIcon columnKey="business" />
            </th>
            <th onClick={() => handleSort('total')} className="sortable">
              TOTAL <SortIcon columnKey="total" />
            </th>
            <th onClick={() => handleSort('residentialPercent')} className="sortable">
              RES. % <SortIcon columnKey="residentialPercent" />
            </th>
            <th onClick={() => handleSort('age')} className="sortable">
              AGE % <SortIcon columnKey="age" />
            </th>
            <th onClick={() => handleSort('size')} className="sortable">
              SIZE <SortIcon columnKey="size" />
            </th>
            <th onClick={() => handleSort('income')} className="sortable">
              INCOME <SortIcon columnKey="income" />
            </th>
            <th onClick={() => handleSort('cost')} className="sortable">
              COST <SortIcon columnKey="cost" />
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

