import { useEffect, useState } from 'react';
import { apiFetch, pretty } from '../lib/api';
import { formatError, ErrorView } from '../lib/errors';
import { connectWallet, hasInjectedProvider, useInjectedAccount } from '../lib/wallet';
import {
  buildBundle,
  ProofBundle,
  DegreeClaim,
  GenerateProofResponse,
} from '../lib/proof';

const ADDR_PLACEHOLDER = '0x0000000000000000000000000000000000000000';

type Credential = {
  id: string;
  credentialId: string;
  holderAddress: string;
  issuerAddress: string;
  merkleRoot: string;
  metadataHash?: string;
  revoked: boolean;
  signature?: string;
  issuedAt: string;
};

type Course = {
  courseId: string;
  courseName: string;
  semester: string;
  creditsScaled: number;
  grade: string;
};

type Transcript = { credentialId: string; degree: DegreeClaim; courses: Course[] };

function short(s: string): string {
  return s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ErrorPanel({ err }: { err: ErrorView }) {
  return (
    <div className="error-panel">
      <div className="error-headline">{err.headline}</div>
      {err.bullets.length > 0 && (
        <ul className="error-bullets">
          {err.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Student() {
  const injected = useInjectedAccount();
  const [wallet, setWallet] = useState('');

  const [creds, setCreds] = useState<Credential[] | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [credError, setCredError] = useState<ErrorView | null>(null);

  const [selected, setSelected] = useState<Credential | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loadingTx, setLoadingTx] = useState(false);
  const [txError, setTxError] = useState<ErrorView | null>(null);

  const [includeDegree, setIncludeDegree] = useState(true);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const [bundle, setBundle] = useState<ProofBundle | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<ErrorView | null>(null);
  const [copied, setCopied] = useState(false);

  // Mirror a connected wallet into the address field once, if the box is empty.
  useEffect(() => {
    if (injected && !wallet) setWallet(injected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injected]);

  async function onConnect() {
    const addr = await connectWallet();
    if (addr) setWallet(addr);
  }

  async function loadCredentials() {
    const addr = wallet.trim();
    if (!addr) return;
    setLoadingCreds(true);
    setCredError(null);
    setCreds(null);
    setSelected(null);
    setTranscript(null);
    setBundle(null);
    const res = await apiFetch(`/student/credentials/${encodeURIComponent(addr)}`);
    setLoadingCreds(false);
    if ('error' in res || !res.ok) {
      setCredError(formatError(res));
      return;
    }
    setCreds(Array.isArray(res.body) ? (res.body as Credential[]) : []);
  }

  async function selectCredential(c: Credential) {
    setSelected(c);
    setTranscript(null);
    setTxError(null);
    setBundle(null);
    setGenError(null);
    setIncludeDegree(true);
    setPicked({});
    setLoadingTx(true);
    const res = await apiFetch(`/student/transcript/${encodeURIComponent(c.credentialId)}`);
    setLoadingTx(false);
    if ('error' in res || !res.ok) {
      setTxError(formatError(res));
      return;
    }
    setTranscript(res.body as Transcript);
  }

  async function generate() {
    if (!selected || !transcript) return;
    const courseIds = Object.entries(picked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!includeDegree && courseIds.length === 0) {
      setGenError({
        headline: 'Nothing to share',
        bullets: ['Select the degree and/or at least one course to prove.'],
      });
      return;
    }
    setGenerating(true);
    setGenError(null);
    setBundle(null);
    const res = await apiFetch('/student/generate-proof', {
      method: 'POST',
      body: {
        credentialId: selected.credentialId,
        holderAddress: wallet.trim(),
        courseIds,
        includeDegree,
      },
    });
    setGenerating(false);
    if ('error' in res || !res.ok) {
      setGenError(formatError(res));
      return;
    }
    const built = buildBundle(selected.signature ?? '', res.body as GenerateProofResponse);
    setBundle(built);
  }

  async function copyBundle() {
    if (!bundle) return;
    try {
      await navigator.clipboard.writeText(pretty(bundle));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  const sharedCourses = bundle?.courses ?? [];
  const allCourseIds = transcript?.courses.map((c) => c.courseId) ?? [];
  const unsharedCount = allCourseIds.length - sharedCourses.length;

  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Holder</span>
        <h1>Student dashboard</h1>
        <p>
          Load the credentials issued to your wallet, then compose a proof that reveals only the
          degree claim and the specific courses you choose — never your full transcript.
        </p>
      </div>

      {/* ── identify ───────────────────────────────────────────── */}
      <div className="panel">
        <div className="row-wrap">
          <label className="field grow">
            Wallet address
            <input
              className="mono"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder={ADDR_PLACEHOLDER}
              spellCheck={false}
            />
          </label>
          <div className="field-actions">
            {hasInjectedProvider() && (
              <button className="ghost" onClick={onConnect}>
                Connect Wallet
              </button>
            )}
            <button className="btn" onClick={loadCredentials} disabled={loadingCreds || !wallet.trim()}>
              {loadingCreds ? 'Loading…' : 'Load credentials'}
            </button>
          </div>
        </div>
        {credError && <ErrorPanel err={credError} />}
      </div>

      {/* ── credential list ────────────────────────────────────── */}
      {creds && (
        <section className="group">
          <h2>
            Your credentials
            <span className="group-note"> · {creds.length} found</span>
          </h2>
          {creds.length === 0 ? (
            <div className="panel placeholder">
              <p className="lead">No credentials are registered to this wallet yet.</p>
            </div>
          ) : (
            <div className="cred-list">
              {creds.map((c) => (
                <article
                  key={c.credentialId}
                  className={`cred-card${selected?.credentialId === c.credentialId ? ' active' : ''}`}
                >
                  <div className="cred-main">
                    <code className="path">{short(c.credentialId)}</code>
                    <span className={`badge ${c.revoked ? 'badge--err' : 'badge--ok'}`}>
                      {c.revoked ? 'Revoked' : 'Valid'}
                    </span>
                  </div>
                  <div className="cred-meta">
                    <span>issuer {short(c.issuerAddress)}</span>
                    {c.issuedAt && <span>· {new Date(c.issuedAt).toLocaleDateString()}</span>}
                  </div>
                  <button className="ghost sm" onClick={() => selectCredential(c)}>
                    {selected?.credentialId === c.credentialId ? 'Selected' : 'View & compose proof'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── proof composer ─────────────────────────────────────── */}
      {selected && (
        <section className="group">
          <h2>Compose a proof</h2>
          <div className="panel">
            {loadingTx && <p className="lead">Loading transcript…</p>}
            {txError && <ErrorPanel err={txError} />}

            {transcript && (
              <>
                <p className="form-section-label">What do you want to share?</p>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={includeDegree}
                    onChange={(e) => setIncludeDegree(e.target.checked)}
                  />
                  <span>
                    <strong>Degree</strong> — {transcript.degree.degreeName} ·{' '}
                    {transcript.degree.major} · {transcript.degree.graduationYear}
                  </span>
                </label>
                <p className="hint" style={{ margin: '0.1rem 0 1rem 1.9rem' }}>
                  The degree leaf is atomic: name, major, and graduation year are revealed together.
                </p>

                <p className="form-section-label">Courses to prove</p>
                {transcript.courses.length === 0 ? (
                  <p className="hint">This credential has no course rows.</p>
                ) : (
                  <div className="check-list">
                    {transcript.courses.map((c) => (
                      <label className="check-row" key={c.courseId}>
                        <input
                          type="checkbox"
                          checked={!!picked[c.courseId]}
                          onChange={(e) => setPicked({ ...picked, [c.courseId]: e.target.checked })}
                        />
                        <span>
                          <strong>{c.courseName}</strong>{' '}
                          <span className="hint">
                            ({c.courseId} · {c.semester} · grade {c.grade})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="privacy-note" style={{ marginTop: '1rem' }}>
                  <span>🔒</span>
                  <span>
                    Unselected courses, their grades, and any other personal data stay private —
                    they are never included in the proof.
                  </span>
                </div>

                {genError && <ErrorPanel err={genError} />}

                <div className="actions" style={{ marginTop: '1.2rem' }}>
                  <button className="btn lg" onClick={generate} disabled={generating}>
                    {generating ? 'Generating…' : 'Generate proof'}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── result ─────────────────────────────────────────────── */}
      {bundle && (
        <section className="group">
          <h2>Proof created</h2>
          <div className="panel">
            <div className="result-banner ok" style={{ marginTop: 0 }}>
              <span className="verdict">✅ Proof ready</span>
              <span className="claims">Hand this file to a verifier — they load it on the Verify page.</span>
            </div>

            <div className="disclose-grid">
              <div className="disclose">
                <h4 className="share">You are sharing</h4>
                <ul className="checklist">
                  {bundle.degree && (
                    <li>
                      Degree: {bundle.degree.degreeName} · {bundle.degree.major} ·{' '}
                      {bundle.degree.graduationYear}
                    </li>
                  )}
                  {sharedCourses.map((c) => (
                    <li key={c.courseId}>
                      Course: {c.courseName} (grade {c.grade})
                    </li>
                  ))}
                  {!bundle.degree && sharedCourses.length === 0 && <li>Nothing selected</li>}
                </ul>
              </div>
              <div className="disclose">
                <h4 className="hide">You are not sharing</h4>
                <ul className="checklist muted-list">
                  {unsharedCount > 0 && <li>{unsharedCount} other course(s) and their grades</li>}
                  <li>Your full transcript</li>
                  <li>Any personal data beyond the claim above</li>
                </ul>
              </div>
            </div>

            <div className="actions">
              <button
                className="btn"
                onClick={() => download(`proof-${short(bundle.credentialId)}.json`, pretty(bundle))}
              >
                ⤓ Download proof JSON
              </button>
              <button className="ghost" onClick={copyBundle}>
                {copied ? 'Copied ✓' : 'Copy JSON'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
