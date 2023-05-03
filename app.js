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

var mid = 36;
var pid = 0;

app.listen(PORT, '10.10.10.6', () => {
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
  //const sql = 'INSERT INTO livestream_events SET ?';
  //await conn.promise().query(sql, livestreamEvent);
  livestreamEvents.push(livestreamEvent);
  console.log("body", request.body);
  response.json(livestreamEvent);
  sendEventsToAll(livestreamEvent);
}

app.post('/send', addLivestreamEvent);

function sendEventsToAll(livestreamEvent) {
  clients.forEach((client) => client.response.write(`data: ${JSON.stringify(livestreamEvent)}\n\n`));
}
