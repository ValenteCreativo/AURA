const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = __dirname;
const DATA_PATH = path.join(__dirname, 'sensor-data.json');
const OFFLINE_AFTER_MS = 60 * 1000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

function readStoredSensor() {
  try {
    if (!fs.existsSync(DATA_PATH)) return null;
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStoredSensor(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function normalizePayload(payload) {
  const timestamp = Number(payload.timestamp ?? Date.now());
  const temperature = Number(payload.temperature);
  const humidity = Number(payload.humidity);
  const state = typeof payload.state === 'string' && payload.state.trim()
    ? payload.state.trim()
    : deriveStateLabel(temperature, humidity);
  const nodeId = typeof payload.nodeId === 'string' && payload.nodeId.trim()
    ? payload.nodeId.trim()
    : 'AURA-001';

  if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) {
    throw new Error('temperature y humidity deben ser números válidos');
  }

  if (!Number.isFinite(timestamp)) {
    throw new Error('timestamp debe ser un número válido');
  }

  return { nodeId, temperature, humidity, state, timestamp };
}

function deriveStateLabel(temperature, humidity) {
  if (temperature > 34 || (temperature > 30 && humidity < 30)) return 'alert';
  if (humidity < 35 || temperature > 28) return 'attention';
  return 'balanced';
}

function buildApiResponse(record) {
  if (!record) {
    return {
      online: false,
      hasData: false,
      nodeId: 'AURA-001',
      temperature: null,
      humidity: null,
      state: 'disconnected',
      timestamp: null,
      lastSeenMs: null
    };
  }

  const lastSeenMs = Date.now() - Number(record.timestamp);
  const online = lastSeenMs >= 0 && lastSeenMs <= OFFLINE_AFTER_MS;

  return {
    ...record,
    online,
    hasData: true,
    state: online ? record.state : 'disconnected',
    lastSeenMs
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.normalize(cleanPath).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  sendFile(res, filePath);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS' && url.pathname === '/api/sensor') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/sensor') {
    const record = readStoredSensor();
    sendJson(res, 200, buildApiResponse(record));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/sensor') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const normalized = normalizePayload(parsed);
        writeStoredSensor(normalized);
        sendJson(res, 201, {
          ok: true,
          message: 'Lectura recibida',
          sensor: buildApiResponse(normalized)
        });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error.message || 'Payload inválido'
        });
      }
    });
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res, url.pathname);
    return;
  }

  sendJson(res, 405, {
    ok: false,
    error: 'Method not allowed'
  });
});

server.listen(PORT, () => {
  console.log(`AURA server running at http://localhost:${PORT}`);
});
