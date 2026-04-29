# AURA

Autonomous Urban Regeneration Via Audio.

Demo web + API local para visualizar el nodo ambiental AURA con lecturas de un ESP32 + DHT11.

## Qué incluye esta V1

- Landing visual para Bosques & Tech 2026
- Panel de nodo en vivo con:
  - temperatura
  - humedad
  - estado ambiental
  - estado online/offline
- API local para recibir y servir lecturas del sensor
- Fallback limpio: si no hay datos reales, el nodo aparece como desconectado

## Estructura

- `index.html` — landing y UI del nodo
- `server.js` — servidor HTTP con frontend + API
- `package.json` — script de arranque
- `AURA_ARVI_contexto_inicial_para_agente.txt` — contexto conceptual del proyecto

## Cómo correrlo

```bash
npm start
```

Servidor local por defecto:

- `http://localhost:3000`

## API

### GET `/api/sensor`
Devuelve la última lectura conocida y si el nodo sigue online.

Ejemplo sin datos:

```json
{
  "online": false,
  "hasData": false,
  "nodeId": "AURA-001",
  "temperature": null,
  "humidity": null,
  "state": "disconnected",
  "timestamp": null,
  "lastSeenMs": null
}
```

### POST `/api/sensor`
Recibe una lectura enviada por el ESP32.

Payload esperado:

```json
{
  "nodeId": "AURA-001",
  "temperature": 28.5,
  "humidity": 31,
  "state": "attention",
  "timestamp": 1714410000000
}
```

Ejemplo con `curl`:

```bash
curl -X POST http://localhost:3000/api/sensor \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId":"AURA-001",
    "temperature":28.5,
    "humidity":31,
    "state":"attention",
    "timestamp":1714410000000
  }'
```

## Lógica actual

- El nodo se considera **online** si la última lectura llegó hace menos de **60 segundos**.
- Si no hay lecturas recientes, la UI muestra el estado **desconectado**.
- La interfaz soporta estos estados:
  - `balanced`
  - `attention`
  - `alert`
  - `disconnected`

## Siguiente paso sugerido

Conectar el sketch del ESP32 para enviar lecturas reales a `POST /api/sensor` desde WiFi.
