const closeChartBtn = document.querySelector('#close-chart');
const canvasDiv = document.querySelector('#canvas-div');
const canvasID = 'top-of-book-chart';
const searchInput = document.querySelector('#searchInput');
const dropBtn = document.querySelector('.dropBtn');
const dropDownList = document.querySelector('#dropDownList');
const dropDownOptions = document.querySelectorAll('#dropDownList option');

let winWidth = window.innerWidth;
let winHeight = window.innerHeight;
canvasDiv.style.width = winWidth * 0.8 + 'px';
canvasDiv.style.height = winHeight * 0.8 + 'px';
window.onresize = function() {
    winWidth = window.innerWidth;
    winHeight = window.innerHeight;
    canvasDiv.style.width = winWidth * 0.8 + 'px';
    canvasDiv.style.height = winHeight * 0.8 + 'px';
};

dropBtn.addEventListener('click', showDropList);
searchInput.addEventListener('keyup', filterOptions);

for (let i=0; i < dropDownOptions.length; i++) {
    dropDownOptions[i].addEventListener('click', () => {

        dropDownList.classList.toggle('show');
        dropBtn.style.display = 'none';
        closeChartBtn.style.display = 'block';
        
        optionClick(dropDownOptions[i]);
        
    });
};

closeChartBtn.addEventListener('click', () => {
    dropBtn.style.display = 'block';
    closeChartBtn.style.display = 'none';

    removeCanvasAndCloseConnections();
});

function showDropList() {
    document.querySelector('#dropDownList').classList.toggle('show');
};

function optionClick(opt) {
    pair = opt.value;
    console.log('Streaming ' + pair);
    loadWSSDataAndDisplayCanvas(pair);
};

function filterOptions() {

    let input, filter, options, i;

    input = document.querySelector('#searchInput');
    filter = input.value.toUpperCase();
    options = document.querySelectorAll('#dropDownList option');
    
    for (i = 0; i < options.length; i++) {
        txtValue = options[i].textContent || options[i].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            options[i].style.display = '';
        } else {
            options[i].style.display = 'none';
        }
    }
};

function displayBtns() {
    dropBtn.style.display = 'block';
    closeChartBtn.style.display = 'none';
};

let buf = {};
let exchange = 'Coinbase';
let streamerObj = {};

function unMapPair(pair) {
    return pair.replace("_", "-");
};

function loadWSSDataAndDisplayCanvas(pair) {

    unMappedPair = unMapPair(pair);

    buf[exchange] = [[], []];
    let streamer = new WebSocket('wss://ws-feed.pro.coinbase.com');
    
    streamerObj["streamer"] = streamer;
    streamerObj["pair"] = unMappedPair;

    streamer.onopen = () => {
        let subRequest = {
            'type': 'subscribe',
            'product_ids': [ unMappedPair ],
            'channels': [
                'heartbeat',
                {
                    'name': 'ticker',
                    'product_ids': [ unMappedPair ]
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

    createCanvas(pair);
};

function createCanvas(pair) {

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
                text: `${exchange} ${pair} top of book`, // chart title
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
    })
};

function unsubscribe(streamerObj) {

    let unsubscribeRequest = {
        'type': 'unsubscribe',
        'product_ids': [ streamerObj.pair ],
        'channels': [
            'heartbeat',
            {
                'name': 'ticker',
                'product_ids': [ streamerObj.pair ]
            }
        ]
    };

    streamerObj.streamer.send(JSON.stringify(unsubscribeRequest));
    streamerObj.streamer.close();

    console.log('WSS connections closed')
};

function removeCanvasAndCloseConnections() {
    let canvas = document.querySelector('#' + canvasID);
    canvasDiv.removeChild(canvas);

    unsubscribe(streamerObj);

};

document.body.onload = displayBtns;
