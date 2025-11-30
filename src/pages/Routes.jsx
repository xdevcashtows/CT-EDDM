import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Printer, Save, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import './Routes.css';
import ImportPanel from '../components/ImportPanel';
import DataTable from '../components/DataTable';
import SavedRoutes from '../components/SavedRoutes';
import RouteComparisonModal from '../components/RouteComparisonModal';
import { optimizeRoutes } from '../utils/optimizeRoutes';
import {
  campaigns as campaignsAPI,
  profiles as profilesAPI,
  savedRoutes as savedRoutesAPI
} from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PageLayout from '../components/PageLayout';
import { enrichSavedRoutesWithLock } from '../utils/routeLocking';

const QUICK_TARGETS = [
  { value: 2500, label: '2,500' },
  { value: 5000, label: '5,000' },
  { value: 10000, label: '10,000' },
  { value: 15000, label: '15,000' }
];

function Routes() {
  const { user } = useAuth();
  const [routeData, setRouteData] = useState([]);
  const [selectedRoutes, setSelectedRoutes] = useState(new Set());
  const [residentialOnly, setResidentialOnly] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [lastOptimizationTarget, setLastOptimizationTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved routes on mount
  useEffect(() => {
    if (user) {
      loadSavedRoutes();
    }
  }, [user]);

  const loadSavedRoutes = async () => {
    setLoading(true);
    const [routesRes, campaignsRes] = await Promise.all([
      savedRoutesAPI.getAll(user.id),
      campaignsAPI.getAll(user.id)
    ]);

    const savedRouteList = routesRes?.data || [];
    const campaignList = campaignsRes?.data || [];
    if (!routesRes.error) {
      setSavedRoutes(enrichSavedRoutesWithLock(savedRouteList, campaignList));
    }

    setLoading(false);
  };

  const updateBatchNumbers = useCallback((batchMap) => {
    setRouteData(prevData => 
      prevData.map(route => ({
        ...route,
        batchNumber: batchMap[route.id] ?? undefined
      }))
    );
  }, []);

  const handleProcessData = useCallback((data) => {
    console.log('🔴 handleProcessData CALLED');
    console.trace('  Call stack:');
    // Initialize batch numbers
    const dataWithBatches = data.map(route => ({
      ...route,
      batchNumber: undefined
    }));
    setRouteData(dataWithBatches);
    // Auto-optimize using the current optimization target, or default to 2500
    if (dataWithBatches.length > 0) {
      const targetValue = lastOptimizationTarget ?? 2500;
      const result = optimizeRoutes(dataWithBatches, targetValue, residentialOnly);
      console.log('  🔴 setSelectedRoutes called from handleProcessData, size:', result.routeIds.length);
      setSelectedRoutes(new Set(result.routeIds));
      updateBatchNumbers(result.batchMap);
      setLastOptimizationTarget(targetValue);
    } else {
      console.log('  🔴 setSelectedRoutes called from handleProcessData (empty)');
      setSelectedRoutes(new Set());
    }
  }, [lastOptimizationTarget, residentialOnly, updateBatchNumbers]);

  const handleRouteToggle = (routeId) => {
    console.log('🔵 handleRouteToggle CALLED for routeId:', routeId);
    console.trace('  Call stack:');
    const newSelected = new Set(selectedRoutes);
    if (newSelected.has(routeId)) {
      newSelected.delete(routeId);
      console.log('  🔵 setSelectedRoutes called from handleRouteToggle (UNSELECT), new size:', newSelected.size);
      // Clear batch number when unselected
      setRouteData(prevData =>
        prevData.map(route =>
          route.id === routeId ? { ...route, batchNumber: undefined } : route
        )
      );
    } else {
      newSelected.add(routeId);
      console.log('  🔵 setSelectedRoutes called from handleRouteToggle (SELECT), new size:', newSelected.size);
      
      // Find the route being selected to get its piece count
      const routeToAdd = routeData.find(r => r.id === routeId);
      if (routeToAdd) {
        const isPBOX = routeToAdd.route?.includes("PBOX");
        const piecesForRoute = isPBOX 
          ? (routeToAdd.total || 0) 
          : (residentialOnly ? (routeToAdd.residential || 0) : (routeToAdd.total || 0));
        
        // Calculate current batch totals
        const batchTotals = { 1: 0, 2: 0, 3: 0 };
        routeData.forEach(route => {
          if (route.batchNumber && selectedRoutes.has(route.id)) {
            const isRoutePBOX = route.route?.includes("PBOX");
            const pieces = isRoutePBOX 
              ? (route.total || 0) 
              : (residentialOnly ? (route.residential || 0) : (route.total || 0));
            batchTotals[route.batchNumber] = (batchTotals[route.batchNumber] || 0) + pieces;
          }
        });
        
        // Find the appropriate batch (max 5000 pieces per batch)
        let assignedBatch = 1;
        const MAX_BATCH_SIZE = 5000;
        
        if (batchTotals[1] + piecesForRoute <= MAX_BATCH_SIZE) {
          assignedBatch = 1;
        } else if (batchTotals[2] + piecesForRoute <= MAX_BATCH_SIZE) {
          assignedBatch = 2;
        } else {
          assignedBatch = 3;
        }
        
        console.log('  Assigning to Batch', assignedBatch, '- Current batch totals:', batchTotals, '+ new pieces:', piecesForRoute);
        
        // Assign to appropriate batch
        setRouteData(prevData =>
          prevData.map(route =>
            route.id === routeId ? { ...route, batchNumber: assignedBatch } : route
          )
        );
      }
    }
    setSelectedRoutes(newSelected);
    // Clear optimization state when manually toggling routes
    setLastOptimizationTarget(null);
  };

  const filteredData = useMemo(() => {
    let data = routeData;
    if (residentialOnly) {
      data = data.filter(route => route.residential > 0);
    }
    return data;
  }, [routeData, residentialOnly]);

  // Store current values in refs to avoid stale closures
  const filteredDataRef = useRef(filteredData);
  const lastOptimizationTargetRef = useRef(lastOptimizationTarget);
  
  useEffect(() => {
    filteredDataRef.current = filteredData;
  }, [filteredData]);
  
  useEffect(() => {
    lastOptimizationTargetRef.current = lastOptimizationTarget;
  }, [lastOptimizationTarget]);

  // Debug: Track every change to selectedRoutes
  useEffect(() => {
    console.log('🟢 selectedRoutes CHANGED - new size:', selectedRoutes.size);
    console.log('  Selected route IDs:', Array.from(selectedRoutes));
  }, [selectedRoutes]);

  // Re-optimize when residential filter changes (but not on initial load)
  const prevResidentialOnlyRef = useRef(residentialOnly);
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    console.log('🟡 RE-OPTIMIZE useEffect triggered');
    // Skip on initial mount
    if (isInitialMount.current) {
      console.log('  SKIPPING: Initial mount');
      isInitialMount.current = false;
      prevResidentialOnlyRef.current = residentialOnly;
      return;
    }
    
    // Only run when residentialOnly actually changes and there's an active optimization
    if (prevResidentialOnlyRef.current !== residentialOnly) {
      console.log('  residentialOnly CHANGED from', prevResidentialOnlyRef.current, 'to', residentialOnly);
      if (routeData.length > 0 && selectedRoutes.size > 0 && lastOptimizationTargetRef.current !== null) {
        console.log('  🟡 setSelectedRoutes called from RE-OPTIMIZE useEffect');
        console.trace('    Call stack:');
        const result = optimizeRoutes(filteredDataRef.current, lastOptimizationTargetRef.current, residentialOnly);
        setSelectedRoutes(new Set(result.routeIds));
        updateBatchNumbers(result.batchMap);
      }
      prevResidentialOnlyRef.current = residentialOnly;
    } else {
      console.log('  SKIPPING: residentialOnly did not change');
    }
  }, [residentialOnly, routeData.length]);

  const handleSelectAll = (checked) => {
    console.log('🟠 handleSelectAll CALLED with checked:', checked);
    console.trace('  Call stack:');
    if (checked) {
      console.log('  🟠 setSelectedRoutes called from handleSelectAll (SELECT ALL), size:', filteredData.length);
      setSelectedRoutes(new Set(filteredData.map(route => route.id)));
      
      // Intelligently batch all routes (max 5000 pieces per batch)
      const MAX_BATCH_SIZE = 5000;
      let currentBatch = 1;
      let currentBatchTotal = 0;
      const batchAssignments = {};
      
      filteredData.forEach(route => {
        const isPBOX = route.route?.includes("PBOX");
        const pieces = isPBOX 
          ? (route.total || 0) 
          : (residentialOnly ? (route.residential || 0) : (route.total || 0));
        
        // If adding this route would exceed the batch limit, move to next batch
        if (currentBatchTotal + pieces > MAX_BATCH_SIZE && currentBatchTotal > 0) {
          currentBatch++;
          currentBatchTotal = 0;
        }
        
        // Assign to current batch
        batchAssignments[route.id] = currentBatch;
        currentBatchTotal += pieces;
      });
      
      console.log('  Batch assignments for Select All:', batchAssignments);
      
      // Apply batch assignments
      setRouteData(prevData =>
        prevData.map(route => 
          batchAssignments[route.id] !== undefined
            ? { ...route, batchNumber: batchAssignments[route.id] } 
            : route
        )
      );
    } else {
      console.log('  🟠 setSelectedRoutes called from handleSelectAll (DESELECT ALL)');
      setSelectedRoutes(new Set());
      // Clear batch numbers for all routes when unselecting all
      setRouteData(prevData =>
        prevData.map(route => ({ ...route, batchNumber: undefined }))
      );
    }
    // Clear optimization state when manually selecting/deselecting all
    setLastOptimizationTarget(null);
  };

  const selectedData = useMemo(() => {
    const result = filteredData.filter(route => selectedRoutes.has(route.id));
    console.log('🟩 selectedData recalculated - length:', result.length);
    console.log('  Routes WITH batch numbers:', result.filter(r => r.batchNumber).map(r => ({ id: r.id, route: r.route, batch: r.batchNumber })));
    console.log('  Routes WITHOUT batch numbers:', result.filter(r => !r.batchNumber).map(r => ({ id: r.id, route: r.route })));
    return result;
  }, [filteredData, selectedRoutes]);

  const handleSaveRoute = async () => {
    if (selectedData.length === 0 || !user) {
      return;
    }

    const defaultName = `Saved Route ${savedRoutes.length + 1}`;
    const rawName = prompt('Name this saved route', defaultName);

    if (rawName === null) {
      return;
    }

    const routeName = rawName.trim();
    if (!routeName) {
      alert('Please provide a name for the saved route.');
      return;
    }

      const totalHouseholds = selectedData.reduce((sum, route) => sum + (route.total || 0), 0);
      const totalCost = selectedData.reduce((sum, route) => sum + (parseFloat(route.cost) || 0), 0);

    const newRoute = {
        user_id: user.id,
      name: routeName,
        routes: selectedData,
        total_households: totalHouseholds,
        total_cost: totalCost,
        notes: ''
      };

      const { error: profileError } = await profilesAPI.ensure(user);
      if (profileError) {
      console.error('Error ensuring profile exists before saving route:', profileError);
      }

    const { data, error } = await savedRoutesAPI.create(newRoute);
      
      if (!error && data) {
      setSavedRoutes(prev => [...prev, data]);
      } else {
      console.error('Error saving route:', error);
      alert('Failed to save route');
    }
  };

  const handleOptimize = useCallback((targetPostcards) => {
    console.log('🟣 handleOptimize CALLED with target:', targetPostcards);
    console.trace('  Call stack:');
    const result = optimizeRoutes(filteredData, targetPostcards, residentialOnly);
    console.log('  🟣 setSelectedRoutes called from handleOptimize, size:', result.routeIds.length);
    setSelectedRoutes(new Set(result.routeIds));
    updateBatchNumbers(result.batchMap);
    setLastOptimizationTarget(targetPostcards);
  }, [filteredData, residentialOnly, updateBatchNumbers]);

  const handleBatchChange = (routeId, batchNumber) => {
    setRouteData(prevData =>
      prevData.map(route =>
        route.id === routeId
          ? { ...route, batchNumber: batchNumber === '' ? undefined : parseInt(batchNumber) }
          : route
      )
    );
  };

  const handleLoadSavedRoute = async (selectionId) => {
    console.log('🟤 handleLoadSavedRoute CALLED');
    console.trace('  Call stack:');
    const { data, error } = await savedRoutesAPI.getById(selectionId);
    if (!error && data) {
      setRouteData(data.routes);
      const routeIds = data.routes.map(r => r.id);
      console.log('  🟤 setSelectedRoutes called from handleLoadSavedRoute, size:', routeIds.length);
      setSelectedRoutes(new Set(routeIds));
    }
  };

  const handleDeleteSavedRoute = async (selectionId) => {
    if (confirm('Are you sure you want to delete this saved route?')) {
      const { error } = await savedRoutesAPI.delete(selectionId);
      if (!error) {
        setSavedRoutes(prev => prev.filter(s => s.id !== selectionId));
      } else {
        alert('Failed to delete route');
      }
    }
  };

  const handleRenameSavedRoute = async (route) => {
    if (!route || !user) return;

    const rawName = prompt('Name this saved route', route.name || '');
    if (rawName === null) return;

    const trimmedName = rawName.trim();
    if (!trimmedName) {
      alert('Please provide a name for the saved route.');
      return;
    }

    const { data, error } = await savedRoutesAPI.update(route.id, { name: trimmedName });
    if (!error && data) {
      setSavedRoutes(prev => prev.map(r => (r.id === data.id ? data : r)));
    } else {
      console.error('Error renaming route:', error);
      alert('Failed to rename route');
    }
  };

  const printTimestampRef = useRef(new Date().toLocaleString());
  const printConfigRef = useRef(null);
  const [showPrintConfig, setShowPrintConfig] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [isDataManagementCollapsed, setIsDataManagementCollapsed] = useState(false);
  const [printColumns, setPrintColumns] = useState({
    route: true,
    residential: true,
    business: true,
    total: true,
    resShare: true,
    age: true,
    size: true,
    income: true,
    cost: true
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (printConfigRef.current && !printConfigRef.current.contains(event.target)) {
        setShowPrintConfig(false);
      }
    };

    if (showPrintConfig) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPrintConfig]);

  const handlePrintConfigToggle = () => {
    if (selectedData.length === 0) return;
    setShowPrintConfig(!showPrintConfig);
  };

  const handlePrintColumnToggle = (column) => {
    setPrintColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handlePrintSummary = () => {
    if (selectedData.length === 0) return;
    printTimestampRef.current = new Date().toLocaleString();
    setShowPrintConfig(false);
    window.print();
  };

  const printSummaryStats = useMemo(() => {
    const residential = selectedData.reduce((sum, route) => sum + (route.residential || 0), 0);
    const business = selectedData.reduce((sum, route) => sum + (route.business || 0), 0);
    const total = selectedData.reduce((sum, route) => sum + (route.total || 0), 0);
    const totalCost = selectedData.reduce((sum, route) => sum + (parseFloat(route.cost) || 0), 0);
    const totalRoutes = selectedData.length;
    const totalSize = selectedData.reduce((sum, route) => sum + (route.size || 0), 0);
    const totalIncome = selectedData.reduce((sum, route) => sum + (route.income || 0), 0);
    const totalAge = selectedData.reduce((sum, route) => sum + (route.age || 0), 0);
    const avgSize = totalRoutes > 0 ? totalSize / totalRoutes : 0;
    const avgIncome = totalRoutes > 0 ? totalIncome / totalRoutes : 0;
    const avgAge = totalRoutes > 0 ? totalAge / totalRoutes : 0;
    const mix = residential + business;
    const residentialShare = mix > 0 ? (residential / mix) * 100 : 0;
    // Extract age range from selected data (should be the same for all routes from same import)
    const ageRange = selectedData.length > 0 && selectedData[0]?.ageRange ? selectedData[0].ageRange : null;

    return {
      residential,
      business,
      total,
      residentialShare,
      avgAge,
      avgSize,
      avgIncome,
      totalCost,
      ageRange
    };
  }, [selectedData]);

  const copySelectedToClipboard = () => {
    if (selectedData.length === 0) return;
    const text = selectedData.map(r => 
      `${r?.route || ''}\t${r?.residential || 0}\t${r?.business || 0}\t${r?.total || 0}\t${r?.age || 0}\t${r?.size || 0}\t${r?.income || 0}\t${r?.cost || 0}`
    ).join('\n');
    navigator.clipboard.writeText(text);
  };

  const layoutProps = {
    title: 'Route Manager',
    subtitle: 'Import and optimize your EDDM routes in one place.',
    tip: 'Drop a USPS export or CSV to start mapping routes quickly.'
  };

  return (
    <PageLayout {...layoutProps} className="page-shell--fullwidth">
      <div className="routes-page">
        <div className="routes-data-management collapsible-section">
          <div 
            className="collapsible-header"
            onClick={() => setIsDataManagementCollapsed(!isDataManagementCollapsed)}
          >
            <h3>Data Management</h3>
            {isDataManagementCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </div>
          <div className={`collapsible-content ${isDataManagementCollapsed ? 'collapsed' : ''}`}>
            <div className="data-management-grid">
              <div className="data-management-section">
                <h4 className="data-management-section-title">Import Data</h4>
                <ImportPanel onProcessData={handleProcessData} />
              </div>
              <div className="data-management-section">
                <h4 className="data-management-section-title">Saved Routes</h4>
                <SavedRoutes 
                  routes={savedRoutes}
                  onLoad={handleLoadSavedRoute}
                  onDelete={handleDeleteSavedRoute}
                  onRename={handleRenameSavedRoute}
                  onCompare={() => setShowComparisonModal(true)}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        </div>

        <section className="routes-table-card">
          <div className="routes-table-header">
            <div>
              <h2>Routes</h2>
              <p className="routes-table-subtitle">
                {selectedData.length.toLocaleString()}/{filteredData.length.toLocaleString()} selected
              </p>
            </div>
            <div className="routes-optimization-controls">
              <div className="routes-optimization-icon">
                <Zap size={14} />
              </div>
              <div className="routes-optimization-segmented">
                <div className="routes-optimization-segmented-bg">
                  {lastOptimizationTarget !== null && (
                    <div 
                      className="routes-optimization-segmented-indicator"
                      style={{
                        left: QUICK_TARGETS.findIndex(opt => opt.value === lastOptimizationTarget) >= 0 
                          ? `calc(${QUICK_TARGETS.findIndex(opt => opt.value === lastOptimizationTarget) * 25}% + 0.25rem)` 
                          : 'calc(0% + 0.25rem)',
                        width: 'calc(25% - 0.5rem)'
                      }}
                    />
                  )}
                </div>
                <div className="routes-optimization-segmented-buttons">
                  {QUICK_TARGETS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleOptimize(option.value)}
                      className={`routes-optimization-segmented-btn ${lastOptimizationTarget === option.value ? 'active' : ''}`}
                    >
                      <div className="routes-optimization-segmented-value">{option.label}</div>
                      <div className="routes-optimization-segmented-unit">pcs</div>
                    </button>
                  ))}
                </div>
              </div>
              <label className="routes-optimization-toggle">
                <span className="routes-optimization-toggle-label">Res. only</span>
                <input
                  type="checkbox"
                  checked={residentialOnly}
                  onChange={(e) => setResidentialOnly(e.target.checked)}
                  className="routes-optimization-toggle-input"
                />
                <div className="routes-optimization-toggle-wrapper">
                  <div className="routes-optimization-toggle-slider"></div>
                </div>
              </label>
            </div>
            {(() => {
                const safeSelectedData = Array.isArray(selectedData) ? selectedData : [];
                console.log('📊 BATCH CALCULATIONS RUNNING');
                console.log('  safeSelectedData.length:', safeSelectedData.length);
                
                // Calculate batch totals (same logic as RouteAnalysisSummary)
                const batch1Data = safeSelectedData.filter(r => r.batchNumber === 1);
                const batch1 = batch1Data.reduce((sum, r) => {
                  const isPBOX = r.route?.includes("PBOX");
                  if (isPBOX) return sum + (r.total || 0);
                  return sum + (residentialOnly ? (r.residential || 0) : (r.total || 0));
                }, 0);
                const batch1Routes = batch1Data.length;
                console.log('  Batch 1:', batch1, 'pieces,', batch1Routes, 'routes');
                
                const batch2Data = safeSelectedData.filter(r => r.batchNumber === 2);
                const batch2 = batch2Data.reduce((sum, r) => {
                  const isPBOX = r.route?.includes("PBOX");
                  if (isPBOX) return sum + (r.total || 0);
                  return sum + (residentialOnly ? (r.residential || 0) : (r.total || 0));
                }, 0);
                const batch2Routes = batch2Data.length;
                console.log('  Batch 2:', batch2, 'pieces,', batch2Routes, 'routes');
                
                const batch3Data = safeSelectedData.filter(r => r.batchNumber === 3);
                const batch3 = batch3Data.reduce((sum, r) => {
                  const isPBOX = r.route?.includes("PBOX");
                  if (isPBOX) return sum + (r.total || 0);
                  return sum + (residentialOnly ? (r.residential || 0) : (r.total || 0));
                }, 0);
                const batch3Routes = batch3Data.length;
                console.log('  Batch 3:', batch3, 'pieces,', batch3Routes, 'routes');

                const batches = [
                  { number: 1, pieces: batch1, routes: batch1Routes },
                  { number: 2, pieces: batch2, routes: batch2Routes },
                  { number: 3, pieces: batch3, routes: batch3Routes }
                ];

                return (
                  <div className="routes-batch-details">
                    {batches.map((batch, index) => (
                      <div 
                        key={batch.number}
                        className={`batch-detail-card-compact ${batch.pieces === 0 ? 'batch-inactive' : ''}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="batch-detail-compact-label">{batch.number}</div>
                        <div className="batch-detail-compact-value">{batch.pieces.toLocaleString()}</div>
                        <div className="batch-detail-compact-meta">{batch.routes} ROUTES</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            <div className="routes-table-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={copySelectedToClipboard}
                  disabled={selectedData.length === 0}
                  className="saved-action-button saved-action-copy"
                  title="Copy"
                >
                  <span role="img" aria-label="copy">📋</span>
                </button>
                <div className="print-button-wrapper" ref={printConfigRef}>
                  <button
                    type="button"
                    onClick={handlePrintConfigToggle}
                    disabled={selectedData.length === 0}
                    className={`saved-action-button saved-action-print ${showPrintConfig ? 'active' : ''}`}
                    title="Print"
                  >
                    <Printer size={18} />
                  </button>
                  {showPrintConfig && (
                    <div className="print-config-menu">
                      <div className="print-config-header">
                        <h4>Select columns to print</h4>
                        <p>Choose which data points to include in your print summary</p>
                      </div>
                      <div className="print-config-options">
                        <label>
                          <input
                            type="checkbox"
                            checked={printColumns.route}
                            onChange={() => handlePrintColumnToggle('route')}
                          />
                          Route
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={printColumns.residential}
                            onChange={() => handlePrintColumnToggle('residential')}
                          />
                          Residential
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={printColumns.business}
                            onChange={() => handlePrintColumnToggle('business')}
                          />
                          Business
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={printColumns.total}
                            onChange={() => handlePrintColumnToggle('total')}
                          />
                          Total
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={printColumns.resShare}
                            onChange={() => handlePrintColumnToggle('resShare')}
                          />
                          Res %
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={printColumns.age}
                            onChange={() => handlePrintColumnToggle('age')}
                          />
                          Age
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={printColumns.size}
                            onChange={() => handlePrintColumnToggle('size')}
                          />
                          Size
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={printColumns.income}
                            onChange={() => handlePrintColumnToggle('income')}
                          />
                          Income
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={printColumns.cost}
                            onChange={() => handlePrintColumnToggle('cost')}
                          />
                          Cost
                        </label>
                      </div>
                      <div className="print-config-footer">
                        <button
                          type="button"
                          onClick={handlePrintSummary}
                          className="print-confirm-button"
                        >
                          Print
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSaveRoute}
                  disabled={selectedData.length === 0}
                  className="saved-action-button saved-action-save"
                  title="Save route"
                >
                  <Save size={18} />
                </button>
              </div>
          </div>
          <div className="routes-table-body">
            <DataTable 
              data={filteredData}
              selectedRoutes={selectedRoutes}
              onRouteToggle={handleRouteToggle}
              onSelectAll={handleSelectAll}
              onBatchChange={handleBatchChange}
            />
          </div>
        </section>
      <div className="routes-print-summary" aria-hidden="true">
        <div className="print-summary-header">
          <div>
            <p className="print-summary-kicker">Route print summary</p>
            <h3>Selected routes overview</h3>
          </div>
          <div className="print-summary-meta">
            <span>Printed · {printTimestampRef.current}</span>
            <span>{residentialOnly ? 'Residential only' : 'All routes'}</span>
            {lastOptimizationTarget && (
              <span>Last optimization target · {lastOptimizationTarget.toLocaleString()} pcs</span>
            )}
          </div>
        </div>
        <div className="print-hero-stats">
          <div className="print-hero-stat">
            <p className="print-hero-label">Total Households</p>
            <p className="print-hero-value">{printSummaryStats.total.toLocaleString()}</p>
          </div>
          <div className="print-hero-stat">
            <p className="print-hero-label">Total Cost</p>
            <p className="print-hero-value">${printSummaryStats.totalCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="print-details-grid">
          {printColumns.residential && (
            <div className="print-detail-stat">
              <p className="print-stat-label">Residential</p>
              <p className="print-stat-value">{printSummaryStats.residential.toLocaleString()}</p>
            </div>
          )}
          {printColumns.business && (
            <div className="print-detail-stat">
              <p className="print-stat-label">Business</p>
              <p className="print-stat-value">{printSummaryStats.business.toLocaleString()}</p>
            </div>
          )}
          {printColumns.resShare && (
            <div className="print-detail-stat">
              <p className="print-stat-label">Res Share</p>
              <p className="print-stat-value">
                {printSummaryStats.residentialShare ? `${printSummaryStats.residentialShare.toFixed(1)}%` : '—'}
              </p>
            </div>
          )}
          {printColumns.age && (
            <div className="print-detail-stat">
              <p className="print-stat-label">{printSummaryStats.ageRange ? `Age ${printSummaryStats.ageRange}` : 'Age'}</p>
              <p className="print-stat-value">{printSummaryStats.avgAge.toFixed(1)}%</p>
            </div>
          )}
          {printColumns.size && (
            <div className="print-detail-stat">
              <p className="print-stat-label">Avg Size</p>
              <p className="print-stat-value">{printSummaryStats.avgSize.toFixed(2)}</p>
            </div>
          )}
          {printColumns.income && (
            <div className="print-detail-stat">
              <p className="print-stat-label">Avg Income</p>
              <p className="print-stat-value">${Math.round(printSummaryStats.avgIncome).toLocaleString()}</p>
            </div>
          )}
        </div>
        <div className="print-summary-table-wrapper">
          <table className="print-summary-table">
            <thead>
              <tr>
                {printColumns.route && <th>Route</th>}
                {printColumns.residential && <th>Res</th>}
                {printColumns.business && <th>Bus</th>}
                {printColumns.resShare && <th>Res %</th>}
                {printColumns.total && <th>Total</th>}
                {printColumns.age && <th>{printSummaryStats.ageRange ? `Age ${printSummaryStats.ageRange}` : 'Age %'}</th>}
                {printColumns.size && <th>Size</th>}
                {printColumns.income && <th>Income</th>}
                {printColumns.cost && <th>Cost</th>}
              </tr>
            </thead>
            <tbody>
              {selectedData.map(route => {
                const routeResidential = route.residential || 0;
                const routeBusiness = route.business || 0;
                const routeTotal = routeResidential + routeBusiness;
                const routeResidentialShare = routeTotal > 0 ? ((routeResidential / routeTotal) * 100) : 0;
                
                return (
                  <tr key={route.id}>
                    {printColumns.route && <td>{route.route || 'Unknown'}</td>}
                    {printColumns.residential && <td>{routeResidential.toLocaleString()}</td>}
                    {printColumns.business && <td>{routeBusiness.toLocaleString()}</td>}
                    {printColumns.resShare && <td>{routeResidentialShare.toFixed(1)}%</td>}
                    {printColumns.total && <td>{(route.total || routeTotal).toLocaleString()}</td>}
                    {printColumns.age && <td>{(route.age || 0).toFixed(1)}%</td>}
                    {printColumns.size && <td>{(route.size || 0).toFixed(2)}</td>}
                    {printColumns.income && <td>{route.income ? `$${route.income.toLocaleString()}` : '—'}</td>}
                    {printColumns.cost && <td>${(parseFloat(route.cost) || 0).toFixed(2)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      <RouteComparisonModal
        routes={savedRoutes}
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
      />
    </PageLayout>
  )
}

export default Routes;

