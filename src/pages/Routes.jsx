import React, { useState, useMemo, useEffect } from 'react';
import './Routes.css';
import ImportPanel from '../components/ImportPanel';
import RouteAnalysisSummary from '../components/RouteAnalysisSummary';
import DataTable from '../components/DataTable';
import SavedSelections from '../components/SavedSelections';
import RouteSelectionSummary from '../components/RouteSelectionSummary';
import EDDMCampaignSummary from '../components/EDDMCampaignSummary';
import { optimizeRoutes } from '../utils/optimizeRoutes';
import { savedRoutes as savedRoutesAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

function Routes() {
  const { user } = useAuth();
  const [routeData, setRouteData] = useState([]);
  const [selectedRoutes, setSelectedRoutes] = useState(new Set());
  const [residentialOnly, setResidentialOnly] = useState(false);
  const [savedSelections, setSavedSelections] = useState([]);
  const [lastOptimizationTarget, setLastOptimizationTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved route selections on mount
  useEffect(() => {
    if (user) {
      loadSavedSelections();
    }
  }, [user]);

  const loadSavedSelections = async () => {
    setLoading(true);
    const { data, error } = await savedRoutesAPI.getAll(user.id);
    if (!error && data) {
      setSavedSelections(data);
    }
    setLoading(false);
  };

  const handleProcessData = (data) => {
    // Initialize batch numbers
    const dataWithBatches = data.map(route => ({
      ...route,
      batchNumber: undefined
    }));
    setRouteData(dataWithBatches);
    // Auto-optimize for 5,000 postcards on data import
    if (dataWithBatches.length > 0) {
      const result = optimizeRoutes(dataWithBatches, 5000, residentialOnly);
      setSelectedRoutes(new Set(result.routeIds));
      updateBatchNumbers(result.batchMap);
      setLastOptimizationTarget(5000);
    } else {
      setSelectedRoutes(new Set());
      setLastOptimizationTarget(null);
    }
  };

  const updateBatchNumbers = (batchMap) => {
    setRouteData(prevData => 
      prevData.map(route => ({
        ...route,
        batchNumber: batchMap[route.id] ?? undefined
      }))
    );
  };

  const handleRouteToggle = (routeId) => {
    const newSelected = new Set(selectedRoutes);
    if (newSelected.has(routeId)) {
      newSelected.delete(routeId);
      // Clear batch number when unselected
      setRouteData(prevData =>
        prevData.map(route =>
          route.id === routeId ? { ...route, batchNumber: undefined } : route
        )
      );
    } else {
      newSelected.add(routeId);
    }
    setSelectedRoutes(newSelected);
  };

  const filteredData = useMemo(() => {
    let data = routeData;
    if (residentialOnly) {
      data = data.filter(route => route.residential > 0);
    }
    return data;
  }, [routeData, residentialOnly]);

  // Re-optimize when residential filter changes (but not on initial load)
  useEffect(() => {
    if (routeData.length > 0 && selectedRoutes.size > 0 && lastOptimizationTarget) {
      const result = optimizeRoutes(filteredData, lastOptimizationTarget, residentialOnly);
      setSelectedRoutes(new Set(result.routeIds));
      updateBatchNumbers(result.batchMap);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentialOnly]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRoutes(new Set(filteredData.map(route => route.id)));
    } else {
      setSelectedRoutes(new Set());
      // Clear batch numbers for all routes when unselecting all
      setRouteData(prevData =>
        prevData.map(route => ({ ...route, batchNumber: undefined }))
      );
    }
  };

  const selectedData = useMemo(() => {
    return filteredData.filter(route => selectedRoutes.has(route.id));
  }, [filteredData, selectedRoutes]);

  const handleSaveSelection = async () => {
    if (selectedData.length > 0 && user) {
      const totalHouseholds = selectedData.reduce((sum, route) => sum + (route.total || 0), 0);
      const totalCost = selectedData.reduce((sum, route) => sum + (parseFloat(route.cost) || 0), 0);

      const newSelection = {
        user_id: user.id,
        name: `Selection ${savedSelections.length + 1}`,
        routes: selectedData,
        total_households: totalHouseholds,
        total_cost: totalCost,
        notes: ''
      };

      const { data, error } = await savedRoutesAPI.create(newSelection);
      
      if (!error && data) {
        setSavedSelections([...savedSelections, data]);
      } else {
        console.error('Error saving selection:', error);
        alert('Failed to save selection');
      }
    }
  };

  const handleOptimize = (targetPostcards) => {
    const result = optimizeRoutes(filteredData, targetPostcards, residentialOnly);
    setSelectedRoutes(new Set(result.routeIds));
    updateBatchNumbers(result.batchMap);
    setLastOptimizationTarget(targetPostcards);
  };

  const handleBatchChange = (routeId, batchNumber) => {
    setRouteData(prevData =>
      prevData.map(route =>
        route.id === routeId
          ? { ...route, batchNumber: batchNumber === '' ? undefined : parseInt(batchNumber) }
          : route
      )
    );
  };

  const handleLoadSelection = async (selectionId) => {
    const { data, error } = await savedRoutesAPI.getById(selectionId);
    if (!error && data) {
      setRouteData(data.routes);
      const routeIds = data.routes.map(r => r.id);
      setSelectedRoutes(new Set(routeIds));
    }
  };

  const handleDeleteSelection = async (selectionId) => {
    if (confirm('Are you sure you want to delete this saved selection?')) {
      const { error } = await savedRoutesAPI.delete(selectionId);
      if (!error) {
        setSavedSelections(savedSelections.filter(s => s.id !== selectionId));
      } else {
        alert('Failed to delete selection');
      }
    }
  };

  return (
    <div className="routes-page">
      <div className="page-header">
        <h1>Route Manager</h1>
        <p>Import and manage your EDDM routes</p>
      </div>

      <div className="routes-content">
        <div className="routes-top">
          <ImportPanel onProcessData={handleProcessData} />
          <RouteAnalysisSummary 
            data={filteredData}
            residentialOnly={residentialOnly}
            onResidentialOnlyChange={setResidentialOnly}
            onSaveSelection={handleSaveSelection}
            selectedData={selectedData}
            onOptimize={handleOptimize}
            activeTarget={lastOptimizationTarget}
          />
        </div>

        <div className="routes-middle">
          <div className="table-container">
            <DataTable 
              data={filteredData}
              selectedRoutes={selectedRoutes}
              onRouteToggle={handleRouteToggle}
              onSelectAll={handleSelectAll}
              onBatchChange={handleBatchChange}
            />
            <SavedSelections 
              selections={savedSelections}
              onLoad={handleLoadSelection}
              onDelete={handleDeleteSelection}
              loading={loading}
            />
          </div>
        </div>

        <div className="routes-bottom">
          <RouteSelectionSummary 
            selectedData={selectedData}
          />
          <EDDMCampaignSummary 
            selectedData={selectedData}
          />
        </div>
      </div>
    </div>
  );
}

export default Routes;

