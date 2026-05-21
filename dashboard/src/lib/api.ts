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

export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(opts.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(`${res.status} ${res.statusText} ${text}`.trim(), res.status);
  }

  return res.json() as Promise<T>;
}
