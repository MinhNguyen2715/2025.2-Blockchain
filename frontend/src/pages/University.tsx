import { useState } from 'react';
import { apiFetch, ApiResult } from '../lib/api';
import { formatError, ErrorView } from '../lib/errors';

const ADDR_PLACEHOLDER = '0x0000000000000000000000000000000000000000';

type Tab = 'issue' | 'revoke' | 'issuer';

const TAB_LABEL: Record<Tab, string> = {
  issue: 'Issue',
  revoke: 'Revoke',
  issuer: 'Add issuer',
};

type Row = {
  courseId: string;
  courseName: string;
  semester: string;
  creditsScaled: string;
  grade: string;
};

const EMPTY_ROW: Row = { courseId: '', courseName: '', semester: '', creditsScaled: '', grade: '' };

type IssueSuccess = {
  credentialId?: string;
  merkleRoot?: string;
  signature?: string;
  txHash?: string;
};

/** Parse a CSV string into transcript rows (positional). */
function parseCsv(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  // Skip a header row if it clearly names the columns.
  if (/courseid/i.test(lines[0]) && /grade/i.test(lines[0])) lines.shift();
  return lines.map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    return {
      courseId: cells[0] ?? '',
      courseName: cells[1] ?? '',
      semester: cells[2] ?? '',
      creditsScaled: cells[3] ?? '',
      grade: cells[4] ?? '',
    };
  });
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

/** Read a string field from a JSON response (when the request succeeded). */
function readSuccess(res: ApiResult): Record<string, unknown> {
  if ('error' in res || !res.ok) return {};
  return (res.body && typeof res.body === 'object' ? res.body : {}) as Record<string, unknown>;
}

export function University() {
  const [adminKey, setAdminKey] = useState('');
  const [tab, setTab] = useState<Tab>('issue');

  // ── issue form ────────────────────────────────────────────────
  const [holderAddress, setHolderAddress] = useState('');
  const [issuerAddress, setIssuerAddress] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [degreeName, setDegreeName] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  // UI-only (not sent)
  const [email, setEmail] = useState('');
  const [classification, setClassification] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }]);
  const [previewing, setPreviewing] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<ErrorView | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<IssueSuccess | null>(null);

  // ── revoke ───────────────────────────────────────────────────
  const [revokeId, setRevokeId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<ErrorView | null>(null);
  const [revokeSuccess, setRevokeSuccess] = useState<string | null>(null);

  // ── add issuer ───────────────────────────────────────────────
  const [newIssuerAddr, setNewIssuerAddr] = useState('');
  const [newIssuerName, setNewIssuerName] = useState('');
  const [addingIssuer, setAddingIssuer] = useState(false);
  const [issuerError, setIssuerError] = useState<ErrorView | null>(null);
  const [issuerSuccess, setIssuerSuccess] = useState<string | null>(null);

  // ── handlers ─────────────────────────────────────────────────
  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ''));
      if (parsed.length) setRows(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function openPreview() {
    setIssueError(null);
    setIssueSuccess(null);
    setPreviewing(true);
  }

  function backToEdit() {
    setPreviewing(false);
  }

  async function confirmIssue() {
    setIssuing(true);
    setIssueError(null);
    setIssueSuccess(null);
    const transcript = rows
      .filter((r) => r.courseId.trim())
      .map((r) => ({
        courseId: r.courseId.trim(),
        courseName: r.courseName.trim(),
        semester: r.semester.trim(),
        creditsScaled: Number(r.creditsScaled) || 0,
        grade: r.grade.trim(),
      }));
    const res = await apiFetch('/university/issue', {
      method: 'POST',
      adminKey,
      body: {
        holderAddress: holderAddress.trim(),
        issuerAddress: issuerAddress.trim(),
        studentId: studentId.trim(),
        studentName: studentName.trim(),
        degree: { degreeName, major, graduationYear },
        transcript,
      },
    });
    setIssuing(false);
    if ('error' in res || !res.ok) {
      setIssueError(formatError(res));
      return;
    }
    const body = readSuccess(res);
    setIssueSuccess({
      credentialId: body.credentialId as string,
      merkleRoot: body.merkleRoot as string,
      signature: body.signature as string,
      txHash: body.txHash as string,
    });
    setPreviewing(false);
  }

  async function revoke() {
    setRevoking(true);
    setRevokeError(null);
    setRevokeSuccess(null);
    const res = await apiFetch('/university/revoke', {
      method: 'POST',
      adminKey,
      body: { credentialId: revokeId.trim() },
    });
    setRevoking(false);
    if ('error' in res || !res.ok) {
      setRevokeError(formatError(res));
      return;
    }
    setRevokeSuccess('The credential has been revoked.');
  }

  async function addIssuer() {
    setAddingIssuer(true);
    setIssuerError(null);
    setIssuerSuccess(null);
    const res = await apiFetch('/university/add-issuer', {
      method: 'POST',
      adminKey,
      body: { issuerAddress: newIssuerAddr.trim(), issuerName: newIssuerName.trim() },
    });
    setAddingIssuer(false);
    if ('error' in res || !res.ok) {
      setIssuerError(formatError(res));
      return;
    }
    setIssuerSuccess(`Authorized ${newIssuerName.trim() || newIssuerAddr.trim()}.`);
  }

  // ── derived ──────────────────────────────────────────────────
  const transcriptRows = rows.filter((r) => r.courseId.trim());

  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Issuer · admin</span>
        <h1>University console</h1>
        <p>
          Issue and revoke credentials and authorize issuer wallets. Every action requires the
          administration key.
        </p>
      </div>

      {/* ── administration key ─────────────────────────────────── */}
      <div className="panel">
        <label className="field">
          Administration key
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="(required — kept in memory only, never persisted)"
            spellCheck={false}
          />
        </label>
        <p className="hint">
          The key lives in this tab's memory only. It is sent with each request and is gone on
          reload.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '1.4rem 0' }}>
        <div className="segmented" role="tablist">
          {(['issue', 'revoke', 'issuer'] as Tab[]).map((t) => (
            <button
              key={t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
              role="tab"
              aria-selected={tab === t}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ── issue ──────────────────────────────────────────────── */}
      {tab === 'issue' && (
        <div className="panel">
          {!previewing && !issueSuccess && (
            <>
              <p className="form-section-label">Student</p>
              <div className="form-grid">
                <label className="field">
                  Full name
                  <input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                </label>
                <label className="field">
                  Student ID
                  <input value={studentId} onChange={(e) => setStudentId(e.target.value)} />
                </label>
                <label className="field span-2">
                  Holder wallet address
                  <input className="mono" value={holderAddress} onChange={(e) => setHolderAddress(e.target.value)} placeholder={ADDR_PLACEHOLDER} spellCheck={false} />
                </label>
                <label className="field">
                  Email <span className="ui-only">UI only</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
              </div>

              <p className="form-section-label">Degree</p>
              <div className="form-grid">
                <label className="field">
                  Degree name
                  <input value={degreeName} onChange={(e) => setDegreeName(e.target.value)} />
                </label>
                <label className="field">
                  Major
                  <input value={major} onChange={(e) => setMajor(e.target.value)} />
                </label>
                <label className="field">
                  Graduation year
                  <input value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} />
                </label>
                <label className="field">
                  Classification <span className="ui-only">UI only</span>
                  <input value={classification} onChange={(e) => setClassification(e.target.value)} placeholder="e.g. Distinction" />
                </label>
                <label className="field">
                  Issue date <span className="ui-only">UI only</span>
                  <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </label>
                <label className="field span-2">
                  Issuer wallet address
                  <input className="mono" value={issuerAddress} onChange={(e) => setIssuerAddress(e.target.value)} placeholder={ADDR_PLACEHOLDER} spellCheck={false} />
                </label>
              </div>
              <p className="hint">
                Fields marked <span className="ui-only">UI only</span> aren't accepted by the
                backend and are not stored on-chain or in the database.
              </p>

              <p className="form-section-label" style={{ marginTop: '1.4rem' }}>
                Transcript
              </p>
              <div className="proof-toolbar">
                <label className="file-btn">
                  ⤓ Upload CSV…
                  <input type="file" accept=".csv,text/csv" onChange={onCsv} style={{ display: 'none' }} />
                </label>
                <span className="hint">columns (in order): course ID, course name, semester, credit, grade</span>
              </div>

              <div className="tx-table">
                <div className="tx-row tx-head">
                  <span>Course ID</span>
                  <span>Course name</span>
                  <span>Semester</span>
                  <span>Credit</span>
                  <span>Grade</span>
                  <span />
                </div>
                {rows.map((r, i) => (
                  <div className="tx-row" key={i}>
                    <input value={r.courseId} onChange={(e) => setRow(i, { courseId: e.target.value })} spellCheck={false} />
                    <input value={r.courseName} onChange={(e) => setRow(i, { courseName: e.target.value })} />
                    <input value={r.semester} onChange={(e) => setRow(i, { semester: e.target.value })} spellCheck={false} />
                    <input type="number" value={r.creditsScaled} onChange={(e) => setRow(i, { creditsScaled: e.target.value })} />
                    <input value={r.grade} onChange={(e) => setRow(i, { grade: e.target.value })} spellCheck={false} />
                    <button
                      className="reset"
                      onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button className="ghost sm" onClick={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])}>
                + Add course
              </button>

              {issueError && <ErrorPanel err={issueError} />}

              <div className="actions" style={{ marginTop: '1.3rem' }}>
                <button className="btn lg" onClick={openPreview}>
                  Review before issuing →
                </button>
              </div>
            </>
          )}

          {/* ── preview ─────────────────────────────────────────── */}
          {previewing && (
            <>
              <div className="preview-head">
                <span className="eyebrow">Step 2 of 2</span>
                <h2>Preview credential before issuing</h2>
                <p className="lead">
                  Confirm the details below. The backend will derive the Merkle root and the
                  university digital signature when you confirm.
                </p>
              </div>

              <div className="kv-section">
                <h3 className="kv-title">Student</h3>
                <dl className="kv-list">
                  <dt>Full name</dt><dd>{studentName || <em className="kv-empty">(missing)</em>}</dd>
                  <dt>Student ID</dt><dd>{studentId || <em className="kv-empty">(missing)</em>}</dd>
                  <dt>Wallet address</dt><dd className="mono">{holderAddress || <em className="kv-empty">(missing)</em>}</dd>
                </dl>
              </div>

              <div className="kv-section">
                <h3 className="kv-title">Degree</h3>
                <dl className="kv-list">
                  <dt>Degree name</dt><dd>{degreeName || <em className="kv-empty">(missing)</em>}</dd>
                  <dt>Major</dt><dd>{major || <em className="kv-empty">(missing)</em>}</dd>
                  <dt>Graduation year</dt><dd>{graduationYear || <em className="kv-empty">(missing)</em>}</dd>
                </dl>
              </div>

              <div className="kv-section">
                <h3 className="kv-title">Transcript</h3>
                <p className="kv-note">{transcriptRows.length} course{transcriptRows.length === 1 ? '' : 's'}</p>
                {transcriptRows.length > 0 ? (
                  <div className="tx-table">
                    <div className="tx-row tx-head">
                      <span>Course ID</span>
                      <span>Course name</span>
                      <span>Semester</span>
                      <span>Credit</span>
                      <span>Grade</span>
                    </div>
                    {transcriptRows.map((r, i) => (
                      <div className="tx-row tx-readonly" key={i}>
                        <span>{r.courseId}</span>
                        <span>{r.courseName}</span>
                        <span>{r.semester}</span>
                        <span>{r.creditsScaled}</span>
                        <span>{r.grade}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="kv-empty">(no courses)</p>
                )}
                <p className="kv-note muted">Merkle root will be generated automatically.</p>
              </div>

              <div className="kv-section">
                <h3 className="kv-title">Blockchain</h3>
                <dl className="kv-list">
                  <dt>Issuer wallet address</dt><dd className="mono">{issuerAddress || <em className="kv-empty">(missing)</em>}</dd>
                  <dt>University digital signature</dt><dd className="kv-pending">generated by the backend</dd>
                  <dt>Credential ID</dt><dd className="kv-pending">generated after issue</dd>
                </dl>
              </div>

              {issueError && <ErrorPanel err={issueError} />}

              <div className="actions" style={{ marginTop: '1.3rem' }}>
                <button className="ghost" onClick={backToEdit} disabled={issuing}>
                  ← Back to edit
                </button>
                <button className="btn lg" onClick={confirmIssue} disabled={issuing}>
                  {issuing ? 'Issuing…' : 'Confirm and issue'}
                </button>
              </div>
            </>
          )}

          {/* ── success ─────────────────────────────────────────── */}
          {issueSuccess && (
            <>
              <div className="result-banner ok" style={{ marginTop: 0 }}>
                <span className="verdict">✅ Credential issued</span>
                <span className="claims">
                  The credential is now on-chain and recorded in the database.
                </span>
              </div>

              <div className="kv-section" style={{ marginTop: '1.2rem' }}>
                <h3 className="kv-title">On-chain record</h3>
                <dl className="kv-list">
                  <dt>Credential ID</dt><dd className="mono break">{issueSuccess.credentialId}</dd>
                  <dt>Merkle root</dt><dd className="mono break">{issueSuccess.merkleRoot}</dd>
                  <dt>University digital signature</dt><dd className="mono break">{issueSuccess.signature}</dd>
                  <dt>Transaction hash</dt><dd className="mono break">{issueSuccess.txHash}</dd>
                </dl>
              </div>

              <div className="actions" style={{ marginTop: '1.2rem' }}>
                <button
                  className="ghost"
                  onClick={() => {
                    setIssueSuccess(null);
                    setPreviewing(false);
                  }}
                >
                  Issue another
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── revoke ─────────────────────────────────────────────── */}
      {tab === 'revoke' && (
        <div className="panel">
          <label className="field">
            Credential ID
            <input className="mono" value={revokeId} onChange={(e) => setRevokeId(e.target.value)} placeholder="0x…" spellCheck={false} />
          </label>
          <label className="field">
            Reason <span className="ui-only">UI only</span>
            <input value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} placeholder="e.g. issued in error" />
          </label>
          <p className="hint">
            The backend records only the credential ID. The reason is for your own records and is
            not stored.
          </p>
          {revokeError && <ErrorPanel err={revokeError} />}
          {revokeSuccess && (
            <div className="result-banner ok">
              <span className="verdict">✅ Credential revoked</span>
              <span className="claims">{revokeSuccess}</span>
            </div>
          )}
          <div className="actions" style={{ marginTop: '1.2rem' }}>
            <button className="btn lg" onClick={revoke} disabled={revoking}>
              {revoking ? 'Revoking…' : 'Revoke credential'}
            </button>
          </div>
        </div>
      )}

      {/* ── add issuer ─────────────────────────────────────────── */}
      {tab === 'issuer' && (
        <div className="panel">
          <label className="field">
            Issuer wallet address
            <input className="mono" value={newIssuerAddr} onChange={(e) => setNewIssuerAddr(e.target.value)} placeholder={ADDR_PLACEHOLDER} spellCheck={false} />
          </label>
          <label className="field">
            Issuer name
            <input value={newIssuerName} onChange={(e) => setNewIssuerName(e.target.value)} placeholder="e.g. Hanoi University of Science and Technology" />
          </label>
          {issuerError && <ErrorPanel err={issuerError} />}
          {issuerSuccess && (
            <div className="result-banner ok">
              <span className="verdict">✅ Issuer authorized</span>
              <span className="claims">{issuerSuccess}</span>
            </div>
          )}
          <div className="actions" style={{ marginTop: '1.2rem' }}>
            <button className="btn lg" onClick={addIssuer} disabled={addingIssuer}>
              {addingIssuer ? 'Authorizing…' : 'Authorize issuer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
