import { ApiResult } from './api';

export type ErrorView = {
  headline: string;
  bullets: string[];
};

/** Friendlier rewrites for class-validator field-name messages. */
const RENAMES: Array<[RegExp, string]> = [
  [/\bcreditsScaled\b/g, 'credit'],
  [/\bsignature\b/g, 'university digital signature'],
];

function humanize(s: string): string {
  let out = s;
  for (const [pat, repl] of RENAMES) out = out.replace(pat, repl);
  return out;
}

/**
 * Normalize an ApiResult error into a headline + bullet list.
 * Used to render both validation errors (Nest class-validator) and
 * lower-level failures with the same clean format. Never returns raw HTTP text.
 */
export function formatError(res: ApiResult): ErrorView {
  if ('error' in res) {
    return {
      headline: 'Connection error',
      bullets: [res.error || 'Could not reach the server.'],
    };
  }
  if (res.ok) {
    return { headline: 'OK', bullets: [] };
  }

  const body = (res.body && typeof res.body === 'object' ? res.body : {}) as Record<string, unknown>;
  const raw = body.message;
  const bullets: string[] = Array.isArray(raw)
    ? (raw as unknown[]).map((m) => humanize(String(m)))
    : typeof raw === 'string' && raw
    ? [humanize(raw)]
    : [`The server returned HTTP ${res.status}.`];

  let headline = 'Request rejected';
  if (res.status === 401) headline = 'Unauthorized';
  else if (res.status === 403) headline = 'Forbidden';
  else if (res.status === 404) headline = 'Not found';
  else if (res.status >= 500) headline = 'Server error';

  return { headline, bullets };
}
