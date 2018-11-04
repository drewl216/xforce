#!/usr/bin/env node

const WebSocket = require('./ws/index.js');
const Obj = require('../js/obj.js');
const Util = require("../js/util.js");
const Victor = require("../js/victor.min.js");
const ServerMessage = require("../js/serverMessage.js");

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


var objs = Array();
var connections = Array();

wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
	});

	if (objs.length > 0) {
		ws.send(ServerMessage.addObjects(objs));
	}

	connections.push(ws);
	objs.push(new Obj());
	var newId = objs.length-1;
	objs[newId].id=newId;

	sendToAll(ServerMessage.addObjects(Array(objs[newId])));
	ws.send(ServerMessage.setPlayerObject(1));
});

setInterval(function(){
	if (objs.length > 0) {
		var index = Util.rand(0,objs.length-1);
		objs[index].x++;
		sendToAll(ServerMessage.updateObjects(Array(objs[index])));
	}
},1000);

function sendToAll(message)
{
	for (var i=0;i<connections.length;i++) {
		connections[i].send(message);
	}
}
