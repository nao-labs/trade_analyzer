let allTrades = [];
let dailyData = {};
let availableFiles = [];

// Enhanced file input for multiple files
function initializeFileHandling() {
    console.log('🚀 Initializing browser-compatible file handling...');
    
    // Update the upload area to support multiple files and directory selection
    const uploadArea = document.getElementById('uploadArea');
    const originalHTML = uploadArea.innerHTML;
    
    uploadArea.innerHTML = `
        <input type="file" id="csvFile" accept=".csv" style="display: none;">
        <input type="file" id="multipleFiles" accept=".csv" multiple style="display: none;">
        <input type="file" id="folderInput" webkitdirectory style="display: none;">
        
        <h3>📈 Upload Your Trading Data</h3>
        <p>Choose how you want to load your data:</p>
        
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
        </div>
        
        <div id="filePreview" class="file-preview" style="display: none;">
            <h4>Found Files:</h4>
            <div id="fileList"></div>
        </div>
    `;
    
    // Add styles for the new upload options
    if (!document.getElementById('uploadOptionsStyles')) {
        const style = document.createElement('style');
        style.id = 'uploadOptionsStyles';
        style.textContent = `
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
                padding: 5px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 0.9em;
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
        `;
        document.head.appendChild(style);
    }
    
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

function handleSingleFile(e) {
    const file = e.target.files[0];
    if (file) {
        console.log('📄 Single file selected:', file.name);
        processFile(file);
    }
}

function handleMultipleFiles(e) {
    const files = Array.from(e.target.files);
    console.log('📊 Multiple files selected:', files.map(f => f.name));
    handleFileList(files);
}

function handleFolderInput(e) {
    const files = Array.from(e.target.files);
    console.log('📁 Folder selected, files found:', files.map(f => f.name));
    handleFileList(files);
}

function handleFileList(files) {
    // Filter for CSV files that start with 'trade_analysis'
    const tradeFiles = files.filter(file => 
        file.name.startsWith('trade_analysis') && file.name.endsWith('.csv')
    );
    
    if (tradeFiles.length === 0) {
        // If no trade_analysis files, show all CSV files
        const csvFiles = files.filter(file => file.name.endsWith('.csv'));
        if (csvFiles.length === 0) {
            alert('No CSV files found. Please select files that contain your trading data.');
            return;
        }
        showFileSelection(csvFiles, 'CSV files found (no trade_analysis files detected)');
    } else if (tradeFiles.length === 1) {
        // Auto-load single trade_analysis file
        console.log('🚀 Auto-loading single trade_analysis file:', tradeFiles[0].name);
        processFile(tradeFiles[0]);
    } else {
        // Show selection for multiple trade_analysis files
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
    
    // Store files globally for access by loadSelectedFile
    window.selectedFiles = files;
}

function loadSelectedFile(index) {
    const file = window.selectedFiles[index];
    console.log('📂 Loading selected file:', file.name);
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
        // Handle items (supports folders in some browsers)
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            const item = e.dataTransfer.items[i];
            if (item.kind === 'file') {
                const file = item.getAsFile();
                files.push(file);
            }
        }
    } else {
        // Handle files
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
            files.push(e.dataTransfer.files[i]);
        }
    }
    
    console.log('📁 Files dropped:', files.map(f => f.name));
    
    if (files.length === 1) {
        processFile(files[0]);
    } else if (files.length > 1) {
        handleFileList(files);
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        alert('CSV file appears to be empty or invalid');
        return;
    }
    
    const headers = parseCSVLine(lines[0]);
    allTrades = [];
    
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
                allTrades.push(trade);
            }
        }
    }
    
    console.log(`✅ Loaded ${allTrades.length} trades`);
    analyzeData();
    displayDashboard();
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
    
    console.log(`📊 Analyzed ${Object.keys(dailyData).length} trading days`);
}

// Hide upload elements after data is loaded
function hideUploadElements() {
    // Hide the upload area
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.add('hidden');
    }
    
    // Hide the header
    const header = document.querySelector('.header');
    if (header) {
        header.classList.add('hidden');
    }
    
    console.log('✅ Upload elements hidden after data load');
}

// Show upload elements again (useful for "Upload New Data" functionality)
function showUploadElements() {
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.remove('hidden');
    }
    
    const header = document.querySelector('.header');
    if (header) {
        header.classList.remove('hidden');
    }
    
    // Hide dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'none';
    }
    
    // Remove upload new data button
    const uploadBtn = document.getElementById('uploadNewDataBtn');
    if (uploadBtn) {
        uploadBtn.remove();
    }
    
    // Reset data
    allTrades = [];
    dailyData = {};
    
    console.log('✅ Upload elements shown for new data upload');
}

// Add a "Upload New Data" button to the dashboard
function addUploadNewDataButton() {
    // Only add if it doesn't exist and we have data
    if (!document.getElementById('uploadNewDataBtn') && allTrades.length > 0) {
        const uploadBtn = document.createElement('button');
        uploadBtn.id = 'uploadNewDataBtn';
        uploadBtn.textContent = '📁 Upload New Data';
        uploadBtn.onclick = showUploadElements;
        
        document.body.appendChild(uploadBtn);
    }
}

function displayDashboard() {
    // Hide upload elements when dashboard is shown
    hideUploadElements();
    
    // Add upload new data button
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
    console.log(`📂 Processing file: ${file.name}`);
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            parseCSV(e.target.result);
        } catch (error) {
            console.error('❌ Error processing file:', error);
            alert('Error processing file. Please check the format and try again.');
            hideLoading();
        }
    };
    reader.readAsText(file);
}

function showLoading() {
    document.getElementById('calendarStatus').innerHTML = '<div class="spinner"></div>Processing your data...';
    document.getElementById('tradesStatus').innerHTML = '<div class="spinner"></div>Analyzing trades...';
}

function hideLoading() {
    document.getElementById('dashboard').style.display = 'none';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing browser-compatible file handling...');
    initializeFileHandling();
});