const form = document.querySelector('form');
const apiKeyInput = document.querySelector('#enter-api-key');
const submitBtn = document.querySelector('#submit-api-key');
const clearBtn = document.querySelector('#clear-api-key');
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

form.addEventListener('submit', (e) => {
    e.preventDefault();
});

submitBtn.addEventListener('click', () => {
    localStorage.setItem('apiKey', apiKeyInput.value);
    displayAPIForm();
});

clearBtn.addEventListener('click', () => {
    localStorage.removeItem('apiKey');
    displayAPIForm();
    removeCanvasAndCloseConnections();
});

function displayAPIForm() {

    if (localStorage.getItem('apiKey')) {
        form.style.display = 'none';
        loadWSSDataAndDisplayCanvas();
    } else {
        form.style.display = 'block';
    }
};

let buf = {};
let exchange = 'Binance';
let wssConnections = [];

function loadWSSDataAndDisplayCanvas() {
    buf[exchange] = [[], []];
    let apiKey = localStorage.getItem('apiKey');
    let ccStreamer = new WebSocket('wss://streamer.cryptocompare.com/v2?api_key=' + apiKey);
    wssConnections.push(ccStreamer);

    ccStreamer.onopen = () => {
        let subRequest = {
            'action': 'SubAdd',
            'subs': ['30~Binance~BTC~USDT']
        };
        ccStreamer.send(JSON.stringify(subRequest));
    }

    ccStreamer.onmessage = (message) => {
        let data = JSON.parse(message.data);
        console.log(data);
        if (data['TYPE'] === '500') {
            let info = data['INFO'];
            alert(info + ' Please refresh page for a new entry.')

        } else if (data['TYPE'] === '401') {
            let info = data['INFO'];
            alert('CryptoCompare message: ' + info);
        }

        if (data['TYPE'] === '30') {
            let topBid = data['BID']
            let topAsk = data['ASK']
            
            if (topBid) {
                buf[exchange][0].push({
                    x: topBid[0]["REPORTEDNS"] / 1000000,
                    y: topBid[0]["P"]
                });
            }
            if (topAsk) {
                buf[exchange][1].push({
                    x: topAsk[0]["REPORTEDNS"] / 1000000,
                    y: topAsk[0]["P"]
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
                borderColor: 'rgb(54, 162, 235)', // line color
                backgroundColor: 'rgba(54, 162, 235, 0.5)', // fill color
                fill: false,                      // no fill
                lineTension: 0                    // straight line
            }, {
                data: [],
                label: 'Ask',
                borderColor: 'rgb(255, 99, 132)', // line color
                backgroundColor: 'rgba(255, 99, 132, 0.5)', // fill color
                fill: false,                      // no fill
                lineTension: 0                    // straight line
            }]
        },
        options: {
            title: {
                text: 'Binance BTC/USDT top of book', // chart title
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

function removeCanvasAndCloseConnections() {
    let canvas = document.querySelector('#' + canvasID);
    canvasDiv.removeChild(canvas);
    wssConnections.forEach(conn => conn.close());
};

document.body.onload = displayAPIForm;
