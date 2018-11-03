#!/usr/bin/env node

const WebSocket = require('./ws/index.js');
const Obj = require('../js/obj.js');



const wss = new WebSocket.Server({
	port: 8080,
		perMessageDeflate: {
			zlibDeflateOptions: { // See zlib defaults.
			  chunkSize: 1024,
			  memLevel: 7,
			  level: 3,
			},
			zlibInflateOptions: {
			  chunkSize: 10 * 1024
			},
			// Other options settable:
			clientNoContextTakeover: true, // Defaults to negotiated value.
			serverNoContextTakeover: true, // Defaults to negotiated value.
			serverMaxWindowBits: 10,       // Defaults to negotiated value.
			// Below options specified as default values.
			concurrencyLimit: 10,          // Limits zlib concurrency for perf.
			threshold: 1024,               // Size (in bytes) below which messages
	 }
});

console.log(Obj);

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });



	var objs = Array();
	objs.push(new Obj());
	objs.push(new Obj());

	var json_objs = Array();

	for (var i=0;i<objs.length;i++) {
		json_objs.push(objs[i].toJson());
	}

	var encoded = JSON.stringify(json_objs);
	ws.send(encoded);
});

