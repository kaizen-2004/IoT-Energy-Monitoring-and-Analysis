import { API_BASE } from './mockData';

const CAN_AUTH_STORAGE_KEY = 'iot-energy-monitor-can-authenticated';

export interface AuthStatus {
  canConfigured: boolean;
}

export function normalizeCanInput(value: string) {
  return value.replace(/\D/g, '');
}

function getAuthStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (_error) {
    return null;
  }
}

function mapAuthStatus(payload: Record<string, unknown>): AuthStatus {
  return {
    canConfigured: Boolean(payload.canConfigured),
  };
}

async function parseResponse(response: Response) {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message || `HTTP ${response.status}`)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return (payload || {}) as Record<string, unknown>;
}

export function isCanAuthenticated() {
  return getAuthStorage()?.getItem(CAN_AUTH_STORAGE_KEY) === 'true';
}

export function rememberCanAuthentication() {
  getAuthStorage()?.setItem(CAN_AUTH_STORAGE_KEY, 'true');
}

export function clearCanAuthentication() {
  getAuthStorage()?.removeItem(CAN_AUTH_STORAGE_KEY);
}

export async function fetchAuthStatus() {
  const response = await fetch(`${API_BASE}/api/auth/status`);
  return mapAuthStatus(await parseResponse(response));
}

export async function setupCustomerAccountAccess(can: string) {
  const response = await fetch(`${API_BASE}/api/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ can: normalizeCanInput(can) }),
  });

  const payload = await parseResponse(response);
  if (!payload.authenticated) {
    throw new Error('Customer Account Number setup could not be completed.');
  }

  return mapAuthStatus(payload);
}

export async function verifyCustomerAccountNumber(can: string) {
  const response = await fetch(`${API_BASE}/api/auth/can`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ can: normalizeCanInput(can) }),
  });

  const payload = await parseResponse(response);
  if (!payload.authenticated) {
    throw new Error('Customer Account Number could not be verified.');
  }

  return mapAuthStatus(payload);
}

export async function changeCustomerAccountNumber(currentCan: string, newCan: string) {
  const response = await fetch(`${API_BASE}/api/auth/can`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentCan: normalizeCanInput(currentCan), newCan: normalizeCanInput(newCan) }),
  });

  return mapAuthStatus(await parseResponse(response));
}
