// Fresh Symbol Analysis Script - symbolAnalysis.js

// Global variables
let selectedSymbol = null;
let symbolsData = {};

// Main function to generate symbol analysis
function generateSymbolAnalysis() {
    console.log('🔄 Starting fresh symbol analysis generation...');
    
    // Check if we have trades data - try multiple possible locations
    const tradesData = window.allTrades || allTrades || [];
    
    if (!Array.isArray(tradesData) || tradesData.length === 0) {
        console.error('❌ No trades data available');
        console.log('Available global variables:', Object.keys(window).filter(key => key.includes('trade') || key.includes('Trade')));
        return;
    }
    
    console.log(`📊 Processing ${tradesData.length} trades...`);
    
    // Reset symbols data
    symbolsData = {};
    selectedSymbol = null;
    
    // Process each trade
    tradesData.forEach((trade, index) => {
        const symbol = trade.Symbol || 'Unknown';
        
        // Initialize symbol data if not exists
        if (!symbolsData[symbol]) {
            symbolsData[symbol] = {
                symbol: symbol,
                trades: [],
                totalPnL: 0,
                totalTrades: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                avgWin: 0,
                avgLoss: 0,
                profitFactor: 0,
                totalVolume: 0,
                instrumentTypes: new Set(),
                mostRecentBuyDate: null,
                oldestBuyDate: null
            };
        }
        
        const symbolInfo = symbolsData[symbol];
        
        // Add trade to symbol
        symbolInfo.trades.push(trade);
        symbolInfo.totalPnL += parseFloat(trade.Total_Profit) || 0;
        symbolInfo.totalTrades++;
        
        // Track buy dates for sorting
        if (trade.Open_Time) {
            const buyDate = new Date(trade.Open_Time);
            if (!isNaN(buyDate.getTime())) {
                if (!symbolInfo.mostRecentBuyDate || buyDate > symbolInfo.mostRecentBuyDate) {
                    symbolInfo.mostRecentBuyDate = buyDate;
                }
                if (!symbolInfo.oldestBuyDate || buyDate < symbolInfo.oldestBuyDate) {
                    symbolInfo.oldestBuyDate = buyDate;
                }
            }
        }
        
        // Count wins/losses
        if (trade.Win_Loss === 'Win') {
            symbolInfo.wins++;
        } else if (trade.Win_Loss === 'Loss') {
            symbolInfo.losses++;
        }
        
        // Add to total volume
        if (trade.Position_Size_USD) {
            symbolInfo.totalVolume += parseFloat(trade.Position_Size_USD) || 0;
        }
        
        // Track instrument types
        if (trade.Instrument_Type) {
            symbolInfo.instrumentTypes.add(trade.Instrument_Type);
        }
    });
    
    // Calculate metrics for each symbol
    Object.values(symbolsData).forEach(symbolInfo => {
        const winningTrades = symbolInfo.trades.filter(t => t.Win_Loss === 'Win');
        const losingTrades = symbolInfo.trades.filter(t => t.Win_Loss === 'Loss');
        
        // Calculate win rate
        symbolInfo.winRate = symbolInfo.totalTrades > 0 ? 
            (symbolInfo.wins / symbolInfo.totalTrades * 100) : 0;
        
        // Calculate average win
        symbolInfo.avgWin = winningTrades.length > 0 ? 
            winningTrades.reduce((sum, t) => sum + (parseFloat(t.Total_Profit) || 0), 0) / winningTrades.length : 0;
        
        // Calculate average loss
        symbolInfo.avgLoss = losingTrades.length > 0 ? 
            Math.abs(losingTrades.reduce((sum, t) => sum + (parseFloat(t.Total_Profit) || 0), 0) / losingTrades.length) : 0;
        
        // Calculate profit factor
        symbolInfo.profitFactor = symbolInfo.avgLoss > 0 ? symbolInfo.avgWin / symbolInfo.avgLoss : 0;
        
        // Sort trades by buy date (newest first) by default
        symbolInfo.trades.sort((a, b) => {
            const dateA = new Date(a.Open_Time);
            const dateB = new Date(b.Open_Time);
            return dateB - dateA;
        });
    });
    
    console.log(`✅ Processed ${Object.keys(symbolsData).length} symbols`);
    
    // Display the analysis
    displaySymbolAnalysis();
}

// Display the symbol analysis interface
function displaySymbolAnalysis() {
    console.log('🖼️ Displaying symbol analysis interface...');
    
    const symbolsGrid = document.getElementById('symbolsGrid');
    if (!symbolsGrid) {
        console.error('❌ symbolsGrid element not found');
        return;
    }
    
    // Sort symbols by most recent buy date by default
    const sortedSymbols = Object.values(symbolsData).sort((a, b) => {
        const dateA = a.mostRecentBuyDate || new Date(0);
        const dateB = b.mostRecentBuyDate || new Date(0);
        return dateB - dateA;
    });
    
    symbolsGrid.innerHTML = `
        <div class="symbols-container">
            <div class="symbols-sidebar">
                <div class="symbols-header">
                    <h3>📈 Symbols (${sortedSymbols.length})</h3>
                    <div class="symbols-controls">
                        <input type="text" id="symbolFilter" placeholder="Filter symbols..." onkeyup="window.filterSymbols()" class="symbol-filter-input">
                        <select id="symbolSort" onchange="window.sortSymbols()">
                            <option value="recentBuy" selected>Sort by Most Recent Buy</option>
                            <option value="pnl">Sort by P&L</option>
                            <option value="trades">Sort by Trade Count</option>
                            <option value="winRate">Sort by Win Rate</option>
                            <option value="oldestBuy">Sort by Oldest Buy</option>
                            <option value="symbol">Sort Alphabetically</option>
                        </select>
                    </div>
                </div>
                <div class="symbols-list" id="symbolsList">
                    ${sortedSymbols.map(symbol => createSymbolItem(symbol)).join('')}
                </div>
            </div>
            
            <div class="symbol-details">
                <div class="symbol-details-header">
                    <h3 id="symbolDetailsTitle">Select a symbol to view trades</h3>
                </div>
                <div class="symbol-metrics" id="symbolMetrics" style="display: none;">
                </div>
                <div class="symbol-charts" id="symbolCharts" style="display: none;">
                    <div class="charts-row">
                        <div class="chart-container">
                            <h4>Cumulative P&L Over Time</h4>
                            <canvas id="cumulativePnlChart"></canvas>
                        </div>
                        <div class="chart-container">
                            <h4>Cumulative Position Size Over Time</h4>
                            <canvas id="cumulativeSizeChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="symbol-trades" id="symbolTrades">
                    <div class="empty-state">
                        <p>👈 Click on a symbol from the left to see its trades</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    console.log('✅ Symbol analysis interface displayed');
}

// Create HTML for individual symbol item
function createSymbolItem(symbolInfo) {
    const pnlClass = symbolInfo.totalPnL >= 0 ? 'positive' : 'negative';
    const instrumentTypesText = Array.from(symbolInfo.instrumentTypes).join(', ') || 'Stock';
    const recentBuyText = symbolInfo.mostRecentBuyDate ? 
        symbolInfo.mostRecentBuyDate.toLocaleDateString() : 'No trades';
    
    // Escape symbol name for onclick
    const escapedSymbol = symbolInfo.symbol.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    return `
        <div class="symbol-item" data-symbol="${symbolInfo.symbol}" onclick="window.selectSymbol('${escapedSymbol}')">
            <div class="symbol-main">
                <div class="symbol-name">${symbolInfo.symbol}</div>
                <div class="symbol-pnl ${pnlClass}">
                    ${symbolInfo.totalPnL >= 0 ? '+' : ''}$${Math.round(symbolInfo.totalPnL).toLocaleString()}
                </div>
            </div>
            <div class="symbol-stats">
                <span class="symbol-trades-count">${symbolInfo.totalTrades} trades</span>
                <span class="symbol-win-rate">${symbolInfo.winRate.toFixed(1)}% win</span>
                <span class="symbol-recent-date">Last: ${recentBuyText}</span>
                <span class="symbol-types">${instrumentTypesText}</span>
            </div>
        </div>
    `;
}

// Select and display details for a symbol
function selectSymbol(symbol) {
    console.log(`🎯 Selecting symbol: ${symbol}`);
    
    // Update UI selection
    document.querySelectorAll('.symbol-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedElement = document.querySelector(`[data-symbol="${symbol}"]`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }
    
    selectedSymbol = symbol;
    const symbolInfo = symbolsData[symbol];
    
    if (!symbolInfo) {
        console.error(`❌ Symbol data not found: ${symbol}`);
        return;
    }
    
    // Update title
    const titleElement = document.getElementById('symbolDetailsTitle');
    if (titleElement) {
        titleElement.textContent = `${symbol} Trading History`;
    }
    
    // Display metrics, charts, and trades
    displaySymbolMetrics(symbolInfo);
    displaySymbolCharts(symbolInfo);
    displaySymbolTrades(symbolInfo);
    
    console.log(`✅ Symbol ${symbol} selected and displayed`);
}

// Display charts for selected symbol
function displaySymbolCharts(symbolInfo) {
    const symbolCharts = document.getElementById('symbolCharts');
    if (!symbolCharts) return;
    
    symbolCharts.style.display = 'block';
    
    // Prepare data for charts - sort trades by close date
    const sortedTrades = [...symbolInfo.trades].sort((a, b) => {
        const dateA = new Date(a.Close_Time || a.Open_Time);
        const dateB = new Date(b.Close_Time || b.Open_Time);
        return dateA - dateB; // Oldest first for cumulative calculation
    });
    
    let cumulativePnl = 0;
    let cumulativeSize = 0;
    
    const chartData = sortedTrades.map(trade => {
        cumulativePnl += parseFloat(trade.Total_Profit) || 0;
        cumulativeSize += parseFloat(trade.Position_Size_USD) || 0;
        
        const date = new Date(trade.Close_Time || trade.Open_Time);
        return {
            date: date.toLocaleDateString(),
            cumulativePnl: cumulativePnl,
            cumulativeSize: cumulativeSize,
            tradePnl: parseFloat(trade.Total_Profit) || 0
        };
    });
    
    // Render cumulative P&L chart
    renderCumulativePnlChart(chartData, symbolInfo.symbol);
    
    // Render cumulative size chart
    renderCumulativeSizeChart(chartData, symbolInfo.symbol);
}

// Render cumulative P&L chart
function renderCumulativePnlChart(chartData, symbol) {
    const ctx = document.getElementById('cumulativePnlChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (window.cumulativePnlChartInstance) {
        window.cumulativePnlChartInstance.destroy();
    }
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#e2e8f0' : '#2c3e50';
    const gridColor = isDarkMode ? '#4a5568' : '#e9ecef';
    
    window.cumulativePnlChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [
                {
                    label: 'Cumulative P&L ($)',
                    data: chartData.map(d => d.cumulativePnl),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor }
                },
                title: {
                    display: true,
                    text: `${symbol} - Cumulative P&L Over Time`,
                    color: textColor
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Cumulative P&L ($)', color: textColor },
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    title: { display: true, text: 'Trade Date', color: textColor },
                    grid: { color: gridColor },
                    ticks: { 
                        color: textColor,
                        maxTicksLimit: 10
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Render cumulative size chart
function renderCumulativeSizeChart(chartData, symbol) {
    const ctx = document.getElementById('cumulativeSizeChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (window.cumulativeSizeChartInstance) {
        window.cumulativeSizeChartInstance.destroy();
    }
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#e2e8f0' : '#2c3e50';
    const gridColor = isDarkMode ? '#4a5568' : '#e9ecef';
    
    window.cumulativeSizeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [
                {
                    label: 'Cumulative Position Size ($)',
                    data: chartData.map(d => d.cumulativeSize),
                    borderColor: '#20c997',
                    backgroundColor: 'rgba(32, 201, 151, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor }
                },
                title: {
                    display: true,
                    text: `${symbol} - Cumulative Position Size Over Time`,
                    color: textColor
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Cumulative Position Size ($)', color: textColor },
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    title: { display: true, text: 'Trade Date', color: textColor },
                    grid: { color: gridColor },
                    ticks: { 
                        color: textColor,
                        maxTicksLimit: 10
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}
function displaySymbolMetrics(symbolInfo) {
    const symbolMetrics = document.getElementById('symbolMetrics');
    if (!symbolMetrics) return;
    
    symbolMetrics.style.display = 'grid';
    
    const avgHoldTime = symbolInfo.trades.length > 0 ? 
        symbolInfo.trades.reduce((sum, t) => sum + (parseFloat(t.Holding_Days) || 0), 0) / symbolInfo.trades.length : 0;
    
    const recentTrades = symbolInfo.trades.slice(0, 10);
    const recentPnL = recentTrades.reduce((sum, t) => sum + (parseFloat(t.Total_Profit) || 0), 0);
    
    symbolMetrics.innerHTML = `
        <div class="symbol-metric-card">
            <div class="metric-value ${symbolInfo.totalPnL >= 0 ? 'positive' : 'negative'}">
                ${symbolInfo.totalPnL >= 0 ? '+' : ''}$${Math.round(symbolInfo.totalPnL).toLocaleString()}
            </div>
            <div class="metric-label">Total P&L</div>
        </div>
        
        <div class="symbol-metric-card">
            <div class="metric-value neutral">${symbolInfo.totalTrades}</div>
            <div class="metric-label">Total Trades</div>
        </div>
        
        <div class="symbol-metric-card">
            <div class="metric-value ${symbolInfo.winRate >= 50 ? 'positive' : symbolInfo.winRate >= 40 ? 'neutral' : 'negative'}">
                ${symbolInfo.winRate.toFixed(1)}%
            </div>
            <div class="metric-label">Win Rate</div>
        </div>
        
        <div class="symbol-metric-card">
            <div class="metric-value ${symbolInfo.profitFactor >= 1.5 ? 'positive' : symbolInfo.profitFactor >= 1 ? 'neutral' : 'negative'}">
                ${symbolInfo.profitFactor.toFixed(2)}
            </div>
            <div class="metric-label">Profit Factor</div>
        </div>
        
        <div class="symbol-metric-card">
            <div class="metric-value positive">$${Math.round(symbolInfo.avgWin).toLocaleString()}</div>
            <div class="metric-label">Avg Win</div>
        </div>
        
        <div class="symbol-metric-card">
            <div class="metric-value negative">$${Math.round(symbolInfo.avgLoss).toLocaleString()}</div>
            <div class="metric-label">Avg Loss</div>
        </div>
        
        <div class="symbol-metric-card">
            <div class="metric-value neutral">${avgHoldTime.toFixed(1)}d</div>
            <div class="metric-label">Avg Hold Time</div>
        </div>
        
        <div class="symbol-metric-card">
            <div class="metric-value ${recentPnL >= 0 ? 'positive' : 'negative'}">
                ${recentPnL >= 0 ? '+' : ''}$${Math.round(recentPnL).toLocaleString()}
            </div>
            <div class="metric-label">Last 10 Trades</div>
        </div>
    `;
}

// Display trades table for selected symbol
function displaySymbolTrades(symbolInfo) {
    const symbolTrades = document.getElementById('symbolTrades');
    if (!symbolTrades) return;
    
    const totalPositionCost = symbolInfo.trades.reduce((sum, trade) => 
        sum + (parseFloat(trade.Position_Size_USD) || 0), 0);
    const totalContracts = symbolInfo.trades.reduce((sum, trade) => 
        sum + (parseFloat(trade.Contract_Amount) || parseFloat(trade.Quantity) || 0), 0);
    
    // Escape symbol name for onclick
    const escapedSymbol = symbolInfo.symbol.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    symbolTrades.innerHTML = `
        <div class="symbol-trades-header">
            <div class="trades-summary">
                <strong>${symbolInfo.trades.length} trades</strong> | 
                <span class="positive">${symbolInfo.wins}W</span> / 
                <span class="negative">${symbolInfo.losses}L</span> |
                Types: ${Array.from(symbolInfo.instrumentTypes).join(', ')} |
                <span class="total-cost">Total Cost: $${Math.round(totalPositionCost).toLocaleString()}</span>
                ${totalContracts > 0 ? ` | <span class="total-contracts">Total Contracts: ${Math.round(totalContracts).toLocaleString()}</span>` : ''}
            </div>
            <div class="trades-sort-controls">
                <label>Sort by:</label>
                <select id="symbolTradesSort" onchange="window.sortSymbolTrades('${escapedSymbol}')">
                    <option value="openDate" selected>Buy Date (Latest First)</option>
                    <option value="openDateAsc">Buy Date (Oldest First)</option>
                    <option value="closeDate">Close Date (Latest First)</option>
                    <option value="closeDateAsc">Close Date (Oldest First)</option>
                    <option value="pnl">P&L (Highest First)</option>
                    <option value="pnlAsc">P&L (Lowest First)</option>
                    <option value="return">Return % (Highest First)</option>
                    <option value="holdTime">Hold Time (Longest First)</option>
                    <option value="positionSize">Position Size (Largest First)</option>
                    <option value="buyPrice">Buy Price (Highest First)</option>
                    <option value="sellPrice">Sell Price (Highest First)</option>
                </select>
            </div>
        </div>
        
        <div class="symbol-trades-list">
            <div class="symbol-trades-table-header">
                <div>Buy Date</div>
                <div>Sell Date</div>
                <div>Contract Name</div>
                <div>Buy Price</div>
                <div>Sell Price</div>
                <div>Position Cost</div>
                <div>Hold Time</div>
                <div>P&L</div>
                <div>Return</div>
                <div>Result</div>
            </div>
            
            <div id="symbolTradesRows">
                ${symbolInfo.trades.map(trade => createSymbolTradeRow(trade)).join('')}
            </div>
        </div>
    `;
}

// Create HTML for individual trade row
function createSymbolTradeRow(trade) {
    const openDate = trade.Open_Time ? new Date(trade.Open_Time).toLocaleDateString() : 'N/A';
    const closeDate = trade.Close_Time ? new Date(trade.Close_Time).toLocaleDateString() : 'Open';
    const holdTime = trade.Holding_Days || (trade.Holding_Hours ? (parseFloat(trade.Holding_Hours) / 24).toFixed(1) : 0);
    const pnl = parseFloat(trade.Total_Profit) || 0;
    const returnPct = parseFloat(trade.Return_Pct) || 0;
    const resultClass = trade.Win_Loss === 'Win' ? 'win' : 'loss';
    const positionSize = parseFloat(trade.Position_Size_USD) || 0;
    
    // Convert prices to numbers safely
    const buyPrice = parseFloat(trade.Buy_Price || trade.Entry_Price || trade.Open_Price || 0);
    const sellPrice = parseFloat(trade.Sell_Price || trade.Exit_Price || trade.Close_Price || 0);
    
    // Get contract name
    const contractName = trade.Position_Name || 
                        trade.Contract_Name || 
                        trade.Option_Contract || 
                        trade.Description || 
                        `${trade.Symbol} ${trade.Instrument_Type || 'Stock'}`;
    
    const contractAmount = parseFloat(trade.Contract_Amount || trade.Quantity || 0);
    const positionDetails = contractAmount > 0 ? 
        `${contractAmount.toLocaleString()} contracts` : 
        `$${Math.round(positionSize).toLocaleString()}`;
    
    return `
        <div class="symbol-trade-row ${resultClass}">
            <div class="trade-date">
                <div class="main-date">${openDate}</div>
                <div class="trade-subtext">${trade.Open_Time ? new Date(trade.Open_Time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
            </div>
            <div class="trade-date">
                <div class="main-date">${closeDate}</div>
                <div class="trade-subtext">${trade.Close_Time ? new Date(trade.Close_Time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
            </div>
            <div class="trade-contract">
                <div class="contract-name">${contractName}</div>
                <div class="trade-subtext">${trade.Instrument_Type || 'Stock'}</div>
            </div>
            <div class="trade-price">
                <div class="price-value">${buyPrice > 0 ? '$' + buyPrice.toFixed(2) : 'N/A'}</div>
                <div class="trade-subtext">Buy</div>
            </div>
            <div class="trade-price">
                <div class="price-value">${sellPrice > 0 ? '$' + sellPrice.toFixed(2) : 'N/A'}</div>
                <div class="trade-subtext">${closeDate === 'Open' ? 'Open' : 'Sell'}</div>
            </div>
            <div class="trade-position">
                <div class="position-cost">$${Math.round(positionSize).toLocaleString()}</div>
                <div class="trade-subtext">${positionDetails}</div>
            </div>
            <div class="trade-hold-time">
                ${holdTime}d
            </div>
            <div class="trade-pnl ${pnl >= 0 ? 'positive' : 'negative'}">
                ${pnl >= 0 ? '+' : ''}$${Math.round(pnl).toLocaleString()}
            </div>
            <div class="trade-return ${returnPct >= 0 ? 'positive' : 'negative'}">
                ${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%
            </div>
            <div class="trade-result ${trade.Win_Loss === 'Win' ? 'positive' : 'negative'}">
                ${trade.Win_Loss || 'Unknown'}
            </div>
        </div>
    `;
}

// Sort trades within a symbol
function sortSymbolTrades(symbol) {
    const sortBy = document.getElementById('symbolTradesSort')?.value || 'closeDate';
    const symbolInfo = symbolsData[symbol];
    
    if (!symbolInfo) {
        console.error(`❌ Symbol not found for sorting: ${symbol}`);
        return;
    }
    
    let sortedTrades = [...symbolInfo.trades];
    
    switch (sortBy) {
        case 'closeDate':
            sortedTrades.sort((a, b) => new Date(b.Close_Time || b.Open_Time) - new Date(a.Close_Time || a.Open_Time));
            break;
        case 'closeDateAsc':
            sortedTrades.sort((a, b) => new Date(a.Close_Time || a.Open_Time) - new Date(b.Close_Time || b.Open_Time));
            break;
        case 'openDate':
            sortedTrades.sort((a, b) => new Date(b.Open_Time) - new Date(a.Open_Time));
            break;
        case 'openDateAsc':
            sortedTrades.sort((a, b) => new Date(a.Open_Time) - new Date(b.Open_Time));
            break;
        case 'pnl':
            sortedTrades.sort((a, b) => (parseFloat(b.Total_Profit) || 0) - (parseFloat(a.Total_Profit) || 0));
            break;
        case 'pnlAsc':
            sortedTrades.sort((a, b) => (parseFloat(a.Total_Profit) || 0) - (parseFloat(b.Total_Profit) || 0));
            break;
        case 'return':
            sortedTrades.sort((a, b) => (parseFloat(b.Return_Pct) || 0) - (parseFloat(a.Return_Pct) || 0));
            break;
        case 'holdTime':
            sortedTrades.sort((a, b) => {
                const holdA = parseFloat(a.Holding_Days) || (parseFloat(a.Holding_Hours) ? parseFloat(a.Holding_Hours) / 24 : 0);
                const holdB = parseFloat(b.Holding_Days) || (parseFloat(b.Holding_Hours) ? parseFloat(b.Holding_Hours) / 24 : 0);
                return holdB - holdA;
            });
            break;
        case 'positionSize':
            sortedTrades.sort((a, b) => (parseFloat(b.Position_Size_USD) || 0) - (parseFloat(a.Position_Size_USD) || 0));
            break;
        case 'buyPrice':
            sortedTrades.sort((a, b) => {
                const priceA = parseFloat(a.Buy_Price || a.Entry_Price || a.Open_Price || 0);
                const priceB = parseFloat(b.Buy_Price || b.Entry_Price || b.Open_Price || 0);
                return priceB - priceA;
            });
            break;
        case 'sellPrice':
            sortedTrades.sort((a, b) => {
                const priceA = parseFloat(a.Sell_Price || a.Exit_Price || a.Close_Price || 0);
                const priceB = parseFloat(b.Sell_Price || b.Exit_Price || b.Close_Price || 0);
                return priceB - priceA;
            });
            break;
    }
    
    // Update the trades display
    const tradesRowsContainer = document.getElementById('symbolTradesRows');
    if (tradesRowsContainer) {
        tradesRowsContainer.innerHTML = sortedTrades.map(trade => createSymbolTradeRow(trade)).join('');
    }
}

// Sort the symbols list
function sortSymbols() {
    const sortBy = document.getElementById('symbolSort')?.value || 'recentBuy';
    let sortedSymbols;
    
    switch (sortBy) {
        case 'pnl':
            sortedSymbols = Object.values(symbolsData).sort((a, b) => b.totalPnL - a.totalPnL);
            break;
        case 'trades':
            sortedSymbols = Object.values(symbolsData).sort((a, b) => b.totalTrades - a.totalTrades);
            break;
        case 'winRate':
            sortedSymbols = Object.values(symbolsData).sort((a, b) => b.winRate - a.winRate);
            break;
        case 'recentBuy':
            sortedSymbols = Object.values(symbolsData).sort((a, b) => {
                const dateA = a.mostRecentBuyDate || new Date(0);
                const dateB = b.mostRecentBuyDate || new Date(0);
                return dateB - dateA;
            });
            break;
        case 'oldestBuy':
            sortedSymbols = Object.values(symbolsData).sort((a, b) => {
                const dateA = a.oldestBuyDate || new Date();
                const dateB = b.oldestBuyDate || new Date();
                return dateA - dateB;
            });
            break;
        case 'symbol':
            sortedSymbols = Object.values(symbolsData).sort((a, b) => a.symbol.localeCompare(b.symbol));
            break;
        default: // recentBuy
            sortedSymbols = Object.values(symbolsData).sort((a, b) => {
                const dateA = a.mostRecentBuyDate || new Date(0);
                const dateB = b.mostRecentBuyDate || new Date(0);
                return dateB - dateA;
            });
    }
    
    // Update the symbols list
    const symbolsList = document.getElementById('symbolsList');
    if (symbolsList) {
        symbolsList.innerHTML = sortedSymbols.map(symbol => createSymbolItem(symbol)).join('');
        
        // Restore selected state
        if (selectedSymbol) {
            const selectedItem = document.querySelector(`[data-symbol="${selectedSymbol}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
        }
    }
}

// Make functions globally available
window.generateSymbolAnalysis = generateSymbolAnalysis;
window.selectSymbol = selectSymbol;
window.sortSymbols = sortSymbols;
window.sortSymbolTrades = sortSymbolTrades;
window.filterSymbols = filterSymbols;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Symbol analysis script initialized');
    
    // Make sure functions are available globally
    window.generateSymbolAnalysis = generateSymbolAnalysis;
    window.selectSymbol = selectSymbol;
    window.sortSymbols = sortSymbols;
    window.sortSymbolTrades = sortSymbolTrades;
});

console.log('✅ Fresh symbol analysis script loaded successfully');