# AURA

Autonomous Urban Regeneration Via Audio.

Demo web + API del nodo ambiental AURA, ahora montada sobre **Next.js** para desplegar limpio en **Vercel** y seguir creciendo con visualizaciones más ricas.

## Qué incluye esta versión

- Landing visual para Bosques & Tech 2026
- Panel de nodo en vivo con:
  - temperatura
  - humedad
  - estado ambiental
  - estado online/offline
- API `GET /api/sensor`
- API `POST /api/sensor`
- Estado inicial desconectado si todavía no hay lecturas reales
- Base moderna con **Next.js App Router**

## Stack

- Next.js
- React
- TypeScript

## Estructura

- `app/page.tsx` — landing y UI del nodo
- `app/api/sensor/route.ts` — API route para lecturas del sensor
- `lib/sensor-store.ts` — lógica de normalización y estado temporal
- `app/globals.css` — estilos globales
- `AURA_ARVI_contexto_inicial_para_agente.txt` — contexto conceptual del proyecto

## Desarrollo local

Instala dependencias:

```bash
npm install
```

Corre el proyecto:

```bash
npm run dev
```

Build de producción:

```bash
npm run build
```

## API

### GET `/api/sensor`
Devuelve la última lectura conocida y si el nodo sigue online.

Ejemplo sin datos:

```json
{
  "nodeId": "AURA-001",
  "temperature": null,
  "humidity": null,
  "state": "disconnected",
  "timestamp": null,
  "online": false,
  "hasData": false,
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

## Nota importante sobre Vercel

La persistencia actual del sensor está en **memoria del runtime** para mantener el deploy simple y compatible con serverless.

Eso significa que en Vercel:
- **sí funciona** para demo y pruebas rápidas,
- pero **no es persistencia durable** entre reinicios, escalado o cold starts.

Para la siguiente versión conviene mover lecturas a:
- Vercel KV
- Upstash Redis
- Supabase
- Firebase
- o una base/API dedicada

## Siguiente paso sugerido

Conectar el sketch del ESP32 para enviar lecturas reales a `POST /api/sensor` desde WiFi, y luego mover persistencia a un backend durable.
