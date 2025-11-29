// Cash Tows EDDM - EDDM Table Copier
// Popup interface for copying route table data

(function() {
    'use strict';

    let popup = null;
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;

    // Create notification
    function showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.className = 'cteddm-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isError ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.25), 0 4px 8px rgba(0,0,0,0.15);
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            font-size: 14px;
            font-weight: 600;
            animation: notificationSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            align-items: center;
            gap: 10px;
            backdrop-filter: blur(10px);
        `;
        notification.innerHTML = `
            <span style="font-size: 18px;">${isError ? '✕' : '✓'}</span>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'notificationSlideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes notificationSlideIn {
            from {
                transform: translateX(400px) scale(0.8);
                opacity: 0;
            }
            to {
                transform: translateX(0) scale(1);
                opacity: 1;
            }
        }
        @keyframes notificationSlideOut {
            from {
                transform: translateX(0) scale(1);
                opacity: 1;
            }
            to {
                transform: translateX(400px) scale(0.8);
                opacity: 0;
            }
        }
        @keyframes popupFadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        @keyframes buttonPulse {
            0%, 100% {
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            50% {
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
            }
        }
        .cteddm-popup {
            position: fixed;
            top: 100px;
            right: 20px;
            width: 280px;
            background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 
                        0 8px 24px rgba(0, 0, 0, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.9);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Oxygen, Ubuntu, Cantarell, sans-serif;
            user-select: none;
            animation: popupFadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            border: 1px solid rgba(255, 255, 255, 0.8);
            overflow: hidden;
        }
        .cteddm-popup::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
        }
        .cteddm-popup-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 18px 20px;
            cursor: move;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            color: white;
        }
        .cteddm-popup-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        }
        .cteddm-popup-title-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        .cteddm-popup-icon {
            width: 24px;
            height: 24px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            backdrop-filter: blur(10px);
        }
        .cteddm-popup-title {
            font-size: 15px;
            font-weight: 700;
            color: white;
            letter-spacing: -0.3px;
        }
        .cteddm-popup-subtitle {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
            margin-top: 2px;
        }
        .cteddm-popup-drag-hint {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .cteddm-popup-body {
            padding: 20px;
            background: #ffffff;
        }
        .cteddm-button {
            width: 100%;
            padding: 14px 20px;
            margin-bottom: 12px;
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            letter-spacing: -0.2px;
        }
        .cteddm-button::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        .cteddm-button:hover::before {
            width: 300px;
            height: 300px;
        }
        .cteddm-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }
        .cteddm-button:active {
            transform: translateY(0);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .cteddm-button:last-child {
            margin-bottom: 0;
        }
        .cteddm-button-icon {
            font-size: 18px;
            position: relative;
            z-index: 1;
        }
        .cteddm-button-text {
            position: relative;
            z-index: 1;
        }
        .cteddm-button-blue {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
        .cteddm-button-blue:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.5);
        }
        .cteddm-button-green {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        .cteddm-button-green:hover {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.5);
        }
        .cteddm-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
    `;
    document.head.appendChild(style);

    // Extract table data and format as TSV (tab-separated)
    function extractTableData(onlyChecked = false) {
        const table = document.querySelector('table.target-audience-table');
        if (!table) {
            return null;
        }

        const rows = table.querySelectorAll('tbody tr.list-items');
        
        // Check if table has actual data
        let hasData = false;
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
                hasData = true;
            }
        });

        if (!hasData) {
            return null;
        }

        // Extract headers
        const headers = [];
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
            const headerCells = headerRow.querySelectorAll('th');
            headerCells.forEach((th, index) => {
                // Skip the checkbox column (first column)
                if (index === 0) return;
                
                const link = th.querySelector('a');
                if (link) {
                    let text = link.textContent.trim();
                    text = text.replace(/\s+/g, ' ').trim();
                    // Only add non-empty headers
                    if (text) {
                        headers.push(text);
                    }
                } else {
                    const text = th.textContent.trim();
                    if (text) {
                        headers.push(text);
                    }
                }
            });
        }

        const expectedColumnCount = headers.length;
        
        // Safety check: if no headers found, can't extract data properly
        if (expectedColumnCount === 0) {
            return null;
        }

        // Extract data rows
        const dataRows = [];
        rows.forEach(row => {
            // If onlyChecked is true, check if the checkbox is checked
            if (onlyChecked) {
                const checkbox = row.querySelector('input[type="checkbox"].routeChex');
                if (!checkbox || !checkbox.checked) {
                    return; // Skip unchecked rows
                }
            }

            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
                const rowData = [];
                let cellIndex = 0;
                
                cells.forEach((cell, index) => {
                    // Skip the checkbox column (first column)
                    if (index === 0) return;
                    
                    // Only extract as many columns as we have headers
                    if (cellIndex >= expectedColumnCount) return;
                    
                    const p = cell.querySelector('p');
                    let text = p ? p.textContent.trim() : cell.textContent.trim();
                    
                    // For TSV, replace tabs and newlines with spaces to avoid breaking the format
                    text = text.replace(/\t/g, ' ').replace(/\n/g, ' ');
                    
                    // Check if this is the Income column and convert "k" suffix to full number
                    const currentHeader = headers[cellIndex];
                    if (currentHeader && currentHeader.toLowerCase().includes('income')) {
                        // Convert "$53.12k" to "$53,120" format
                        // Handle various formats: "$53.12k", "53.12k", "$53.12K", etc.
                        const kMatch = text.match(/^\$?\s*([\d,]+\.?\d*)\s*k$/i);
                        if (kMatch) {
                            const cleanedNum = kMatch[1].replace(/,/g, '');
                            const numValue = parseFloat(cleanedNum);
                            // Check if parseFloat succeeded (not NaN)
                            if (!isNaN(numValue) && isFinite(numValue)) {
                                const fullValue = numValue * 1000;
                                // Format with commas: $53,120
                                text = '$' + fullValue.toLocaleString('en-US', { 
                                    minimumFractionDigits: 0, 
                                    maximumFractionDigits: 0 
                                });
                            }
                            // If parseFloat failed, leave text as-is
                        }
                    }
                    
                    rowData.push(text);
                    
                    cellIndex++;
                });
                
                // Ensure rowData matches header count (pad with empty strings if needed, but don't exceed)
                while (rowData.length < expectedColumnCount) {
                    rowData.push('');
                }
                
                // Trim to exact header count (remove any extra columns)
                if (rowData.length > expectedColumnCount) {
                    rowData.splice(expectedColumnCount);
                }
                
                if (rowData.length > 0) {
                    dataRows.push(rowData);
                }
            }
        });

        if (dataRows.length === 0) {
            return null;
        }

        // Combine headers and rows
        const dataRowsFormatted = [headers, ...dataRows];
        
        // Convert to TSV format (tab-separated) for better spreadsheet compatibility
        const tsv = dataRowsFormatted.map(row => row.join('\t')).join('\n');
        
        return tsv;
    }

    // Copy text to clipboard
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    // Copy all routes
    function copyAllRoutes() {
        const tableData = extractTableData(false);
        if (!tableData) {
            showNotification('No route data found', true);
            return;
        }

        copyToClipboard(tableData).then(success => {
            if (success) {
                const rowCount = tableData.split('\n').length - 1;
                showNotification(`✓ Copied ${rowCount} route${rowCount !== 1 ? 's' : ''}!`);
            } else {
                showNotification('✗ Failed to copy', true);
            }
        });
    }

    // Copy checked routes
    function copyCheckedRoutes() {
        const tableData = extractTableData(true);
        if (!tableData) {
            showNotification('No checked routes found', true);
            return;
        }

        copyToClipboard(tableData).then(success => {
            if (success) {
                const rowCount = tableData.split('\n').length - 1;
                showNotification(`✓ Copied ${rowCount} checked route${rowCount !== 1 ? 's' : ''}!`);
            } else {
                showNotification('✗ Failed to copy', true);
            }
        });
    }

    // Drag functionality
    function dragMouseDown(e) {
        e.preventDefault();
        initialX = e.clientX;
        initialY = e.clientY;
        isDragging = true;
        document.addEventListener('mousemove', dragMouseMove);
        document.addEventListener('mouseup', dragMouseUp);
    }

    function dragMouseMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        currentX = initialX - e.clientX;
        currentY = initialY - e.clientY;
        initialX = e.clientX;
        initialY = e.clientY;
        
        const rect = popup.getBoundingClientRect();
        let newTop = rect.top - currentY;
        let newLeft = rect.left - currentX;
        
        // Keep popup within viewport
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
        
        popup.style.top = newTop + 'px';
        popup.style.right = 'auto';
        popup.style.left = newLeft + 'px';
    }

    function dragMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', dragMouseMove);
        document.removeEventListener('mouseup', dragMouseUp);
    }

    // Create popup
    function createPopup() {
        if (popup) {
            return; // Popup already exists
        }

        popup = document.createElement('div');
        popup.className = 'cteddm-popup';
        popup.innerHTML = `
            <div class="cteddm-popup-header">
                <div class="cteddm-popup-title-wrapper">
                    <div class="cteddm-popup-icon">📋</div>
                    <div>
                        <div class="cteddm-popup-title">Cash Tows EDDM</div>
                        <div class="cteddm-popup-subtitle">Route Data Copier</div>
                    </div>
                </div>
                <div class="cteddm-popup-drag-hint">
                    <span>⋮⋮</span>
                </div>
            </div>
            <div class="cteddm-popup-body">
                <button class="cteddm-button cteddm-button-blue" id="copy-all-btn">
                    <span class="cteddm-button-icon">📄</span>
                    <span class="cteddm-button-text">Copy All Routes</span>
                </button>
                <button class="cteddm-button cteddm-button-green" id="copy-checked-btn">
                    <span class="cteddm-button-icon">✓</span>
                    <span class="cteddm-button-text">Copy Checked Routes</span>
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        // Add drag functionality to header
        const header = popup.querySelector('.cteddm-popup-header');
        header.addEventListener('mousedown', dragMouseDown);

        // Add button event listeners
        document.getElementById('copy-all-btn').addEventListener('click', copyAllRoutes);
        document.getElementById('copy-checked-btn').addEventListener('click', copyCheckedRoutes);
    }

    // Initialize popup when page loads
    function init() {
        // Wait a bit for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(createPopup, 1000);
            });
        } else {
            setTimeout(createPopup, 1000);
        }
    }

    init();

})();
