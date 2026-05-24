import { authHeaders } from './token';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiOptions = RequestInit & { timeoutMs?: number };

export async function api<T = unknown>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const { timeoutMs = 90_000, ...fetchOpts } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(path, {
      ...fetchOpts,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(fetchOpts.headers as Record<string, string> | undefined),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(`${res.status} ${res.statusText} ${text}`.trim(), res.status);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('A requisição demorou demais. Tente de novo.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
