export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:3000/api';

export type ApiResult =
  | { ok: boolean; status: number; body: unknown; raw: string; ms: number }
  | { error: string; ms: number };

/** Thin fetch wrapper used by the role pages. Never throws on HTTP errors. */
export async function apiFetch(
  path: string,
  init?: { method?: 'GET' | 'POST'; body?: unknown; adminKey?: string },
): Promise<ApiResult> {
  const url = API_BASE.replace(/\/$/, '') + path;
  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (init?.method === 'POST') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body ?? {});
  }
  if (init?.adminKey) headers['x-admin-api-key'] = init.adminKey;

  const t0 = performance.now();
  try {
    const res = await fetch(url, { method: init?.method ?? 'GET', headers, body });
    const raw = await res.text();
    const ms = Math.round(performance.now() - t0);
    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* leave as text */
    }
    return { ok: res.ok, status: res.status, body: parsed, raw, ms };
  } catch (err) {
    return { error: (err as Error).message || String(err), ms: Math.round(performance.now() - t0) };
  }
}

export function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
