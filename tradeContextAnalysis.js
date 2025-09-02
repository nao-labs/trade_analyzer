// tradeContextAnalysis.js - New Module for Trade Context Analysis

const API_BASE_URL = 'http://152.42.239.83:4000/api';
// auth.js - Handles API Authentication and Token Management

/**
 * Main function to start the context analysis for a selected timeline.
 * @param {string} timelineKey - The key for the selected timeline (e.g., "AAPL-2025-08").
 */
async function initiateTradeContextAnalysis(timelineKey) {
    const timelineInfo = window.timelineData[timelineKey];
    if (!timelineInfo) {
        alert('Could not find timeline data. Please try again.');
        return;
    }

    showLoadingModal('Fetching market and indicator data...');

    const { symbol, firstTradeDate, lastTradeDate } = timelineInfo;
    const startDate = firstTradeDate.toISOString().split('T')[0];
    const endDate = lastTradeDate.toISOString().split('T')[0];

    try {
        // Fetch both technical indicators and daily prices in parallel
        const [indicators, dailyPrices] = await Promise.all([
            fetchApiData(`/technical_indicators/${symbol}?start_date=${startDate}&end_date=${endDate}`),
            fetchApiData(`/daily_prices/${symbol}?start_date=${startDate}&end_date=${endDate}`)
        ]);

        if (!indicators || !dailyPrices) {
            throw new Error('Failed to fetch required data from the API.');
        }

        // Process and merge the data
        const mergedTradeData = processAndMergeData(timelineInfo, indicators, dailyPrices);

        // Display the results in a modal
        displayContextAnalysisModal(mergedTradeData, timelineInfo);

    } catch (error) {
        console.error('Error during trade context analysis:', error);
        showLoadingModal(`Error: ${error.message}`, true);
    }
}

/**
 * Generic utility to fetch data from the backend API.
 * @param {string} endpoint - The API endpoint to query.
 */
async function fetchApiData(endpoint) {
    const token = getApiToken();
    if (!token || token === 'YOUR_JWT_TOKEN_HERE') {
        throw new Error('Authentication token is missing. Please implement getApiToken().');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`API request failed for ${endpoint} with status ${response.status}`);
    }

    return response.json();
}

/**
 * Merges trade data with technical indicators and daily prices.
 * @param {object} timelineInfo - The original timeline data object.
 * @param {Array} indicators - Array of technical indicator objects from the API.
 * @param {Array} dailyPrices - Array of daily price objects from the API.
 * @returns {Array} - An array of trades, each augmented with indicator data.
 */
function processAndMergeData(timelineInfo, indicators, dailyPrices) {
    // Create maps for efficient O(1) lookups by date
    const indicatorMap = new Map(indicators.map(i => [i.date, i]));
    const priceMap = new Map(dailyPrices.map(p => [p.date.split('T')[0], p]));

    return timelineInfo.trades.map(trade => {
        const tradeDate = new Date(trade.Open_Time).toISOString().split('T')[0];
        
        const dayIndicators = indicatorMap.get(tradeDate);
        const dayPriceInfo = priceMap.get(tradeDate);
        const closePrice = dayPriceInfo ? dayPriceInfo.close_price : null;

        const augmentedTrade = { ...trade };

        if (dayIndicators && closePrice) {
            const { ema_10, ema_20, sma_50 } = dayIndicators;

            augmentedTrade.indicators = {
                closePrice,
                ema10: ema_10,
                ema20: ema_20,
                sma50: sma_50,
                ext_ema10: ema_10 ? ((closePrice - ema_10) / ema_10) * 100 : null,
                ext_ema20: ema_20 ? ((closePrice - ema_20) / ema_20) * 100 : null,
                ext_sma50: sma_50 ? ((closePrice - sma_50) / sma_50) * 100 : null,
            };
        } else {
            augmentedTrade.indicators = null; // No data for this trade date
        }
        return augmentedTrade;
    }).sort((a, b) => new Date(b.Open_Time) - new Date(a.Open_Time)); // Sort newest first
}

/**
 * Creates and displays the analysis results in a modal window.
 * @param {Array} mergedData - The augmented trade data.
 * @param {object} timelineInfo - The original timeline info for context.
 */
function displayContextAnalysisModal(mergedData, timelineInfo) {
    closeContextModal(); // Close any existing modal first

    const modalHtml = `
        <div class="context-modal-overlay" onclick="closeContextModal()">
            <div class="context-modal-content" onclick="event.stopPropagation()">
                <div class="context-modal-header">
                    <h2>Trade Context Analysis: ${timelineInfo.symbol} - ${timelineInfo.monthDisplay}</h2>
                    <button class="context-modal-close" onclick="closeContextModal()">×</button>
                </div>
                <div class="context-modal-body">
                    <p class="context-summary">
                        Analyzing ${mergedData.length} trades. "Ext %" shows how far the closing price was from the indicator on the trade day.
                    </p>
                    <div class="context-table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Open Date</th>
                                    <th>P&L</th>
                                    <th>Result</th>
                                    <th>Day's Close</th>
                                    <th>EMA 10</th>
                                    <th>Ext %</th>
                                    <th>EMA 20</th>
                                    <th>Ext %</th>
                                    <th>SMA 50</th>
                                    <th>Ext %</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${mergedData.map(createContextTableRow).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Creates the HTML for a single row in the analysis table.
 * @param {object} trade - A single augmented trade object.
 */
function createContextTableRow(trade) {
    const pnl = parseFloat(trade.Total_Profit) || 0;
    const pnlClass = pnl >= 0 ? 'positive' : 'negative';
    const resultClass = trade.Win_Loss === 'Win' ? 'positive' : 'negative';
    const indicators = trade.indicators;

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const formatIndicator = (value) => value ? value.toFixed(2) : 'N/A';
    
    const formatExtension = (ext) => {
        if (ext === null || isNaN(ext)) return 'N/A';
        const extClass = ext > 5 ? 'ext-high' : ext < -5 ? 'ext-low' : 'ext-mid';
        const sign = ext > 0 ? '+' : '';
        return `<span class="${extClass}">${sign}${ext.toFixed(1)}%</span>`;
    };

    return `
        <tr>
            <td>${formatDate(trade.Open_Time)}</td>
            <td class="${pnlClass}">$${Math.round(pnl).toLocaleString()}</td>
            <td class="${resultClass}">${trade.Win_Loss}</td>
            ${indicators ? `
                <td>$${formatIndicator(indicators.closePrice)}</td>
                <td>$${formatIndicator(indicators.ema10)}</td>
                <td>${formatExtension(indicators.ext_ema10)}</td>
                <td>$${formatIndicator(indicators.ema20)}</td>
                <td>${formatExtension(indicators.ext_ema20)}</td>
                <td>$${formatIndicator(indicators.sma50)}</td>
                <td>${formatExtension(indicators.ext_sma50)}</td>
            ` : `
                <td colspan="7" class="no-data">Market data not available for this day.</td>
            `}
        </tr>
    `;
}

/**
 * Shows a loading/message modal.
 * @param {string} message - The message to display.
 * @param {boolean} isError - If true, styles as an error message.
 */
function showLoadingModal(message, isError = false) {
    closeContextModal();
    const modalHtml = `
        <div class="context-modal-overlay" onclick="closeContextModal()">
            <div class="context-modal-content loading-modal ${isError ? 'error' : ''}">
                <p>${message}</p>
                ${isError ? `<button onclick="closeContextModal()">Close</button>` : ''}
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}


/**
 * Closes the analysis modal window.
 */
function closeContextModal() {
    const modal = document.querySelector('.context-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Make the initiator function globally available
window.initiateTradeContextAnalysis = initiateTradeContextAnalysis;