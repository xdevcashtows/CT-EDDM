# Cash Tows EDDM - EDDM Table Copier

A Chrome extension that provides a popup interface for copying EDDM route table data to your clipboard on the USPS EDDM website.

## Features

- Draggable popup interface that appears on the EDDM page
- **Copy All Routes** - Copies all routes from the table
- **Copy Checked Routes** - Copies only the routes you've selected with checkboxes
- Tab-separated format output (automatically parses into columns in Excel, Google Sheets, etc.)
- Visual notifications when data is copied
- Drag the popup to move it anywhere on the page

## Installation

1. Download or clone this repository to your computer
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the folder containing this extension
6. The extension is now installed!

## Usage

1. Navigate to the USPS EDDM page: https://eddm.usps.com/eddm/select-routes.htm
2. A popup will appear on the page (you can drag it to move it around)
3. Enter a zip code and click "Search" to load route data
4. Click **"Copy All Routes"** to copy all routes, or **"Copy Checked Routes"** to copy only selected routes
5. You'll see a notification confirming the copy
6. Paste the data into Excel, Google Sheets, or any spreadsheet application (Ctrl+V or Cmd+V)

## How It Works

The extension adds a draggable popup to the EDDM page with two buttons:
- **Copy All Routes**: Extracts all route data from the table, formats it as tab-separated values, and copies to clipboard
- **Copy Checked Routes**: Only extracts routes that have been checked/selected, formats as tab-separated values, and copies to clipboard

The popup can be dragged anywhere on the page for your convenience.

## File Structure

```
CT EDDM extension/
├── manifest.json      # Extension configuration
├── content.js         # Main script that monitors and copies table data
├── README.md          # This file
└── icon*.png          # Extension icons (optional)
```

## Notes

- The extension only works on the USPS EDDM select-routes page
- Data is copied in tab-separated format, which automatically splits into columns when pasted into Excel, Google Sheets, etc.
- The notification will disappear after 2.5 seconds
- The extension runs automatically - no need to click anything!

## Troubleshooting

- If the table isn't being copied, make sure you're on the correct page: `https://eddm.usps.com/eddm/select-routes.htm`
- Try refreshing the page if the extension doesn't seem to be working
- Check that the table has actually loaded with data (not just empty rows)

## License

Free to use and modify as needed.

