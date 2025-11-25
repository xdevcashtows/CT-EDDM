import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract route data from USPS EDDM PDF
 * @param {File} file - The PDF file to extract from
 * @returns {Promise<{routes: Array, routeSets: Array}>}
 */
export async function extractRoutesFromPDF(file) {
  try {
    console.log('Starting PDF extraction...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('File loaded into array buffer');

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`PDF loaded, total pages: ${pdf.numPages}`);

    if (pdf.numPages < 3) {
      throw new Error('PDF must have at least 3 pages. Route data should start on page 3.');
    }

    const routes = [];
    const routeSets = [];
    let pageNum = 3;

    while (pageNum <= pdf.numPages) {
      console.log(`Processing page ${pageNum} for routes`);
      const page = await pdf.getPage(pageNum);
      const { routes: pageRoutes, format, foundAtIndex } = await extractRoutesFromPage(page);

      if (pageRoutes.length > 0) {
        console.log(`Found ${pageRoutes.length} routes on page ${pageNum}`);
        routes.push(...pageRoutes);
        routeSets.push({
          routes: pageRoutes,
          startPage: pageNum,
          format: format,
          foundAtIndex: foundAtIndex
        });

        const routeCount = pageRoutes.length;
        pageNum += routeCount + 1;

        if (pageNum + 1 <= pdf.numPages) {
          pageNum += 1;
          console.log(`Skipping to next potential route listing at page ${pageNum}`);
        }
      } else {
        pageNum++;
      }
    }

    console.log('Route sets:', routeSets);
    console.log('All extracted routes:', routes);

    if (routes.length === 0) {
      throw new Error('No valid route data found in the PDF. Please ensure the PDF contains route lists in the correct format.');
    }

    return { routes, routeSets };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw error;
  }
}

/**
 * Extract routes from a single PDF page
 * @param {PDFPageProxy} page - The PDF page to extract from
 * @returns {Promise<{routes: Array, format: string, foundAtIndex: number}>}
 */
async function extractRoutesFromPage(page) {
  const textContent = await page.getTextContent();
  const items = textContent.items;

  // Look for route listing indicators
  const routes = [];
  let format = 'standard';
  let foundAtIndex = -1;

  // Search for "ZIP Code" header which indicates route listing
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = item.str.trim();

    if (text === 'ZIP Code' || text === 'Zip Code') {
      foundAtIndex = i;
      format = 'standard';
      break;
    }
  }

  // Alternative format check
  if (foundAtIndex === -1) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const text = item.str.trim();
      
      if (text.includes('Route') && i + 2 < items.length) {
        const nextText = items[i + 1].str.trim();
        if (nextText === 'Mailpieces' || nextText.includes('Pieces')) {
          foundAtIndex = i;
          format = 'alternative';
          break;
        }
      }
    }
  }

  if (foundAtIndex === -1) {
    return { routes: [], format: 'standard', foundAtIndex: -1 };
  }

  // Extract route data starting after the header
  let dataStartIndex = foundAtIndex + 3; // Skip header row
  
  for (let i = dataStartIndex; i < items.length - 2; i++) {
    const zipText = items[i].str.trim();
    const routeText = items[i + 1]?.str.trim();
    const mailpiecesText = items[i + 2]?.str.trim();

    // Check if this looks like a valid route entry
    if (zipText && /^\d{5}$/.test(zipText) && routeText && mailpiecesText) {
      const mailpieces = parseInt(mailpiecesText.replace(/,/g, ''), 10);
      
      if (!isNaN(mailpieces) && mailpieces > 0) {
        routes.push({
          zipCode: zipText,
          routeNumber: routeText,
          mailpieces: mailpieces
        });
        i += 2; // Skip the items we just processed
      }
    }
  }

  return { routes, format, foundAtIndex };
}

/**
 * Generate facing slips PDF from routes
 * @param {Array} routes - Array of route objects
 * @param {File} originalPdf - The original USPS PDF file
 * @param {string} mailingDate - The mailing date in YYYY-MM-DD format
 * @returns {Promise<{pdfBlob: Blob, totalFacingSlips: number, totalMailpieces: number}>}
 */
export async function generateFacingSlips(routes, originalPdf, mailingDate) {
  try {
    // Parse the date
    const [year, month, day] = mailingDate.split('-');
    const formattedDate = `${month}/${day}/${year}`;

    // Load the original PDF
    const arrayBuffer = await originalPdf.arrayBuffer();
    const originalPdfDoc = await PDFDocument.load(arrayBuffer);

    // Create a new PDF for the output
    const outputPdf = await PDFDocument.create();
    const font = await outputPdf.embedFont(StandardFonts.HelveticaBold);

    // Calculate total facing slips and mailpieces
    let totalFacingSlips = 0;
    let totalMailpieces = 0;

    routes.forEach(route => {
      totalMailpieces += route.mailpieces;
      const fullSlips = Math.floor(route.mailpieces / 100);
      const remainder = route.mailpieces % 100;
      totalFacingSlips += remainder > 0 ? fullSlips + 1 : fullSlips;
    });

    // Copy the first 2 pages from the original PDF (cover pages)
    const coverPages = await outputPdf.copyPages(originalPdfDoc, [0, 1]);
    coverPages.forEach(page => outputPdf.addPage(page));

    // Process each route
    for (const route of routes) {
      const fullSlips = Math.floor(route.mailpieces / 100);
      const remainder = route.mailpieces % 100;
      const slipCount = remainder > 0 ? fullSlips + 1 : fullSlips;

      // For each facing slip needed for this route
      for (let slipNum = 1; slipNum <= slipCount; slipNum++) {
        // Determine the number of mailpieces for this slip
        const mailpiecesOnSlip = slipNum === slipCount && remainder > 0 ? remainder : 100;

        // Create a new page (or copy from template if available)
        // For simplicity, we'll create a blank page and add text
        const page = outputPdf.addPage([612, 792]); // Letter size
        const { height } = page.getSize();

        // Draw the mailing date
        page.drawText(formattedDate, {
          x: inches(0.625),
          y: height - inches(3),
          size: 28,
          font: font,
          color: rgb(0, 0, 0)
        });

        // Draw the mailpiece count
        page.drawText(mailpiecesOnSlip.toString(), {
          x: inches(3.25),
          y: height - inches(3),
          size: 28,
          font: font,
          color: rgb(0, 0, 0)
        });

        // Draw the slip number
        page.drawText(slipNum.toString(), {
          x: inches(5.25),
          y: height - inches(3.2),
          size: 36,
          font: font,
          color: rgb(0, 0, 0)
        });

        // Draw route information
        page.drawText(`ZIP: ${route.zipCode}`, {
          x: inches(0.5),
          y: height - inches(4),
          size: 12,
          font: font,
          color: rgb(0, 0, 0)
        });

        page.drawText(`Route: ${route.routeNumber}`, {
          x: inches(0.5),
          y: height - inches(4.3),
          size: 12,
          font: font,
          color: rgb(0, 0, 0)
        });

        // Draw Do Not Deliver addresses if present
        if (route.doNotDeliverAddresses && route.doNotDeliverAddresses.length > 0) {
          await drawDoNotDeliverAddresses(page, route.doNotDeliverAddresses);
        }
      }
    }

    // Save the PDF
    const pdfBytes = await outputPdf.save();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      pdfBlob,
      totalFacingSlips,
      totalMailpieces
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}

/**
 * Draw Do Not Deliver addresses on a page
 * @param {PDFPage} page - The PDF page to draw on
 * @param {Array<string>} addresses - Array of addresses
 */
async function drawDoNotDeliverAddresses(page, addresses) {
  const { height } = page.getSize();
  const leftColumnX = inches(0.5);
  const rightColumnX = inches(4.25);
  const startY = height - inches(5.7);
  const lineHeight = 21;
  const maxAddresses = Math.min(addresses.length, 22);

  for (let i = 0; i < maxAddresses; i++) {
    const isLeftColumn = i < 11;
    const rowInColumn = i % 11;
    const x = isLeftColumn ? leftColumnX : rightColumnX;
    const y = startY - (rowInColumn * lineHeight);
    
    // Truncate long addresses
    const address = addresses[i].length > 35 
      ? addresses[i].substring(0, 32) + '...' 
      : addresses[i];

    page.drawText(address, {
      x: x,
      y: y,
      size: 8,
      color: rgb(0, 0, 0)
    });
  }
}

/**
 * Convert inches to points (72 points per inch)
 * @param {number} inches - Number of inches
 * @returns {number} Points
 */
function inches(inches) {
  return inches * 72;
}

/**
 * Merge Do Not Deliver addresses into routes
 * @param {Array} routes - Array of route objects
 * @param {Array} dndAddresses - Array of DND address objects
 * @returns {Array} Routes with DND addresses merged
 */
export function mergeDoNotDeliverAddresses(routes, dndAddresses) {
  return routes.map(route => {
    const routeDndAddresses = dndAddresses
      .filter(dnd => dnd.zip === route.zipCode && dnd.route === route.routeNumber)
      .map(dnd => dnd.address);

    return {
      ...route,
      doNotDeliverAddresses: routeDndAddresses
    };
  });
}

