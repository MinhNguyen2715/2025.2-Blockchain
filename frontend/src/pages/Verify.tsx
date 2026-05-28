import { useRef, useState } from 'react';
import { apiFetch, ApiResult } from '../lib/api';
import { formatError } from '../lib/errors';
import { parseBundle, CourseClaim } from '../lib/proof';

type Mode = 'degree' | 'course' | 'status';

const MODE_LABEL: Record<Mode, string> = {
  degree: 'Verify degree information',
  course: 'Verify one course',
  status: 'Check revocation status',
};

type DegreeFields = {
  credentialId: string;
  degreeName: string;
  major: string;
  graduationYear: string;
  proof: string;
  signature: string;
};

type CourseFields = {
  credentialId: string;
  courseId: string;
  courseName: string;
  semester: string;
  creditsScaled: string;
  grade: string;
  proof: string;
  signature: string;
};

const DEGREE_INIT: DegreeFields = {
  credentialId: '',
  degreeName: '',
  major: '',
  graduationYear: '',
  proof: '',
  signature: '',
};

const COURSE_INIT: CourseFields = {
  credentialId: '',
  courseId: '',
  courseName: '',
  semester: '',
  creditsScaled: '',
  grade: '',
  proof: '',
  signature: '',
};

/** Split a multiline proof box into an array of hashes. */
function parseProofLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

type Verdict = {
  kind: 'ok' | 'bad' | 'warn';
  headline: string;
  bullets: string[];
  /** Optional claim line shown beneath the headline (e.g. degree summary). */
  claim?: string;
};

function interpret(mode: Mode, res: ApiResult): Verdict {
  if ('error' in res) {
    return {
      kind: 'bad',
      headline: '❌ Connection error',
      bullets: [res.error || 'Could not reach the verification service.'],
    };
  }

  if (!res.ok) {
    // 404 → the credential doesn't exist on-chain
    if (res.status === 404) {
      return {
        kind: 'warn',
        headline: '❌ Invalid credential',
        bullets: ['This credential does not exist on the blockchain.'],
      };
    }
    // 4xx/5xx → render as bullet list (validation errors, missing fields, 401, etc.)
    const e = formatError(res);
    return {
      kind: 'warn',
      headline: e.headline,
      bullets: e.bullets,
    };
  }

  const body = (res.body && typeof res.body === 'object' ? res.body : {}) as Record<string, unknown>;

  if (mode === 'status') {
    if (body.revoked === true) {
      return {
        kind: 'bad',
        headline: '❌ Invalid credential',
        bullets: ['This credential has been revoked.'],
      };
    }
    if (body.valid === true) {
      return {
        kind: 'ok',
        headline: '✅ Valid credential',
        bullets: [
          'This credential exists on the blockchain.',
          'It has not been revoked.',
        ],
      };
    }
    return {
      kind: 'bad',
      headline: '❌ Invalid credential',
      bullets: ['The credential failed an on-chain status check.'],
    };
  }

  // degree / course
  if (body.valid === true) {
    const lastBullet =
      mode === 'degree'
        ? 'The disclosed degree is included in the original transcript.'
        : 'The disclosed course is included in the original transcript.';
    const claim =
      mode === 'degree'
        ? [body.degreeName, body.major, body.graduationYear].filter(Boolean).join(' · ')
        : undefined;
    return {
      kind: 'ok',
      headline: '✅ Valid credential',
      bullets: [
        'This credential was issued by an authorized university.',
        'The university digital signature is valid.',
        'The credential has not been revoked.',
        lastBullet,
      ],
      claim: claim || undefined,
    };
  }

  return {
    kind: 'bad',
    headline: '❌ Invalid credential',
    bullets: ['The privacy proof did not match the credential.'],
  };
}

/** A single labeled text input. */
function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      {props.label}
      <input
        className={props.mono ? 'mono' : undefined}
        value={props.value}
        type={props.type ?? 'text'}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        spellCheck={false}
      />
    </label>
  );
}

export function Verify() {
  const [mode, setMode] = useState<Mode>('degree');
  const [degree, setDegree] = useState<DegreeFields>(DEGREE_INIT);
  const [course, setCourse] = useState<CourseFields>(COURSE_INIT);
  const [statusId, setStatusId] = useState('');

  // When a bundle with multiple courses is loaded, let the verifier switch among them.
  const [loadedCourses, setLoadedCourses] = useState<CourseClaim[] | null>(null);

  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loadNote, setLoadNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setVerdict(null);
    setLoadNote(null);
  }

  function fillCourseFrom(c: CourseClaim, credentialId: string, signature: string) {
    setCourse({
      credentialId,
      courseId: c.courseId,
      courseName: c.courseName,
      semester: c.semester,
      creditsScaled: String(c.creditsScaled),
      grade: c.grade,
      proof: (c.proof ?? []).join('\n'),
      signature,
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const b = parseBundle(String(reader.result ?? ''));
        setVerdict(null);
        if (b.degree) {
          setDegree({
            credentialId: b.credentialId,
            degreeName: b.degree.degreeName,
            major: b.degree.major,
            graduationYear: b.degree.graduationYear,
            proof: (b.degreeProof ?? []).join('\n'),
            signature: b.signature || '',
          });
        }
        if (b.courses && b.courses.length) {
          setLoadedCourses(b.courses);
          fillCourseFrom(b.courses[0], b.credentialId, b.signature || '');
        } else {
          setLoadedCourses(null);
        }
        // Land the verifier on whatever the bundle actually carries.
        const next: Mode = b.degree ? 'degree' : b.courses && b.courses.length ? 'course' : mode;
        setMode(next);
        const parts: string[] = [];
        if (b.degree) parts.push('degree claim');
        if (b.courses?.length) parts.push(`${b.courses.length} course${b.courses.length > 1 ? 's' : ''}`);
        setLoadNote(`Loaded ${parts.join(' + ') || 'bundle'} from ${file.name}.`);
      } catch (err) {
        setLoadNote(`That file isn't a valid proof bundle: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function verify() {
    setVerdict(null);
    setLoading(true);
    try {
      let res: ApiResult;
      if (mode === 'status') {
        res = await apiFetch(`/verify/status/${encodeURIComponent(statusId)}`);
      } else if (mode === 'degree') {
        res = await apiFetch('/verify/degree', {
          method: 'POST',
          body: {
            credentialId: degree.credentialId,
            degreeName: degree.degreeName,
            major: degree.major,
            graduationYear: degree.graduationYear,
            proof: parseProofLines(degree.proof),
            signature: degree.signature,
          },
        });
      } else {
        res = await apiFetch('/verify/full', {
          method: 'POST',
          body: {
            credentialId: course.credentialId,
            courseId: course.courseId,
            courseName: course.courseName,
            semester: course.semester,
            creditsScaled: Number(course.creditsScaled) || 0,
            grade: course.grade,
            proof: parseProofLines(course.proof),
            signature: course.signature,
          },
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
          Load the proof a student shared with you (it fills the fields below), or enter the
          claim by hand. Choose what you're checking.
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

        {mode !== 'status' && (
          <div className="proof-toolbar">
            <button className="file-btn" onClick={() => fileRef.current?.click()}>
              ⤓ Load proof file…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              style={{ display: 'none' }}
            />
            <span className="hint">load the .json the student exported, then verify</span>
          </div>
        )}

        {loadNote && (
          <div className="privacy-note" style={{ marginBottom: '1rem' }}>
            <span>📎</span>
            <span>{loadNote}</span>
          </div>
        )}

        {mode === 'status' && (
          <label className="field">
            Credential ID
            <input
              className="mono"
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
            />
          </label>
        )}

        {mode === 'degree' && (
          <div className="form-grid">
            <Field label="Credential ID" mono placeholder="0x…" value={degree.credentialId} onChange={(v) => setDegree({ ...degree, credentialId: v })} />
            <Field label="Degree name" value={degree.degreeName} onChange={(v) => setDegree({ ...degree, degreeName: v })} />
            <Field label="Major" value={degree.major} onChange={(v) => setDegree({ ...degree, major: v })} />
            <Field label="Graduation year" value={degree.graduationYear} onChange={(v) => setDegree({ ...degree, graduationYear: v })} />
            <label className="field span-2">
              Privacy proof (one hash per line)
              <textarea
                className="mono"
                value={degree.proof}
                onChange={(e) => setDegree({ ...degree, proof: e.target.value })}
                rows={Math.min(10, degree.proof.split('\n').length + 1)}
                placeholder={'0x…\n0x…'}
                spellCheck={false}
              />
            </label>
            <label className="field span-2">
              University digital signature
              <input
                className="mono"
                value={degree.signature}
                onChange={(e) => setDegree({ ...degree, signature: e.target.value })}
                placeholder="0x…"
                spellCheck={false}
              />
            </label>
          </div>
        )}

        {mode === 'course' && (
          <>
            {loadedCourses && loadedCourses.length > 1 && (
              <label className="field">
                Course in bundle
                <select
                  value={course.courseId}
                  onChange={(e) => {
                    const c = loadedCourses.find((x) => x.courseId === e.target.value);
                    if (c) fillCourseFrom(c, course.credentialId, course.signature);
                  }}
                >
                  {loadedCourses.map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.courseId} — {c.courseName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="form-grid">
              <Field label="Credential ID" mono placeholder="0x…" value={course.credentialId} onChange={(v) => setCourse({ ...course, credentialId: v })} />
              <Field label="Course ID" value={course.courseId} onChange={(v) => setCourse({ ...course, courseId: v })} />
              <Field label="Course name" value={course.courseName} onChange={(v) => setCourse({ ...course, courseName: v })} />
              <Field label="Semester" value={course.semester} onChange={(v) => setCourse({ ...course, semester: v })} />
              <Field label="Credit" type="number" value={course.creditsScaled} onChange={(v) => setCourse({ ...course, creditsScaled: v })} />
              <Field label="Grade" value={course.grade} onChange={(v) => setCourse({ ...course, grade: v })} />
              <label className="field span-2">
                Privacy proof (one hash per line)
                <textarea
                  className="mono"
                  value={course.proof}
                  onChange={(e) => setCourse({ ...course, proof: e.target.value })}
                  rows={Math.min(10, course.proof.split('\n').length + 1)}
                  placeholder={'0x…\n0x…'}
                  spellCheck={false}
                />
              </label>
              <label className="field span-2">
                University digital signature
                <input
                  className="mono"
                  value={course.signature}
                  onChange={(e) => setCourse({ ...course, signature: e.target.value })}
                  placeholder="0x…"
                  spellCheck={false}
                />
              </label>
            </div>
          </>
        )}

        {mode === 'degree' && (
          <div className="privacy-note">
            <span>🔒</span>
            <span>
              <strong>Privacy preserved.</strong> A degree check confirms only the degree, major,
              and graduation year via a privacy proof. The transcript and grades are never
              transmitted.
            </span>
          </div>
        )}

        <div className="actions" style={{ marginTop: '1.2rem' }}>
          <button className="btn lg" onClick={verify} disabled={loading}>
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </div>

        {verdict && (
          <div className={`result-banner ${verdict.kind}`}>
            <span className="verdict">{verdict.headline}</span>
            {verdict.claim && <span className="claims">{verdict.claim}</span>}
            {verdict.bullets.length > 0 && (
              <ul className="banner-bullets">
                {verdict.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
