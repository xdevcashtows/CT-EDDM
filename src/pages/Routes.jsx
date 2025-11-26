import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Printer, Save } from 'lucide-react';
import './Routes.css';
import ImportPanel from '../components/ImportPanel';
import RouteAnalysisSummary from '../components/RouteAnalysisSummary';
import DataTable from '../components/DataTable';
import SavedRoutes from '../components/SavedRoutes';
import { optimizeRoutes } from '../utils/optimizeRoutes';
import { profiles as profilesAPI, savedRoutes as savedRoutesAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PageLayout from '../components/PageLayout';

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
    const { data, error } = await savedRoutesAPI.getAll(user.id);
    if (!error && data) {
      setSavedRoutes(data);
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

  const handlePrintSummary = () => {
    if (selectedData.length === 0) return;
    printTimestampRef.current = new Date().toLocaleString();
    window.print();
  };

  const printSummaryStats = useMemo(() => {
    const residential = selectedData.reduce((sum, route) => sum + (route.residential || 0), 0);
    const business = selectedData.reduce((sum, route) => sum + (route.business || 0), 0);
    const households = selectedData.reduce((sum, route) => sum + (route.total || 0), 0);
    const totalCost = selectedData.reduce((sum, route) => sum + (parseFloat(route.cost) || 0), 0);
    const totalRoutes = selectedData.length;
    const avgCost = totalRoutes ? totalCost / totalRoutes : 0;
    const avgHouseholds = totalRoutes ? households / totalRoutes : 0;
    const totalSize = selectedData.reduce((sum, route) => sum + (route.size || 0), 0);
    const totalIncome = selectedData.reduce((sum, route) => sum + (route.income || 0), 0);
    const avgSize = totalRoutes ? totalSize / totalRoutes : 0;
    const avgIncome = totalRoutes ? totalIncome / totalRoutes : 0;
    const mix = residential + business;
    const residentialShare = mix ? (residential / mix) * 100 : 0;
    const batchTotals = selectedData.reduce(
      (acc, route) => {
        const batchKey = route.batchNumber;
        if (batchKey >= 1 && batchKey <= 3) {
          acc[batchKey].routes += 1;
          acc[batchKey].pieces += route.total || 0;
        } else {
          acc.unassigned.routes += 1;
          acc.unassigned.pieces += route.total || 0;
        }
        return acc;
      },
      {
        1: { routes: 0, pieces: 0 },
        2: { routes: 0, pieces: 0 },
        3: { routes: 0, pieces: 0 },
        unassigned: { routes: 0, pieces: 0 }
      }
    );

    return {
      totalRoutes,
      residential,
      business,
      households,
      totalCost,
      avgCost,
      avgHouseholds,
      avgSize,
      avgIncome,
      residentialShare,
      batchTotals
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
          <div className="routes-import-card">
            <ImportPanel onProcessData={handleProcessData} />
          </div>

          <div className="routes-top-card">
            <SavedRoutes 
              routes={savedRoutes}
              onLoad={handleLoadSavedRoute}
              onDelete={handleDeleteSavedRoute}
              onRename={handleRenameSavedRoute}
              loading={loading}
            />
          </div>
        </div>

        <div className="route-analysis-row">
          <RouteAnalysisSummary 
            data={filteredData}
            residentialOnly={residentialOnly}
            onResidentialOnlyChange={setResidentialOnly}
            selectedData={selectedData}
            onOptimize={handleOptimize}
            activeTarget={lastOptimizationTarget}
          />
        </div>

        <section className="routes-table-card">
          <div className="routes-table-header">
            <div>
              <h2>Routes</h2>
              <p className="routes-table-subtitle">
                {filteredData.length.toLocaleString()} routes imported · {selectedData.length.toLocaleString()} selected
              </p>
            </div>
              <div className="routes-table-actions">
                <button
                  type="button"
                  onClick={handlePrintSummary}
                  disabled={selectedData.length === 0}
                  className="saved-action-button saved-action-print"
                >
                  <Printer size={14} />
                  Print summary
                </button>
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
        <div className="print-summary-grid">
          <div className="print-summary-stat">
            <p className="print-stat-label">Routes selected</p>
            <p className="print-stat-value">{printSummaryStats.totalRoutes.toLocaleString()}</p>
          </div>
          <div className="print-summary-stat">
            <p className="print-stat-label">Households (total)</p>
            <p className="print-stat-value">{printSummaryStats.households.toLocaleString()}</p>
          </div>
          <div className="print-summary-stat">
            <p className="print-stat-label">Total cost</p>
            <p className="print-stat-value">${printSummaryStats.totalCost.toFixed(2)}</p>
          </div>
          <div className="print-summary-stat">
            <p className="print-stat-label">Avg. households</p>
            <p className="print-stat-value">{printSummaryStats.avgHouseholds.toFixed(1)}</p>
          </div>
          <div className="print-summary-stat">
            <p className="print-stat-label">Avg. cost</p>
            <p className="print-stat-value">${printSummaryStats.avgCost.toFixed(2)}</p>
          </div>
          <div className="print-summary-stat">
            <p className="print-stat-label">Avg. size</p>
            <p className="print-stat-value">{printSummaryStats.avgSize.toFixed(2)}</p>
          </div>
          <div className="print-summary-stat">
            <p className="print-stat-label">Avg. income</p>
            <p className="print-stat-value">${Math.round(printSummaryStats.avgIncome)}</p>
          </div>
          <div className="print-summary-stat">
            <p className="print-stat-label">Residential share</p>
            <p className="print-stat-value">
              {printSummaryStats.residentialShare ? `${printSummaryStats.residentialShare.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
        <div className="print-summary-batches">
          <div className="print-summary-batch-heading">
            <p className="print-stat-label">Batch breakdown</p>
            <p className="print-summary-subtitle">Routes grouped by batch assignment</p>
          </div>
          <div className="print-summary-batch-grid">
            {Object.entries(printSummaryStats.batchTotals).map(([batchKey, batch]) => (
              <div key={batchKey} className="print-batch-card">
                <p className="print-batch-label">
                  {batchKey === 'unassigned' ? 'Unassigned' : `Batch ${batchKey}`}
                </p>
                <p className="print-batch-value">{batch.pieces.toLocaleString()} pcs</p>
                <p className="print-batch-sub">{batch.routes} routes</p>
              </div>
            ))}
          </div>
        </div>
        <div className="print-summary-table-wrapper">
          <table className="print-summary-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Residential</th>
                <th>Business</th>
                <th>Total</th>
                <th>Cost</th>
                <th>Size</th>
                <th>Income</th>
                <th>Batch</th>
              </tr>
            </thead>
            <tbody>
              {selectedData.map(route => (
                <tr key={route.id}>
                  <td>{route.route || 'Unknown'}</td>
                  <td>{(route.residential || 0).toLocaleString()}</td>
                  <td>{(route.business || 0).toLocaleString()}</td>
                  <td>{(route.total || 0).toLocaleString()}</td>
                  <td>${(parseFloat(route.cost) || 0).toFixed(2)}</td>
                  <td>{route.size || '—'}</td>
                  <td>{route.income ? `$${route.income.toLocaleString()}` : '—'}</td>
                  <td>{route.batchNumber ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </PageLayout>
  )
}

export default Routes;

