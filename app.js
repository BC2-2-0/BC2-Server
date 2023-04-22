const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const config = require('./config');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/status', (request, response) => response.json({ clients: clients.length }));

const PORT = 3000;

const conn = mysql.createConnection(config.mysql);

let clients = [];
let livestreamEvents = [];

app.listen(PORT, '10.82.18.24', () => {
  console.log(`Livestream service starting`);
});

function eventsHandler(request, response) {
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
  console.log(request.body.menu);
  if (request.body.menu == undefined) {
    // Mining Event
    const result = await conn.promise().query('SELECT MAX(mid) as max_mid FROM livestream_events');
    const newMid = result[0][0].max_mid + 1;
    request.body.mid = newMid;
    request.body.type = 'mining';
  } else {
    // Block Event
    const result = await conn.promise().query('SELECT MAX(bid) as max_bid FROM livestream_events');
    const newBid = result[0][0].max_bid + 1;
    request.body.bid = newBid;
    request.body.type = 'block';
  }

  const livestreamEvent = request.body;
  const sql = 'INSERT INTO livestream_events SET ?';
  await conn.promise().query(sql, livestreamEvent);
  livestreamEvents.push(livestreamEvent);
  console.log(request.body);
  response.json(livestreamEvent);
  sendEventsToAll(livestreamEvent);
}

app.post('/send', addLivestreamEvent);

function sendEventsToAll(livestreamEvent) {
  clients.forEach((client) => client.response.write(`data: ${JSON.stringify(livestreamEvent)}\n\n`));
}