import { useRef, useState } from 'react';
import { apiFetch, ApiResult } from '../lib/api';
import { formatError } from '../lib/errors';
import { parseBundle, ProofBundle } from '../lib/proof';

type LeafCheck = {
  kind: 'degree' | 'course';
  label: string;
  detail?: string;
  ok: boolean;
  reason?: string;
};

type Result =
  | { kind: 'valid'; claim?: string; leaves: LeafCheck[] }
  | { kind: 'invalid'; bullets: string[] }
  | { kind: 'revoked' }
  | { kind: 'notfound' }
  | { kind: 'error'; bullets: string[] };

function leafReasonFromRes(res: ApiResult): string {
  if ('error' in res) return res.error || 'Network error';
  if (res.ok) return '';
  const e = formatError(res);
  return e.bullets[0] || `HTTP ${res.status}`;
}

/** Summarize what the loaded bundle carries, for the "bundle loaded" card. */
function bundleSummary(b: ProofBundle): string[] {
  const parts: string[] = [];
  if (b.degree) parts.push(`degree claim (${b.degree.degreeName} · ${b.degree.major} · ${b.degree.graduationYear})`);
  if (b.courses && b.courses.length) {
    parts.push(`${b.courses.length} course${b.courses.length === 1 ? '' : 's'}`);
  }
  if (!parts.length) parts.push('status check only (no degree or course claims)');
  return parts;
}

export function Verify() {
  const [bundle, setBundle] = useState<ProofBundle | null>(null);
  const [loadNote, setLoadNote] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const b = parseBundle(String(reader.result ?? ''));
        setBundle(b);
        setLoadError(null);
        setResult(null);
        setLoadNote(`Loaded from ${file.name}.`);
      } catch (err) {
        setBundle(null);
        setLoadNote(null);
        setResult(null);
        setLoadError(`That file isn't a valid proof bundle: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function verify() {
    if (!bundle) return;
    setVerifying(true);
    setResult(null);
    try {
      // 1. Status check (existence + revocation) ─────────────
      const statusRes = await apiFetch(
        `/verify/status/${encodeURIComponent(bundle.credentialId)}`,
      );
      if ('error' in statusRes) {
        setResult({
          kind: 'error',
          bullets: [statusRes.error || 'Could not reach the verification service.'],
        });
        return;
      }
      if (statusRes.status === 404) {
        setResult({ kind: 'notfound' });
        return;
      }
      if (!statusRes.ok) {
        setResult({ kind: 'error', bullets: formatError(statusRes).bullets });
        return;
      }
      const sBody = (statusRes.body && typeof statusRes.body === 'object'
        ? statusRes.body
        : {}) as { valid?: boolean; revoked?: boolean };
      if (sBody.revoked === true) {
        setResult({ kind: 'revoked' });
        return;
      }
      if (sBody.valid !== true) {
        setResult({
          kind: 'invalid',
          bullets: ['The credential failed an on-chain status check.'],
        });
        return;
      }

      // 2. Per-leaf verification ─────────────────────────────
      const leaves: LeafCheck[] = [];

      if (bundle.degree) {
        const r = await apiFetch('/verify/degree', {
          method: 'POST',
          body: {
            credentialId: bundle.credentialId,
            degreeName: bundle.degree.degreeName,
            major: bundle.degree.major,
            graduationYear: bundle.degree.graduationYear,
            proof: bundle.degreeProof ?? [],
            signature: bundle.signature,
          },
        });
        let ok = false;
        let reason: string | undefined;
        if ('error' in r || !r.ok) {
          reason = leafReasonFromRes(r);
        } else {
          const b = (r.body && typeof r.body === 'object' ? r.body : {}) as { valid?: boolean };
          ok = b.valid === true;
          if (!ok) reason = 'The privacy proof did not match the credential.';
        }
        leaves.push({
          kind: 'degree',
          label: 'Degree',
          detail: `${bundle.degree.degreeName} · ${bundle.degree.major} · ${bundle.degree.graduationYear}`,
          ok,
          reason,
        });
      }

      for (const c of bundle.courses ?? []) {
        const r = await apiFetch('/verify/full', {
          method: 'POST',
          body: {
            credentialId: bundle.credentialId,
            courseId: c.courseId,
            courseName: c.courseName,
            semester: c.semester,
            creditsScaled: c.creditsScaled,
            grade: c.grade,
            proof: c.proof,
            signature: bundle.signature,
          },
        });
        let ok = false;
        let reason: string | undefined;
        if ('error' in r || !r.ok) {
          reason = leafReasonFromRes(r);
        } else {
          const b = (r.body && typeof r.body === 'object' ? r.body : {}) as { valid?: boolean };
          ok = b.valid === true;
          if (!ok) reason = 'The privacy proof did not match the credential.';
        }
        leaves.push({
          kind: 'course',
          label: `Course ${c.courseId}`,
          detail: `${c.courseName} · ${c.semester} · grade ${c.grade}`,
          ok,
          reason,
        });
      }

      // 3. Aggregate ─────────────────────────────────────────
      const failed = leaves.filter((l) => !l.ok);
      if (failed.length > 0) {
        const bullets = failed.map((l) =>
          l.kind === 'degree'
            ? `The privacy proof for the degree did not match the credential${l.reason && l.reason !== 'The privacy proof did not match the credential.' ? ` (${l.reason})` : ''}.`
            : `The privacy proof for ${l.label.toLowerCase()} (${l.detail ?? ''}) did not match the credential${l.reason && l.reason !== 'The privacy proof did not match the credential.' ? ` (${l.reason})` : ''}.`,
        );
        setResult({ kind: 'invalid', bullets });
        return;
      }

      const claim = bundle.degree
        ? `${bundle.degree.degreeName} · ${bundle.degree.major} · ${bundle.degree.graduationYear}`
        : undefined;
      setResult({ kind: 'valid', claim, leaves });
    } finally {
      setVerifying(false);
    }
  }

  function reset() {
    setBundle(null);
    setLoadNote(null);
    setLoadError(null);
    setResult(null);
  }

  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Verifier</span>
        <h1>Verify a credential</h1>
        <p>
          Load the proof a student shared with you. The verification runs against the on-chain
          registry and reveals only the information the student chose to disclose.
        </p>
      </div>

      <div className="panel">
        <div className="proof-toolbar">
          <button className="file-btn" onClick={() => fileRef.current?.click()}>
            ⤓ Upload proof file…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFile}
            style={{ display: 'none' }}
          />
          <span className="hint">load the .json the student exported</span>
        </div>

        {loadError && (
          <div className="error-panel">
            <div className="error-headline">Could not load that file</div>
            <ul className="error-bullets">
              <li>{loadError}</li>
            </ul>
          </div>
        )}

        {bundle && !result && (
          <>
            <div className="kv-section" style={{ marginTop: '0.6rem' }}>
              <h3 className="kv-title">Bundle loaded</h3>
              <dl className="kv-list">
                <dt>File</dt>
                <dd>{loadNote?.replace(/^Loaded from /, '').replace(/\.$/, '') ?? ''}</dd>
                <dt>Credential ID</dt>
                <dd className="mono break">{bundle.credentialId}</dd>
                <dt>Contents</dt>
                <dd>
                  <ul className="role-bullets" style={{ margin: 0 }}>
                    {bundleSummary(bundle).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </div>

            <div className="actions" style={{ marginTop: '1.2rem' }}>
              <button className="ghost" onClick={reset} disabled={verifying}>
                Clear
              </button>
              <button className="btn lg" onClick={verify} disabled={verifying}>
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </>
        )}

        {result && result.kind === 'valid' && (
          <div className="result-banner ok">
            <span className="verdict">✅ Valid credential</span>
            {result.claim && <span className="claims">{result.claim}</span>}
            <ul className="banner-bullets">
              <li>This credential was issued by an authorized university.</li>
              <li>The university digital signature is valid.</li>
              <li>The credential has not been revoked.</li>
              <li>All disclosed information is included in the original transcript.</li>
            </ul>

            {result.leaves.length > 0 && (
              <div className="kv-section" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <h3 className="kv-title">Disclosed information</h3>
                <dl className="kv-list">
                  {result.leaves.map((l, i) => (
                    <FragmentRow key={i} label={l.label} detail={l.detail ?? ''} />
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}

        {result && result.kind === 'revoked' && (
          <div className="result-banner bad">
            <span className="verdict">❌ Invalid credential</span>
            <ul className="banner-bullets">
              <li>This credential has been revoked.</li>
            </ul>
          </div>
        )}

        {result && result.kind === 'notfound' && (
          <div className="result-banner warn">
            <span className="verdict">❌ Invalid credential</span>
            <ul className="banner-bullets">
              <li>This credential does not exist on the blockchain.</li>
            </ul>
          </div>
        )}

        {result && result.kind === 'invalid' && (
          <div className="result-banner bad">
            <span className="verdict">❌ Invalid credential</span>
            <ul className="banner-bullets">
              {result.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {result && result.kind === 'error' && (
          <div className="error-panel">
            <div className="error-headline">Verification could not run</div>
            <ul className="error-bullets">
              {result.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {result && (
          <div className="actions" style={{ marginTop: '1rem' }}>
            <button className="ghost" onClick={reset}>
              Verify another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Tiny helper to render a dt/dd pair inline. */
function FragmentRow({ label, detail }: { label: string; detail: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{detail}</dd>
    </>
  );
}
