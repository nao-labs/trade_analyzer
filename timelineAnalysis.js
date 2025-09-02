// Timeline Analysis Component - timelineAnalysis.js

let selectedTimeline = null;
window.timelineData = {}; // Attach to the window to make it global

// Main function to generate timeline analysis
function generateTimelineAnalysis() {
    console.log('📅 Starting timeline analysis generation...');
    
    const tradesData = window.allTrades || allTrades || [];
    
    if (!Array.isArray(tradesData) || tradesData.length === 0) {
        console.error('❌ No trades data available');
        return;
    }
    
    console.log(`📊 Processing ${tradesData.length} trades for timeline...`);
    
    // Reset timeline data
    window.timelineData = {}; // Also update the global object here
    selectedTimeline = null;
    
    // Process each trade to create symbol-month aggregations
    tradesData.forEach((trade, index) => {
        const symbol = trade.Symbol || 'Unknown';
        const openDate = new Date(trade.Open_Time);
        
        if (isNaN(openDate.getTime())) return;
        
        const monthKey = `${openDate.getFullYear()}-${String(openDate.getMonth() + 1).padStart(2, '0')}`;
        const timelineKey = `${symbol}-${monthKey}`;
        
        // Initialize timeline entry if not exists
        if (!timelineData[timelineKey]) {
            timelineData[timelineKey] = {
                symbol: symbol,
                month: monthKey,
                monthDisplay: new Date(openDate.getFullYear(), openDate.getMonth()).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
                trades: [],
                totalPnL: 0,
                totalTrades: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                avgWin: 0,
                avgLoss: 0,
                totalVolume: 0,
                firstTradeDate: openDate,
                lastTradeDate: openDate,
                tradesByDate: new Map()
            };
        }
        
        const timelineInfo = timelineData[timelineKey];
        
        // Add trade to timeline
        timelineInfo.trades.push(trade);
        timelineInfo.totalPnL += parseFloat(trade.Total_Profit) || 0;
        timelineInfo.totalTrades++;
        
        // Track first and last trade dates
        if (openDate < timelineInfo.firstTradeDate) {
            timelineInfo.firstTradeDate = openDate;
        }
        if (openDate > timelineInfo.lastTradeDate) {
            timelineInfo.lastTradeDate = openDate;
        }
        
        // Count wins/losses
        if (trade.Win_Loss === 'Win') {
            timelineInfo.wins++;
        } else if (trade.Win_Loss === 'Loss') {
            timelineInfo.losses++;
        }
        
        // Add to total volume
        if (trade.Position_Size_USD) {
            timelineInfo.totalVolume += parseFloat(trade.Position_Size_USD) || 0;
        }
        
        // Group trades by buy date
        const buyDateKey = openDate.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!timelineInfo.tradesByDate.has(buyDateKey)) {
            timelineInfo.tradesByDate.set(buyDateKey, {
                date: buyDateKey,
                dateObj: openDate,
                trades: [],
                totalPnL: 0,
                wins: 0,
                losses: 0
            });
        }
        
        const dayGroup = timelineInfo.tradesByDate.get(buyDateKey);
        dayGroup.trades.push(trade);
        dayGroup.totalPnL += parseFloat(trade.Total_Profit) || 0;
        if (trade.Win_Loss === 'Win') dayGroup.wins++;
        if (trade.Win_Loss === 'Loss') dayGroup.losses++;
    });
    
    // Calculate metrics for each timeline entry
    Object.values(timelineData).forEach(timelineInfo => {
        const winningTrades = timelineInfo.trades.filter(t => t.Win_Loss === 'Win');
        const losingTrades = timelineInfo.trades.filter(t => t.Win_Loss === 'Loss');
        
        // Calculate win rate
        timelineInfo.winRate = timelineInfo.totalTrades > 0 ? 
            (timelineInfo.wins / timelineInfo.totalTrades * 100) : 0;
        
        // Calculate average win
        timelineInfo.avgWin = winningTrades.length > 0 ? 
            winningTrades.reduce((sum, t) => sum + (parseFloat(t.Total_Profit) || 0), 0) / winningTrades.length : 0;
        
        // Calculate average loss
        timelineInfo.avgLoss = losingTrades.length > 0 ? 
            Math.abs(losingTrades.reduce((sum, t) => sum + (parseFloat(t.Total_Profit) || 0), 0) / losingTrades.length) : 0;
        
        // Sort trades by date within each timeline entry
        timelineInfo.trades.sort((a, b) => new Date(b.Close_Time) - new Date(a.Close_Time));
        
        // Convert tradesByDate Map to sorted array
        timelineInfo.tradesByDateArray = Array.from(timelineInfo.tradesByDate.values())
            .sort((a, b) => b.dateObj - a.dateObj);
    });
    
    console.log(`✅ Processed ${Object.keys(timelineData).length} timeline entries`);
    
    // Display the analysis
    displayTimelineAnalysis();
}

// Display the timeline analysis interface
function displayTimelineAnalysis() {
    console.log('🖼️ Displaying timeline analysis interface...');
    
    const timelineTab = document.getElementById('timelineTab');
    if (!timelineTab) {
        console.error('❌ timelineTab element not found');
        return;
    }
    
    // Sort timeline entries by most recent first trade date
    const sortedTimelines = Object.values(timelineData).sort((a, b) => {
        return b.lastTradeDate - a.lastTradeDate;
    });
    
    timelineTab.innerHTML = `
        <div class="timeline-container">
            <div class="timeline-sidebar">
                <div class="timeline-header">
                    <h3>📅 Symbol-Month Timeline (${sortedTimelines.length})</h3>
                    <div class="timeline-controls">
                        <input type="text" id="timelineFilter" placeholder="Filter by symbol..." onkeyup="window.filterTimelines()" class="timeline-filter-input">
                        <select id="timelineSort" onchange="window.sortTimelines()">
                            <option value="recentFirst" selected>Sort by Most Recent</option>
                            <option value="oldestFirst">Sort by Oldest</option>
                            <option value="pnl">Sort by P&L</option>
                            <option value="pnl-negative">Sort by P&L (Negative)</option>
                            <option value="trades">Sort by Trade Count</option>
                            <option value="winRate">Sort by Win Rate</option>
                            <option value="symbol">Sort by Symbol</option>
                        </select>
                    </div>
                </div>
                <div class="timeline-list" id="timelineList">
                    ${sortedTimelines.map(timeline => createTimelineItem(timeline)).join('')}
                </div>
            </div>
            
            <div class="timeline-details">
                <div class="timeline-details-header">
                    <h3 id="timelineDetailsTitle">Select a symbol-month to view trades</h3>
                </div>
                <div class="timeline-metrics" id="timelineMetrics" style="display: none;">
                </div>
                <div class="timeline-trades" id="timelineTrades">
                    <div class="empty-state">
                        <p>👈 Click on a symbol-month from the left to see its trades</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    console.log('✅ Timeline analysis interface displayed');
}

// Create HTML for individual timeline item
function createTimelineItem(timelineInfo) {
    const pnlClass = timelineInfo.totalPnL >= 0 ? 'positive' : 'negative';
    const timelineKey = `${timelineInfo.symbol}-${timelineInfo.month}`;
    const escapedKey = timelineKey.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    return `
        <div class="timeline-item" data-timeline="${timelineKey}" onclick="window.selectTimeline('${escapedKey}')">
            <div class="timeline-main">
                <div class="timeline-symbol">${timelineInfo.symbol}</div>
                <div class="timeline-month">${timelineInfo.monthDisplay}</div>
            </div>
            <div class="timeline-metrics-preview">
                <div class="timeline-pnl ${pnlClass}">
                    ${timelineInfo.totalPnL >= 0 ? '+' : ''}$${Math.round(timelineInfo.totalPnL).toLocaleString()}
                </div>
                <div class="timeline-stats">
                    <span>${timelineInfo.totalTrades} trades</span>
                    <span>${timelineInfo.winRate.toFixed(1)}% win</span>
                    <span>${timelineInfo.tradesByDateArray.length} days</span>
                </div>
            </div>
        </div>
    `;
}

// Select and display details for a timeline entry
function selectTimeline(timelineKey) {
    console.log(`🎯 Selecting timeline: ${timelineKey}`);
    
    // Update UI selection
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedElement = document.querySelector(`[data-timeline="${timelineKey}"]`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }
    
    selectedTimeline = timelineKey;
    const timelineInfo = timelineData[timelineKey];
    
    if (!timelineInfo) {
        console.error(`❌ Timeline data not found: ${timelineKey}`);
        return;
    }
    
    // Update title and add the new analysis button
    const titleElement = document.getElementById('timelineDetailsTitle');
    if (titleElement) {
        // Use innerHTML to add the button
        titleElement.innerHTML = `
            <span>${timelineInfo.symbol} - ${timelineInfo.monthDisplay}</span>
            <button class="context-analysis-btn" onclick="window.initiateTradeContextAnalysis('${timelineKey}')">
                Analyze Context
            </button>
        `;
    }
    
    // Display metrics and trades
    displayTimelineMetrics(timelineInfo);
    displayTimelineTrades(timelineInfo);
    
    console.log(`✅ Timeline ${timelineKey} selected and displayed`);
}

// Display metrics for selected timeline
function displayTimelineMetrics(timelineInfo) {
    const timelineMetrics = document.getElementById('timelineMetrics');
    if (!timelineMetrics) return;
    
    timelineMetrics.style.display = 'grid';
    
    const avgHoldTime = timelineInfo.trades.length > 0 ? 
        timelineInfo.trades.reduce((sum, t) => sum + (parseFloat(t.Holding_Days) || 0), 0) / timelineInfo.trades.length : 0;
    
    const profitFactor = timelineInfo.avgLoss > 0 ? timelineInfo.avgWin / timelineInfo.avgLoss : 0;
    const dateRange = `${timelineInfo.firstTradeDate.toLocaleDateString()} - ${timelineInfo.lastTradeDate.toLocaleDateString()}`;
    
    timelineMetrics.innerHTML = `
        <div class="timeline-metric-card">
            <div class="metric-value ${timelineInfo.totalPnL >= 0 ? 'positive' : 'negative'}">
                ${timelineInfo.totalPnL >= 0 ? '+' : ''}$${Math.round(timelineInfo.totalPnL).toLocaleString()}
            </div>
            <div class="metric-label">Total P&L</div>
        </div>
        
        <div class="timeline-metric-card">
            <div class="metric-value neutral">${timelineInfo.totalTrades}</div>
            <div class="metric-label">Total Trades</div>
        </div>
        
        <div class="timeline-metric-card">
            <div class="metric-value ${timelineInfo.winRate >= 50 ? 'positive' : timelineInfo.winRate >= 40 ? 'neutral' : 'negative'}">
                ${timelineInfo.winRate.toFixed(1)}%
            </div>
            <div class="metric-label">Win Rate</div>
        </div>
        
        <div class="timeline-metric-card">
            <div class="metric-value ${profitFactor >= 1.5 ? 'positive' : profitFactor >= 1 ? 'neutral' : 'negative'}">
                ${profitFactor.toFixed(2)}
            </div>
            <div class="metric-label">Profit Factor</div>
        </div>
        
        <div class="timeline-metric-card">
            <div class="metric-value positive">$${Math.round(timelineInfo.avgWin).toLocaleString()}</div>
            <div class="metric-label">Avg Win</div>
        </div>
        
        <div class="timeline-metric-card">
            <div class="metric-value negative">$${Math.round(timelineInfo.avgLoss).toLocaleString()}</div>
            <div class="metric-label">Avg Loss</div>
        </div>
        
        <div class="timeline-metric-card">
            <div class="metric-value neutral">${avgHoldTime.toFixed(1)}d</div>
            <div class="metric-label">Avg Hold Time</div>
        </div>
        
        <div class="timeline-metric-card">
            <div class="metric-value neutral">${timelineInfo.tradesByDateArray.length}</div>
            <div class="metric-label">Trading Days</div>
        </div>
    `;
}

// Display trades grouped by date with expandable details
function displayTimelineTrades(timelineInfo) {
    const timelineTrades = document.getElementById('timelineTrades');
    if (!timelineTrades) return;
    
    const totalVolume = timelineInfo.totalVolume;
    const dateRange = `${timelineInfo.firstTradeDate.toLocaleDateString()} - ${timelineInfo.lastTradeDate.toLocaleDateString()}`;
    
    timelineTrades.innerHTML = `
        <div class="timeline-trades-header">
            <div class="trades-summary">
                <strong>${timelineInfo.symbol} - ${timelineInfo.monthDisplay}</strong> | 
                <span class="positive">${timelineInfo.wins}W</span> / 
                <span class="negative">${timelineInfo.losses}L</span> |
                Date Range: ${dateRange} |
                <span class="total-volume">Total Volume: $${Math.round(totalVolume).toLocaleString()}</span>
            </div>
        </div>
        
        <div class="timeline-trades-list">
            ${timelineInfo.tradesByDateArray.map(dayGroup => createDateGroupHtml(dayGroup)).join('')}
        </div>
    `;
}

// Create HTML for date group with expandable trades
function createDateGroupHtml(dayGroup) {
    const dayPnlClass = dayGroup.totalPnL >= 0 ? 'positive' : 'negative';
    const dayId = `day-${dayGroup.date.replace(/-/g, '')}`;
    const dayDisplay = new Date(dayGroup.date).toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    return `
        <div class="date-group">
            <div class="date-group-header" onclick="toggleDateGroup('${dayId}')">
                <div class="date-group-main">
                    <div class="date-group-date">${dayDisplay}</div>
                    <div class="date-group-pnl ${dayPnlClass}">
                        ${dayGroup.totalPnL >= 0 ? '+' : ''}$${Math.round(dayGroup.totalPnL).toLocaleString()}
                    </div>
                </div>
                <div class="date-group-stats">
                    <span>${dayGroup.trades.length} trades</span>
                    <span class="positive">${dayGroup.wins}W</span>
                    <span class="negative">${dayGroup.losses}L</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            
            <div class="date-group-content" id="${dayId}" style="display: none;">
                <div class="date-trades-table">
                    <div class="date-trades-header">
                        <div>Time</div>
                        <div>Sell Date</div>
                        <div>Contract</div>
                        <div>Position</div>
                        <div>Hold Time</div>
                        <div>P&L</div>
                        <div>Return</div>
                        <div>Result</div>
                    </div>
                    ${dayGroup.trades.map(trade => createDateTradeRow(trade)).join('')}
                </div>
            </div>
        </div>
    `;
}

// Create HTML for individual trade within a date group
function createDateTradeRow(trade) {
    const openTime = trade.Open_Time ? new Date(trade.Open_Time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';
    const closeDate = trade.Close_Time ? new Date(trade.Close_Time).toLocaleDateString() : 'N/A';
    const holdTime = trade.Holding_Days || (trade.Holding_Hours ? (parseFloat(trade.Holding_Hours) / 24).toFixed(1) : 0);
    const pnl = parseFloat(trade.Total_Profit) || 0;
    const returnPct = parseFloat(trade.Return_Pct) || 0;
    const resultClass = trade.Win_Loss === 'Win' ? 'win' : 'loss';
    const positionSize = parseFloat(trade.Position_Size_USD) || 0;
    
    const contractName = trade.Position_Name || 
                        trade.Contract_Name || 
                        trade.Option_Contract || 
                        trade.Description || 
                        `${trade.Symbol} ${trade.Instrument_Type || 'Stock'}`;
    
    const contractAmount = parseFloat(trade.Contract_Amount || trade.Quantity || 0);
    const positionDisplay = contractAmount > 0 ? 
        `${contractAmount} contracts ($${Math.round(positionSize).toLocaleString()})` : 
        `$${Math.round(positionSize).toLocaleString()}`;
    
    return `
        <div class="date-trade-row ${resultClass}">
            <div class="trade-time">${openTime}</div>
            <div class="trade-time">${closeDate}</div>
            <div class="trade-contract">
                <div class="contract-name">${contractName}</div>
                <div class="trade-subtext">${trade.Instrument_Type || 'Stock'}</div>
            </div>
            <div class="trade-position">
                <div class="position-info">${positionDisplay}</div>
            </div>
            <div class="trade-hold-time">${holdTime}d</div>
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

// Toggle date group visibility
function toggleDateGroup(dayId) {
    const content = document.getElementById(dayId);
    const header = content.previousElementSibling;
    const expandIcon = header.querySelector('.expand-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        expandIcon.textContent = '▲';
        header.classList.add('expanded');
    } else {
        content.style.display = 'none';
        expandIcon.textContent = '▼';
        header.classList.remove('expanded');
    }
}

// Filter timelines function
function filterTimelines() {
    const filterText = document.getElementById('timelineFilter')?.value?.toLowerCase() || '';
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    timelineItems.forEach(item => {
        const symbolText = item.querySelector('.timeline-symbol')?.textContent?.toLowerCase() || '';
        if (symbolText.includes(filterText)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Sort timelines function
function sortTimelines() {
    const sortBy = document.getElementById('timelineSort')?.value || 'recentFirst';
    let sortedTimelines;
    
    switch (sortBy) {
        case 'pnl':
            sortedTimelines = Object.values(timelineData).sort((a, b) => b.totalPnL - a.totalPnL);
            break;
    
        case 'pnl-negative':
            sortedTimelines = Object.values(timelineData).sort((a, b) => a.totalPnL - b.totalPnL);
            break;
        case 'trades':
            sortedTimelines = Object.values(timelineData).sort((a, b) => b.totalTrades - a.totalTrades);
            break;
        case 'winRate':
            sortedTimelines = Object.values(timelineData).sort((a, b) => b.winRate - a.winRate);
            break;
        case 'recentFirst':
            sortedTimelines = Object.values(timelineData).sort((a, b) => b.lastTradeDate - a.lastTradeDate);
            break;
        case 'oldestFirst':
            sortedTimelines = Object.values(timelineData).sort((a, b) => a.firstTradeDate - b.firstTradeDate);
            break;
        case 'symbol':
            sortedTimelines = Object.values(timelineData).sort((a, b) => a.symbol.localeCompare(b.symbol));
            break;
        default:
            sortedTimelines = Object.values(timelineData).sort((a, b) => b.firstTradeDate - a.firstTradeDate);
    }
    
    // Update the timeline list
    const timelineList = document.getElementById('timelineList');
    if (timelineList) {
        timelineList.innerHTML = sortedTimelines.map(timeline => createTimelineItem(timeline)).join('');
        
        // Restore selected state
        if (selectedTimeline) {
            const selectedItem = document.querySelector(`[data-timeline="${selectedTimeline}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
        }
    }
}

// Make functions globally available
window.generateTimelineAnalysis = generateTimelineAnalysis;
window.selectTimeline = selectTimeline;
window.sortTimelines = sortTimelines;
window.filterTimelines = filterTimelines;
window.toggleDateGroup = toggleDateGroup;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 Timeline analysis script initialized');
});

console.log('✅ Timeline analysis script loaded successfully');