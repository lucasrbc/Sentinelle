export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Construit une URL d'API avec ses paramètres de requête. */
export function apiUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/** Appel public à l'API (sans authentification) renvoyant du JSON typé. */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const res = await fetch(apiUrl(path, params), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${path} → HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Appel à l'API Sentinelle avec le jeton d'accès Supabase en Bearer. */
export async function apiFetch(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
}
