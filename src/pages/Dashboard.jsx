import React, { useState, useMemo, useEffect } from 'react'
import './Dashboard.css'
import ImportPanel from '../components/ImportPanel'
import RouteAnalysisSummary from '../components/RouteAnalysisSummary'
import DataTable from '../components/DataTable'
import SavedRoutes from '../components/SavedRoutes'
import RouteSelectionSummary from '../components/RouteSelectionSummary'
import EDDMCampaignSummary from '../components/EDDMCampaignSummary'
import { optimizeRoutes } from '../utils/optimizeRoutes'

function Dashboard({ onSignOut }) {
  const [routeData, setRouteData] = useState([])
  const [selectedRoutes, setSelectedRoutes] = useState(new Set())
  const [residentialOnly, setResidentialOnly] = useState(false)
  const [savedRoutes, setSavedRoutes] = useState([])
  const [lastOptimizationTarget, setLastOptimizationTarget] = useState(null)

  const handleProcessData = (data) => {
    // Initialize batch numbers
    const dataWithBatches = data.map(route => ({
      ...route,
      batchNumber: undefined
    }))
    setRouteData(dataWithBatches)
    // Auto-optimize for 5,000 postcards on data import
    if (dataWithBatches.length > 0) {
      const result = optimizeRoutes(dataWithBatches, 5000, residentialOnly)
      setSelectedRoutes(new Set(result.routeIds))
      updateBatchNumbers(result.batchMap)
      setLastOptimizationTarget(5000)
    } else {
      setSelectedRoutes(new Set())
      setLastOptimizationTarget(null)
    }
  }

  const updateBatchNumbers = (batchMap) => {
    setRouteData(prevData => 
      prevData.map(route => ({
        ...route,
        batchNumber: batchMap[route.id] ?? undefined
      }))
    )
  }

  const handleRouteToggle = (routeId) => {
    const newSelected = new Set(selectedRoutes)
    if (newSelected.has(routeId)) {
      newSelected.delete(routeId)
      // Clear batch number when unselected
      setRouteData(prevData =>
        prevData.map(route =>
          route.id === routeId ? { ...route, batchNumber: undefined } : route
        )
      )
    } else {
      newSelected.add(routeId)
    }
    setSelectedRoutes(newSelected)
  }

  const filteredData = useMemo(() => {
    let data = routeData
    if (residentialOnly) {
      data = data.filter(route => route.residential > 0)
    }
    return data
  }, [routeData, residentialOnly])

  // Re-optimize when residential filter changes (but not on initial load)
  useEffect(() => {
    if (routeData.length > 0 && selectedRoutes.size > 0 && lastOptimizationTarget) {
      const result = optimizeRoutes(filteredData, lastOptimizationTarget, residentialOnly)
      setSelectedRoutes(new Set(result.routeIds))
      updateBatchNumbers(result.batchMap)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentialOnly])

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRoutes(new Set(filteredData.map(route => route.id)))
    } else {
      setSelectedRoutes(new Set())
      // Clear batch numbers for all routes when unselecting all
      setRouteData(prevData =>
        prevData.map(route => ({ ...route, batchNumber: undefined }))
      )
    }
  }

  const selectedData = useMemo(() => {
    return filteredData.filter(route => selectedRoutes.has(route.id))
  }, [filteredData, selectedRoutes])

  const handleSaveRoute = () => {
    if (selectedData.length === 0) return;

    const defaultName = `Saved Route ${savedRoutes.length + 1}`;
    const rawName = prompt('Name this saved route', defaultName);
    if (rawName === null) return;

    const routeName = rawName.trim();
    if (!routeName) {
      alert('Please provide a name for the saved route.');
      return;
    }

    const newRoute = {
        id: Date.now(),
      name: routeName,
        routes: selectedData,
        timestamp: new Date().toISOString()
    };

    setSavedRoutes(prev => [...prev, newRoute]);
  };

  const handleOptimize = (targetPostcards) => {
    const result = optimizeRoutes(filteredData, targetPostcards, residentialOnly)
    setSelectedRoutes(new Set(result.routeIds))
    updateBatchNumbers(result.batchMap)
    setLastOptimizationTarget(targetPostcards)
  }

  const handleLoadSavedRoute = (routeId) => {
    const savedRoute = savedRoutes.find(route => route.id === routeId)
    if (!savedRoute) return

    setRouteData(savedRoute.routes)
    const routeIds = savedRoute.routes.map(route => route.id)
    setSelectedRoutes(new Set(routeIds))
  }

  const handleDeleteSavedRoute = (routeId) => {
    setSavedRoutes(prev => prev.filter(route => route.id !== routeId))
  }

  const handleRenameSavedRoute = (route) => {
    if (!route) return;

    const rawName = prompt('Name this saved route', route.name || '');
    if (rawName === null) return;

    const trimmedName = rawName.trim();
    if (!trimmedName) {
      alert('Please provide a name for the saved route.');
      return;
    }

    setSavedRoutes(prev => prev.map(r => r.id === route.id ? { ...r, name: trimmedName } : r))
  }

  const handleBatchChange = (routeId, batchNumber) => {
    setRouteData(prevData =>
      prevData.map(route =>
        route.id === routeId
          ? { ...route, batchNumber: batchNumber === '' ? undefined : parseInt(batchNumber) }
          : route
      )
    )
  }

  return (
    <div className="dashboard-content"> {/* Simplified structure */}
        <div className="dashboard-top">
          <ImportPanel onProcessData={handleProcessData} />
          <RouteAnalysisSummary 
            data={filteredData}
            residentialOnly={residentialOnly}
            onResidentialOnlyChange={setResidentialOnly}
            onSaveSelection={handleSaveRoute}
            selectedData={selectedData}
            onOptimize={handleOptimize}
            activeTarget={lastOptimizationTarget}
          />
        </div>

        <div className="dashboard-middle">
          <div className="table-container">
            <DataTable 
              data={filteredData}
              selectedRoutes={selectedRoutes}
              onRouteToggle={handleRouteToggle}
              onSelectAll={handleSelectAll}
              onBatchChange={handleBatchChange}
            />
            <SavedRoutes 
              routes={savedRoutes}
              onLoad={handleLoadSavedRoute}
              onDelete={handleDeleteSavedRoute}
              onRename={handleRenameSavedRoute}
            />
          </div>
        </div>

        <div className="dashboard-bottom">
          <RouteSelectionSummary 
            selectedData={selectedData}
          />
          <EDDMCampaignSummary 
            selectedData={selectedData}
          />
        </div>
      </div>
  )
}

export default Dashboard

