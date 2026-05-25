import { useRef, useState } from 'react';
import { apiFetch, pretty, ApiResult } from '../lib/api';

const BYTES32_ZERO = '0x' + '00'.repeat(32);
const SIG_PLACEHOLDER = '0x' + '00'.repeat(65);

type Mode = 'degree' | 'course' | 'status';

const TEMPLATES: Record<Exclude<Mode, 'status'>, string> = {
  degree: JSON.stringify(
    {
      credentialId: BYTES32_ZERO,
      degreeName: 'Bachelor of Engineering',
      major: 'Cybersecurity',
      graduationYear: '2026',
      proof: [],
      signature: SIG_PLACEHOLDER,
    },
    null,
    2,
  ),
  course: JSON.stringify(
    {
      credentialId: BYTES32_ZERO,
      courseId: 'IT1000',
      courseName: 'Intro to Smoke',
      semester: '2024-1',
      creditsScaled: 400,
      grade: 'A',
      proof: [],
      signature: SIG_PLACEHOLDER,
    },
    null,
    2,
  ),
};

const MODE_LABEL: Record<Mode, string> = {
  degree: 'Degree',
  course: 'Course',
  status: 'Status',
};

type Verdict = {
  kind: 'ok' | 'bad' | 'warn';
  headline: string;
  claims?: string;
  meta: string;
  raw: string;
};

function interpret(mode: Mode, res: ApiResult): Verdict {
  if ('error' in res) {
    return {
      kind: 'bad',
      headline: 'CONNECTION ERROR',
      meta: `Could not reach the backend · ${res.ms}ms`,
      raw: res.error,
    };
  }
  const ms = `${res.status} · ${res.ms}ms`;
  const body = (res.body && typeof res.body === 'object' ? res.body : {}) as Record<string, unknown>;

  if (res.status === 404) {
    return { kind: 'warn', headline: 'CREDENTIAL NOT FOUND', meta: ms, raw: res.raw };
  }
  if (res.status >= 400) {
    const msg =
      (Array.isArray(body.message) ? body.message.join(', ') : (body.message as string)) ||
      'Request rejected';
    return { kind: 'warn', headline: 'REQUEST REJECTED', claims: msg, meta: ms, raw: res.raw };
  }

  if (mode === 'status') {
    if (body.revoked === true) {
      return { kind: 'warn', headline: 'REVOKED', claims: 'This credential has been revoked.', meta: ms, raw: res.raw };
    }
    return body.valid === true
      ? { kind: 'ok', headline: 'VALID', claims: 'Credential is live and not revoked.', meta: ms, raw: res.raw }
      : { kind: 'bad', headline: 'NOT VALID', meta: ms, raw: res.raw };
  }

  // degree / course
  if (body.valid === true) {
    const claims =
      mode === 'degree'
        ? [body.degreeName, body.major, body.graduationYear].filter(Boolean).join(' · ')
        : 'Course record confirmed against the credential.';
    return { kind: 'ok', headline: 'VALID', claims, meta: ms, raw: res.raw };
  }
  return { kind: 'bad', headline: 'NOT VALID', claims: 'The proof did not check out against this credential.', meta: ms, raw: res.raw };
}

export function Verify() {
  const [mode, setMode] = useState<Mode>('degree');
  const [payload, setPayload] = useState(TEMPLATES.degree);
  const [credentialId, setCredentialId] = useState(BYTES32_ZERO);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setVerdict(null);
    setParseError(null);
    if (next !== 'status') setPayload(TEMPLATES[next]);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setPayload(text);
      // If the file carries a credentialId, mirror it into status mode too.
      try {
        const obj = JSON.parse(text);
        if (obj.credentialId) setCredentialId(obj.credentialId);
      } catch {
        /* ignore */
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function verify() {
    setParseError(null);
    setVerdict(null);
    setLoading(true);
    try {
      let res: ApiResult;
      if (mode === 'status') {
        res = await apiFetch(`/verify/status/${encodeURIComponent(credentialId)}`);
      } else {
        let parsed: unknown;
        try {
          parsed = JSON.parse(payload);
        } catch (err) {
          setParseError(`That isn't valid JSON: ${(err as Error).message}`);
          setLoading(false);
          return;
        }
        res = await apiFetch(`/verify/${mode === 'degree' ? 'degree' : 'full'}`, {
          method: 'POST',
          body: parsed,
        });
      }
      setVerdict(interpret(mode, res));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Verifier</span>
        <h1>Verify a credential</h1>
        <p>
          Paste or upload the proof a student shared with you, then confirm their claim. Choose
          what you're checking below.
        </p>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
          <div className="segmented" role="tablist">
            {(['degree', 'course', 'status'] as Mode[]).map((m) => (
              <button
                key={m}
                className={mode === m ? 'active' : ''}
                onClick={() => switchMode(m)}
                role="tab"
                aria-selected={mode === m}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        {mode === 'status' ? (
          <label className="field">
            Credential ID
            <input
              className="mono"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              spellCheck={false}
            />
          </label>
        ) : (
          <>
            <div className="proof-toolbar">
              <button className="file-btn" onClick={() => fileRef.current?.click()}>
                ⤓ Load from file…
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={onFile}
                style={{ display: 'none' }}
              />
              <span className="hint">paste the proof JSON, or load a .json the student exported</span>
            </div>
            <label className="field">
              <textarea
                className="mono"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                rows={Math.min(20, payload.split('\n').length + 1)}
                spellCheck={false}
              />
            </label>
          </>
        )}

        {mode === 'degree' && (
          <div className="privacy-note">
            <span>🔒</span>
            <span>
              <strong>Privacy preserved.</strong> A degree check confirms only the degree, major,
              and graduation year via a Merkle proof. The transcript and grades are never
              transmitted.
            </span>
          </div>
        )}

        {parseError && (
          <div className="privacy-note" style={{ borderLeftColor: 'var(--err)', marginTop: '0.9rem' }}>
            <span>⚠</span>
            <span>{parseError}</span>
          </div>
        )}

        <div className="actions" style={{ marginTop: '1.2rem' }}>
          <button className="btn lg" onClick={verify} disabled={loading}>
            {loading ? 'Verifying…' : `Verify ${MODE_LABEL[mode].toLowerCase()}`}
          </button>
        </div>

        {verdict && (
          <div className={`result-banner ${verdict.kind}`}>
            <span className="verdict">{verdict.headline}</span>
            {verdict.claims && <span className="claims">{verdict.claims}</span>}
            <span className="meta">{verdict.meta}</span>
            <details className="drawer">
              <summary>Raw response</summary>
              <pre>{(() => {
                try {
                  return pretty(JSON.parse(verdict.raw));
                } catch {
                  return verdict.raw || '(empty body)';
                }
              })()}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
