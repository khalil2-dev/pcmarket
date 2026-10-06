/**
 * JWT helpers. The backend (JwtUtil.java) issues HS256 tokens whose payload is:
 *   { idUser, email, role, iat, exp, n }
 * exp is in seconds (app.jwt-expiration-seconds = 3600).
 */
export interface JwtPayload {
  idUser: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const TOKEN_KEY = 'token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  localStorage.clear();
}

/** Decodes a base64url JWT payload. Returns null if the token is malformed. */
export function decodeToken(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const payload = JSON.parse(atob(b64));
    if (typeof payload.idUser !== 'number') return null;
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

/** Payload of the stored token, or null when missing / invalid / expired. */
export function currentUser(): JwtPayload | null {
  const payload = decodeToken(getToken());
  if (!payload) return null;
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return null;
  return payload;
}

export function isAdmin(): boolean {
  return currentUser()?.role === 'admin';
}

/** Error message sent by the backend ({success:false, message}) or a fallback. */
export function apiError(err: any, fallback: string): string {
  return err?.error?.message || fallback;
}
