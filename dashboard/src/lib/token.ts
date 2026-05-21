export const AUTH_TOKEN =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token') || ''
    : '';

export function authHeaders(): Record<string, string> {
  return AUTH_TOKEN ? { 'x-auth-token': AUTH_TOKEN } : {};
}
