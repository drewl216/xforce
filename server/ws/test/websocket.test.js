/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^ws$" }] */

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');

const constants = require('../lib/constants');
const WebSocket = require('..');

class CustomAgent extends http.Agent {
  addRequest () {}
}

describe('WebSocket', function () {
  describe('#ctor', function () {
    it('throws an error when using an invalid url', function () {
      assert.throws(
        () => new WebSocket('ws+unix:'),
        /^Error: Invalid URL: ws\+unix:$/
      );
    });

    it('accepts `url.Url` objects as url', function (done) {
      const agent = new CustomAgent();

      agent.addRequest = (req) => {
        assert.strictEqual(req.path, '/');
        done();
      };

      // eslint-disable-next-line node/no-deprecated-api
      const ws = new WebSocket(url.parse('ws://localhost'), { agent });
    });

    it('accepts `url.URL` objects as url', function (done) {
      if (!url.URL) return this.skip();

      const agent = new CustomAgent();

      agent.addRequest = (req, opts) => {
        assert.strictEqual(opts.host, '::1');
        assert.strictEqual(req.path, '/');
        done();
      };

      const ws = new WebSocket(new url.URL('ws://[::1]'), { agent });
    });

    describe('options', function () {
      it('accepts the `options` object as 3rd argument', function () {
        const agent = new CustomAgent();
        let count = 0;
        let ws;

        agent.addRequest = () => count++;

        ws = new WebSocket('ws://localhost', undefined, { agent });
        ws = new WebSocket('ws://localhost', null, { agent });
        ws = new WebSocket('ws://localhost', [], { agent });

        assert.strictEqual(count, 3);
      });

      it('accepts the `maxPayload` option', function (done) {
        const maxPayload = 20480;
        const wss = new WebSocket.Server({
          perMessageDeflate: true,
          port: 0
        }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`, {
            perMessageDeflate: true,
            maxPayload
          });

          ws.on('open', () => {
            assert.strictEqual(ws._receiver._maxPayload, maxPayload);
            assert.strictEqual(
              ws._receiver._extensions['permessage-deflate']._maxPayload,
              maxPayload
            );
            wss.close(done);
          });
        });
      });

      it('throws an error when using an invalid `protocolVersion`', function () {
        const options = { agent: new CustomAgent(), protocolVersion: 1000 };

        assert.throws(
          () => new WebSocket('ws://localhost', options),
          /^RangeError: Unsupported protocol version: 1000 \(supported versions: 8, 13\)$/
        );
      });
    });
  });

  describe('Constants', function () {
    const readyStates = {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3
    };

    Object.keys(readyStates).forEach((state) => {
      describe(`\`${state}\``, function () {
        it('is enumerable property of class', function () {
          const propertyDescripter = Object.getOwnPropertyDescriptor(WebSocket, state);

          assert.strictEqual(propertyDescripter.value, readyStates[state]);
          assert.strictEqual(propertyDescripter.enumerable, true);
        });

        it('is property of instance', function () {
          const ws = new WebSocket('ws://localhost', {
            agent: new CustomAgent()
          });

          assert.strictEqual(ws[state], readyStates[state]);
        });
      });
    });
  });

  describe('Attributes', function () {
    describe('`binaryType`', function () {
      it("defaults to 'nodebuffer'", function () {
        const ws = new WebSocket('ws://localhost', {
          agent: new CustomAgent()
        });

        assert.strictEqual(ws.binaryType, 'nodebuffer');
      });

      it("can be changed to 'arraybuffer' or 'fragments'", function () {
        const ws = new WebSocket('ws://localhost', {
          agent: new CustomAgent()
        });

        ws.binaryType = 'arraybuffer';
        assert.strictEqual(ws.binaryType, 'arraybuffer');

        ws.binaryType = 'foo';
        assert.strictEqual(ws.binaryType, 'arraybuffer');

        ws.binaryType = 'fragments';
        assert.strictEqual(ws.binaryType, 'fragments');

        ws.binaryType = '';
        assert.strictEqual(ws.binaryType, 'fragments');

        ws.binaryType = 'nodebuffer';
        assert.strictEqual(ws.binaryType, 'nodebuffer');
      });
    });

    describe('`bufferedAmount`', function () {
      it('defaults to zero', function () {
        const ws = new WebSocket('ws://localhost', {
          agent: new CustomAgent()
        });

        assert.strictEqual(ws.bufferedAmount, 0);
      });

      it('defaults to zero upon "open"', function (done) {
        const wss = new WebSocket.Server({ port: 0 }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

          ws.onopen = () => {
            assert.strictEqual(ws.bufferedAmount, 0);
            wss.close(done);
          };
        });
      });

      it('takes into account the data in the sender queue', function (done) {
        const wss = new WebSocket.Server({
          perMessageDeflate: true,
          port: 0
        }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`, {
            perMessageDeflate: { threshold: 0 }
          });

          ws.on('open', () => {
            ws.send('foo');
            ws.send('bar', (err) => {
              assert.ifError(err);
              assert.strictEqual(ws.bufferedAmount, 0);
              wss.close(done);
            });

            assert.strictEqual(ws.bufferedAmount, 3);
          });
        });
      });

      it('takes into account the data in the socket queue', function (done) {
        const wss = new WebSocket.Server({ port: 0 }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`);
        });

        wss.on('connection', (ws) => {
          const data = Buffer.alloc(1024, 61);

          while (true) {
            if (ws._socket.bufferSize > 0) {
              assert.strictEqual(ws.bufferedAmount, ws._socket.bufferSize);
              break;
            }
            ws.send(data);
          }

          ws.on('close', () => wss.close(done));
          ws.close();
        });
      });
    });

    describe('`extensions`', function () {
      it('exposes the negotiated extensions names (1/2)', function (done) {
        const wss = new WebSocket.Server({ port: 0 }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

          assert.strictEqual(ws.extensions, '');

          ws.on('open', () => {
            assert.strictEqual(ws.extensions, '');
            ws.on('close', () => wss.close(done));
          });
        });

        wss.on('connection', (ws) => {
          assert.strictEqual(ws.extensions, '');
          ws.close();
        });
      });

      it('exposes the negotiated extensions names (2/2)', function (done) {
        const wss = new WebSocket.Server({
          perMessageDeflate: true,
          port: 0
        }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

          assert.strictEqual(ws.extensions, '');

          ws.on('open', () => {
            assert.strictEqual(ws.extensions, 'permessage-deflate');
            ws.on('close', () => wss.close(done));
          });
        });

        wss.on('connection', (ws) => {
          assert.strictEqual(ws.extensions, 'permessage-deflate');
          ws.close();
        });
      });
    });

    describe('`protocol`', function () {
      it('exposes the subprotocol selected by the server', function (done) {
        const wss = new WebSocket.Server({ port: 0 }, () => {
          const port = wss.address().port;
          const ws = new WebSocket(`ws://localhost:${port}`, 'foo');

          assert.strictEqual(ws.extensions, '');

          ws.on('open', () => {
            assert.strictEqual(ws.protocol, 'foo');
            ws.on('close', () => wss.close(done));
          });
        });

        wss.on('connection', (ws) => {
          assert.strictEqual(ws.protocol, 'foo');
          ws.close();
        });
      });
    });

    describe('`readyState`', function () {
      it('defaults to `CONNECTING`', function () {
        const ws = new WebSocket('ws://localhost', {
          agent: new CustomAgent()
        });

        assert.strictEqual(ws.readyState, WebSocket.CONNECTING);
      });

      it('is set to `OPEN` once connection is established', function (done) {
        const wss = new WebSocket.Server({ port: 0 }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

          ws.on('open', () => {
            assert.strictEqual(ws.readyState, WebSocket.OPEN);
            ws.close();
          });

          ws.on('close', () => wss.close(done));
        });
      });

      it('is set to `CLOSED` once connection is closed', function (done) {
        const wss = new WebSocket.Server({ port: 0 }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

          ws.on('close', () => {
            assert.strictEqual(ws.readyState, WebSocket.CLOSED);
            wss.close(done);
          });

          ws.on('open', () => ws.close(1001));
        });
      });

      it('is set to `CLOSED` once connection is terminated', function (done) {
        const wss = new WebSocket.Server({ port: 0 }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

          ws.on('close', () => {
            assert.strictEqual(ws.readyState, WebSocket.CLOSED);
            wss.close(done);
          });

          ws.on('open', () => ws.terminate());
        });
      });
    });

    describe('`url`', function () {
      it('exposes the server url', function () {
        const url = 'ws://localhost';
        const ws = new WebSocket(url, { agent: new CustomAgent() });

        assert.strictEqual(ws.url, url);
      });
    });
  });

  describe('Events', function () {
    it("emits an 'error' event if an error occurs", function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('error', (err) => {
          assert.ok(err instanceof RangeError);
          assert.strictEqual(
            err.message,
            'Invalid WebSocket frame: invalid opcode 5'
          );

          ws.on('close', (code, reason) => {
            assert.strictEqual(code, 1002);
            assert.strictEqual(reason, '');
            wss.close(done);
          });
        });
      });

      wss.on('connection', (ws) => {
        ws._socket.write(Buffer.from([0x85, 0x00]));
      });
    });

    it('does not re-emit `net.Socket` errors', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          ws._socket.on('error', (err) => {
            assert.ok(err instanceof Error);
            assert.ok(err.message.startsWith('write E'));
            ws.on('close', (code, message) => {
              assert.strictEqual(message, '');
              assert.strictEqual(code, 1006);
              wss.close(done);
            });
          });

          for (const client of wss.clients) client.terminate();
          ws.send('foo');
          ws.send('bar');
        });
      });
    });

    it("emits an 'upgrade' event", function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);
        ws.on('upgrade', (res) => {
          assert.ok(res instanceof http.IncomingMessage);
          wss.close(done);
        });
      });
    });

    it("emits a 'ping' event", function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);
        ws.on('ping', () => wss.close(done));
      });

      wss.on('connection', (ws) => ws.ping());
    });

    it("emits a 'pong' event", function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);
        ws.on('pong', () => wss.close(done));
      });

      wss.on('connection', (ws) => ws.pong());
    });
  });

  describe('Connection establishing', function () {
    const server = http.createServer();

    beforeEach((done) => server.listen(0, done));
    afterEach((done) => server.close(done));

    it('fails if the Sec-WebSocket-Accept header is invalid', function (done) {
      server.once('upgrade', (req, socket) => {
        socket.on('end', socket.end);
        socket.write(
          'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          'Sec-WebSocket-Accept: CxYS6+NgJSBG74mdgLvGscRvpns=\r\n' +
          '\r\n'
        );
      });

      const ws = new WebSocket(`ws://localhost:${server.address().port}`);

      ws.on('error', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, 'Invalid Sec-WebSocket-Accept header');
        done();
      });
    });

    it('close event is raised when server closes connection', function (done) {
      server.once('upgrade', (req, socket) => {
        const key = crypto.createHash('sha1')
          .update(req.headers['sec-websocket-key'] + constants.GUID, 'binary')
          .digest('base64');

        socket.end(
          'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${key}\r\n` +
          '\r\n'
        );
      });

      const ws = new WebSocket(`ws://localhost:${server.address().port}`);

      ws.on('close', (code, reason) => {
        assert.strictEqual(code, 1006);
        assert.strictEqual(reason, '');
        done();
      });
    });

    it('error is emitted if server aborts connection', function (done) {
      server.once('upgrade', (req, socket) => {
        socket.end(
          `HTTP/1.1 401 ${http.STATUS_CODES[401]}\r\n` +
          'Connection: close\r\n' +
          'Content-type: text/html\r\n' +
          `Content-Length: ${http.STATUS_CODES[401].length}\r\n` +
          '\r\n'
        );
      });

      const ws = new WebSocket(`ws://localhost:${server.address().port}`);

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, 'Unexpected server response: 401');
        done();
      });
    });

    it('unexpected response can be read when sent by server', function (done) {
      server.once('upgrade', (req, socket) => {
        socket.end(
          `HTTP/1.1 401 ${http.STATUS_CODES[401]}\r\n` +
          'Connection: close\r\n' +
          'Content-type: text/html\r\n' +
          `Content-Length: ${http.STATUS_CODES[401].length}\r\n` +
          '\r\n' +
          'foo'
        );
      });

      const ws = new WebSocket(`ws://localhost:${server.address().port}`);

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', () => done(new Error("Unexpected 'error' event")));
      ws.on('unexpected-response', (req, res) => {
        assert.strictEqual(res.statusCode, 401);

        let data = '';

        res.on('data', (v) => {
          data += v;
        });

        res.on('end', () => {
          assert.strictEqual(data, 'foo');
          done();
        });
      });
    });

    it('request can be aborted when unexpected response is sent by server', function (done) {
      server.once('upgrade', (req, socket) => {
        socket.end(
          `HTTP/1.1 401 ${http.STATUS_CODES[401]}\r\n` +
          'Connection: close\r\n' +
          'Content-type: text/html\r\n' +
          `Content-Length: ${http.STATUS_CODES[401].length}\r\n` +
          '\r\n' +
          'foo'
        );
      });

      const ws = new WebSocket(`ws://localhost:${server.address().port}`);

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', () => done(new Error("Unexpected 'error' event")));
      ws.on('unexpected-response', (req, res) => {
        assert.strictEqual(res.statusCode, 401);

        res.on('end', done);
        req.abort();
      });
    });

    it('fails if the opening handshake timeout expires', function (done) {
      server.once('upgrade', (req, socket) => socket.on('end', socket.end));

      const port = server.address().port;
      const ws = new WebSocket(`ws://localhost:${port}`, null, {
        handshakeTimeout: 100
      });

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, 'Opening handshake has timed out');
        done();
      });
    });

    it('fails if the Sec-WebSocket-Extensions response header is invalid', function (done) {
      server.once('upgrade', (req, socket) => {
        const key = crypto.createHash('sha1')
          .update(req.headers['sec-websocket-key'] + constants.GUID, 'binary')
          .digest('base64');

        socket.end(
          'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${key}\r\n` +
          'Sec-WebSocket-Extensions: foo;=\r\n' +
          '\r\n'
        );
      });

      const ws = new WebSocket(`ws://localhost:${server.address().port}`);

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, 'Invalid Sec-WebSocket-Extensions header');
        ws.on('close', () => done());
      });
    });

    it('fails if server sends a subprotocol when none was requested', function (done) {
      const wss = new WebSocket.Server({ server });

      wss.on('headers', (headers) => {
        headers.push('Sec-WebSocket-Protocol: foo');
      });

      const ws = new WebSocket(`ws://localhost:${server.address().port}`);

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(
          err.message,
          'Server sent a subprotocol but none was requested'
        );
        ws.on('close', () => wss.close(done));
      });
    });

    it('fails if server sends an invalid subprotocol', function (done) {
      const wss = new WebSocket.Server({
        handleProtocols: () => 'baz',
        server
      });

      const ws = new WebSocket(`ws://localhost:${server.address().port}`, [
        'foo',
        'bar'
      ]);

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, 'Server sent an invalid subprotocol');
        ws.on('close', () => wss.close(done));
      });
    });

    it('fails if server sends no subprotocol', function (done) {
      const wss = new WebSocket.Server({
        handleProtocols: () => {},
        server
      });

      const ws = new WebSocket(`ws://localhost:${server.address().port}`, [
        'foo',
        'bar'
      ]);

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, 'Server sent no subprotocol');
        ws.on('close', () => wss.close(done));
      });
    });
  });

  describe('Connection with query string', function () {
    it('connects when pathname is not null', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const port = wss.address().port;
        const ws = new WebSocket(`ws://localhost:${port}/?token=qwerty`);

        ws.on('open', () => wss.close(done));
      });
    });

    it('connects when pathname is null', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const port = wss.address().port;
        const ws = new WebSocket(`ws://localhost:${port}?token=qwerty`);

        ws.on('open', () => wss.close(done));
      });
    });
  });

  describe('#ping', function () {
    it('throws an error if `readyState` is not `OPEN`', function (done) {
      const ws = new WebSocket('ws://localhost', {
        agent: new CustomAgent()
      });

      assert.throws(
        () => ws.ping(),
        /^Error: WebSocket is not open: readyState 0 \(CONNECTING\)$/
      );

      ws.ping((err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(
          err.message,
          'WebSocket is not open: readyState 0 (CONNECTING)'
        );
        done();
      });
    });

    it('can send a ping with no data', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          ws.ping(() => ws.ping());
        });
      });

      wss.on('connection', (ws) => {
        let pings = 0;
        ws.on('ping', (data) => {
          assert.ok(Buffer.isBuffer(data));
          assert.strictEqual(data.length, 0);
          if (++pings === 2) wss.close(done);
        });
      });
    });

    it('can send a ping with data', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          ws.ping('hi', () => ws.ping('hi', true));
        });
      });

      wss.on('connection', (ws) => {
        let pings = 0;
        ws.on('ping', (message) => {
          assert.strictEqual(message.toString(), 'hi');
          if (++pings === 2) wss.close(done);
        });
      });
    });

    it('can send numbers as ping payload', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.ping(0));
      });

      wss.on('connection', (ws) => {
        ws.on('ping', (message) => {
          assert.strictEqual(message.toString(), '0');
          wss.close(done);
        });
      });
    });
  });

  describe('#pong', function () {
    it('throws an error if `readyState` is not `OPEN`', (done) => {
      const ws = new WebSocket('ws://localhost', {
        agent: new CustomAgent()
      });

      assert.throws(
        () => ws.pong(),
        /^Error: WebSocket is not open: readyState 0 \(CONNECTING\)$/
      );

      ws.pong((err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(
          err.message,
          'WebSocket is not open: readyState 0 (CONNECTING)'
        );
        done();
      });
    });

    it('can send a pong with no data', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          ws.pong(() => ws.pong());
        });
      });

      wss.on('connection', (ws) => {
        let pongs = 0;
        ws.on('pong', (data) => {
          assert.ok(Buffer.isBuffer(data));
          assert.strictEqual(data.length, 0);
          if (++pongs === 2) wss.close(done);
        });
      });
    });

    it('can send a pong with data', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          ws.pong('hi', () => ws.pong('hi', true));
        });
      });

      wss.on('connection', (ws) => {
        let pongs = 0;
        ws.on('pong', (message) => {
          assert.strictEqual(message.toString(), 'hi');
          if (++pongs === 2) wss.close(done);
        });
      });
    });

    it('can send numbers as pong payload', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.pong(0));
      });

      wss.on('connection', (ws) => {
        ws.on('pong', (message) => {
          assert.strictEqual(message.toString(), '0');
          wss.close(done);
        });
      });
    });
  });

  describe('#send', function () {
    it('can send a big binary message', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const array = new Float32Array(5 * 1024 * 1024);

        for (let i = 0; i < array.length; i++) {
          array[i] = i / 5;
        }

        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send(array, { compress: false }));
        ws.on('message', (msg) => {
          assert.ok(msg.equals(Buffer.from(array.buffer)));
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => ws.send(msg, { compress: false }));
      });
    });

    it('can send text data', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send('hi'));
        ws.on('message', (message) => {
          assert.strictEqual(message, 'hi');
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => ws.send(msg));
      });
    });

    it('does not override the `fin` option', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          ws.send('fragment', { fin: false });
          ws.send('fragment', { fin: true });
        });
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => {
          assert.strictEqual(msg, 'fragmentfragment');
          wss.close(done);
        });
      });
    });

    it('sends numbers as strings', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send(0));
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => {
          assert.strictEqual(msg, '0');
          wss.close(done);
        });
      });
    });

    it('can send binary data as an array', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const array = new Float32Array(6);

        for (let i = 0; i < array.length; ++i) {
          array[i] = i / 2;
        }

        const partial = array.subarray(2, 5);
        const buf = Buffer.from(partial.buffer)
          .slice(partial.byteOffset, partial.byteOffset + partial.byteLength);

        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send(partial, { binary: true }));
        ws.on('message', (message) => {
          assert.ok(message.equals(buf));
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => ws.send(msg));
      });
    });

    it('can send binary data as a buffer', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const buf = Buffer.from('foobar');
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send(buf, { binary: true }));
        ws.on('message', (message) => {
          assert.ok(message.equals(buf));
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => ws.send(msg));
      });
    });

    it('can send an `ArrayBuffer`', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const array = new Float32Array(5);

        for (let i = 0; i < array.length; ++i) {
          array[i] = i / 2;
        }

        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send(array.buffer));
        ws.onmessage = (event) => {
          assert.ok(event.data.equals(Buffer.from(array.buffer)));
          wss.close(done);
        };
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => ws.send(msg));
      });
    });

    it('can send a `Buffer`', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const buf = Buffer.from('foobar');
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send(buf));

        ws.onmessage = (event) => {
          assert.ok(event.data.equals(buf));
          wss.close(done);
        };
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => ws.send(msg));
      });
    });

    it('throws an error if `readyState` is not `OPEN`', function () {
      const ws = new WebSocket('ws://localhost', {
        agent: new CustomAgent()
      });

      assert.throws(
        () => ws.send('hi'),
        /^Error: WebSocket is not open: readyState 0 \(CONNECTING\)$/
      );
    });

    it('passes errors to the callback, if present', function () {
      const ws = new WebSocket('ws://localhost', {
        agent: new CustomAgent()
      });

      ws.send('hi', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(
          err.message,
          'WebSocket is not open: readyState 0 (CONNECTING)'
        );
      });
    });

    it('calls the optional callback when data is written out', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          ws.send('hi', (err) => {
            assert.ifError(err);
            wss.close(done);
          });
        });
      });
    });

    it('works when the `data` argument is falsy', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send());
      });

      wss.on('connection', (ws) => {
        ws.on('message', (message) => {
          assert.ok(message.equals(Buffer.alloc(0)));
          wss.close(done);
        });
      });
    });

    it('can send text data with `mask` option set to `false`', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send('hi', { mask: false }));
      });

      wss.on('connection', (ws) => {
        ws.on('message', (message) => {
          assert.strictEqual(message, 'hi');
          wss.close(done);
        });
      });
    });

    it('can send binary data with `mask` option set to `false`', function (done) {
      const array = new Float32Array(5);

      for (let i = 0; i < array.length; ++i) {
        array[i] = i / 2;
      }

      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.send(array, { mask: false }));
      });

      wss.on('connection', (ws) => {
        ws.on('message', (message) => {
          assert.ok(message.equals(Buffer.from(array.buffer)));
          wss.close(done);
        });
      });
    });
  });

  describe('#close', function () {
    it('closes the connection if called while connecting (1/2)', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => done(new Error("Unexpected 'open' event")));
        ws.on('error', (err) => {
          assert.ok(err instanceof Error);
          assert.strictEqual(
            err.message,
            'WebSocket was closed before the connection was established'
          );
          ws.on('close', () => wss.close(done));
        });
        ws.close(1001);
      });
    });

    it('closes the connection if called while connecting (2/2)', function (done) {
      const wss = new WebSocket.Server({
        verifyClient: (info, cb) => setTimeout(cb, 300, true),
        port: 0
      }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => done(new Error("Unexpected 'open' event")));
        ws.on('error', (err) => {
          assert.ok(err instanceof Error);
          assert.strictEqual(
            err.message,
            'WebSocket was closed before the connection was established'
          );
          ws.on('close', () => wss.close(done));
        });
        setTimeout(() => ws.close(1001), 150);
      });
    });

    it('can be called from an error listener while connecting', function (done) {
      const ws = new WebSocket('ws://localhost:1337');

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.code, 'ECONNREFUSED');
        ws.close();
        ws.on('close', () => done());
      });
    });

    it("can be called from a listener of the 'upgrade' event", function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => done(new Error("Unexpected 'open' event")));
        ws.on('error', (err) => {
          assert.ok(err instanceof Error);
          assert.strictEqual(
            err.message,
            'WebSocket was closed before the connection was established'
          );
          ws.on('close', () => wss.close(done));
        });
        ws.on('upgrade', () => ws.close());
      });
    });

    it('throws an error if the first argument is invalid (1/2)', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          assert.throws(
            () => ws.close('error'),
            /^TypeError: First argument must be a valid error code number$/
          );

          wss.close(done);
        });
      });
    });

    it('throws an error if the first argument is invalid (2/2)', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          assert.throws(
            () => ws.close(1004),
            /^TypeError: First argument must be a valid error code number$/
          );

          wss.close(done);
        });
      });
    });

    it('sends the close status code only when necessary', function (done) {
      let sent;
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          ws._socket.once('data', (data) => {
            sent = data;
          });
        });
      });

      wss.on('connection', (ws) => {
        ws._socket.once('data', (received) => {
          assert.ok(received.slice(0, 2).equals(Buffer.from([0x88, 0x80])));
          assert.ok(sent.equals(Buffer.from([0x88, 0x00])));

          ws.on('close', (code, reason) => {
            assert.strictEqual(code, 1005);
            assert.strictEqual(reason, '');
            wss.close(done);
          });
        });
        ws.close();
      });
    });

    it('works when close reason is not specified', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.close(1000));
      });

      wss.on('connection', (ws) => {
        ws.on('close', (code, message) => {
          assert.strictEqual(message, '');
          assert.strictEqual(code, 1000);
          wss.close(done);
        });
      });
    });

    it('works when close reason is specified', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => ws.close(1000, 'some reason'));
      });

      wss.on('connection', (ws) => {
        ws.on('close', (code, message) => {
          assert.strictEqual(message, 'some reason');
          assert.strictEqual(code, 1000);
          wss.close(done);
        });
      });
    });

    it('ends connection to the server', function (done) {
      const wss = new WebSocket.Server({
        clientTracking: false,
        port: 0
      }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => {
          ws.on('close', (code, reason) => {
            assert.strictEqual(reason, 'some reason');
            assert.strictEqual(code, 1000);
            wss.close(done);
          });
          ws.close(1000, 'some reason');
        });
      });
    });

    it('permits all buffered data to be delivered', function (done) {
      const wss = new WebSocket.Server({
        perMessageDeflate: { threshold: 0 },
        port: 0
      }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);
        const messages = [];

        ws.on('message', (message) => messages.push(message));
        ws.on('close', (code) => {
          assert.strictEqual(code, 1005);
          assert.deepStrictEqual(messages, ['foo', 'bar', 'baz']);
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        const callback = (err) => assert.ifError(err);

        ws.send('foo', callback);
        ws.send('bar', callback);
        ws.send('baz', callback);
        ws.close();
        ws.close();
      });
    });

    it('allows close code 1013', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('close', (code) => {
          assert.strictEqual(code, 1013);
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => ws.close(1013));
    });

    it('does nothing if `readyState` is `CLOSED`', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('close', (code) => {
          assert.strictEqual(code, 1005);
          assert.strictEqual(ws.readyState, WebSocket.CLOSED);
          ws.close();
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => ws.close());
    });
  });

  describe('#terminate', function () {
    it('closes the connection if called while connecting (1/2)', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => done(new Error("Unexpected 'open' event")));
        ws.on('error', (err) => {
          assert.ok(err instanceof Error);
          assert.strictEqual(
            err.message,
            'WebSocket was closed before the connection was established'
          );
          ws.on('close', () => wss.close(done));
        });
        ws.terminate();
      });
    });

    it('closes the connection if called while connecting (2/2)', function (done) {
      const wss = new WebSocket.Server({
        verifyClient: (info, cb) => setTimeout(cb, 300, true),
        port: 0
      }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => done(new Error("Unexpected 'open' event")));
        ws.on('error', (err) => {
          assert.ok(err instanceof Error);
          assert.strictEqual(
            err.message,
            'WebSocket was closed before the connection was established'
          );
          ws.on('close', () => wss.close(done));
        });
        setTimeout(() => ws.terminate(), 150);
      });
    });

    it('can be called from an error listener while connecting', function (done) {
      const ws = new WebSocket('ws://localhost:1337');

      ws.on('open', () => done(new Error("Unexpected 'open' event")));
      ws.on('error', (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.code, 'ECONNREFUSED');
        ws.terminate();
        ws.on('close', () => done());
      });
    });

    it("can be called from a listener of the 'upgrade' event", function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('open', () => done(new Error("Unexpected 'open' event")));
        ws.on('error', (err) => {
          assert.ok(err instanceof Error);
          assert.strictEqual(
            err.message,
            'WebSocket was closed before the connection was established'
          );
          ws.on('close', () => wss.close(done));
        });
        ws.on('upgrade', () => ws.terminate());
      });
    });

    it('does nothing if `readyState` is `CLOSED`', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.on('close', (code) => {
          assert.strictEqual(code, 1006);
          assert.strictEqual(ws.readyState, WebSocket.CLOSED);
          ws.terminate();
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => ws.terminate());
    });
  });

  describe('WHATWG API emulation', function () {
    it('supports the `on{close,error,message,open}` attributes', function () {
      const listener = () => {};
      const ws = new WebSocket('ws://localhost', { agent: new CustomAgent() });

      assert.strictEqual(ws.onmessage, undefined);
      assert.strictEqual(ws.onclose, undefined);
      assert.strictEqual(ws.onerror, undefined);
      assert.strictEqual(ws.onopen, undefined);

      ws.onmessage = listener;
      ws.onerror = listener;
      ws.onclose = listener;
      ws.onopen = listener;

      assert.strictEqual(ws.onmessage, listener);
      assert.strictEqual(ws.onclose, listener);
      assert.strictEqual(ws.onerror, listener);
      assert.strictEqual(ws.onopen, listener);
    });

    it('works like the `EventEmitter` interface', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.onmessage = (messageEvent) => {
          assert.strictEqual(messageEvent.data, 'foo');
          ws.onclose = (closeEvent) => {
            assert.strictEqual(closeEvent.wasClean, true);
            assert.strictEqual(closeEvent.code, 1005);
            assert.strictEqual(closeEvent.reason, '');
            wss.close(done);
          };
          ws.close();
        };

        ws.onopen = () => ws.send('foo');
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => ws.send(msg));
      });
    });

    it("doesn't return listeners added with `on`", function () {
      const listener = () => {};
      const ws = new WebSocket('ws://localhost', { agent: new CustomAgent() });

      ws.on('open', listener);

      assert.deepStrictEqual(ws.listeners('open'), [listener]);
      assert.strictEqual(ws.onopen, undefined);
    });

    it("doesn't remove listeners added with `on`", function () {
      const listener = () => {};
      const ws = new WebSocket('ws://localhost', { agent: new CustomAgent() });

      ws.on('close', listener);
      ws.onclose = listener;

      let listeners = ws.listeners('close');

      assert.strictEqual(listeners.length, 2);
      assert.strictEqual(listeners[0], listener);
      assert.strictEqual(listeners[1]._listener, listener);

      ws.onclose = listener;

      listeners = ws.listeners('close');

      assert.strictEqual(listeners.length, 2);
      assert.strictEqual(listeners[0], listener);
      assert.strictEqual(listeners[1]._listener, listener);
    });

    it('adds listeners for custom events with `addEventListener`', function () {
      const listener = () => {};
      const ws = new WebSocket('ws://localhost', { agent: new CustomAgent() });

      ws.addEventListener('foo', listener);
      assert.strictEqual(ws.listeners('foo')[0], listener);

      //
      // Fails silently when the `listener` is not a function.
      //
      ws.addEventListener('bar', {});
      assert.strictEqual(ws.listeners('bar').length, 0);
    });

    it('supports the `removeEventListener` method', function () {
      const listener = () => {};
      const ws = new WebSocket('ws://localhost', { agent: new CustomAgent() });

      ws.addEventListener('message', listener);
      ws.addEventListener('open', listener);
      ws.addEventListener('foo', listener);

      assert.strictEqual(ws.listeners('message')[0]._listener, listener);
      assert.strictEqual(ws.listeners('open')[0]._listener, listener);
      assert.strictEqual(ws.listeners('foo')[0], listener);

      ws.removeEventListener('message', () => {});

      assert.strictEqual(ws.listeners('message')[0]._listener, listener);

      ws.removeEventListener('message', listener);
      ws.removeEventListener('open', listener);
      ws.removeEventListener('foo', listener);

      assert.strictEqual(ws.listenerCount('message'), 0);
      assert.strictEqual(ws.listenerCount('open'), 0);
      assert.strictEqual(ws.listenerCount('foo'), 0);
    });

    it('wraps text data in a `MessageEvent`', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.addEventListener('open', () => ws.send('hi'));
        ws.addEventListener('message', (messageEvent) => {
          assert.strictEqual(messageEvent.data, 'hi');
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => ws.send(msg));
      });
    });

    it('receives a `CloseEvent` when server closes (1000)', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.addEventListener('close', (closeEvent) => {
          assert.ok(closeEvent.wasClean);
          assert.strictEqual(closeEvent.reason, '');
          assert.strictEqual(closeEvent.code, 1000);
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => ws.close(1000));
    });

    it('receives a `CloseEvent` when server closes (4000)', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.addEventListener('close', (closeEvent) => {
          assert.ok(closeEvent.wasClean);
          assert.strictEqual(closeEvent.reason, 'some daft reason');
          assert.strictEqual(closeEvent.code, 4000);
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => ws.close(4000, 'some daft reason'));
    });

    it('sets `target` and `type` on events', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const err = new Error('forced');
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.addEventListener('open', (openEvent) => {
          assert.strictEqual(openEvent.type, 'open');
          assert.strictEqual(openEvent.target, ws);
        });
        ws.addEventListener('message', (messageEvent) => {
          assert.strictEqual(messageEvent.type, 'message');
          assert.strictEqual(messageEvent.target, ws);
          wss.close();
        });
        ws.addEventListener('close', (closeEvent) => {
          assert.strictEqual(closeEvent.type, 'close');
          assert.strictEqual(closeEvent.target, ws);
          ws.emit('error', err);
        });
        ws.addEventListener('error', (errorEvent) => {
          assert.strictEqual(errorEvent.message, 'forced');
          assert.strictEqual(errorEvent.type, 'error');
          assert.strictEqual(errorEvent.target, ws);
          assert.strictEqual(errorEvent.error, err);

          done();
        });
      });

      wss.on('connection', (client) => client.send('hi'));
    });

    it('passes binary data as a Node.js `Buffer` by default', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.onmessage = (evt) => {
          assert.ok(Buffer.isBuffer(evt.data));
          wss.close(done);
        };
      });

      wss.on('connection', (ws) => ws.send(new Uint8Array(4096)));
    });

    it('ignores `binaryType` for text messages', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        ws.binaryType = 'arraybuffer';

        ws.onmessage = (evt) => {
          assert.strictEqual(evt.data, 'foo');
          wss.close(done);
        };
      });

      wss.on('connection', (ws) => ws.send('foo'));
    });

    it('allows to update `binaryType` on the fly', function (done) {
      const wss = new WebSocket.Server({ port: 0 }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);

        function testType (binaryType, next) {
          const buf = Buffer.from(binaryType);
          ws.binaryType = binaryType;

          ws.onmessage = (evt) => {
            if (binaryType === 'nodebuffer') {
              assert.ok(Buffer.isBuffer(evt.data));
              assert.ok(evt.data.equals(buf));
            } else if (binaryType === 'arraybuffer') {
              assert.ok(evt.data instanceof ArrayBuffer);
              assert.ok(Buffer.from(evt.data).equals(buf));
            } else if (binaryType === 'fragments') {
              assert.deepStrictEqual(evt.data, [buf]);
            }
            next();
          };

          ws.send(buf);
        }

        ws.onopen = () => {
          testType('nodebuffer', () => {
            testType('arraybuffer', () => {
              testType('fragments', () => wss.close(done));
            });
          });
        };
      });

      wss.on('connection', (ws) => {
        ws.on('message', (msg) => ws.send(msg));
      });
    });
  });

  describe('SSL', function () {
    it('connects to secure websocket server', function (done) {
      const server = https.createServer({
        cert: fs.readFileSync('test/fixtures/certificate.pem'),
        key: fs.readFileSync('test/fixtures/key.pem')
      });
      const wss = new WebSocket.Server({ server });

      wss.on('connection', () => {
        wss.close();
        server.close(done);
      });

      server.listen(0, () => {
        const ws = new WebSocket(`wss://localhost:${server.address().port}`, {
          rejectUnauthorized: false
        });
      });
    });

    it('connects to secure websocket server with client side certificate', function (done) {
      const server = https.createServer({
        cert: fs.readFileSync('test/fixtures/certificate.pem'),
        ca: [fs.readFileSync('test/fixtures/ca1-cert.pem')],
        key: fs.readFileSync('test/fixtures/key.pem'),
        requestCert: true
      });

      let success = false;
      const wss = new WebSocket.Server({
        verifyClient: (info) => {
          success = !!info.req.client.authorized;
          return true;
        },
        server
      });

      wss.on('connection', () => {
        assert.ok(success);
        server.close(done);
        wss.close();
      });

      server.listen(0, () => {
        const ws = new WebSocket(`wss://localhost:${server.address().port}`, {
          cert: fs.readFileSync('test/fixtures/agent1-cert.pem'),
          key: fs.readFileSync('test/fixtures/agent1-key.pem'),
          rejectUnauthorized: false
        });
      });
    });

    it('cannot connect to secure websocket server via ws://', function (done) {
      const server = https.createServer({
        cert: fs.readFileSync('test/fixtures/certificate.pem'),
        key: fs.readFileSync('test/fixtures/key.pem')
      });
      const wss = new WebSocket.Server({ server });

      server.listen(0, () => {
        const ws = new WebSocket(`ws://localhost:${server.address().port}`, {
          rejectUnauthorized: false
        });

        ws.on('error', () => {
          server.close(done);
          wss.close();
        });
      });
    });

    it('can send and receive text data', function (done) {
      const server = https.createServer({
        cert: fs.readFileSync('test/fixtures/certificate.pem'),
        key: fs.readFileSync('test/fixtures/key.pem')
      });
      const wss = new WebSocket.Server({ server });

      wss.on('connection', (ws) => {
        ws.on('message', (message) => {
          assert.strictEqual(message, 'foobar');
          server.close(done);
          wss.close();
        });
      });

      server.listen(0, () => {
        const ws = new WebSocket(`wss://localhost:${server.address().port}`, {
          rejectUnauthorized: false
        });

        ws.on('open', () => ws.send('foobar'));
      });
    });

    it('can send a big binary message', function (done) {
      this.timeout(4000);

      const buf = crypto.randomBytes(5 * 1024 * 1024);
      const server = https.createServer({
        cert: fs.readFileSync('test/fixtures/certificate.pem'),
        key: fs.readFileSync('test/fixtures/key.pem')
      });
      const wss = new WebSocket.Server({ server });

      wss.on('connection', (ws) => {
        ws.on('message', (message) => ws.send(message));
      });

      server.listen(0, () => {
        const ws = new WebSocket(`wss://localhost:${server.address().port}`, {
          rejectUnauthorized: false
        });

        ws.on('open', () => ws.send(buf));
        ws.on('message', (message) => {
          assert.ok(buf.equals(message));

          server.close(done);
          wss.close();
        });
      });
    });
  });

  describe('Request headers', function () {
    it('adds the authorization header if the url has userinfo (1/2)', function (done) {
      const agent = new CustomAgent();
      const auth = 'test:testpass';

      agent.addRequest = (req) => {
        assert.strictEqual(
          req._headers.authorization,
          `Basic ${Buffer.from(auth).toString('base64')}`
        );
        done();
      };

      const ws = new WebSocket(`ws://${auth}@localhost`, { agent });
    });

    it('adds the authorization header if the url has userinfo (2/2)', function (done) {
      if (!url.URL) return this.skip();

      const agent = new CustomAgent();
      const auth = 'test:testpass';

      agent.addRequest = (req) => {
        assert.strictEqual(
          req._headers.authorization,
          `Basic ${Buffer.from(auth).toString('base64')}`
        );
        done();
      };

      const ws = new WebSocket(new url.URL(`ws://${auth}@localhost`), {
        agent
      });
    });

    it('adds custom headers', function (done) {
      const agent = new CustomAgent();

      agent.addRequest = (req) => {
        assert.strictEqual(req._headers.cookie, 'foo=bar');
        done();
      };

      const ws = new WebSocket('ws://localhost', {
        headers: { 'Cookie': 'foo=bar' },
        agent
      });
    });

    it('includes the host header with port number', function (done) {
      const agent = new CustomAgent();

      agent.addRequest = (req) => {
        assert.strictEqual(req._headers.host, 'localhost:1337');
        done();
      };

      const ws = new WebSocket('ws://localhost:1337', { agent });
    });

    it('excludes default ports from host header', function () {
      const httpsAgent = new https.Agent();
      const httpAgent = new http.Agent();
      const values = [];
      let ws;

      httpsAgent.addRequest = httpAgent.addRequest = (req) => {
        values.push(req._headers.host);
      };

      ws = new WebSocket('wss://localhost:8443', { agent: httpsAgent });
      ws = new WebSocket('wss://localhost:443', { agent: httpsAgent });
      ws = new WebSocket('ws://localhost:88', { agent: httpAgent });
      ws = new WebSocket('ws://localhost:80', { agent: httpAgent });

      assert.deepStrictEqual(values, [
        'localhost:8443',
        'localhost',
        'localhost:88',
        'localhost'
      ]);
    });

    it("doesn't add the origin header by default", function (done) {
      const agent = new CustomAgent();

      agent.addRequest = (req) => {
        assert.strictEqual(req._headers.origin, undefined);
        done();
      };

      const ws = new WebSocket('ws://localhost', { agent });
    });

    it('honors the `origin` option (1/2)', function (done) {
      const agent = new CustomAgent();

      agent.addRequest = (req) => {
        assert.strictEqual(req._headers.origin, 'https://example.com:8000');
        done();
      };

      const ws = new WebSocket('ws://localhost', {
        origin: 'https://example.com:8000',
        agent
      });
    });

    it('honors the `origin` option (2/2)', function (done) {
      const agent = new CustomAgent();

      agent.addRequest = (req) => {
        assert.strictEqual(
          req._headers['sec-websocket-origin'],
          'https://example.com:8000'
        );
        done();
      };

      const ws = new WebSocket('ws://localhost', {
        origin: 'https://example.com:8000',
        protocolVersion: 8,
        agent
      });
    });
  });

  describe('permessage-deflate', function () {
    it('is enabled by default', (done) => {
      const agent = new CustomAgent();

      agent.addRequest = (req) => {
        assert.strictEqual(
          req._headers['sec-websocket-extensions'],
          'permessage-deflate; client_max_window_bits'
        );
        done();
      };

      const ws = new WebSocket('ws://localhost', { agent });
    });

    it('can be disabled', function (done) {
      const agent = new CustomAgent();

      agent.addRequest = (req) => {
        assert.strictEqual(req._headers['sec-websocket-extensions'], undefined);
        done();
      };

      const ws = new WebSocket('ws://localhost', {
        perMessageDeflate: false,
        agent
      });
    });

    it('can send extension parameters', function (done) {
      const agent = new CustomAgent();

      const value = 'permessage-deflate; server_no_context_takeover;' +
        ' client_no_context_takeover; server_max_window_bits=10;' +
        ' client_max_window_bits';

      agent.addRequest = (req) => {
        assert.strictEqual(
          req._headers['sec-websocket-extensions'],
          value
        );
        done();
      };

      const ws = new WebSocket('ws://localhost', {
        perMessageDeflate: {
          clientNoContextTakeover: true,
          serverNoContextTakeover: true,
          clientMaxWindowBits: true,
          serverMaxWindowBits: 10
        },
        agent
      });
    });

    it('can send and receive text data', function (done) {
      const wss = new WebSocket.Server({
        perMessageDeflate: { threshold: 0 },
        port: 0
      }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`, {
          perMessageDeflate: { threshold: 0 }
        });

        ws.on('open', () => ws.send('hi', { compress: true }));
        ws.on('message', (message) => {
          assert.strictEqual(message, 'hi');
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        ws.on('message', (message) => ws.send(message, { compress: true }));
      });
    });

    it('can send and receive a `TypedArray`', function (done) {
      const array = new Float32Array(5);

      for (let i = 0; i < array.length; i++) {
        array[i] = i / 2;
      }

      const wss = new WebSocket.Server({
        perMessageDeflate: { threshold: 0 },
        port: 0
      }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`, {
          perMessageDeflate: { threshold: 0 }
        });

        ws.on('open', () => ws.send(array, { compress: true }));
        ws.on('message', (message) => {
          assert.ok(message.equals(Buffer.from(array.buffer)));
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        ws.on('message', (message) => ws.send(message, { compress: true }));
      });
    });

    it('can send and receive an `ArrayBuffer`', function (done) {
      const array = new Float32Array(5);

      for (let i = 0; i < array.length; i++) {
        array[i] = i / 2;
      }

      const wss = new WebSocket.Server({
        perMessageDeflate: { threshold: 0 },
        port: 0
      }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`, {
          perMessageDeflate: { threshold: 0 }
        });

        ws.on('open', () => ws.send(array.buffer, { compress: true }));
        ws.on('message', (message) => {
          assert.ok(message.equals(Buffer.from(array.buffer)));
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        ws.on('message', (message) => ws.send(message, { compress: true }));
      });
    });

    it('consumes all received data when connection is closed abnormally', function (done) {
      const wss = new WebSocket.Server({
        perMessageDeflate: { threshold: 0 },
        port: 0
      }, () => {
        const ws = new WebSocket(`ws://localhost:${wss.address().port}`);
        const messages = [];

        ws.on('message', (message) => messages.push(message));
        ws.on('close', (code) => {
          assert.strictEqual(code, 1006);
          assert.deepStrictEqual(messages, ['foo', 'bar', 'baz', 'qux']);
          wss.close(done);
        });
      });

      wss.on('connection', (ws) => {
        ws.send('foo');
        ws.send('bar');
        ws.send('baz');
        ws.send('qux', () => ws._socket.end());
      });
    });

    describe('#send', function () {
      it('ignores the `compress` option if the extension is disabled', function (done) {
        const wss = new WebSocket.Server({ port: 0 }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`, {
            perMessageDeflate: false
          });

          ws.on('open', () => ws.send('hi', { compress: true }));
          ws.on('message', (message) => {
            assert.strictEqual(message, 'hi');
            wss.close(done);
          });
        });

        wss.on('connection', (ws) => {
          ws.on('message', (message) => ws.send(message, { compress: true }));
        });
      });
    });

    describe('#terminate', function () {
      it('can be used while data is being compressed', function (done) {
        const wss = new WebSocket.Server({
          perMessageDeflate: { threshold: 0 },
          port: 0
        }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`, {
            perMessageDeflate: { threshold: 0 }
          });

          ws.on('open', () => {
            ws.send('hi', (err) => {
              assert.ok(err instanceof Error);
              wss.close(done);
            });
            ws.terminate();
          });
        });
      });

      it('can be used while data is being decompressed', function (done) {
        const wss = new WebSocket.Server({
          perMessageDeflate: true,
          port: 0
        }, () => {
          const ws = new WebSocket(`ws://localhost:${wss.address().port}`);
          const messages = [];

          ws.on('message', (message) => {
            if (messages.push(message) > 1) return;

            process.nextTick(() => {
              assert.strictEqual(ws._receiver._state, 5);
              ws.terminate();
            });
          });

          ws.on('close', (code, reason) => {
            assert.deepStrictEqual(messages, ['', '', '', '']);
            assert.strictEqual(code, 1006);
            assert.strictEqual(reason, '');
            wss.close(done);
          });
        });

        wss.on('connection', (ws) => {
          const buf = Buffer.from('c10100c10100c10100c10100', 'hex');
          ws._socket.write(buf);
        });
      });
    });
  });
});
