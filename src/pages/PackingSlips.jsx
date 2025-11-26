import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, Download, Info, ChevronUp } from 'lucide-react';
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
  const [calloutOpen, setCalloutOpen] = useState(false);

  const layoutProps = {
    title: 'Facing Slip Generator',
    subtitle: 'Upload USPS EDDM exports, merge Do Not Deliver addresses, and process facing slips.'
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

  const statusPanelData = (() => {
    if (status === 'processing') {
      return {
        statusType: 'processing',
        icon: <Loader className="loader status-icon" />,
        messages: [{ text: 'Generating facing slips...' }]
      };
    }

    if (status === 'complete') {
      return {
        statusType: 'complete',
        icon: <CheckCircle className="status-icon success" />,
        messages: stats ? [
          {
            text: `Completed! ${formatNumber(stats.totalFacingSlips)} slips ready.`,
            className: 'text-success'
          },
          {
            text: `Total mailpieces: ${formatNumber(stats.totalMailpieces)}`,
            className: 'text-muted'
          }
        ] : [
          {
            text: 'Facing slips ready.',
            className: 'text-success'
          }
        ]
      };
    }

    if (status === 'error') {
      return {
        statusType: 'error',
        icon: <XCircle className="status-icon error" />,
        messages: [{ text: error || 'Failed to generate facing slips', className: 'text-error' }]
      };
    }

    return {
      statusType: 'idle',
      icon: <Info className="status-icon" />,
      messages: [
        {
          text: 'Upload required files and select mailing date to enable generation.',
          className: 'status-idle-text'
        }
      ]
    };
  })();

  return (
    <PageLayout {...layoutProps} className="page-shell--fullwidth">
      <div className="packing-page">
        {error && (
        <div className="status-banner error">
            <XCircle className="icon" />
            <p>{error}</p>
          </div>
        )}

        <div className="usage-callout" data-open={calloutOpen}>
          <div className="usage-callout-header">
            <div>
              <p className="callout-eyebrow">How to use this tool</p>
              <p className="callout-description">
                Start with the USPS combined PDF before adding CSV DND data.
              </p>
            </div>
            <button
              type="button"
              className="callout-toggle"
              onClick={() => setCalloutOpen(prev => !prev)}
              aria-expanded={calloutOpen}
              aria-label={calloutOpen ? 'Collapse instructions' : 'Expand instructions'}
            >
              <ChevronUp className="callout-icon" />
            </button>
          </div>
          {calloutOpen && (
            <ol className="callout-steps">
              <li>Go to your USPS EDDM Order Confirmation page</li>
              <li>Click the "Print" button then "All Forms"</li>
              <li>Save the combined PDF file that downloads</li>
              <li>Upload that combined PDF file here</li>
            </ol>
          )}
        </div>

        <div className="packing-card-grid">
          <section className="upload-card pdf-card">
            <div className="card-heading">
              <div>
                <p className="card-eyebrow">EDDM PDF</p>
                <h2>Upload combined USPS export</h2>
              </div>
              <span className="badge badge-required">Required</span>
            </div>
            <p className="card-subtext">PDF format</p>
            <div
              {...getPdfRootProps()}
              className={`dropzone ${pdfFile ? 'filled' : ''}`}
            >
              <input {...getPdfInputProps()} />
              <Upload className="dropzone-icon" />
              <div className="dropzone-text">
                <p className="bold">{pdfFile ? `Loaded: ${pdfFile.name}` : 'Drop file or click'}</p>
                <p>{pdfFile ? 'Click to replace' : 'PDF format only'}</p>
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
                <p className="card-eyebrow">DND ADDRESSES</p>
                <h2>Merge optional DND CSV</h2>
              </div>
              <span className="badge badge-optional">Optional</span>
            </div>
            <p className="card-subtext">
              ZIP, ROUTE, DND ADDRESS
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

          <section className="upload-card mailing-card">
            <div className="card-heading">
              <div>
                <p className="card-eyebrow">Mailing Date</p>
                <h3>Select mail date</h3>
              </div>
            </div>
            <input
              type="date"
              value={mailingDate}
              onChange={(e) => setMailingDate(e.target.value)}
              className="date-input"
            />
            <button
              onClick={handleGenerate}
              disabled={!pdfFile || !mailingDate || routes.length === 0}
              className="generate-btn"
            >
              <FileText className="icon" />
              Generate Facing Slips
            </button>
            <p className="helper-text">
              You need a PDF upload, mailing date, and extracted routes to enable generation.
            </p>
          </section>
        </div>

        <div className="status-row">
          <div className={`status-panel ${statusPanelData.statusType}`}>
            <div className="status-panel-leading">
              {statusPanelData.icon}
              <div className="status-panel-texts">
                {statusPanelData.messages.map((message, idx) => (
                  <p key={idx} className={`status-panel-line ${message.className || ''}`}>
                    {message.text}
                  </p>
                ))}
              </div>
            </div>
            {generatedPdf && (
              <button onClick={handleDownload} className="download-btn compact">
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

