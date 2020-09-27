const canvasDiv = document.querySelector('#canvas-div');
const canvasID = 'top-of-book-chart';

let buf = {};
let exchange = 'Coinbase';
let pair = 'BTC-USD'

function loadWSSDataAndDisplayCanvas() {

    buf[exchange] = [[], []];
    let streamer = new WebSocket('wss://ws-feed.pro.coinbase.com');

    streamer.onopen = () => {
        let subRequest = {
            'type': 'subscribe',
            'product_ids': [ pair ],
            'channels': [
                'heartbeat',
                {
                    'name': 'ticker',
                    'product_ids': [ pair ]
                }
            ]
        };
        streamer.send(JSON.stringify(subRequest));
    }

    streamer.onmessage = (message) => {
        let data = JSON.parse(message.data);

        if (data['type'] === 'heartbeat') {

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
};

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
                borderColor: 'rgb(0, 255, 0)',
                backgroundColor: 'rgba(0, 255, 0, 0.5)',
                fill: false,
                lineTension: 0
            }, {
                data: [],
                label: 'Ask',
                borderColor: 'rgb(255, 0, 0)',
                backgroundColor: 'rgba(255, 0, 0, 0.5)',
                fill: false,
                lineTension: 0
            }]
        },
        options: {
            title: {
                text: `${exchange} ${pair} top of book`,
                display: true
            },
            scales: {
                xAxes: [{
                    type: 'realtime'
                }]
            },
            plugins: {
                streaming: {
                    duration: 300000, // display for last 5 minutes (300000ms)
                    onRefresh: (chart) => {
                        Array.prototype.push.apply(
                            chart.data.datasets[0].data, buf[exchange][0]
                        );
                        Array.prototype.push.apply(
                            chart.data.datasets[1].data, buf[exchange][1]
                        );
                        buf[exchange] = [[], []];
                    }
                }
            }
        }
    })
};

document.body.onload = loadWSSDataAndDisplayCanvas;
