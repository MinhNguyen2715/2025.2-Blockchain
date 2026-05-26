import { useState } from 'react';
import { apiFetch, pretty, ApiResult } from '../lib/api';

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

type Outcome =
  | { kind: 'ok'; title: string; data: unknown }
  | { kind: 'bad'; title: string; detail: string }
  | { kind: 'auth'; title: string; detail: string };

function outcomeFrom(res: ApiResult, okTitle: string): Outcome {
  if ('error' in res) {
    return { kind: 'bad', title: 'CONNECTION ERROR', detail: res.error };
  }
  if (res.status === 401) {
    return {
      kind: 'auth',
      title: 'UNAUTHORIZED',
      detail: 'The admin API key is missing or incorrect. Enter a valid x-admin-api-key above.',
    };
  }
  if (res.ok) {
    return { kind: 'ok', title: okTitle, data: res.body };
  }
  const body = res.body as Record<string, unknown> | undefined;
  const msg = body && (Array.isArray(body.message) ? body.message.join(', ') : body.message);
  return { kind: 'bad', title: `REJECTED · ${res.status}`, detail: (msg as string) || res.raw || 'Request failed' };
}

/** Parse a CSV string into transcript rows. Columns: courseId,courseName,semester,creditsScaled,grade */
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

function OutcomeBanner({ outcome }: { outcome: Outcome }) {
  const kind = outcome.kind === 'ok' ? 'ok' : outcome.kind === 'auth' ? 'warn' : 'bad';
  return (
    <div className={`result-banner ${kind}`}>
      <span className="verdict">{outcome.title}</span>
      {outcome.kind !== 'ok' && <span className="claims">{outcome.detail}</span>}
      {outcome.kind === 'ok' && (
        <details className="drawer" open>
          <summary>Response</summary>
          <pre>{pretty(outcome.data)}</pre>
        </details>
      )}
    </div>
  );
}

export function University() {
  const [adminKey, setAdminKey] = useState('');
  const [tab, setTab] = useState<Tab>('issue');

  // issue form
  const [holderAddress, setHolderAddress] = useState('');
  const [issuerAddress, setIssuerAddress] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [degreeName, setDegreeName] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  // UI-only (not sent to the backend)
  const [email, setEmail] = useState('');
  const [classification, setClassification] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }]);
  const [issueOut, setIssueOut] = useState<Outcome | null>(null);
  const [issuing, setIssuing] = useState(false);

  // revoke form
  const [revokeId, setRevokeId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeOut, setRevokeOut] = useState<Outcome | null>(null);
  const [revoking, setRevoking] = useState(false);

  // add issuer
  const [newIssuerAddr, setNewIssuerAddr] = useState('');
  const [newIssuerName, setNewIssuerName] = useState('');
  const [issuerOut, setIssuerOut] = useState<Outcome | null>(null);
  const [addingIssuer, setAddingIssuer] = useState(false);

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

  async function issue() {
    setIssuing(true);
    setIssueOut(null);
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
    setIssueOut(outcomeFrom(res, 'CREDENTIAL ISSUED'));
  }

  async function revoke() {
    setRevoking(true);
    setRevokeOut(null);
    const res = await apiFetch('/university/revoke', {
      method: 'POST',
      adminKey,
      body: { credentialId: revokeId.trim() },
    });
    setRevoking(false);
    setRevokeOut(outcomeFrom(res, 'CREDENTIAL REVOKED'));
  }

  async function addIssuer() {
    setAddingIssuer(true);
    setIssuerOut(null);
    const res = await apiFetch('/university/add-issuer', {
      method: 'POST',
      adminKey,
      body: { issuerAddress: newIssuerAddr.trim(), issuerName: newIssuerName.trim() },
    });
    setAddingIssuer(false);
    setIssuerOut(outcomeFrom(res, 'ISSUER AUTHORIZED'));
  }

  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Issuer · admin</span>
        <h1>University console</h1>
        <p>
          Issue and revoke credentials and authorize issuer wallets. Every action requires the
          admin API key, sent as the <code>x-admin-api-key</code> header.
        </p>
      </div>

      {/* ── admin key ──────────────────────────────────────────── */}
      <div className="panel">
        <label className="field">
          x-admin-api-key
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
            Fields marked <span className="ui-only">UI only</span> aren't accepted by the backend
            and are not stored on-chain or in the database.
          </p>

          <p className="form-section-label" style={{ marginTop: '1.4rem' }}>
            Transcript
          </p>
          <div className="proof-toolbar">
            <label className="file-btn">
              ⤓ Upload CSV…
              <input type="file" accept=".csv,text/csv" onChange={onCsv} style={{ display: 'none' }} />
            </label>
            <span className="hint">columns: courseId, courseName, semester, creditsScaled, grade</span>
          </div>

          <div className="tx-table">
            <div className="tx-row tx-head">
              <span>Course ID</span>
              <span>Course name</span>
              <span>Semester</span>
              <span>Credits ×100</span>
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

          <div className="actions" style={{ marginTop: '1.3rem' }}>
            <button className="btn lg" onClick={issue} disabled={issuing}>
              {issuing ? 'Issuing…' : 'Issue credential'}
            </button>
          </div>

          {issueOut && <OutcomeBanner outcome={issueOut} />}
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
          <div className="actions" style={{ marginTop: '1.2rem' }}>
            <button className="btn lg" onClick={revoke} disabled={revoking}>
              {revoking ? 'Revoking…' : 'Revoke credential'}
            </button>
          </div>
          {revokeOut && <OutcomeBanner outcome={revokeOut} />}
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
          <div className="actions" style={{ marginTop: '1.2rem' }}>
            <button className="btn lg" onClick={addIssuer} disabled={addingIssuer}>
              {addingIssuer ? 'Authorizing…' : 'Authorize issuer'}
            </button>
          </div>
          {issuerOut && <OutcomeBanner outcome={issuerOut} />}
        </div>
      )}
    </div>
  );
}
