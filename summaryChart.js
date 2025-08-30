// Summary Chart Component - summaryChart.js

let summaryChart = null;
let summaryData = [];
let currentAggregation = 'month';

function generateSummaryChart() {
    console.log('📊 Generating summary chart...');
    
    if (!allTrades || allTrades.length === 0) {
        console.error('❌ No trades data available for summary chart');
        return;
    }
    
    // Calculate summary data for all aggregation levels
    calculateSummaryData();
    
    // Display the summary interface
    displaySummaryChart();
    
    console.log('✅ Summary chart generated');
}

function calculateSummaryData() {
    const aggregations = ['day', 'week', 'month', 'year'];
    summaryData = {};
    
    aggregations.forEach(aggType => {
        summaryData[aggType] = {};
        
        allTrades.forEach(trade => {
            const tradeDate = new Date(trade.Close_Time || trade.Open_Time);
            if (isNaN(tradeDate.getTime())) return;
            
            let periodKey;
            switch (aggType) {
                case 'day':
                    periodKey = tradeDate.toISOString().split('T')[0]; // YYYY-MM-DD
                    break;
                case 'week':
                    const weekStart = getWeekStart(tradeDate);
                    periodKey = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    periodKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'year':
                    periodKey = tradeDate.getFullYear().toString();
                    break;
            }
            
            if (!summaryData[aggType][periodKey]) {
                summaryData[aggType][periodKey] = {
                    period: periodKey,
                    totalTrades: 0,
                    wins: 0,
                    losses: 0,
                    winRate: 0,
                    totalGains: 0,
                    totalLosses: 0,
                    netProfit: 0,
                    avgWinningTrade: 0,
                    avgLosingTrade: 0,
                    winningTrades: [],
                    losingTrades: []
                };
            }
            
            const period = summaryData[aggType][periodKey];
            const profit = parseFloat(trade.Total_Profit) || 0;
            
            period.totalTrades++;
            period.netProfit += profit;
            
            if (trade.Win_Loss === 'Win') {
                period.wins++;
                period.totalGains += profit;
                period.winningTrades.push(profit);
            } else if (trade.Win_Loss === 'Loss') {
                period.losses++;
                period.totalLosses += Math.abs(profit);
                period.losingTrades.push(profit);
            }
        });
        
        // Calculate averages and win rates
        Object.values(summaryData[aggType]).forEach(period => {
            period.winRate = period.totalTrades > 0 ? (period.wins / period.totalTrades * 100) : 0;
            period.avgWinningTrade = period.winningTrades.length > 0 ? 
                period.winningTrades.reduce((sum, p) => sum + p, 0) / period.winningTrades.length : 0;
            period.avgLosingTrade = period.losingTrades.length > 0 ? 
                period.losingTrades.reduce((sum, p) => sum + p, 0) / period.losingTrades.length : 0;
        });
    });
    
    console.log('📊 Summary data calculated for all aggregations');
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function displaySummaryChart() {
    const summaryTab = document.getElementById('summaryTab');
    if (!summaryTab) {
        console.error('❌ Summary tab not found');
        return;
    }
    
    summaryTab.innerHTML = `
        <div class="summary-section">
            <div class="summary-header">
                <h3 class="section-title">📊 Trading Performance Summary</h3>
                <div class="summary-controls">
                    <label for="aggregationSelect">Aggregate by:</label>
                    <select id="aggregationSelect" onchange="window.updateSummaryAggregation()">
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month" selected>Month</option>
                        <option value="year">Year</option>
                    </select>
                    <button onclick="window.exportSummaryData()" class="export-btn">📥 Export Summary</button>
                </div>
            </div>
            
            <div class="summary-metrics" id="summaryMetrics">
                <!-- Overall metrics will be populated here -->
            </div>
            
            <div class="summary-chart-container">
                <canvas id="summaryChart"></canvas>
            </div>
            
            <div class="summary-table-container">
                <div class="summary-table" id="summaryTable">
                    <!-- Table will be populated here -->
                </div>
            </div>
        </div>
    `;
    
    // Update the display with default aggregation
    updateSummaryDisplay();
}

function updateSummaryAggregation() {
    const select = document.getElementById('aggregationSelect');
    currentAggregation = select.value;
    updateSummaryDisplay();
}

function updateSummaryDisplay() {
    const data = summaryData[currentAggregation];
    if (!data) return;
    
    const periods = Object.values(data).sort((a, b) => a.period.localeCompare(b.period));
    
    // Update overall metrics
    updateSummaryMetrics(periods);
    
    // Update chart
    renderSummaryChart(periods);
    
    // Update table
    renderSummaryTable(periods);
}

function updateSummaryMetrics(periods) {
    const metricsContainer = document.getElementById('summaryMetrics');
    if (!metricsContainer) return;
    
    // Calculate overall totals
    const totals = periods.reduce((acc, period) => ({
        totalTrades: acc.totalTrades + period.totalTrades,
        wins: acc.wins + period.wins,
        losses: acc.losses + period.losses,
        totalGains: acc.totalGains + period.totalGains,
        totalLosses: acc.totalLosses + period.totalLosses,
        netProfit: acc.netProfit + period.netProfit,
        winningTrades: acc.winningTrades.concat(period.winningTrades),
        losingTrades: acc.losingTrades.concat(period.losingTrades)
    }), {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalGains: 0,
        totalLosses: 0,
        netProfit: 0,
        winningTrades: [],
        losingTrades: []
    });
    
    const winRate = totals.totalTrades > 0 ? (totals.wins / totals.totalTrades * 100) : 0;
    const avgWinningTrade = totals.winningTrades.length > 0 ? 
        totals.winningTrades.reduce((sum, p) => sum + p, 0) / totals.winningTrades.length : 0;
    const avgLosingTrade = totals.losingTrades.length > 0 ? 
        totals.losingTrades.reduce((sum, p) => sum + p, 0) / totals.losingTrades.length : 0;
    
    metricsContainer.innerHTML = `
        <div class="metric-card">
            <div class="metric-value neutral">${totals.totalTrades}</div>
            <div class="metric-label">Total Trades</div>
        </div>
        <div class="metric-card">
            <div class="metric-value positive">${totals.wins}</div>
            <div class="metric-label">Wins (${winRate.toFixed(2)}%)</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">${totals.losses}</div>
            <div class="metric-label">Losses</div>
        </div>
        <div class="metric-card">
            <div class="metric-value positive">$${Math.round(totals.totalGains).toLocaleString()}</div>
            <div class="metric-label">Total Gains</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">$${Math.round(totals.totalLosses).toLocaleString()}</div>
            <div class="metric-label">Total Losses</div>
        </div>
        <div class="metric-card">
            <div class="metric-value ${totals.netProfit >= 0 ? 'positive' : 'negative'}">
                $${Math.round(totals.netProfit).toLocaleString()}
            </div>
            <div class="metric-label">Net Profit</div>
        </div>
        <div class="metric-card">
            <div class="metric-value positive">$${Math.round(avgWinningTrade).toLocaleString()}</div>
            <div class="metric-label">Avg Winning Trade</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">$${Math.round(Math.abs(avgLosingTrade)).toLocaleString()}</div>
            <div class="metric-label">Avg Losing Trade</div>
        </div>
    `;
}

function renderSummaryChart(periods) {
    const ctx = document.getElementById('summaryChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (summaryChart) {
        summaryChart.destroy();
    }
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#e2e8f0' : '#2c3e50';
    const gridColor = isDarkMode ? '#4a5568' : '#e9ecef';
    
    // Prepare data for dual-axis chart
    const labels = periods.map(p => formatPeriodLabel(p.period, currentAggregation));
    
    summaryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Net Profit ($)',
                    data: periods.map(p => Math.round(p.netProfit)),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Win Rate (%)',
                    data: periods.map(p => p.winRate),
                    borderColor: '#6f42c1',
                    backgroundColor: 'rgba(111, 66, 193, 0.1)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                },
                {
                    label: 'Total Trades',
                    data: periods.map(p => p.totalTrades),
                    type: 'bar',
                    backgroundColor: 'rgba(102, 126, 234, 0.3)',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    yAxisID: 'y2'
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
                    text: `Trading Performance by ${currentAggregation.charAt(0).toUpperCase() + currentAggregation.slice(1)}`,
                    color: textColor
                }
            },
            scales: {
                x: {
                    title: { display: true, text: currentAggregation.charAt(0).toUpperCase() + currentAggregation.slice(1), color: textColor },
                    grid: { color: gridColor },
                    ticks: { 
                        color: textColor,
                        maxTicksLimit: 12
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Net Profit ($)', color: textColor },
                    grid: { color: gridColor },
                    ticks: { 
                        color: textColor,
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Win Rate (%)', color: textColor },
                    grid: { display: false },
                    ticks: { 
                        color: textColor,
                        max: 100,
                        min: 0
                    }
                },
                y2: {
                    type: 'linear',
                    display: false,
                    max: Math.max(...periods.map(p => p.totalTrades)) * 2
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function renderSummaryTable(periods) {
    const tableContainer = document.getElementById('summaryTable');
    if (!tableContainer) return;
    
    const reversedPeriods = [...periods].reverse(); // Show most recent first
    
    tableContainer.innerHTML = `
        <div class="table-header">
            <div class="table-title">Detailed ${currentAggregation.charAt(0).toUpperCase() + currentAggregation.slice(1)} Breakdown</div>
        </div>
        <div class="summary-table-scroll">
            <table class="summary-data-table">
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Total Trades</th>
                        <th>Wins</th>
                        <th>Losses</th>
                        <th>Win Rate</th>
                        <th>Total Gains</th>
                        <th>Total Losses</th>
                        <th>Net Profit</th>
                        <th>Avg Win</th>
                        <th>Avg Loss</th>
                    </tr>
                </thead>
                <tbody>
                    ${reversedPeriods.map(period => `
                        <tr class="${period.netProfit >= 0 ? 'profit-row' : 'loss-row'}">
                            <td class="period-cell">${formatPeriodLabel(period.period, currentAggregation)}</td>
                            <td>${period.totalTrades}</td>
                            <td class="positive">${period.wins}</td>
                            <td class="negative">${period.losses}</td>
                            <td class="${period.winRate >= 50 ? 'positive' : period.winRate >= 40 ? 'neutral' : 'negative'}">
                                ${period.winRate.toFixed(1)}%
                            </td>
                            <td class="positive">$${Math.round(period.totalGains).toLocaleString()}</td>
                            <td class="negative">$${Math.round(period.totalLosses).toLocaleString()}</td>
                            <td class="${period.netProfit >= 0 ? 'positive' : 'negative'}">
                                $${Math.round(period.netProfit).toLocaleString()}
                            </td>
                            <td class="positive">$${Math.round(period.avgWinningTrade).toLocaleString()}</td>
                            <td class="negative">$${Math.round(Math.abs(period.avgLosingTrade)).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function formatPeriodLabel(period, aggregation) {
    switch (aggregation) {
        case 'day':
            return new Date(period).toLocaleDateString();
        case 'week':
            const weekEnd = new Date(period);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return `${new Date(period).toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
        case 'month':
            const [year, month] = period.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        case 'year':
            return period;
        default:
            return period;
    }
}

function exportSummaryData() {
    const data = summaryData[currentAggregation];
    if (!data) return;
    
    const periods = Object.values(data).sort((a, b) => a.period.localeCompare(b.period));
    
    const headers = [
        'Period', 'Total Trades', 'Wins', 'Losses', 'Win Rate (%)', 
        'Total Gains ($)', 'Total Losses ($)', 'Net Profit ($)', 
        'Avg Winning Trade ($)', 'Avg Losing Trade ($)'
    ];
    
    const csvData = [
        headers.join(','),
        ...periods.map(period => [
            formatPeriodLabel(period.period, currentAggregation),
            period.totalTrades,
            period.wins,
            period.losses,
            period.winRate.toFixed(2),
            Math.round(period.totalGains),
            Math.round(period.totalLosses),
            Math.round(period.netProfit),
            Math.round(period.avgWinningTrade),
            Math.round(Math.abs(period.avgLosingTrade))
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_summary_${currentAggregation}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Make functions globally available
window.generateSummaryChart = generateSummaryChart;
window.updateSummaryAggregation = updateSummaryAggregation;
window.exportSummaryData = exportSummaryData;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Summary chart script initialized');
});

console.log('✅ Summary chart script loaded successfully');