# Packing Slips Feature Documentation

## Overview

The Packing Slips page is a PDF processing tool that automatically extracts route data from USPS EDDM (Every Door Direct Mail) PDFs and generates facing slips with the required information filled in.

## How It Works

### 1. PDF Extraction (No LLM Required)

The system uses **PDF.js** to extract text content from uploaded PDFs:

- **Text Parsing**: Scans the PDF starting from page 3 (where route data typically begins)
- **Pattern Recognition**: Looks for specific headers like "ZIP Code", "Route", and "Mailpieces"
- **Data Extraction**: Extracts route information in a structured format:
  ```javascript
  {
    zipCode: "33156",
    routeNumber: "R004",
    mailpieces: 450
  }
  ```

### 2. PDF Generation

The system uses **pdf-lib** to generate new facing slip PDFs:

- **Template Creation**: Creates new PDF pages with proper formatting
- **Data Insertion**: Writes extracted data at specific coordinates:
  - Mailing date (formatted as MM/DD/YYYY)
  - Mailpiece count per slip (max 100 per slip)
  - Slip number (sequential for each route)
  - Route information (ZIP code and route number)
  - Do Not Deliver addresses (if provided)

### 3. Optional CSV Processing

Users can upload a CSV file with Do Not Deliver addresses:

```csv
ZIP,ROUTE,DND ADDRESS
33156,R004,813 Morningbird Dr
33156,C014,429 Hollybrook Lane
```

The system:
- Parses the CSV file
- Matches addresses to extracted routes
- Adds matching addresses to the facing slips
- Shows a preview with match indicators

## Technical Architecture

### Dependencies

```json
{
  "pdf-lib": "^1.17.1",      // PDF creation and manipulation
  "pdfjs-dist": "latest",     // PDF text extraction
  "react-dropzone": "latest", // File upload UI
  "lucide-react": "latest"    // Icons
}
```

### File Structure

```
src/
├── pages/
│   ├── PackingSlips.jsx      // Main component
│   └── PackingSlips.css       // Styles
├── utils/
│   └── pdfProcessor.js        // PDF extraction & generation logic
```

### Key Functions

#### `extractRoutesFromPDF(file)`
- **Input**: PDF File object
- **Output**: `{ routes: Array, routeSets: Array }`
- **Process**:
  1. Load PDF with PDF.js
  2. Iterate through pages starting at page 3
  3. Extract text content from each page
  4. Search for route listing headers
  5. Parse route data (ZIP, Route Number, Mailpieces)
  6. Return structured route data

#### `generateFacingSlips(routes, originalPdf, mailingDate)`
- **Input**: 
  - `routes`: Array of route objects
  - `originalPdf`: Original USPS PDF file
  - `mailingDate`: Date string (YYYY-MM-DD)
- **Output**: `{ pdfBlob: Blob, totalFacingSlips: number, totalMailpieces: number }`
- **Process**:
  1. Create new PDF document
  2. Copy cover pages from original PDF
  3. For each route:
     - Calculate number of facing slips needed (1 per 100 mailpieces)
     - Create a page for each slip
     - Draw mailing date, mailpiece count, slip number
     - Add route information
     - Add Do Not Deliver addresses if present
  4. Save and return PDF as Blob

## User Workflow

### Step 1: Upload EDDM PDF
1. User goes to USPS EDDM Order Confirmation page
2. Clicks "Print All Forms" button
3. Saves the combined PDF file
4. Uploads to the Packing Slips page

### Step 2: Review Extracted Routes
- System automatically extracts route data
- Displays table showing:
  - ZIP Code
  - Route Number
  - Mailpieces count
- Shows total number of routes found

### Step 3: (Optional) Upload Do Not Deliver CSV
- Upload CSV with addresses to exclude
- System shows preview with match indicators:
  - ✓ Green checkmark = Address matches a route
  - ✗ Red X = Address doesn't match any route
- Summary shows match statistics

### Step 4: Select Mailing Date
- Choose the date for the mailing
- Date will be printed on all facing slips

### Step 5: Generate Facing Slips
- Click "Generate Facing Slips" button
- System processes routes and creates PDF
- Shows statistics:
  - Total Routes
  - Total Facing Slips
  - Total Mailpieces

### Step 6: Download
- Click "Download Facing Slips PDF"
- PDF downloads with filename: `facing-slips-[timestamp].pdf`

## PDF Layout Specifications

### Facing Slip Format

Each facing slip contains:

```
┌─────────────────────────────────────┐
│  [Mailing Date]  [Count]  [Slip #]  │  ← Header (28-36pt bold)
│                                     │
│  ZIP: [ZIP Code]                    │  ← Route Info (12pt)
│  Route: [Route Number]              │
│                                     │
│  Do Not Deliver Addresses:          │  ← DND Section (8pt)
│  [Address 1]      [Address 12]      │  (Two columns,
│  [Address 2]      [Address 13]      │   max 22 addresses)
│  ...              ...                │
└─────────────────────────────────────┘
```

### Coordinate System

- Uses 72 points per inch
- Letter size: 612 x 792 points
- Key positions:
  - Mailing date: (45, height - 216)
  - Mailpiece count: (234, height - 216)
  - Slip number: (378, height - 230)
  - Route info: (36, height - 288)
  - DND addresses: Two columns starting at (36, height - 410)

## Error Handling

The system handles various error cases:

1. **Invalid PDF**: Shows error if PDF doesn't have at least 3 pages
2. **No Routes Found**: Shows error if no route data can be extracted
3. **Invalid CSV**: Shows error if CSV format is incorrect
4. **Missing Date**: Prevents generation if mailing date not selected
5. **Processing Errors**: Catches and displays any processing errors

## Performance Considerations

- **File Size Limits**:
  - PDF: 10MB max
  - CSV: 1MB max
- **Processing Time**: Depends on number of routes (typically 1-5 seconds)
- **Memory**: Processes PDFs in memory (suitable for typical EDDM files)

## Future Enhancements

Possible improvements:
1. Template selection for different facing slip formats
2. Batch processing for multiple PDFs
3. Preview of generated facing slips before download
4. Save/load user preferences
5. Integration with USPS API for validation
6. Print directly from browser

## Troubleshooting

### Common Issues

**Problem**: Routes not extracting correctly
- **Solution**: Ensure PDF is the combined form from USPS "Print All Forms"
- Check that PDF has route listings starting on page 3

**Problem**: DND addresses not showing on slips
- **Solution**: Verify CSV format matches: ZIP,ROUTE,ADDRESS
- Ensure ZIP and Route values match extracted routes exactly

**Problem**: Date not appearing on slips
- **Solution**: Select a date in the date picker before generating

**Problem**: Generated PDF is blank
- **Solution**: Check browser console for errors
- Ensure all dependencies are installed correctly

## Technical Notes

### Why No LLM?

The system doesn't require an LLM because:
1. **Structured Data**: USPS PDFs have consistent formatting
2. **Pattern Matching**: Text extraction and regex are sufficient
3. **Known Coordinates**: Facing slip layout is standardized
4. **Performance**: Direct processing is faster and cheaper
5. **Reliability**: Deterministic results without AI variability

### Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Required Features**: 
  - FileReader API
  - Blob/URL APIs
  - ES6+ JavaScript support

### Security

- All processing happens client-side (in the browser)
- No data is sent to external servers (except for any backend storage you implement)
- PDFs are processed in memory and not stored permanently

## API Reference

### Component Props

The `PackingSlips` component doesn't take any props - it's a standalone page.

### Utility Functions

```javascript
// Extract routes from PDF
extractRoutesFromPDF(file: File): Promise<{
  routes: Array<{
    zipCode: string,
    routeNumber: string,
    mailpieces: number
  }>,
  routeSets: Array
}>

// Generate facing slips
generateFacingSlips(
  routes: Array,
  originalPdf: File,
  mailingDate: string
): Promise<{
  pdfBlob: Blob,
  totalFacingSlips: number,
  totalMailpieces: number
}>

// Merge DND addresses
mergeDoNotDeliverAddresses(
  routes: Array,
  dndAddresses: Array<{
    zip: string,
    route: string,
    address: string
  }>
): Array
```

## License

This feature is part of the Cash Tows EDDM Pro application.

