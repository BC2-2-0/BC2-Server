const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
const config = require('./config');
require('dotenv').config();


const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/status', (request, response) => response.json({ clients: clients.length }));

const PORT = 3000;

const conn = mysql.createConnection(config.mysql);

let clients = [];
let livestreamEvents = [];

var mid = 102;
var pid = 100;

app.listen(PORT, process.env.PORT, () => {
  console.log(`Livestream service starting`);
});

function eventsHandler(request, response) {
  console.log("receive")
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  };
  response.writeHead(200, headers);

  const data = 'connect';

  response.write(data);

  const clientId = Date.now();

  const newClient = {
    id: clientId,
    response,
  };

  clients.push(newClient);

  request.on('close', () => {
    console.log(clientId);
  });
}

app.get('/receive', eventsHandler);

async function addLivestreamEvent(request, response) {
  console.log("send")
  if (request.body.menu == undefined) {
    // Mining Event
    console.log("mining");
    conn.query(`insert into mining values(0)`,(err,rows,field)=>{
        if(err) throw err;
    })
    request.body.mid = mid;
    request.body.type = 'mining';
    mid += 1;
  } else {
    // PAY Event
    console.log("pay");
    conn.query(`insert into pay values(0)`,(err,rows,field)=>{
        if(err) throw err;
    })
    request.body.bid = pid;
    request.body.type = 'block';
  }

  const livestreamEvent = request.body;
  livestreamEvents.push(livestreamEvent);
  console.log("body", request.body);
  response.json(livestreamEvent);
  sendEventsToAll(livestreamEvent);
}

app.post('/send', addLivestreamEvent);

function sendEventsToAll(livestreamEvent) {
  clients.forEach((client) => client.response.write(`data: ${JSON.stringify(livestreamEvent)}\n\n`));
}

var balance; // 잔고
var price;   // 상품 가격
var item; // 상품 이름

async function purchaseProduct(request, response) {
  console.log("purchase")
  if (request.body.balance - request.body.price >= 0) {
    request.body.type = 'Success payment';
  } else {
    request.body.type = 'Fail payment';
  }

  const livestreamEvent = request.body;
  livestreamEvents.push(livestreamEvent);
  console.log("body", request.body);
  response.json(livestreamEvent);
  sendEventsToAll(livestreamEvent)
}

app.post('/purchase', purchaseProduct);
