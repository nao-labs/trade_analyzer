let charts = {};

function getDayOfWeekPerformance() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayData = days.map(() => ({ pnl: 0, trades: 0, wins: 0 }));
    
    allTrades.forEach(trade => {
        const date = new Date(trade.Close_Time || trade.Open_Time);
        const dayIndex = date.getDay();
        dayData[dayIndex].pnl += trade.Total_Profit || 0;
        dayData[dayIndex].trades++;
        if (trade.Win_Loss === 'Win') dayData[dayIndex].wins++;
    });
    
    return days.map((day, index) => ({
        day,
        pnl: dayData[index].pnl,
        trades: dayData[index].trades,
        winRate: dayData[index].trades > 0 ? (dayData[index].wins / dayData[index].trades * 100).toFixed(1) : 0
    }));
}

function getTimeOfDayPerformance() {
    const buckets = Array(24).fill().map((_, i) => ({
        hour: `${i}:00-${i+1}:00`,
        pnl: 0,
        trades: 0,
        wins: 0
    }));
    
    allTrades.forEach(trade => {
        const date = new Date(trade.Open_Time);
        if (isNaN(date.getTime())) return;
        const hour = date.getHours();
        buckets[hour].pnl += trade.Total_Profit || 0;
        buckets[hour].trades++;
        if (trade.Win_Loss === 'Win') buckets[hour].wins++;
    });
    
    return buckets.filter(b => b.trades > 0).map(b => ({
        ...b,
        winRate: b.trades > 0 ? (b.wins / b.trades * 100).toFixed(1) : 0
    }));
}

function getTradeFrequencyClusters() {
    const sortedTrades = [...allTrades].sort((a, b) => new Date(a.Open_Time) - new Date(b.Open_Time));
    const clusters = [];
    let currentCluster = [];
    
    for (let i = 0; i < sortedTrades.length; i++) {
        currentCluster.push(sortedTrades[i]);
        if (i < sortedTrades.length - 1) {
            const currentTime = new Date(sortedTrades[i].Open_Time).getTime();
            const nextTime = new Date(sortedTrades[i + 1].Open_Time).getTime();
            if (nextTime - currentTime > 3600000) {
                if (currentCluster.length >= 3) clusters.push(currentCluster);
                currentCluster = [];
            }
        }
    }
    if (currentCluster.length >= 3) clusters.push(currentCluster);
    
    return clusters.map(cluster => ({
        startTime: new Date(cluster[0].Open_Time).toLocaleString(),
        tradeCount: cluster.length,
        pnl: cluster.reduce((sum, t) => sum + (t.Total_Profit || 0), 0),
        winRate: (cluster.filter(t => t.Win_Loss === 'Win').length / cluster.length * 100).toFixed(1)
    }));
}

function getPerformanceAfterResults() {
    const sortedTrades = [...allTrades].sort((a, b) => new Date(a.Close_Time || a.Open_Time) - new Date(b.Close_Time || b.Open_Time));
    const afterWin = { pnl: 0, trades: 0, wins: 0 };
    const afterLoss = { pnl: 0, trades: 0, wins: 0 };
    
    for (let i = 0; i < sortedTrades.length - 1; i++) {
        const current = sortedTrades[i];
        const next = sortedTrades[i + 1];
        if (current.Win_Loss === 'Win') {
            afterWin.pnl += next.Total_Profit || 0;
            afterWin.trades++;
            if (next.Win_Loss === 'Win') afterWin.wins++;
        } else if (current.Win_Loss === 'Loss') {
            afterLoss.pnl += next.Total_Profit || 0;
            afterLoss.trades++;
            if (next.Win_Loss === 'Win') afterLoss.wins++;
        }
    }
    
    return [
        { label: 'After Win', ...afterWin, winRate: afterWin.trades > 0 ? (afterWin.wins / afterWin.trades * 100).toFixed(1) : 0 },
        { label: 'After Loss', ...afterLoss, winRate: afterLoss.trades > 0 ? (afterLoss.wins / afterLoss.trades * 100).toFixed(1) : 0 }
    ];
}

function getPositionSizeAnalysis() {
    const sortedTrades = [...allTrades]
        .filter(t => t.Position_Size_USD)
        .sort((a, b) => a.Position_Size_USD - b.Position_Size_USD);
    const quartileSize = Math.floor(sortedTrades.length / 4);
    
    const quartiles = [
        sortedTrades.slice(0, quartileSize),
        sortedTrades.slice(quartileSize, 2 * quartileSize),
        sortedTrades.slice(2 * quartileSize, 3 * quartileSize),
        sortedTrades.slice(3 * quartileSize)
    ];
    
    return quartiles.map((trades, i) => {
        const pnl = trades.reduce((sum, t) => sum + (t.Total_Profit || 0), 0);
        const wins = trades.filter(t => t.Win_Loss === 'Win').length;
        return {
            label: `Q${i + 1} (${Math.round(trades[0]?.Position_Size_USD || 0).toLocaleString()}-${Math.round(trades[trades.length - 1]?.Position_Size_USD || 0).toLocaleString()})`,
            pnl,
            trades: trades.length,
            winRate: trades.length > 0 ? (wins / trades.length * 100).toFixed(1) : 0
        };
    });
}

function getRMultipleDistribution() {
    const bins = { '<-2': 0, '-2 to -1': 0, '-1 to 0': 0, '0 to 1': 0, '1 to 2': 0, '2 to 3': 0, '>3': 0 };
    allTrades.forEach(trade => {
        if (!trade.Position_Size_USD || !trade.Total_Profit) return;
        const risk = trade.Position_Size_USD * 0.01;
        const rMultiple = trade.Total_Profit / risk;
        if (rMultiple < -2) bins['<-2']++;
        else if (rMultiple < -1) bins['-2 to -1']++;
        else if (rMultiple < 0) bins['-1 to 0']++;
        else if (rMultiple < 1) bins['0 to 1']++;
        else if (rMultiple < 2) bins['1 to 2']++;
        else if (rMultiple < 3) bins['2 to 3']++;
        else bins['>3']++;
    });
    return bins;
}

function getEntryTriggerPerformance() {
    const triggers = {};
    allTrades.forEach(trade => {
        const trigger = trade.Entry_Trigger || 'Unknown';
        if (!triggers[trigger]) {
            triggers[trigger] = { pnl: 0, trades: 0, wins: 0 };
        }
        triggers[trigger].pnl += trade.Total_Profit || 0;
        triggers[trigger].trades++;
        if (trade.Win_Loss === 'Win') triggers[trigger].wins++;
    });
    return Object.entries(triggers).map(([trigger, data]) => ({
        trigger,
        pnl: data.pnl,
        trades: data.trades,
        winRate: data.trades > 0 ? (data.wins / data.trades * 100).toFixed(1) : 0
    }));
}

function getExitQuality() {
    let targetHits = 0, stopHits = 0, total = 0;
    allTrades.forEach(trade => {
        if (trade.Profit_Target_Hit || trade.Stop_Loss_Hit) {
            total++;
            if (trade.Profit_Target_Hit) targetHits++;
            if (trade.Stop_Loss_Hit) stopHits++;
        }
    });
    return {
        targetHitRate: total > 0 ? (targetHits / total * 100).toFixed(1) : 0,
        stopHitRate: total > 0 ? (stopHits / total * 100).toFixed(1) : 0
    };
}

function getMarketRegimePerformance() {
    const regimes = {};
    allTrades.forEach(trade => {
        const regime = trade.Market_Regime || 'Unknown';
        if (!regimes[regime]) {
            regimes[regime] = { pnl: 0, trades: 0, wins: 0 };
        }
        regimes[regime].pnl += trade.Total_Profit || 0;
        regimes[regime].trades++;
        if (trade.Win_Loss === 'Win') regimes[regime].wins++;
    });
    return Object.entries(regimes).map(([regime, data]) => ({
        regime,
        pnl: data.pnl,
        trades: data.trades,
        winRate: data.trades > 0 ? (data.wins / data.trades * 100).toFixed(1) : 0
    }));
}

function getTiltIndicators() {
    const avgSize = allTrades.reduce((sum, t) => sum + (t.Position_Size_USD || 0), 0) / allTrades.length;
    const tiltTrades = allTrades.filter(trade => {
        const time = new Date(trade.Open_Time).getHours();
        const isLate = time >= 15;
        const isLarge = trade.Position_Size_USD > 2 * avgSize;
        const noThesis = !trade.Trade_Thesis;
        return isLate || isLarge || noThesis;
    });
    return {
        count: tiltTrades.length,
        pnl: tiltTrades.reduce((sum, t) => sum + (t.Total_Profit || 0), 0),
        winRate: tiltTrades.length > 0 ? (tiltTrades.filter(t => t.Win_Loss === 'Win').length / tiltTrades.length * 100).toFixed(1) : 0
    };
}

function getRollingWinRate(windowSize = 50) {
    const sortedTrades = [...allTrades].sort((a, b) => new Date(a.Close_Time || a.Open_Time) - new Date(b.Close_Time || b.Open_Time));
    const winRates = [];
    for (let i = windowSize; i <= sortedTrades.length; i++) {
        const window = sortedTrades.slice(i - windowSize, i);
        const wins = window.filter(t => t.Win_Loss === 'Win').length;
        winRates.push({
            date: new Date(sortedTrades[i - 1].Close_Time || sortedTrades[i - 1].Open_Time).toLocaleDateString(),
            winRate: (wins / windowSize * 100).toFixed(1)
        });
    }
    return winRates;
}

function getStreaksAnalysis() {
    const sortedTrades = [...allTrades].sort((a, b) => {
        const dateA = new Date(a.Close_Time || a.Open_Time);
        const dateB = new Date(b.Close_Time || b.Open_Time);
        return dateA - dateB;
    });
    
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let lastResult = null;
    
    sortedTrades.forEach(trade => {
        if (trade.Win_Loss === lastResult) {
            currentStreak++;
        } else {
            if (lastResult === 'Win') maxWinStreak = Math.max(maxWinStreak, currentStreak);
            if (lastResult === 'Loss') maxLossStreak = Math.max(maxLossStreak, currentStreak);
            currentStreak = 1;
            lastResult = trade.Win_Loss;
        }
    });
    
    if (lastResult === 'Win') maxWinStreak = Math.max(maxWinStreak, currentStreak);
    if (lastResult === 'Loss') maxLossStreak = Math.max(maxLossStreak, currentStreak);
    
    return { maxWinStreak, maxLossStreak };
}

function getRiskMetrics() {
    const pnls = allTrades.map(t => t.Total_Profit || 0);
    const winners = pnls.filter(p => p > 0);
    const losers = pnls.filter(p => p < 0);
    
    const maxWin = winners.length > 0 ? Math.max(...winners) : 0;
    const maxLoss = losers.length > 0 ? Math.min(...losers) : 0;
    const avgTrade = pnls.length > 0 ? pnls.reduce((sum, p) => sum + p, 0) / pnls.length : 0;
    
    const variance = pnls.length > 0 ? 
        pnls.reduce((sum, p) => sum + Math.pow(p - avgTrade, 2), 0) / pnls.length : 0;
    const stdDev = Math.sqrt(variance);
    
    return { maxWin, maxLoss, avgTrade, stdDev };
}

function generateAnalytics() {
    const analyticsGrid = document.getElementById('analyticsGrid');
    
    // Symbol Analysis
    const symbolData = {};
    allTrades.forEach(trade => {
        const symbol = trade.Symbol || 'Unknown';
        if (!symbolData[symbol]) {
            symbolData[symbol] = { pnl: 0, trades: 0, wins: 0 };
        }
        symbolData[symbol].pnl += trade.Total_Profit || 0;
        symbolData[symbol].trades++;
        if (trade.Win_Loss === 'Win') symbolData[symbol].wins++;
    });
    
    const topSymbols = Object.entries(symbolData)
        .sort(([,a], [,b]) => b.pnl - a.pnl)
        .slice(0, 10);
    
    // Hold Duration Analysis
    const durationData = {
        'Same Day (0d)': [],
        'Short (1-3d)': [],
        'Medium (4-10d)': [],
        'Long (11-30d)': [],
        'Very Long (30d+)': []
    };
    
    allTrades.forEach(trade => {
        const days = trade.Holding_Days || (trade.Holding_Hours ? trade.Holding_Hours / 24 : 0);
        const pnl = trade.Total_Profit || 0;
        
        if (days === 0) durationData['Same Day (0d)'].push(pnl);
        else if (days <= 3) durationData['Short (1-3d)'].push(pnl);
        else if (days <= 10) durationData['Medium (4-10d)'].push(pnl);
        else if (days <= 30) durationData['Long (11-30d)'].push(pnl);
        else durationData['Very Long (30d+)'].push(pnl);
    });
    
    // Instrument Type Analysis
    const instrumentData = {};
    allTrades.forEach(trade => {
        const type = trade.Instrument_Type || 'Unknown';
        if (!instrumentData[type]) {
            instrumentData[type] = { pnl: 0, trades: 0, wins: 0 };
        }
        instrumentData[type].pnl += trade.Total_Profit || 0;
        instrumentData[type].trades++;
        if (trade.Win_Loss === 'Win') instrumentData[type].wins++;
    });
    
    // Monthly Performance
    const monthlyData = {};
    allTrades.forEach(trade => {
        const date = new Date(trade.Close_Time || trade.Open_Time);
        if (isNaN(date.getTime())) return;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { pnl: 0, trades: 0, wins: 0 };
        }
        monthlyData[monthKey].pnl += trade.Total_Profit || 0;
        monthlyData[monthKey].trades++;
        if (trade.Win_Loss === 'Win') monthlyData[monthKey].wins++;
    });
    
    analyticsGrid.innerHTML = `
        <div class="analytics-card" id="topSymbolsCard">
            <div class="analytics-title">🏆 Top Symbols by P&L</div>
            <button class="collapse-btn" onclick="toggleCollapse('topSymbolsCard')">−</button>
            ${topSymbols.map(([symbol, data]) => `
                <div class="breakdown-item">
                    <div class="breakdown-label">${symbol}</div>
                    <div class="breakdown-value ${data.pnl >= 0 ? 'positive' : 'negative'}">
                        ${Math.round(data.pnl).toLocaleString()}
                        <div class="breakdown-subtext">${data.trades} trades, ${Math.round(data.wins / data.trades * 100)}% win rate</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="analytics-card" id="holdDurationCard">
            <div class="analytics-title">⏱️ Performance by Hold Duration</div>
            <button class="collapse-btn" onclick="toggleCollapse('holdDurationCard')">−</button>
            ${Object.entries(durationData).map(([duration, pnls]) => {
                if (pnls.length === 0) return '';
                const totalPnl = pnls.reduce((sum, pnl) => sum + pnl, 0);
                const avgPnl = totalPnl / pnls.length;
                return `
                    <div class="breakdown-item">
                        <div class="breakdown-label">${duration}</div>
                        <div class="breakdown-value ${totalPnl >= 0 ? 'positive' : 'negative'}">
                            ${Math.round(totalPnl).toLocaleString()}
                            <div class="breakdown-subtext">${pnls.length} trades, avg ${Math.round(avgPnl).toLocaleString()}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="analytics-card" id="instrumentTypeCard">
            <div class="analytics-title">📋 Performance by Instrument Type</div>
            <button class="collapse-btn" onclick="toggleCollapse('instrumentTypeCard')">−</button>
            ${Object.entries(instrumentData).map(([type, data]) => `
                <div class="breakdown-item">
                    <div class="breakdown-label">${type}</div>
                    <div class="breakdown-value ${data.pnl >= 0 ? 'positive' : 'negative'}">
                        ${Math.round(data.pnl).toLocaleString()}
                        <div class="breakdown-subtext">${data.trades} trades, ${Math.round(data.wins / data.trades * 100)}% win rate</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="analytics-card" id="monthlyPerformanceCard">
            <div class="analytics-title">📅 Monthly Performance</div>
            <button class="collapse-btn" onclick="toggleCollapse('monthlyPerformanceCard')">−</button>
            ${Object.entries(monthlyData)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 12)
                .map(([month, data]) => `
                    <div class="breakdown-item">
                        <div class="breakdown-label">${month}</div>
                        <div class="breakdown-value ${data.pnl >= 0 ? 'positive' : 'negative'}">
                            ${Math.round(data.pnl).toLocaleString()}
                            <div class="breakdown-subtext">${data.trades} trades, ${Math.round(data.wins / data.trades * 100)}% win rate</div>
                        </div>
                    </div>
                `).join('')}
        </div>
        
        <div class="analytics-card" id="dayOfWeekCard">
            <div class="analytics-title">📅 Day of Week Performance</div>
            <button class="collapse-btn" onclick="toggleCollapse('dayOfWeekCard')">−</button>
            ${getDayOfWeekPerformance().map(data => `
                <div class="breakdown-item">
                    <div class="breakdown-label">${data.day}</div>
                    <div class="breakdown-value ${data.pnl >= 0 ? 'positive' : 'negative'}">
                        ${Math.round(data.pnl).toLocaleString()}
                        <div class="breakdown-subtext">${data.trades} trades, ${data.winRate}% win rate</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="analytics-card" id="timeOfDayCard">
            <div class="analytics-title">🕒 Time of Day Performance</div>
            <button class="collapse-btn" onclick="toggleCollapse('timeOfDayCard')">−</button>
            <div class="chart-container">
                <canvas id="timeOfDayChart"></canvas>
            </div>
        </div>
        
        <div class="analytics-card" id="tradeClusteringCard">
            <div class="analytics-title">😓 Trade Clustering (Potential Tilt)</div>
            <button class="collapse-btn" onclick="toggleCollapse('tradeClusteringCard')">−</button>
            ${getTradeFrequencyClusters().map(cluster => `
                <div class="breakdown-item">
                    <div class="breakdown-label">${cluster.startTime}</div>
                    <div class="breakdown-value ${cluster.pnl >= 0 ? 'positive' : 'negative'}">
                        ${Math.round(cluster.pnl).toLocaleString()}
                        <div class="breakdown-subtext">${cluster.tradeCount} trades, ${cluster.winRate}% win rate</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="analytics-card" id="afterResultsCard">
            <div class="analytics-title">🧠 Performance After Results</div>
            <button class="collapse-btn" onclick="toggleCollapse('afterResultsCard')">−</button>
            ${getPerformanceAfterResults().map(data => `
                <div class="breakdown-item">
                    <div class="breakdown-label">${data.label}</div>
                    <div class="breakdown-value ${data.pnl >= 0 ? 'positive' : 'negative'}">
                        ${Math.round(data.pnl).toLocaleString()}
                        <div class="breakdown-subtext">${data.trades} trades, ${data.winRate}% win rate</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="analytics-card" id="positionSizeCard">
            <div class="analytics-title">💰 Performance by Position Size</div>
            <button class="collapse-btn" onclick="toggleCollapse('positionSizeCard')">−</button>
            <div class="chart-container">
                <canvas id="positionSizeChart"></canvas>
            </div>
        </div>
        
        <div class="analytics-card" id="rMultipleCard">
            <div class="analytics-title">📊 R-Multiple Distribution</div>
            <button class="collapse-btn" onclick="toggleCollapse('rMultipleCard')">−</button>
            <div class="chart-container">
                <canvas id="rMultipleChart"></canvas>
            </div>
        </div>
        
        <div class="analytics-card" id="entryTriggerCard">
            <div class="analytics-title">🎯 Entry Trigger Performance</div>
            <button class="collapse-btn" onclick="toggleCollapse('entryTriggerCard')">−</button>
            ${getEntryTriggerPerformance().map(data => `
                <div class="breakdown-item">
                    <div class="breakdown-label">${data.trigger}</div>
                    <div class="breakdown-value ${data.pnl >= 0 ? 'positive' : 'negative'}">
                        ${Math.round(data.pnl).toLocaleString()}
                        <div class="breakdown-subtext">${data.trades} trades, ${data.winRate}% win rate</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="analytics-card" id="exitQualityCard">
            <div class="analytics-title">🏁 Exit Quality</div>
            <button class="collapse-btn" onclick="toggleCollapse('exitQualityCard')">−</button>
            <div class="breakdown-item">
                <div class="breakdown-label">Profit Target Hit Rate</div>
                <div class="breakdown-value positive">${getExitQuality().targetHitRate}%</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">Stop Loss Hit Rate</div>
                <div class="breakdown-value negative">${getExitQuality().stopHitRate}%</div>
            </div>
        </div>
        
        <div class="analytics-card" id="marketRegimeCard">
            <div class="analytics-title">🌍 Market Regime Performance</div>
            <button class="collapse-btn" onclick="toggleCollapse('marketRegimeCard')">−</button>
            ${getMarketRegimePerformance().map(data => `
                <div class="breakdown-item">
                    <div class="breakdown-label">${data.regime}</div>
                    <div class="breakdown-value ${data.pnl >= 0 ? 'positive' : 'negative'}">
                        ${Math.round(data.pnl).toLocaleString()}
                        <div class="breakdown-subtext">${data.trades} trades, ${data.winRate}% win rate</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="analytics-card" id="tiltIndicatorsCard">
            <div class="analytics-title">🎰 Tilt Indicators</div>
            <button class="collapse-btn" onclick="toggleCollapse('tiltIndicatorsCard')">−</button>
            <div class="breakdown-item">
                <div class="breakdown-label">Potential Tilt Trades</div>
                <div class="breakdown-value ${getTiltIndicators().pnl >= 0 ? 'positive' : 'negative'}">
                    ${Math.round(getTiltIndicators().pnl).toLocaleString()}
                    <div class="breakdown-subtext">${getTiltIndicators().count} trades, ${getTiltIndicators().winRate}% win rate</div>
                </div>
            </div>
        </div>
        
        <div class="analytics-card" id="streaksCard">
            <div class="analytics-title">🔥 Streaks Analysis</div>
            <button class="collapse-btn" onclick="toggleCollapse('streaksCard')">−</button>
            <div class="breakdown-item">
                <div class="breakdown-label">Max Win Streak</div>
                <div class="breakdown-value positive">${getStreaksAnalysis().maxWinStreak} trades</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">Max Loss Streak</div>
                <div class="breakdown-value negative">${getStreaksAnalysis().maxLossStreak} trades</div>
            </div>
        </div>
        
        <div class="analytics-card" id="rollingWinRateCard">
            <div class="analytics-title">📈 Rolling Win Rate</div>
            <button class="collapse-btn" onclick="toggleCollapse('rollingWinRateCard')">−</button>
            <div class="chart-container">
                <canvas id="rollingWinRateChart"></canvas>
            </div>
        </div>
        
        <div class="analytics-card" id="riskMetricsCard">
            <div class="analytics-title">⚠️ Risk Metrics</div>
            <button class="collapse-btn" onclick="toggleCollapse('riskMetricsCard')">−</button>
            <div class="breakdown-item">
                <div class="breakdown-label">Largest Win</div>
                <div class="breakdown-value positive">${Math.round(getRiskMetrics().maxWin).toLocaleString()}</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">Largest Loss</div>
                <div class="breakdown-value negative">${Math.round(getRiskMetrics().maxLoss).toLocaleString()}</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">Average Trade</div>
                <div class="breakdown-value ${getRiskMetrics().avgTrade >= 0 ? 'positive' : 'negative'}">${Math.round(getRiskMetrics().avgTrade).toLocaleString()}</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">Standard Deviation</div>
                <div class="breakdown-value neutral">${Math.round(getRiskMetrics().stdDev).toLocaleString()}</div>
            </div>
        </div>
    `;
    
    renderCharts();
}

function renderCharts() {
    // Time of Day Chart
    const timeOfDayData = getTimeOfDayPerformance();
    if (timeOfDayData.length > 0) {
        charts.timeOfDayChart = new Chart(document.getElementById('timeOfDayChart'), {
            type: 'bar',
            data: {
                labels: timeOfDayData.map(b => b.hour),
                datasets: [
                    {
                        label: 'P&L ($)',
                        data: timeOfDayData.map(b => Math.round(b.pnl)),
                        backgroundColor: timeOfDayData.map(b => b.pnl >= 0 ? '#28a745' : '#dc3545'),
                        borderColor: timeOfDayData.map(b => b.pnl >= 0 ? '#218838' : '#c82333'),
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'P&L ($)' },
                        grid: { color: document.body.classList.contains('dark-mode') ? '#4a5568' : '#e9ecef' }
                    },
                    x: {
                        title: { display: true, text: 'Time of Day' },
                        grid: { color: document.body.classList.contains('dark-mode') ? '#4a5568' : '#e9ecef' }
                    }
                },
                plugins: {
                    legend: { display: true, labels: { color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#2c3e50' } },
                    title: { display: true, text: 'P&L by Time of Day', color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#2c3e50' }
                }
            }
        });
    }
    
    // Position Size Chart
    const positionSizeData = getPositionSizeAnalysis();
    if (positionSizeData.length > 0) {
        charts.positionSizeChart = new Chart(document.getElementById('positionSizeChart'), {
            type: 'bar',
            data: {
                labels: positionSizeData.map(q => q.label),
                datasets: [
                    {
                        label: 'P&L ($)',
                        data: positionSizeData.map(q => Math.round(q.pnl)),
                        backgroundColor: positionSizeData.map(q => q.pnl >= 0 ? '#28a745' : '#dc3545'),
                        borderColor: positionSizeData.map(q => q.pnl >= 0 ? '#218838' : '#c82333'),
                        borderWidth: 1
                    },
                    {
                        label: 'Win Rate (%)',
                        data: positionSizeData.map(q => q.winRate),
                        type: 'line',
                        borderColor: '#6f42c1',
                        backgroundColor: '#6f42c1',
                        yAxisID: 'y2'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'P&L ($)' },
                        grid: { color: document.body.classList.contains('dark-mode') ? '#4a5568' : '#e9ecef' }
                    },
                    y2: {
                        position: 'right',
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Win Rate (%)' },
                        grid: { display: false }
                    },
                    x: {
                        title: { display: true, text: 'Position Size Quartile' },
                        grid: { color: document.body.classList.contains('dark-mode') ? '#4a5568' : '#e9ecef' }
                    }
                },
                plugins: {
                    legend: { display: true, labels: { color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#2c3e50' } },
                    title: { display: true, text: 'Performance by Position Size', color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#2c3e50' }
                }
            }
        });
    }
    
    // R-Multiple Chart
    const rMultipleData = getRMultipleDistribution();
    if (Object.values(rMultipleData).some(v => v > 0)) {
        charts.rMultipleChart = new Chart(document.getElementById('rMultipleChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(rMultipleData),
                datasets: [
                    {
                        label: 'Trade Count',
                        data: Object.values(rMultipleData),
                        backgroundColor: '#6f42c1',
                        borderColor: '#5a3aa1',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Trades' },
                        grid: { color: document.body.classList.contains('dark-mode') ? '#4a5568' : '#e9ecef' }
                    },
                    x: {
                        title: { display: true, text: 'R-Multiple' },
                        grid: { color: document.body.classList.contains('dark-mode') ? '#4a5568' : '#e9ecef' }
                    }
                },
                plugins: {
                    legend: { display: true, labels: { color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#2c3e50' } },
                    title: { display: true, text: 'R-Multiple Distribution', color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#2c3e50' }
                }
            }
        });
    }
    
    // Rolling Win Rate Chart
    const rollingWinRateData = getRollingWinRate();
    if (rollingWinRateData.length > 0) {
        charts.rollingWinRateChart = new Chart(document.getElementById('rollingWinRateChart'), {
            type: 'line',
            data: {
                labels: rollingWinRateData.map(w => w.date),
                datasets: [
                    {
                        label: 'Rolling Win Rate (%)',
                        data: rollingWinRateData.map(w => w.winRate),
                        borderColor: '#6f42c1',
                        backgroundColor: 'rgba(111, 66, 193, 0.1)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Win Rate (%)' },
                        grid: { color: document.body.classList.contains('dark-mode') ? '#4a5568' : '#e9ecef' }
                    },
                    x: {
                        title: { display: true, text: 'Date' },
                        grid: { color: document.body.classList.contains('dark-mode') ? '#4a5568' : '#e9ecef' }
                    }
                },
                plugins: {
                    legend: { display: true, labels: { color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#2c3e50' } },
                    title: { display: true, text: 'Rolling Win Rate (50 Trades)', color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#2c3e50' }
                }
            }
        });
    }
}