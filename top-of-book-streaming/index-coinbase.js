const launchChartBtn = document.querySelector('#launch-chart');
const closeChartBtn = document.querySelector('#close-chart');
const canvasDiv = document.querySelector('#canvas-div');
const canvasID = 'top-of-book-chart';

let winWidth = window.innerWidth;
let winHeight = window.innerHeight;
canvasDiv.style.width = winWidth * 0.8 + 'px';
canvasDiv.style.height = winHeight * 0.8 + 'px';

window.onresize = function() {
    winWidth = window.innerWidth;
    winHeight = window.innerHeight;
    canvasDiv.style.width = winWidth * 0.8 + 'px';
    canvasDiv.style.height = winHeight * 0.8 + 'px';
}

launchChartBtn.addEventListener('click', () => {
    launchChartBtn.style.display = 'none';
    closeChartBtn.style.display = 'block';

    loadWSSDataAndDisplayCanvas();
});

closeChartBtn.addEventListener('click', () => {
    launchChartBtn.style.display = 'block';
    closeChartBtn.style.display = 'none';

    removeCanvasAndCloseConnections();
});

function displayBtns() {
    launchChartBtn.style.display = 'block';
    closeChartBtn.style.display = 'none';
};

let buf = {};
let exchange = 'Coinbase';
let wssConnections = [];
let pair = 'BTC-USD'

function loadWSSDataAndDisplayCanvas() {
    buf[exchange] = [[], []];
    let streamer = new WebSocket('wss://ws-feed.pro.coinbase.com');
    wssConnections.push(streamer);

    streamer.onopen = () => {
        let subRequest = {
            'type': 'subscribe',
            'product_ids': [ pair ],
            'channels': [
                'heartbeat',
                {
                    'name': 'ticker',
                    'product_ids': [pair]
                }
            ]
        };
        streamer.send(JSON.stringify(subRequest));
    }

    streamer.onmessage = (message) => {
        let data = JSON.parse(message.data);

        if (data['type'] === 'error') {
            
            console.log(data.message);
            removeCanvasAndCloseConnections();
            alert(data.message);

        } else if (data['type'] === 'subscriptions') {

            console.log("Subscribed:" + JSON.stringify(data.channels));

        } else if (data['type'] === 'heartbeat') {

            let time = data.time;
            console.log('Heartbeat: ' + time);

        };

        if (data['type'] === 'ticker') {
            let topBid = data['best_bid'];
            let topAsk = data['best_ask'];
            let timestamp = Date.parse(data['time']);

            if (topBid) {
                buf[exchange][0].push({
                    x: timestamp,
                    y: topBid
                });
            }
            if (topAsk) {
                buf[exchange][1].push({
                    x: timestamp,
                    y: topAsk
                });
            }
        }
    }

    createCanvas();
}

function createCanvas() {

    let canvas = document.createElement("canvas");
    canvas.id = canvasID;
    canvasDiv.appendChild(canvas);

    let ctx = canvas.getContext('2d');

    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                data: [],
                label: 'Bid',
                borderColor: 'rgb(0, 255, 0)', // line color
                backgroundColor: 'rgba(0, 255, 0, 0.5)', // fill color
                fill: false,                      // no fill
                lineTension: 0                    // straight line
            }, {
                data: [],
                label: 'Ask',
                borderColor: 'rgb(255, 0, 0)', // line color
                backgroundColor: 'rgba(255, 0, 0, 0.5)', // fill color
                fill: false,                      // no fill
                lineTension: 0                    // straight line
            }]
        },
        options: {
            title: {
                text: exchange + pair + 'top of book', // chart title
                display: true
            },
            scales: {
                xAxes: [{
                    type: 'realtime' // auto-scroll on X axis
                }]
            },
            plugins: {
                streaming: {
                    duration: 300000, // display data for the latest 300000ms (5 mins)
                    onRefresh: (chart) => { // callback on chart update interval
                        Array.prototype.push.apply(
                            chart.data.datasets[0].data, buf[exchange][0]
                        );            // add 'buy' price data to chart
                        Array.prototype.push.apply(
                            chart.data.datasets[1].data, buf[exchange][1]
                        );            // add 'sell' price data to chart
                        buf[exchange] = [[], []]; // clear buffer
                    }
                }
            }
        }
    });    
}

function unsubscribe(wssConnections) {

    let unsubscribeRequest = {
        'type': 'unsubscribe',
        'product_ids': [ pair ],
        'channels': [
            'heartbeat',
            {
                'name': 'ticker',
                'product_ids': [pair]
            }
        ]
    };

    wssConnections.forEach(conn => {

        conn.send(JSON.stringify(unsubscribeRequest));
        conn.close();
    });

    console.log('WSS connections closed')
};

function removeCanvasAndCloseConnections() {
    let canvas = document.querySelector('#' + canvasID);
    canvasDiv.removeChild(canvas);

    unsubscribe(wssConnections);

};

document.body.onload = displayBtns;
