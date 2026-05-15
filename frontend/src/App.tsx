import { useMemo, useState } from 'react';
import { ENDPOINTS, EndpointSpec, buildPath, pathParamNames } from './endpoints';

const DEFAULT_API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:3000/api';
const DEFAULT_ADMIN_KEY = (import.meta.env.VITE_ADMIN_API_KEY as string | undefined) || '';

type Result = {
  status: number;
  ok: boolean;
  body: string;
  ms: number;
} | { error: string; ms: number };

type EndpointState = {
  pathParams: Record<string, string>;
  body: string;
  result: Result | null;
  loading: boolean;
};

function initialState(spec: EndpointSpec): EndpointState {
  const pathParams: Record<string, string> = {};
  for (const name of pathParamNames(spec.pathTemplate)) {
    pathParams[name] = spec.pathParams?.[name] ?? '';
  }
  return {
    pathParams,
    body: spec.defaultBody ?? '',
    result: null,
    loading: false,
  };
}

function statusClass(r: Result | null): string {
  if (!r) return 'badge badge--idle';
  if ('error' in r) return 'badge badge--err';
  if (r.status >= 200 && r.status < 300) return 'badge badge--ok';
  if (r.status >= 400 && r.status < 500) return 'badge badge--warn';
  return 'badge badge--err';
}

function statusText(r: Result | null): string {
  if (!r) return 'idle';
  if ('error' in r) return `error · ${r.ms}ms`;
  return `${r.status} ${r.ok ? 'OK' : ''} · ${r.ms}ms`;
}

export function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [adminKey, setAdminKey] = useState(DEFAULT_ADMIN_KEY);

  const initialStates = useMemo<Record<string, EndpointState>>(() => {
    const map: Record<string, EndpointState> = {};
    for (const e of ENDPOINTS) map[e.id] = initialState(e);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [states, setStates] = useState(initialStates);

  function update(id: string, patch: Partial<EndpointState>) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function ping(spec: EndpointSpec) {
    const s = states[spec.id];
    update(spec.id, { loading: true, result: null });

    const url = apiBase.replace(/\/$/, '') + buildPath(spec.pathTemplate, s.pathParams);
    const headers: Record<string, string> = {};
    let body: string | undefined;

    if (spec.method === 'POST') {
      headers['Content-Type'] = 'application/json';
      body = s.body;
      // Best-effort: validate JSON before sending so we report it locally.
      try {
        if (body) JSON.parse(body);
      } catch (e) {
        update(spec.id, {
          loading: false,
          result: { error: `Local JSON parse error: ${(e as Error).message}`, ms: 0 },
        });
        return;
      }
    }

    if (spec.adminKey) {
      headers['x-admin-api-key'] = adminKey;
    }

    const t0 = performance.now();
    try {
      const res = await fetch(url, { method: spec.method, headers, body });
      const text = await res.text();
      const ms = Math.round(performance.now() - t0);
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not JSON, leave as text
      }
      update(spec.id, {
        loading: false,
        result: { status: res.status, ok: res.ok, body: pretty, ms },
      });
    } catch (err) {
      const ms = Math.round(performance.now() - t0);
      update(spec.id, {
        loading: false,
        result: { error: (err as Error).message || String(err), ms },
      });
    }
  }

  const groups: Array<{ key: EndpointSpec['group']; title: string; note?: string }> = [
    { key: 'verify', title: 'verify', note: 'public — no auth' },
    { key: 'student', title: 'student', note: 'public — no auth' },
    {
      key: 'university',
      title: 'university',
      note: 'requires x-admin-api-key',
    },
  ];

  return (
    <div className="page">
      <header className="header">
        <h1>Diploma Frontend — Endpoint Smoke Test</h1>
        <p className="subtitle">
          Pings every <code>/api/*</code> route exposed by the NestJS backend. Goal: verify
          Vite + dev server + CORS + reachability. A 4xx response still counts as
          &quot;reachable&quot;.
        </p>

        <div className="config">
          <label>
            API base
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            x-admin-api-key
            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              type="password"
              placeholder="(leave blank to test the 401 path)"
              spellCheck={false}
            />
          </label>
        </div>
      </header>

      {groups.map((group) => (
        <section key={group.key} className="group">
          <h2>
            {group.title}
            {group.note && <span className="group-note"> · {group.note}</span>}
          </h2>
          <div className="cards">
            {ENDPOINTS.filter((e) => e.group === group.key).map((spec) => {
              const s = states[spec.id];
              const paramNames = pathParamNames(spec.pathTemplate);
              return (
                <article className="card" key={spec.id}>
                  <header className="card-head">
                    <span className={`method method--${spec.method.toLowerCase()}`}>
                      {spec.method}
                    </span>
                    <code className="path">{spec.pathTemplate}</code>
                    <span className={statusClass(s.result)}>{statusText(s.result)}</span>
                  </header>

                  <p className="desc">{spec.description}</p>

                  {paramNames.length > 0 && (
                    <div className="params">
                      {paramNames.map((name) => (
                        <label key={name}>
                          {name}
                          <input
                            value={s.pathParams[name] ?? ''}
                            onChange={(e) =>
                              update(spec.id, {
                                pathParams: { ...s.pathParams, [name]: e.target.value },
                              })
                            }
                            spellCheck={false}
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  {spec.method === 'POST' && (
                    <details>
                      <summary>request body (JSON)</summary>
                      <textarea
                        value={s.body}
                        onChange={(e) => update(spec.id, { body: e.target.value })}
                        spellCheck={false}
                        rows={Math.min(14, (s.body.match(/\n/g)?.length ?? 0) + 2)}
                      />
                    </details>
                  )}

                  <div className="actions">
                    <button onClick={() => ping(spec)} disabled={s.loading}>
                      {s.loading ? 'pinging…' : 'Ping'}
                    </button>
                    <button
                      className="reset"
                      onClick={() => update(spec.id, initialState(spec))}
                      disabled={s.loading}
                    >
                      reset
                    </button>
                  </div>

                  {s.result && (
                    <pre className="result">
                      {'error' in s.result
                        ? `// network / fetch error\n${s.result.error}`
                        : s.result.body || '(empty body)'}
                    </pre>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <footer className="footer">
        <small>
          If every card shows a status badge (any number), Vite + CORS are working. If you see
          &quot;error · …ms&quot; on every card, the dev server can&apos;t reach{' '}
          <code>{apiBase}</code> — start the backend with <code>npm run start:dev</code> in{' '}
          <code>backend/</code>.
        </small>
      </footer>
    </div>
  );
}
