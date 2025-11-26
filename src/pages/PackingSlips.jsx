import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, Download, Info } from 'lucide-react';
import { extractRoutesFromPDF, generateFacingSlips } from '../utils/pdfProcessor';
import PageLayout from '../components/PageLayout';
import './PackingSlips.css';

export default function PackingSlips() {
  const [pdfFile, setPdfFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [mailingDate, setMailingDate] = useState('');
  const [routes, setRoutes] = useState([]);
  const [dndAddresses, setDndAddresses] = useState([]);
  const [showDndPreview, setShowDndPreview] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, extracting, processing, complete, error
  const [error, setError] = useState(null);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [stats, setStats] = useState(null);

  const layoutProps = {
    title: 'Facing Slip Generator',
    subtitle: 'Upload USPS EDDM exports, merge Do Not Deliver addresses, and process facing slips.',
    tip: 'Start with the USPS combined PDF before adding CSV DND data.'
  };

  const onPdfDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError(null);
      setGeneratedPdf(null);

      try {
        setStatus('extracting');
        const extractedData = await extractRoutesFromPDF(file);
        setRoutes(extractedData.routes);
        setStatus('idle');
      } catch (err) {
        setError('Failed to extract route data from PDF');
        setStatus('error');
        console.error(err);
      }
    } else {
      setError('Please upload a PDF file');
    }
  }, []);

  const onCsvDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      setCsvFile(file);
      try {
        const text = await file.text();
        const parsed = parseCSV(text);
        setDndAddresses(parsed);
        setShowDndPreview(true);
      } catch (err) {
        setError('Failed to parse CSV file');
        console.error(err);
      }
    } else {
      setError('Please upload a CSV file');
    }
  }, []);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const addresses = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        addresses.push({
          zip: parts[0],
          route: parts[1],
          address: parts[2]
        });
      }
    }
    
    return addresses;
  };

  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps } = useDropzone({
    onDrop: onPdfDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10485760,
    multiple: false
  });

  const { getRootProps: getCsvRootProps, getInputProps: getCsvInputProps } = useDropzone({
    onDrop: onCsvDrop,
    accept: { 'text/csv': ['.csv'] },
    maxSize: 1048576,
    multiple: false
  });

  const removeCsv = () => {
    setCsvFile(null);
    setDndAddresses([]);
    setShowDndPreview(false);
  };

  const handleGenerate = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF file before generating facing slips.');
      return;
    }
    if (!mailingDate) {
      setError('Please select a mailing date.');
      return;
    }
    if (!routes || routes.length === 0) {
      setError('No route data was detected in the uploaded PDF.');
      return;
    }

    try {
      setStatus('processing');
      setError(null);

      let processedRoutes = routes;
      if (dndAddresses.length > 0) {
        const matchingAddresses = dndAddresses.filter(dnd =>
          routes.some(r => r.zipCode === dnd.zip && r.routeNumber === dnd.route)
        );
        
        if (matchingAddresses.length > 0) {
          processedRoutes = routes.map(route => {
            const routeDndAddresses = matchingAddresses
              .filter(dnd => dnd.zip === route.zipCode && dnd.route === route.routeNumber)
              .map(dnd => dnd.address);
            
            return {
              ...route,
              doNotDeliverAddresses: routeDndAddresses
            };
          });
        }
      }

      const result = await generateFacingSlips(processedRoutes, pdfFile, mailingDate);
      
      setGeneratedPdf(result.pdfBlob);
      setStats({
        totalRoutes: processedRoutes.length,
        totalFacingSlips: result.totalFacingSlips,
        totalMailpieces: result.totalMailpieces
      });
      setStatus('complete');
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to generate facing slips');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (generatedPdf) {
      const url = URL.createObjectURL(generatedPdf);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facing-slips-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatNumber = (num) => num.toLocaleString();

  return (
    <PageLayout {...layoutProps} className="page-shell--fullwidth">
      <div className="packing-page">
        {error && (
          <div className="status-banner error">
            <XCircle className="icon" />
            <p>{error}</p>
          </div>
        )}

        <div className="upload-grid">
          <section className="upload-card">
            <div className="card-heading">
              <div>
                <p className="card-eyebrow">EDDM PDF</p>
                <h2>Upload the combined USPS export</h2>
              </div>
              <span className="badge badge-required">Required</span>
            </div>
            <p className="card-subtext">Follow these steps to upload the combined USPS export:</p>
            <ol className="pdf-steps">
              <li>
                <span>Step 1:</span> Go to your USPS EDDM Order Confirmation page
              </li>
              <li>
                <span>Step 2:</span> Click the <strong>"Print All Forms"</strong> button
              </li>
              <li>
                <span>Step 3:</span> Save the combined PDF file that downloads
              </li>
              <li>
                <span>Step 4:</span> Upload that combined PDF file here
              </li>
            </ol>
            <div
              {...getPdfRootProps()}
              className={`dropzone ${pdfFile ? 'filled' : ''}`}
            >
              <input {...getPdfInputProps()} />
              <Upload className="dropzone-icon" />
              <div className="dropzone-text">
                <p className="bold">{pdfFile ? `Loaded: ${pdfFile.name}` : 'Drop your combined PDF here'}</p>
                <p>{pdfFile ? 'Click to replace' : 'Support: Drag & drop or browse'}</p>
              </div>
            </div>

            {routes.length > 0 && (
              <div className="route-list">
                <div className="route-list-header">
                  <p>Extracted routes ({routes.length})</p>
                  <span className="pill">{routes.length} routes</span>
                </div>
                <div className="route-list-body">
                  <table>
                    <thead>
                      <tr>
                        <th>ZIP</th>
                        <th>Route</th>
                        <th className="text-right">Mailpieces</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map((route, idx) => (
                        <tr key={idx}>
                          <td>{route.zipCode}</td>
                          <td>{route.routeNumber}</td>
                          <td className="text-right">{route.mailpieces}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="upload-card dnd-card">
            <div className="card-heading">
              <div>
                <p className="card-eyebrow">Do Not Deliver Addresses</p>
                <h2>Merge optional DND CSV</h2>
              </div>
              <span className="badge badge-optional">Optional</span>
            </div>
            <p className="card-subtext">
              CSV must include columns: <strong>ZIP, ROUTE, DND ADDRESS</strong>.
            </p>

            {csvFile ? (
              <div className="csv-loaded">
                <div className="csv-loaded-top">
                  <CheckCircle className="icon" />
                  <div>
                    <p className="bold">{csvFile.name}</p>
                    <p>{dndAddresses.length} addresses parsed</p>
                  </div>
                  <button onClick={removeCsv} className="text-link">
                    <XCircle className="icon" />
                  </button>
                </div>

                {showDndPreview && dndAddresses.length > 0 && (
                  <div className="dnd-preview">
                    <div className="dnd-preview-table">
                      <table>
                        <thead>
                          <tr>
                            <th>ZIP</th>
                            <th>Route</th>
                            <th>Address</th>
                            <th>Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dndAddresses.map((dnd, idx) => {
                            const matches = routes.some(
                              r => r.zipCode === dnd.zip && r.routeNumber === dnd.route
                            );
                            return (
                              <tr key={idx}>
                                <td>{dnd.zip}</td>
                                <td>{dnd.route}</td>
                                <td>{dnd.address}</td>
                                <td className="text-center">{matches ? '✓' : '✗'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="dnd-preview-helper">
                      {(() => {
                        const matchCount = dndAddresses.filter(dnd =>
                          routes.some(r => r.zipCode === dnd.zip && r.routeNumber === dnd.route)
                        ).length;
                        const totalCount = dndAddresses.length;

                        if (matchCount === 0) {
                          return <p className="text-error"><strong>No matches.</strong> None of the DND addresses align with the extracted routes.</p>;
                        } else if (matchCount === totalCount) {
                          return <p className="text-success"><strong>All matched.</strong> {matchCount} addresses will be excluded.</p>;
                        }
                        return <p className="text-warning"><strong>Partial match.</strong> {matchCount} of {totalCount} addresses were matched.</p>;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                {...getCsvRootProps()}
                className="dropzone csv-dropzone"
              >
                <input {...getCsvInputProps()} />
                <Upload className="dropzone-icon" />
                <div className="dropzone-text">
                  <p className="bold">Upload CSV DND file</p>
                  <p>ZIP, ROUTE, DND ADDRESS (optional)</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="generate-grid">
          <div className="control-card">
            <p className="card-eyebrow">Mailing Date</p>
            <h3>Select when your mail should go out</h3>
            <input
              type="date"
              value={mailingDate}
              onChange={(e) => setMailingDate(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              disabled={!pdfFile || !mailingDate || routes.length === 0}
            >
              <FileText className="icon" />
              Generate Facing Slips
            </button>
            <p className="helper-text">
              You need a PDF upload, mailing date, and extracted routes to enable generation.
            </p>
          </div>

          <div className="status-card">
            <div className="status-card-header">
              <Info className="icon" />
              <p>Status</p>
            </div>
            {status === 'processing' && (
              <div className="status-body">
                <Loader className="loader" />
                <p>Generating facing slips...</p>
              </div>
            )}
            {status === 'complete' && stats && (
              <div className="status-body">
                <p className="text-success">Completed! {formatNumber(stats.totalFacingSlips)} slips ready.</p>
                <p className="text-muted">Total mailpieces: {formatNumber(stats.totalMailpieces)}</p>
              </div>
            )}
            {status === 'idle' && (
              <p className="status-idle">
                Upload the required files and select a mailing date to enable generation.
              </p>
            )}
            {generatedPdf && (
              <button onClick={handleDownload} className="download-btn">
                <Download className="icon" />
                Download Facing Slips PDF
              </button>
            )}
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <p>Total Routes</p>
            <strong>{stats ? formatNumber(stats.totalRoutes) : '—'}</strong>
          </div>
          <div className="stat-card">
            <p>Total Facing Slips</p>
            <strong>{stats ? formatNumber(stats.totalFacingSlips) : '—'}</strong>
          </div>
          <div className="stat-card">
            <p>Total Mailpieces</p>
            <strong>{stats ? formatNumber(stats.totalMailpieces) : '—'}</strong>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

