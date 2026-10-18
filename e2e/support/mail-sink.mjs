// A throwaway mail server for the acceptance tests: accepts SMTP on 1025 and lists what it got on http://localhost:8025/messages.
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';

const messages = [];

createServer((socket) => {
  let buffer = '';
  let data = null;
  let current = { to: [], raw: '' };
  socket.write('220 sink ESMTP\r\n');
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    for (;;) {
      if (data !== null) {
        const end = buffer.indexOf('\r\n.\r\n');
        if (end === -1) return;
        current.raw = buffer.slice(0, end);
        buffer = buffer.slice(end + 5);
        messages.push(current);
        current = { to: [], raw: '' };
        data = null;
        socket.write('250 queued\r\n');
        continue;
      }
      const eol = buffer.indexOf('\r\n');
      if (eol === -1) return;
      const line = buffer.slice(0, eol);
      buffer = buffer.slice(eol + 2);
      const command = line.slice(0, 4).toUpperCase();
      if (command === 'RCPT') current.to.push(line.slice(line.indexOf('<') + 1, line.indexOf('>')));
      if (command === 'DATA') {
        data = '';
        socket.write('354 go ahead\r\n');
      } else if (command === 'QUIT') {
        socket.write('221 bye\r\n');
        socket.end();
      } else {
        socket.write('250 ok\r\n');
      }
    }
  });
}).listen(1025);

createHttpServer((req, res) => {
  if (req.method === 'DELETE') messages.length = 0;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(messages));
}).listen(8025);
