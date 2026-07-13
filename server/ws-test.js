import { WebSocket } from 'ws';
const ws = new WebSocket('wss://profundx.com/ws');

ws.on('open', () => {
    console.log('Connected to WS');
    ws.send(JSON.stringify({
        type: 'subscribe',
        symbols: ['BTCUSDT'],
        interval: '1h',
        needsInitial: true
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'initial') {
        console.log(`Received initial for ${msg.symbol}. Klines count: ${msg.klines.length}`);
        if (msg.klines.length > 0) {
            console.log('First kline:', msg.klines[0]);
            console.log('Last kline:', msg.klines[msg.klines.length - 1]);
            
            console.log('First date:', new Date(msg.klines[0].time * 1000).toISOString());
            console.log('Last date:', new Date(msg.klines[msg.klines.length - 1].time * 1000).toISOString());
        }
        process.exit(0);
    }
});
ws.on('error', (err) => {
    console.error(err);
    process.exit(1);
});
