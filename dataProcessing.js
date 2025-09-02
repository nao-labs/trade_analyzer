// Import-Time Filter System - Updated dataProcessing.js

let allTrades = [];
let dailyData = {};
let availableFiles = [];
let importFilters = {
    instrumentType: 'all' // 'all', 'options', 'stocks'
};

// Enhanced file input for multiple files with import filters
function initializeFileHandling() {
    console.log('Initializing file handling with import filters...');
    
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.innerHTML = `
        <input type="file" id="csvFile" accept=".csv" style="display: none;">
        <input type="file" id="multipleFiles" accept=".csv" multiple style="display: none;">
        <input type="file" id="folderInput" webkitdirectory style="display: none;">
        
        <h3>📈 Upload Your Trading Data</h3>
        <p>Choose your data and filter options:</p>
        
        <!-- Import Filter Options -->
        <div class="import-filters">
            <h4>Import Filter</h4>
            <div class="filter-options">
                <label class="filter-option">
                    <input type="radio" name="importFilter" value="all" checked onchange="updateImportFilter()">
                    <span class="filter-label">📊 All Trades</span>
                    <span class="filter-description">Import all trades (stocks + options)</span>
                </label>
                <label class="filter-option">
                    <input type="radio" name="importFilter" value="options" onchange="updateImportFilter()">
                    <span class="filter-label">📈 Options Only</span>
                    <span class="filter-description">Import only options trades</span>
                </label>
                <label class="filter-option">
                    <input type="radio" name="importFilter" value="stocks" onchange="updateImportFilter()">
                    <span class="filter-label">📉 Stocks Only</span>
                    <span class="filter-description">Import only stock trades</span>
                </label>
            </div>
        </div>
        
        <div class="upload-options">
            <button class="upload-btn" onclick="document.getElementById('csvFile').click()">
                📄 Single CSV File
            </button>
            <button class="upload-btn" onclick="document.getElementById('multipleFiles').click()">
                📊 Multiple CSV Files
            </button>
            <button class="upload-btn" onclick="document.getElementById('folderInput').click()">
                📁 Select Data Folder
            </button>
        </div>
        
        <div class="upload-drop-zone" id="dropZone">
            <p>Or drag & drop files/folders here</p>
            <div class="current-filter-display" id="currentFilterDisplay">
                Current filter: <strong>All Trades</strong>
            </div>
        </div>
        
        <div id="filePreview" class="file-preview" style="display: none;">
            <h4>Found Files:</h4>
            <div id="fileList"></div>
        </div>
    `;
    
    // Add styles for the import filters
    addImportFilterStyles();
    
    // Set up event listeners
    document.getElementById('csvFile').addEventListener('change', handleSingleFile);
    document.getElementById('multipleFiles').addEventListener('change', handleMultipleFiles);
    document.getElementById('folderInput').addEventListener('change', handleFolderInput);
    
    // Enhanced drag and drop
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    dropZone.addEventListener('dragleave', handleDragLeave);
}

function addImportFilterStyles() {
    if (!document.getElementById('importFilterStyles')) {
        const style = document.createElement('style');
        style.id = 'importFilterStyles';
        style.textContent = `
            .import-filters {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 20px;
                margin: 20px 0;
                border: 2px solid #e9ecef;
            }
            
            body.dark-mode .import-filters {
                background: #4a5568;
                border-color: #718096;
            }
            
            .import-filters h4 {
                margin: 0 0 15px 0;
                color: #2c3e50;
                font-size: 1.1em;
                font-weight: 700;
            }
            
            body.dark-mode .import-filters h4 {
                color: #e2e8f0;
            }
            
            .filter-options {
                display: grid;
                gap: 12px;
            }
            
            .filter-option {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 15px;
                background: white;
                border-radius: 10px;
                border: 2px solid #e9ecef;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .filter-option:hover {
                border-color: #667eea;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
            }
            
            .filter-option input[type="radio"] {
                margin: 0;
                transform: scale(1.2);
                accent-color: #667eea;
            }
            
            .filter-option input[type="radio"]:checked + .filter-label {
                color: #667eea;
                font-weight: 700;
            }
            
            body.dark-mode .filter-option {
                background: #2d3748;
                border-color: #718096;
            }
            
            body.dark-mode .filter-option:hover {
                border-color: #667eea;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            }
            
            .filter-label {
                font-weight: 600;
                color: #2c3e50;
                font-size: 1.05em;
                flex-shrink: 0;
                min-width: 120px;
            }
            
            body.dark-mode .filter-label {
                color: #e2e8f0;
            }
            
            .filter-description {
                color: #6c757d;
                font-size: 0.9em;
                line-height: 1.4;
            }
            
            body.dark-mode .filter-description {
                color: #a0aec0;
            }
            
            .current-filter-display {
                margin-top: 15px;
                padding: 10px;
                background: rgba(102, 126, 234, 0.1);
                border-radius: 8px;
                text-align: center;
                color: #667eea;
                font-weight: 600;
                font-size: 0.9em;
            }
            
            body.dark-mode .current-filter-display {
                background: rgba(102, 126, 234, 0.2);
            }
            
            .upload-options {
                display: flex;
                gap: 15px;
                margin: 20px 0;
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .upload-options .upload-btn {
                flex: 1;
                min-width: 150px;
                max-width: 200px;
            }
            
            .upload-drop-zone {
                border: 2px dashed #ccc;
                border-radius: 10px;
                padding: 30px;
                margin: 20px 0;
                text-align: center;
                color: #666;
                transition: all 0.3s ease;
            }
            
            .upload-drop-zone.dragover {
                border-color: #667eea;
                background: #f0f3ff;
                color: #667eea;
            }
            
            body.dark-mode .upload-drop-zone {
                border-color: #718096;
                color: #a0aec0;
            }
            
            body.dark-mode .upload-drop-zone.dragover {
                border-color: #667eea;
                background: #4a5568;
            }
            
            .file-preview {
                margin-top: 20px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
            }
            
            body.dark-mode .file-preview {
                background: #4a5568;
            }
            
            .file-item {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 12px;
                margin: 8px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .file-item:hover {
                border-color: #667eea;
                background: #f0f3ff;
            }
            
            body.dark-mode .file-item {
                background: #2d3748;
                border-color: #718096;
            }
            
            body.dark-mode .file-item:hover {
                background: #4a5568;
                border-color: #667eea;
            }
            
            .file-name {
                font-weight: 600;
                color: #2c3e50;
            }
            
            body.dark-mode .file-name {
                color: #e2e8f0;
            }
            
            .file-details {
                font-size: 0.9em;
                color: #6c757d;
            }
            
            body.dark-mode .file-details {
                color: #a0aec0;
            }
            
            .load-file-btn {
                background: #28a745;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 0.9em;
                font-weight: 600;
            }
            
            .load-file-btn:hover {
                background: #218838;
            }
            
            #uploadNewDataBtn {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                padding: 10px 20px;
                font-size: 0.9em;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            
            #uploadNewDataBtn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .filter-status-indicator {
                position: fixed;
                top: 70px;
                right: 20px;
                z-index: 999;
                padding: 8px 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 20px;
                font-size: 0.85em;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            
            @media (max-width: 768px) {
                .filter-options {
                    gap: 8px;
                }
                
                .filter-option {
                    padding: 12px;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                
                .filter-label {
                    min-width: auto;
                }
                
                .upload-options {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .upload-options .upload-btn {
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function updateImportFilter() {
    const selected = document.querySelector('input[name="importFilter"]:checked');
    importFilters.instrumentType = selected ? selected.value : 'all';
    
    // Update the display
    const display = document.getElementById('currentFilterDisplay');
    if (display) {
        const filterLabels = {
            'all': 'All Trades',
            'options': 'Options Only', 
            'stocks': 'Stocks Only'
        };
        display.innerHTML = `Current filter: <strong>${filterLabels[importFilters.instrumentType]}</strong>`;
    }
    
    console.log('Import filter updated:', importFilters.instrumentType);
}

function isOptionTrade(trade) {
    const instrumentType = (trade.Instrument_Type || '').toLowerCase();
    const positionName = (trade.Position_Name || '').toLowerCase();
    const contractName = (trade.Contract_Name || '').toLowerCase();
    const description = (trade.Description || '').toLowerCase();
    
    // Check various indicators for options
    return instrumentType.includes('option') || 
           instrumentType.includes('call') || 
           instrumentType.includes('put') ||
           positionName.includes('call') ||
           positionName.includes('put') ||
           contractName.includes('call') ||
           contractName.includes('put') ||
           description.includes('call') ||
           description.includes('put') ||
           // Check for option-like symbols (e.g., AAPL240315C150)
           /[A-Z]+\d{6}[CP]\d+/.test(trade.Symbol || '') ||
           // Check for expiration date patterns
           positionName.includes('exp') ||
           contractName.includes('exp');
}

function shouldIncludeTrade(trade) {
    if (importFilters.instrumentType === 'all') {
        return true;
    } else if (importFilters.instrumentType === 'options') {
        return isOptionTrade(trade);
    } else if (importFilters.instrumentType === 'stocks') {
        return !isOptionTrade(trade);
    }
    return true;
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        alert('CSV file appears to be empty or invalid');
        return;
    }
    
    const headers = parseCSVLine(lines[0]);
    allTrades = [];
    let totalTrades = 0;
    let filteredOut = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= headers.length - 2) {
            const trade = {};
            
            headers.forEach((header, index) => {
                const value = values[index] || '';
                
                if (['Total_Profit', 'Position_Size_USD', 'Return_Pct', 'Holding_Hours', 'Holding_Days'].includes(header)) {
                    trade[header] = parseFloat(value) || 0;
                } else {
                    trade[header] = value;
                }
            });
            
            if (trade.Symbol && (trade.Close_Time || trade.Open_Time)) {
                totalTrades++;
                
                // Apply import filter
                if (shouldIncludeTrade(trade)) {
                    allTrades.push(trade);
                } else {
                    filteredOut++;
                }
            }
        }
    }
    
    console.log(`Loaded ${allTrades.length} trades (filtered out ${filteredOut} trades, ${totalTrades} total)`);
    
    // Add filter status indicator
    addFilterStatusIndicator();
    
    analyzeData();
    displayDashboard();
}

function addFilterStatusIndicator() {
    // Remove existing indicator
    const existing = document.getElementById('filterStatusIndicator');
    if (existing) {
        existing.remove();
    }
    
    // Only show indicator if filtering is active
    if (importFilters.instrumentType !== 'all') {
        const indicator = document.createElement('div');
        indicator.id = 'filterStatusIndicator';
        indicator.className = 'filter-status-indicator';
        
        const filterLabels = {
            'options': 'Options Only',
            'stocks': 'Stocks Only'
        };
        
        indicator.textContent = `Filter: ${filterLabels[importFilters.instrumentType]}`;
        document.body.appendChild(indicator);
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Rest of the existing functions remain the same...
function handleSingleFile(e) {
    const file = e.target.files[0];
    if (file) {
        console.log('Single file selected:', file.name);
        processFile(file);
    }
}

function handleMultipleFiles(e) {
    const files = Array.from(e.target.files);
    console.log('Multiple files selected:', files.map(f => f.name));
    handleFileList(files);
}

function handleFolderInput(e) {
    const files = Array.from(e.target.files);
    console.log('Folder selected, files found:', files.map(f => f.name));
    handleFileList(files);
}

function handleFileList(files) {
    const tradeFiles = files.filter(file => 
        file.name.startsWith('trade_analysis') && file.name.endsWith('.csv')
    );
    
    if (tradeFiles.length === 0) {
        const csvFiles = files.filter(file => file.name.endsWith('.csv'));
        if (csvFiles.length === 0) {
            alert('No CSV files found. Please select files that contain your trading data.');
            return;
        }
        showFileSelection(csvFiles, 'CSV files found (no trade_analysis files detected)');
    } else if (tradeFiles.length === 1) {
        console.log('Auto-loading single trade_analysis file:', tradeFiles[0].name);
        processFile(tradeFiles[0]);
    } else {
        showFileSelection(tradeFiles, 'Multiple trade_analysis files found');
    }
}

function showFileSelection(files, title) {
    const filePreview = document.getElementById('filePreview');
    const fileList = document.getElementById('fileList');
    
    filePreview.style.display = 'block';
    filePreview.querySelector('h4').textContent = title;
    
    fileList.innerHTML = files.map((file, index) => `
        <div class="file-item">
            <div>
                <div class="file-name">${file.name}</div>
                <div class="file-details">
                    Size: ${(file.size / 1024).toFixed(1)} KB | 
                    Modified: ${new Date(file.lastModified).toLocaleDateString()}
                </div>
            </div>
            <button class="load-file-btn" onclick="loadSelectedFile(${index})">
                Load This File
            </button>
        </div>
    `).join('');
    
    window.selectedFiles = files;
}

function loadSelectedFile(index) {
    const file = window.selectedFiles[index];
    console.log('Loading selected file:', file.name);
    processFile(file);
}

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('dropZone').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('dropZone').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropZone').classList.remove('dragover');
    
    const files = [];
    
    if (e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            const item = e.dataTransfer.items[i];
            if (item.kind === 'file') {
                const file = item.getAsFile();
                files.push(file);
            }
        }
    } else {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
            files.push(e.dataTransfer.files[i]);
        }
    }
    
    console.log('Files dropped:', files.map(f => f.name));
    
    if (files.length === 1) {
        processFile(files[0]);
    } else if (files.length > 1) {
        handleFileList(files);
    }
}

function analyzeData() {
    dailyData = {};
    
    allTrades.forEach(trade => {
        const tradeDate = trade.Close_Time || trade.Open_Time;
        if (!tradeDate) return;
        
        const date = new Date(tradeDate);
        if (isNaN(date.getTime())) return;
        
        const dateKey = date.toISOString().split('T')[0];
        
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                date: dateKey,
                pnl: 0,
                trades: 0,
                wins: 0,
                losses: 0,
                tradesList: []
            };
        }
        
        dailyData[dateKey].pnl += trade.Total_Profit || 0;
        dailyData[dateKey].trades++;
        dailyData[dateKey].tradesList.push(trade);
        
        if (trade.Win_Loss === 'Win') dailyData[dateKey].wins++;
        if (trade.Win_Loss === 'Loss') dailyData[dateKey].losses++;
    });
    
    console.log(`Analyzed ${Object.keys(dailyData).length} trading days`);
}

function hideUploadElements() {
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.add('hidden');
    }
    
    const header = document.querySelector('.header');
    if (header) {
        header.classList.add('hidden');
    }
    
    console.log('Upload elements hidden after data load');
}

function showUploadElements() {
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.remove('hidden');
    }
    
    const header = document.querySelector('.header');
    if (header) {
        header.classList.remove('hidden');
    }
    
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'none';
    }
    
    const uploadBtn = document.getElementById('uploadNewDataBtn');
    if (uploadBtn) {
        uploadBtn.remove();
    }
    
    const filterIndicator = document.getElementById('filterStatusIndicator');
    if (filterIndicator) {
        filterIndicator.remove();
    }
    
    // Reset data
    allTrades = [];
    dailyData = {};
    importFilters.instrumentType = 'all';
    
    console.log('Upload elements shown for new data upload');
}

function addUploadNewDataButton() {
    if (!document.getElementById('uploadNewDataBtn') && allTrades.length > 0) {
        const uploadBtn = document.createElement('button');
        uploadBtn.id = 'uploadNewDataBtn';
        uploadBtn.textContent = '📁 Upload New Data';
        uploadBtn.onclick = showUploadElements;
        
        document.body.appendChild(uploadBtn);
    }
}

function displayDashboard() {
    hideUploadElements();
    addUploadNewDataButton();
    
    document.getElementById('dashboard').style.display = 'block';
    
    displayMetrics();
    updateCalendarSort();
    displayAllTrades();
}

function displayMetrics() {
    const totalPnL = allTrades.reduce((sum, trade) => sum + (trade.Total_Profit || 0), 0);
    const winners = allTrades.filter(t => t.Win_Loss === 'Win').length;
    const losers = allTrades.filter(t => t.Win_Loss === 'Loss').length;
    const winRate = winners + losers > 0 ? (winners / (winners + losers) * 100) : 0;
    
    const avgWin = winners > 0 ? 
        allTrades.filter(t => t.Win_Loss === 'Win').reduce((sum, t) => sum + (t.Total_Profit || 0), 0) / winners : 0;
    const avgLoss = losers > 0 ? 
        Math.abs(allTrades.filter(t => t.Win_Loss === 'Loss').reduce((sum, t) => sum + (t.Total_Profit || 0), 0) / losers) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    document.getElementById('metricsRow').innerHTML = `
        <div class="metric-card">
            <div class="metric-value ${totalPnL >= 0 ? 'positive' : 'negative'}">
                $${Math.round(totalPnL).toLocaleString()}
            </div>
            <div class="metric-label">Total P&L</div>
        </div>
        <div class="metric-card">
            <div class="metric-value neutral">${allTrades.length}</div>
            <div class="metric-label">Total Trades</div>
        </div>
        <div class="metric-card">
            <div class="metric-value ${winRate >= 50 ? 'positive' : winRate >= 40 ? 'neutral' : 'negative'}">
                ${winRate.toFixed(1)}%
            </div>
            <div class="metric-label">Win Rate</div>
        </div>
        <div class="metric-card">
            <div class="metric-value ${profitFactor >= 1.5 ? 'positive' : profitFactor >= 1 ? 'neutral' : 'negative'}">
                ${profitFactor.toFixed(2)}
            </div>
            <div class="metric-label">Profit Factor</div>
        </div>
        <div class="metric-card">
            <div class="metric-value positive">$${Math.round(avgWin).toLocaleString()}</div>
            <div class="metric-label">Average Win</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">$${Math.round(avgLoss).toLocaleString()}</div>
            <div class="metric-label">Average Loss</div>
        </div>
    `;
}

function processFile(file) {
    console.log(`Processing file: ${file.name}`);
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            parseCSV(e.target.result);
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file. Please check the format and try again.');
            hideLoading();
        }
    };
    reader.readAsText(file);
}

function showLoading() {
    const calendarStatus = document.getElementById('calendarStatus');
    const tradesStatus = document.getElementById('tradesStatus');
    
    if (calendarStatus) {
        calendarStatus.innerHTML = '<div class="spinner"></div>Processing your data...';
    }
    if (tradesStatus) {
        tradesStatus.innerHTML = '<div class="spinner"></div>Analyzing trades...';
    }
}

function hideLoading() {
    document.getElementById('dashboard').style.display = 'none';
}

// Make functions globally available
window.updateImportFilter = updateImportFilter;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing file handling with import filters...');
    initializeFileHandling();
});