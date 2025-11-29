import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Printer, Save, ChevronDown, ChevronUp } from 'lucide-react';
import './Routes.css';
import ImportPanel from '../components/ImportPanel';
import RouteAnalysisSummary from '../components/RouteAnalysisSummary';
import DataTable from '../components/DataTable';
import SavedRoutes from '../components/SavedRoutes';
import { optimizeRoutes } from '../utils/optimizeRoutes';
import {
  campaigns as campaignsAPI,
  profiles as profilesAPI,
  savedRoutes as savedRoutesAPI
} from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PageLayout from '../components/PageLayout';
import { enrichSavedRoutesWithLock } from '../utils/routeLocking';

function Routes() {
  const { user } = useAuth();
  const [routeData, setRouteData] = useState([]);
  const [selectedRoutes, setSelectedRoutes] = useState(new Set());
  const [residentialOnly, setResidentialOnly] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [lastOptimizationTarget, setLastOptimizationTarget] = useState(2500);
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

  const handleProcessData = (data) => {
    // Initialize batch numbers
    const dataWithBatches = data.map(route => ({
      ...route,
      batchNumber: undefined
    }));
    setRouteData(dataWithBatches);
    // Auto-optimize for 2,500 postcards on data import
    if (dataWithBatches.length > 0) {
      const result = optimizeRoutes(dataWithBatches, 2500, residentialOnly);
      setSelectedRoutes(new Set(result.routeIds));
      updateBatchNumbers(result.batchMap);
      setLastOptimizationTarget(2500);
    } else {
      setSelectedRoutes(new Set());
      setLastOptimizationTarget(2500);
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

  const handleLoadSavedRoute = async (selectionId) => {
    const { data, error } = await savedRoutesAPI.getById(selectionId);
    if (!error && data) {
      setRouteData(data.routes);
      const routeIds = data.routes.map(r => r.id);
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
  const [isImportCollapsed, setIsImportCollapsed] = useState(false);
  const [isSavedRoutesCollapsed, setIsSavedRoutesCollapsed] = useState(false);
  const [isAnalysisCollapsed, setIsAnalysisCollapsed] = useState(false);
  const [isRoutesTableCollapsed, setIsRoutesTableCollapsed] = useState(false);
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

    return {
      residential,
      business,
      total,
      residentialShare,
      avgAge,
      avgSize,
      avgIncome,
      totalCost
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
        <div className="routes-top-row">
          <div className="routes-import-card collapsible-section">
            <div 
              className="collapsible-header"
              onClick={() => setIsImportCollapsed(!isImportCollapsed)}
            >
              <h3>Import Data</h3>
              {isImportCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>
            <div className={`collapsible-content ${isImportCollapsed ? 'collapsed' : ''}`}>
              <ImportPanel onProcessData={handleProcessData} />
            </div>
          </div>

          <div className="routes-top-card collapsible-section">
            <div 
              className="collapsible-header"
              onClick={() => setIsSavedRoutesCollapsed(!isSavedRoutesCollapsed)}
            >
              <h3>Saved Routes</h3>
              {isSavedRoutesCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>
            <div className={`collapsible-content ${isSavedRoutesCollapsed ? 'collapsed' : ''}`}>
              <SavedRoutes 
                routes={savedRoutes}
                onLoad={handleLoadSavedRoute}
                onDelete={handleDeleteSavedRoute}
                onRename={handleRenameSavedRoute}
                loading={loading}
              />
            </div>
          </div>
        </div>

        <div className="route-analysis-row collapsible-section">
          <div 
            className="collapsible-header"
            onClick={() => setIsAnalysisCollapsed(!isAnalysisCollapsed)}
          >
            <h3>Route Analysis</h3>
            {isAnalysisCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </div>
          <div className={`collapsible-content ${isAnalysisCollapsed ? 'collapsed' : ''}`}>
            <RouteAnalysisSummary 
              data={filteredData}
              residentialOnly={residentialOnly}
              onResidentialOnlyChange={setResidentialOnly}
              selectedData={selectedData}
              onOptimize={handleOptimize}
              activeTarget={lastOptimizationTarget}
            />
          </div>
        </div>

        <section className="routes-table-card collapsible-section">
          <div 
            className="collapsible-header routes-table-header"
            onClick={() => setIsRoutesTableCollapsed(!isRoutesTableCollapsed)}
          >
            <div>
              <h2>Routes</h2>
              <p className="routes-table-subtitle">
                {filteredData.length.toLocaleString()} routes imported · {selectedData.length.toLocaleString()} selected
              </p>
            </div>
            <div className="routes-table-actions-wrapper">
              {!isRoutesTableCollapsed && (
                <div className="routes-table-actions" onClick={(e) => e.stopPropagation()}>
                <div className="print-button-wrapper" ref={printConfigRef}>
                  <button
                    type="button"
                    onClick={handlePrintConfigToggle}
                    disabled={selectedData.length === 0}
                    className={`saved-action-button saved-action-print ${showPrintConfig ? 'active' : ''}`}
                  >
                    <Printer size={14} />
                    Print summary
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
                  onClick={copySelectedToClipboard}
                  disabled={selectedData.length === 0}
                  className="saved-action-button saved-action-copy"
                >
                  <span role="img" aria-label="copy">📋</span>
                  Copy selected
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoute}
                  disabled={selectedData.length === 0}
                  className="saved-action-button saved-action-save"
                >
                  <Save size={14} />
                  Save route
                </button>
                </div>
              )}
              {isRoutesTableCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>
          </div>
          <div className={`collapsible-content ${isRoutesTableCollapsed ? 'collapsed' : ''}`}>
            <div className="routes-table-body">
              <DataTable 
                data={filteredData}
                selectedRoutes={selectedRoutes}
                onRouteToggle={handleRouteToggle}
                onSelectAll={handleSelectAll}
                onBatchChange={handleBatchChange}
              />
            </div>
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
              <p className="print-stat-label">Age 30-65</p>
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
                {printColumns.age && <th>Age %</th>}
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
    </PageLayout>
  )
}

export default Routes;

