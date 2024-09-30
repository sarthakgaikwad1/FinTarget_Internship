const socketUrl = 'wss://stream.binance.com:9443/ws';
let socket = null;
let chart = null;
let storedData = {};

// Initialize the chart and manage candlestick data
function initializeChart(symbol, interval) {
    console.log(`Initializing chart for ${symbol} at interval ${interval}`);
    const chartData = storedData[symbol]?.[interval] || [];

    const ctx = document.getElementById('candlestickChart').getContext('2d');
    if (chart) {
        chart.destroy();
    }
    chart = new Chart(ctx, {
        type: 'candlestick',
        data: {
            datasets: [{
                label: `${symbol.toUpperCase()} ${interval}`,
                data: chartData
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        tooltipFormat: 'll HH:mm'
                    },
                    ticks: {
                        source: 'auto'
                    }
                }
            }
        }
    });
}

// Connect to WebSocket and fetch live data
function connectWebSocket(symbol, interval) {
    if (socket) {
        console.log('Closing previous WebSocket connection');
        socket.close();
    }

    // Construct the WebSocket URL
    const wsUrl = `${socketUrl}/${symbol}@kline_${interval}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const candlestick = message.k;

        // Only process the candlestick if it is closed (finalized)
        if (!candlestick.x) {
            return;
        }

        const newCandle = {
            t: candlestick.t,
            o: candlestick.o,
            h: candlestick.h,
            l: candlestick.l,
            c: candlestick.c
        };

        console.log(`New candle for ${symbol}:`, newCandle);

        // Store data in memory and in localStorage for persistence
        if (!storedData[symbol]) {
            storedData[symbol] = {};
        }

        if (!storedData[symbol][interval]) {
            storedData[symbol][interval] = [];
        }

        storedData[symbol][interval].push(newCandle);

        // Save to localStorage
        localStorage.setItem('candlestickData', JSON.stringify(storedData));

        updateChart(newCandle);
    };
}

// Update chart with new candlestick
function updateChart(candle) {
    if (!chart) {
        return;
    }

    const data = chart.data.datasets[0].data;
    data.push(candle);
    chart.update();
}

// Restore data from localStorage
function restoreDataFromLocalStorage() {
    const storedCandles = localStorage.getItem('candlestickData');
    if (storedCandles) {
        storedData = JSON.parse(storedCandles);
    }
}

// Handle symbol and interval changes
document.getElementById('symbol').addEventListener('change', function () {
    const symbol = this.value;
    const interval = document.getElementById('interval').value;
    initializeChart(symbol, interval);
    connectWebSocket(symbol, interval);
});

document.getElementById('interval').addEventListener('change', function () {
    const interval = this.value;
    const symbol = document.getElementById('symbol').value;
    initializeChart(symbol, interval);
    connectWebSocket(symbol, interval);
});

// Initialize
restoreDataFromLocalStorage();
initializeChart('ethusdt', '1m');
connectWebSocket('ethusdt', '1m');
