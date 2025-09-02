let selectedDate = null;
let sortOrder = 'desc';
let analyticsGenerated = false;
let summaryGenerated = false;
let currentTradesData = [];
let currentPage = 1;
let currentPerPage = 50;
let currentSort = { column: 'closeDate', order: 'desc' };

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    updateCharts();
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    
    // Tab click listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => showTab(btn.dataset.tab));
    });
    
    // File upload listeners
    document.getElementById('csvFile').addEventListener('change', handleFile);
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragleave', handleDragLeave);
});

function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) btn.classList.add('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    if (tabName === 'analytics' && allTrades.length > 0 && !analyticsGenerated) {
        generateAnalytics();
        analyticsGenerated = true;
    }
    
    if (tabName === 'summary' && allTrades.length > 0 && !summaryGenerated) {
        generateSummaryChart();
        summaryGenerated = true;
    }
    
    if (tabName === 'symbols' && allTrades.length > 0) {
        generateSymbolAnalysis();
    }
    
    if (tabName === 'timeline' && allTrades.length > 0) {
        generateTimelineAnalysis();
    }
}

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFile(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function toggleSortOrder() {
    sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    document.querySelector('.calendar-controls button').textContent = `Toggle Order (Current: ${sortOrder === 'desc' ? 'Descending' : 'Ascending'})`;
    updateCalendarSort();
}

function updateCalendarSort() {
    const sortBy = document.getElementById('calendarSort').value;
    const sortedDates = Object.keys(dailyData).sort((a, b) => {
        let dateA, dateB;
        if (sortBy === 'buyTime') {
            // Get the earliest buy time for each day
            const tradesA = dailyData[a].tradesList;
            const tradesB = dailyData[b].tradesList;
            
            dateA = Math.min(...tradesA.map(t => {
                const openTime = new Date(t.Open_Time);
                return isNaN(openTime.getTime()) ? new Date(a).getTime() : openTime.getTime();
            }));
            dateB = Math.min(...tradesB.map(t => {
                const openTime = new Date(t.Open_Time);
                return isNaN(openTime.getTime()) ? new Date(b).getTime() : openTime.getTime();
            }));
        } else {
            // Sort by close time (latest close time for each day)
            const tradesA = dailyData[a].tradesList;
            const tradesB = dailyData[b].tradesList;
            
            dateA = Math.max(...tradesA.map(t => {
                const closeTime = new Date(t.Close_Time || t.Open_Time);
                return isNaN(closeTime.getTime()) ? new Date(a).getTime() : closeTime.getTime();
            }));
            dateB = Math.max(...tradesB.map(t => {
                const closeTime = new Date(t.Close_Time || t.Open_Time);
                return isNaN(closeTime.getTime()) ? new Date(b).getTime() : closeTime.getTime();
            }));
        }
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    displayCalendar(sortedDates);
}

function displayCalendar(sortedDates = Object.keys(dailyData).sort().reverse()) {
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarStatus = document.getElementById('calendarStatus');
    
    calendarStatus.textContent = `${sortedDates.length} trading days (click any day to see its trades)`;
    calendarGrid.innerHTML = '';
    
    sortedDates.forEach(dateKey => {
        const dayData = dailyData[dateKey];
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        dayCard.setAttribute('data-date', dateKey);
        
        const pnl = dayData.pnl;
        const pnlColor = pnl > 5000 ? '#28a745' : 
                        pnl > 1000 ? '#20c997' : 
                        pnl > 0 ? '#28a745' : 
                        pnl > -1000 ? '#fd7e14' : 
                        pnl > -5000 ? '#dc3545' : '#721c24';
        
        const backgroundColor = pnl > 5000 ? '#d4edda' : 
                              pnl > 1000 ? '#d1ecf1' : 
                              pnl > 0 ? '#e8f5e8' : 
                              pnl > -1000 ? '#fff3cd' : 
                              pnl > -5000 ? '#f8d7da' : '#f5c6cb';
        
        dayCard.style.backgroundColor = backgroundColor;
        dayCard.style.borderColor = pnlColor;
        
        dayCard.innerHTML = `
            <div class="day-date">${new Date(dateKey).toLocaleDateString()}</div>
            <div class="day-pnl" style="color: ${pnlColor}">
                ${pnl >= 0 ? '+' : ''}$${Math.round(pnl).toLocaleString()}
            </div>
            <div class="day-info">
                ${dayData.trades} trades<br>
                ${dayData.wins}W / ${dayData.losses}L
            </div>
        `;
        
        dayCard.addEventListener('click', () => selectDate(dateKey));
        calendarGrid.appendChild(dayCard);
    });
}

function selectDate(dateKey) {
    document.querySelectorAll('.day-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`[data-date="${dateKey}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    selectedDate = dateKey;
    displayTradesForDate(dateKey);
}

function displayTradesForDate(dateKey) {
    const dayData = dailyData[dateKey];
    const tradesStatus = document.getElementById('tradesStatus');
    const tradesControls = document.getElementById('tradesControls');
    
    tradesStatus.innerHTML = `
        ${new Date(dateKey).toLocaleDateString()} - 
        ${dayData.trades} trades, 
        ${dayData.pnl >= 0 ? '+' : ''}$${Math.round(dayData.pnl).toLocaleString()} P&L
    `;
    
    tradesControls.innerHTML = `
        <button class="back-btn" onclick="displayAllTrades()">← Show All Trades</button>
    `;
    
    currentTradesData = dayData.tradesList;
    currentPage = 1;
    displayTrades(currentTradesData, true);
}

function displayAllTrades() {
    selectedDate = null;
    
    document.querySelectorAll('.day-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const tradesStatus = document.getElementById('tradesStatus');
    const tradesControls = document.getElementById('tradesControls');
    
    tradesStatus.textContent = `Showing all ${allTrades.length} trades`;
    
    const sortedTrades = [...allTrades].sort((a, b) => {
        const dateA = new Date(a.Close_Time || a.Open_Time);
        const dateB = new Date(b.Close_Time || b.Open_Time);
        return dateB - dateA;
    });
    
    currentTradesData = sortedTrades;
    currentPage = 1;
    displayTrades(currentTradesData, false);
}

function applyTradeFilters() {
    const symbol = document.getElementById('symbolFilter').value.toUpperCase();
    const type = document.getElementById('typeFilter').value;
    const result = document.getElementById('resultFilter').value;
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    const filteredTrades = allTrades.filter(trade => {
        const tradeDate = new Date(trade.Close_Time || trade.Open_Time);
        return (
            (!symbol || (trade.Symbol || '').toUpperCase().includes(symbol)) &&
            (!type || (trade.Instrument_Type || 'Unknown') === type) &&
            (!result || trade.Win_Loss === result) &&
            (isNaN(startDate.getTime()) || tradeDate >= startDate) &&
            (isNaN(endDate.getTime()) || tradeDate <= endDate)
        );
    });
    
    currentTradesData = filteredTrades;
    currentPage = 1;
    displayTrades(currentTradesData);
}

function exportTrades() {
    const headers = ['Open_Time', 'Close_Time', 'Holding_Days', 'Symbol', 'Position_Name', 'Total_Profit', 'Return_Pct', 'Win_Loss', 'Instrument_Type'];
    const csv = [
        headers.join(','),
        ...allTrades.map(trade => headers.map(h => `"${trade[h] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trades_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function displayTrades(trades, showTime = false) {
    currentTradesData = trades;
    const start = (currentPage - 1) * currentPerPage;
    const end = start + currentPerPage;
    const paginatedTrades = [...trades].slice(start, end);
    
    // Apply current sort to paginated trades
    sortTrades(paginatedTrades, currentSort);
    
    const container = document.getElementById('tradesContainer');
    
    container.innerHTML = `
        <div class="trades-header">
            <div class="sortable" data-sort="openDate">Buy Date</div>
            <div class="sortable" data-sort="closeDate">${showTime ? 'Close Time' : 'Close Date'}</div>
            <div class="sortable" data-sort="holdDays">Hold Days</div>
            <div class="sortable" data-sort="symbol">Symbol</div>
            <div>Description</div>
            <div class="sortable" data-sort="pnl">P&L</div>
            <div class="sortable" data-sort="return">Return</div>
            <div class="sortable" data-sort="result">Result</div>
        </div>
    `;
    
    // Add click handlers for sorting
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (currentSort.column === column) {
                currentSort.order = currentSort.order === 'desc' ? 'asc' : 'desc';
            } else {
                currentSort = { column, order: 'desc' };
            }
            // Re-sort and re-display current page
            sortTrades(paginatedTrades, currentSort);
            renderTradeRows(paginatedTrades, showTime);
        });
    });
    
    renderTradeRows(paginatedTrades, showTime);
    
    // Update controls and pagination
    const pages = Math.ceil(trades.length / currentPerPage);
    const tradesControls = document.getElementById('tradesControls');
    
    if (!selectedDate) {
        tradesControls.innerHTML = `
            <div class="trades-controls">
                <input type="text" id="symbolFilter" placeholder="Filter by Symbol">
                <select id="typeFilter">
                    <option value="">All Types</option>
                    ${[...new Set(allTrades.map(t => t.Instrument_Type || 'Unknown'))].map(type => `<option value="${type}">${type}</option>`).join('')}
                </select>
                <select id="resultFilter">
                    <option value="">All Results</option>
                    <option value="Win">Win</option>
                    <option value="Loss">Loss</option>
                </select>
                <input type="date" id="startDate">
                <input type="date" id="endDate">
                <button onclick="applyTradeFilters()">Apply Filters</button>
                <button onclick="exportTrades()">Export Trades</button>
            </div>
        `;
    }
    
    tradesControls.innerHTML += `
        <div class="pagination">
            <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <span>Page ${currentPage} of ${pages}</span>
            <button onclick="goToPage(${currentPage + 1})" ${currentPage === pages ? 'disabled' : ''}>Next</button>
        </div>
    `;
}

function goToPage(page) {
    const maxPage = Math.ceil(currentTradesData.length / currentPerPage);
    if (page >= 1 && page <= maxPage) {
        currentPage = page;
        displayTrades(currentTradesData, selectedDate !== null);
    }
}

function sortTrades(trades, { column, order }) {
    trades.sort((a, b) => {
        let valA, valB;
        switch (column) {
            case 'openDate':
                valA = new Date(a.Open_Time).getTime();
                valB = new Date(b.Open_Time).getTime();
                // Handle invalid dates
                if (isNaN(valA)) valA = 0;
                if (isNaN(valB)) valB = 0;
                break;
            case 'closeDate':
                valA = new Date(a.Close_Time || a.Open_Time).getTime();
                valB = new Date(b.Close_Time || b.Open_Time).getTime();
                // Handle invalid dates
                if (isNaN(valA)) valA = 0;
                if (isNaN(valB)) valB = 0;
                break;
            case 'holdDays':
                valA = a.Holding_Days || (a.Holding_Hours ? a.Holding_Hours / 24 : 0);
                valB = b.Holding_Days || (b.Holding_Hours ? b.Holding_Hours / 24 : 0);
                break;
            case 'symbol':
                valA = (a.Symbol || '').toLowerCase();
                valB = (b.Symbol || '').toLowerCase();
                break;
            case 'pnl':
                valA = a.Total_Profit || 0;
                valB = b.Total_Profit || 0;
                break;
            case 'return':
                valA = a.Return_Pct || 0;
                valB = b.Return_Pct || 0;
                break;
            case 'result':
                valA = (a.Win_Loss || '').toLowerCase();
                valB = (b.Win_Loss || '').toLowerCase();
                break;
            default:
                return 0;
        }
        
        if (valA < valB) return order === 'desc' ? 1 : -1;
        if (valA > valB) return order === 'desc' ? -1 : 1;
        return 0;
    });
}

function renderTradeRows(trades, showTime) {
    const container = document.getElementById('tradesContainer');
    
    // Keep the existing header, just add rows
    const existingRows = container.querySelectorAll('.trade-row');
    existingRows.forEach(row => row.remove());
    
    trades.forEach(trade => {
        const row = document.createElement('div');
        row.className = `trade-row ${trade.Win_Loss === 'Win' ? 'win' : 'loss'}`;
        
        const openDate = trade.Open_Time ? new Date(trade.Open_Time).toLocaleDateString() : 'N/A';
        const closeDate = trade.Close_Time ? 
            (showTime ? new Date(trade.Close_Time).toLocaleTimeString() : new Date(trade.Close_Time).toLocaleDateString()) : 
            'Open';
        
        const holdDays = trade.Holding_Days || 
            (trade.Holding_Hours ? Math.round(trade.Holding_Hours / 24 * 10) / 10 : 0);
        
        const pnl = trade.Total_Profit || 0;
        const returnPct = trade.Return_Pct || 0;
        
        row.innerHTML = `
            <div class="trade-date">${openDate}</div>
            <div class="trade-date">${closeDate}</div>
            <div class="trade-date">${holdDays}d</div>
            <div class="trade-symbol">${trade.Symbol || 'N/A'}</div>
            <div>${trade.Position_Name || `${trade.Symbol} ${trade.Instrument_Type || 'Stock'}`}</div>
            <div class="${pnl >= 0 ? 'positive' : 'negative'}">
                ${pnl >= 0 ? '+' : ''}${Math.round(pnl).toLocaleString()}
            </div>
            <div class="${returnPct >= 0 ? 'positive' : 'negative'}">
                ${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%
            </div>
            <div class="${trade.Win_Loss === 'Win' ? 'positive' : 'negative'}">
                ${trade.Win_Loss || 'Unknown'}
            </div>
        `;
        
        container.appendChild(row);
    });
}

function toggleCollapse(cardId) {
    const card = document.getElementById(cardId);
    card.classList.toggle('collapsed');
    const btn = card.querySelector('.collapse-btn');
    btn.textContent = card.classList.contains('collapsed') ? '+' : '−';
}

function updateCharts() {
    // Re-render charts with updated theme colors
    if (typeof charts !== 'undefined' && Object.keys(charts).length > 0) {
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        if (typeof renderCharts === 'function') {
            renderCharts();
        }
    }
    
    // Re-render summary chart if it exists
    if (summaryChart && typeof summaryChart.destroy === 'function') {
        summaryChart.destroy();
        if (typeof renderSummaryChart === 'function' && summaryData && summaryData[currentAggregation]) {
            const periods = Object.values(summaryData[currentAggregation]).sort((a, b) => a.period.localeCompare(b.period));
            renderSummaryChart(periods);
        }
    }
}