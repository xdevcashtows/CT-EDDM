import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, Download, Info } from 'lucide-react';
import { extractRoutesFromPDF, generateFacingSlips } from '../utils/pdfProcessor';

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

  // Handle PDF upload
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

  // Handle CSV upload
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
    maxSize: 10485760, // 10MB
    multiple: false
  });

  const { getRootProps: getCsvRootProps, getInputProps: getCsvInputProps } = useDropzone({
    onDrop: onCsvDrop,
    accept: { 'text/csv': ['.csv'] },
    maxSize: 1048576, // 1MB
    multiple: false
  });

  const removeCsv = () => {
    setCsvFile(null);
    setDndAddresses([]);
    setShowDndPreview(false);
  };

  const handleGenerate = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF file');
      return;
    }
    if (!mailingDate) {
      setError('Please select a mailing date');
      return;
    }
    if (!routes || routes.length === 0) {
      setError('No route data found in PDF');
      return;
    }

    try {
      setStatus('processing');
      setError(null);

      // Merge DND addresses with routes if provided
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Process EDDM Routes</h1>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Upload EDDM PDF Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload EDDM PDF</h2>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Important: Upload the Combined USPS EDDM Form
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                You need to upload the combined PDF file from your USPS EDDM Order Confirmation page.
              </p>
              <p className="text-sm text-blue-800">
                <strong>Step 1:</strong> Go to your USPS EDDM Order Confirmation page<br />
                <strong>Step 2:</strong> Click the <span className="bg-blue-100 px-2 py-1 rounded font-medium">"Print All Forms"</span> button<br />
                <strong>Step 3:</strong> Save the combined PDF file that downloads<br />
                <strong>Step 4:</strong> Upload that combined PDF file here
              </p>
            </div>
          </div>
        </div>

        <div
          {...getPdfRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            pdfFile ? 'border-green-500 bg-green-50' : 'border-gray-300'
          }`}
        >
          <input {...getPdfInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-600 mb-2">
            {pdfFile ? `File loaded: ${pdfFile.name}` : 'Upload your combined EDDM PDF file'}
          </p>
          <p className="text-sm text-gray-500">
            {pdfFile ? 'Click or drag to replace' : 'Click or drag & drop the combined PDF file from "Print All Forms"'}
          </p>
        </div>

        {/* Extracted Routes Table */}
        {routes.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Extracted Routes ({routes.length})
            </h3>
            <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="pb-2">ZIP Code</th>
                    <th className="pb-2">Route</th>
                    <th className="pb-2 text-right">Mailpieces</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route, idx) => (
                    <tr key={idx} className="border-t border-gray-200">
                      <td className="py-2">{route.zipCode}</td>
                      <td className="py-2">{route.routeNumber}</td>
                      <td className="py-2 text-right">{route.mailpieces}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Do Not Deliver Addresses Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Do Not Deliver Addresses (Optional)
        </h2>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">CSV Format Required</h3>
              <p className="text-sm text-blue-800 mb-2">
                Upload a CSV file with columns: ZIP, ROUTE, DND ADDRESS
              </p>
              <p className="text-sm text-blue-800">
                <strong>Example:</strong><br />
                33156,R004,813 Morningbird Dr<br />
                33156,C014,429 Hollybrook Lane
              </p>
            </div>
          </div>
        </div>

        {csvFile ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800">
                  {csvFile.name} ({dndAddresses.length} addresses loaded)
                </span>
              </div>
              <button
                onClick={removeCsv}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {showDndPreview && dndAddresses.length > 0 && (
              <div className="mt-4">
                <div className="max-h-48 overflow-y-auto bg-white rounded border p-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="pb-1">ZIP</th>
                        <th className="pb-1">Route</th>
                        <th className="pb-1">Address</th>
                        <th className="pb-1 text-center">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dndAddresses.map((dnd, idx) => {
                        const matches = routes.some(
                          r => r.zipCode === dnd.zip && r.routeNumber === dnd.route
                        );
                        return (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="py-1">{dnd.zip}</td>
                            <td className="py-1">{dnd.route}</td>
                            <td className="py-1">{dnd.address}</td>
                            <td className="py-1 text-center">
                              {matches ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-red-600">✗</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    {(() => {
                      const matchCount = dndAddresses.filter(dnd =>
                        routes.some(r => r.zipCode === dnd.zip && r.routeNumber === dnd.route)
                      ).length;
                      const totalCount = dndAddresses.length;

                      if (matchCount === 0) {
                        return (
                          <div className="text-red-700">
                            <strong>No matching routes found.</strong> None of the DND addresses match the extracted routes from your PDF.
                          </div>
                        );
                      } else if (matchCount === totalCount) {
                        return (
                          <div className="text-green-700">
                            <strong>All addresses matched!</strong> {matchCount} of {totalCount} DND addresses will be added to facing slips.
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-yellow-700">
                            <strong>Partial match:</strong> {matchCount} of {totalCount} DND addresses match extracted routes. Only matching addresses will be added to facing slips.
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            {...getCsvRootProps()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-blue-400"
          >
            <input {...getCsvInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
            <p className="text-lg text-gray-600 mb-2">
              Upload CSV file with Do Not Deliver addresses
            </p>
            <p className="text-sm text-gray-500">
              Click or drag & drop your CSV file here (optional)
            </p>
          </div>
        )}
      </div>

      {/* Mailing Date Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mailing Date</h2>
        <input
          type="date"
          value={mailingDate}
          onChange={(e) => setMailingDate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleGenerate}
          disabled={!pdfFile || !mailingDate || routes.length === 0}
          className={`mt-4 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
            !pdfFile || !mailingDate || routes.length === 0
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <FileText className="w-5 h-5 mr-2" />
          Generate Facing Slips
        </button>
      </div>

      {/* Generated Facing Slips Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Facing Slips</h2>

        {status === 'processing' && (
          <div className="flex items-center justify-center p-8">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mr-3" />
            <span className="text-lg text-gray-600">Generating facing slips...</span>
          </div>
        )}

        {stats && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Total Routes</div>
              <div className="text-xl font-semibold text-gray-900">
                {formatNumber(stats.totalRoutes)}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Total Facing Slips</div>
              <div className="text-xl font-semibold text-gray-900">
                {formatNumber(stats.totalFacingSlips)}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Total Mailpieces</div>
              <div className="text-xl font-semibold text-gray-900">
                {formatNumber(stats.totalMailpieces)}
              </div>
            </div>
          </div>
        )}

        {generatedPdf && (
          <div className="flex items-center justify-center">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Facing Slips PDF
            </button>
          </div>
        )}

        {!generatedPdf && status === 'idle' && (
          <p className="text-center text-gray-500 p-8">
            Upload a PDF file and select a mailing date to generate facing slips
          </p>
        )}
      </div>
    </div>
  );
}

