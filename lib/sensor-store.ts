export type SensorState = 'balanced' | 'attention' | 'alert' | 'disconnected';

export type SensorReading = {
  nodeId: string;
  temperature: number;
  humidity: number;
  state: Exclude<SensorState, 'disconnected'>;
  timestamp: number;
};

export type SensorApiResponse = {
  nodeId: string;
  temperature: number | null;
  humidity: number | null;
  state: SensorState;
  timestamp: number | null;
  online: boolean;
  hasData: boolean;
  lastSeenMs: number | null;
};

const OFFLINE_AFTER_MS = 60_000;

declare global {
  var __auraReading: SensorReading | undefined;
}

function deriveState(temperature: number, humidity: number): Exclude<SensorState, 'disconnected'> {
  if (temperature > 34 || (temperature > 30 && humidity < 30)) return 'alert';
  if (humidity < 35 || temperature > 28) return 'attention';
  return 'balanced';
}

export function normalizeReading(payload: Partial<SensorReading> & Record<string, unknown>): SensorReading {
  const temperature = Number(payload.temperature);
  const humidity = Number(payload.humidity);
  const timestamp = Number(payload.timestamp ?? Date.now());
  const nodeId = typeof payload.nodeId === 'string' && payload.nodeId.trim() ? payload.nodeId.trim() : 'AURA-001';
  const requestedState = typeof payload.state === 'string' ? payload.state.trim() : '';
  const state = (requestedState === 'balanced' || requestedState === 'attention' || requestedState === 'alert')
    ? requestedState
    : deriveState(temperature, humidity);

  if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) {
    throw new Error('temperature y humidity deben ser números válidos');
  }

  if (!Number.isFinite(timestamp)) {
    throw new Error('timestamp debe ser un número válido');
  }

  return {
    nodeId,
    temperature,
    humidity,
    state,
    timestamp
  };
}

export function setLatestReading(reading: SensorReading) {
  globalThis.__auraReading = reading;
}

export function getLatestReading(): SensorApiResponse {
  const reading = globalThis.__auraReading;

  if (!reading) {
    return {
      nodeId: 'AURA-001',
      temperature: null,
      humidity: null,
      state: 'disconnected',
      timestamp: null,
      online: false,
      hasData: false,
      lastSeenMs: null
    };
  }

  const lastSeenMs = Date.now() - reading.timestamp;
  const online = lastSeenMs >= 0 && lastSeenMs <= OFFLINE_AFTER_MS;

  return {
    nodeId: reading.nodeId,
    temperature: reading.temperature,
    humidity: reading.humidity,
    state: online ? reading.state : 'disconnected',
    timestamp: reading.timestamp,
    online,
    hasData: true,
    lastSeenMs
  };
}
