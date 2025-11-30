import { useState } from 'react';
import { X, CheckSquare, Square } from 'lucide-react';
import './RouteComparisonModal.css';

function RouteComparisonModal({ routes = [], isOpen, onClose }) {
  const [selectedRouteIds, setSelectedRouteIds] = useState(new Set());

  if (!isOpen) return null;

  // Calculate statistics for each route
  const routeStats = routes.map(route => {
    const routeList = route.routes || [];
    const residential = routeList.reduce((sum, r) => sum + (r.residential || 0), 0);
    const business = routeList.reduce((sum, r) => sum + (r.business || 0), 0);
    const total = routeList.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalCost = routeList.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
    const totalAge = routeList.reduce((sum, r) => sum + (r.age || 0), 0);
    const totalSize = routeList.reduce((sum, r) => sum + (r.size || 0), 0);
    const totalIncome = routeList.reduce((sum, r) => sum + (r.income || 0), 0);
    const routeCount = routeList.length;
    const avgAge = routeCount > 0 ? totalAge / routeCount : 0;
    const avgSize = routeCount > 0 ? totalSize / routeCount : 0;
    const avgIncome = routeCount > 0 ? totalIncome / routeCount : 0;
    const residentialShare = total > 0 ? (residential / total) * 100 : 0;
    const ageRange = routeList.length > 0 && routeList[0]?.ageRange ? routeList[0].ageRange : null;

    return {
      id: route.id,
      name: route.name,
      routeCount,
      residential,
      business,
      total,
      totalCost,
      avgAge,
      avgSize,
      avgIncome,
      residentialShare,
      ageRange,
      isLocked: route.is_locked
    };
  });

  const toggleRouteSelection = (routeId) => {
    const newSelected = new Set(selectedRouteIds);
    if (newSelected.has(routeId)) {
      newSelected.delete(routeId);
    } else {
      newSelected.add(routeId);
    }
    setSelectedRouteIds(newSelected);
  };

  const selectAll = () => {
    if (selectedRouteIds.size === routes.length) {
      setSelectedRouteIds(new Set());
    } else {
      setSelectedRouteIds(new Set(routes.map(r => r.id)));
    }
  };

  const selectedStats = routeStats.filter(stat => selectedRouteIds.has(stat.id));
  const allSelected = routes.length > 0 && selectedRouteIds.size === routes.length;
  const someSelected = selectedRouteIds.size > 0 && selectedRouteIds.size < routes.length;

  return (
    <div className="route-comparison-modal-overlay" onClick={onClose}>
      <div className="route-comparison-modal" onClick={(e) => e.stopPropagation()}>
        <div className="route-comparison-modal-header">
          <h2>Compare Saved Routes</h2>
          <button className="route-comparison-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="route-comparison-modal-content">
          {/* Route Selection */}
          <div className="route-comparison-selection">
            <div className="route-comparison-selection-header">
              <button
                className="route-comparison-select-all"
                onClick={selectAll}
                type="button"
              >
                {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
              </button>
              <span className="route-comparison-selection-count">
                {selectedRouteIds.size} of {routes.length} selected
              </span>
            </div>
            <div className="route-comparison-checkboxes">
              {routes.map(route => (
                <label 
                  key={route.id} 
                  className={`route-comparison-checkbox-item ${selectedRouteIds.has(route.id) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedRouteIds.has(route.id)}
                    onChange={() => toggleRouteSelection(route.id)}
                  />
                  <span className="route-comparison-checkbox-label">
                    {route.name}
                    {route.is_locked && <span className="locked-badge-small">Locked</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Comparison Table */}
          {selectedStats.length > 0 ? (
            <div className="route-comparison-table-wrapper">
              <table className="route-comparison-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {selectedStats.map(stat => (
                      <th key={stat.id}>{stat.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="metric-label">Number of Routes</td>
                    {selectedStats.map(stat => (
                      <td key={stat.id}>{stat.routeCount.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-label">Total Households</td>
                    {selectedStats.map(stat => (
                      <td key={stat.id}>{stat.total.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-label">Residential</td>
                    {selectedStats.map(stat => (
                      <td key={stat.id}>{stat.residential.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-label">Business</td>
                    {selectedStats.map(stat => (
                      <td key={stat.id}>{stat.business.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-label">Residential Share</td>
                    {selectedStats.map(stat => (
                      <td key={stat.id}>{stat.residentialShare.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-label">{selectedStats[0]?.ageRange ? `Age ${selectedStats[0].ageRange}` : 'Age %'}</td>
                    {selectedStats.map(stat => (
                      <td key={stat.id}>{stat.avgAge.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-label">Avg Size</td>
                    {selectedStats.map(stat => (
                      <td key={stat.id}>{stat.avgSize.toFixed(2)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-label">Avg Income</td>
                    {selectedStats.map(stat => (
                      <td key={stat.id}>${Math.round(stat.avgIncome).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-label">Total Cost</td>
                    {selectedStats.map(stat => (
                      <td key={stat.id}>${stat.totalCost.toFixed(2)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="route-comparison-empty">
              <p>Select at least one route to compare</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RouteComparisonModal;

