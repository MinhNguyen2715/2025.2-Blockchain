const ROLES = [
  {
    to: '#/student',
    glyph: '🎓',
    title: "I'm a student",
    bullets: [
      'View the diplomas issued to you',
      'Create a proof to share with an employer',
    ],
  },
  {
    to: '#/university',
    glyph: '🏛',
    title: "I'm a university",
    bullets: [
      'Issue digital diplomas',
      'Revoke diplomas',
      'Authorize issuers',
    ],
  },
  {
    to: '#/verify',
    glyph: '✓',
    title: "I'm a verifier",
    bullets: [
      'Load a proof a student sent you',
      'Verify a diploma, a course, or credential validity',
    ],
  },
];

export function Landing() {
  return (
    <div>
      <section className="hero">
        <span className="eyebrow">On-chain credentials</span>
        <h1>
          Prove what you earned.
          <br />
          Reveal only <span className="accent">what you choose</span>.
        </h1>
        <p>
          A privacy-preserving diploma system. Students prove they graduated — the major, the
          year — while the transcript and grades stay private.
        </p>
      </section>

      <div className="role-grid">
        {ROLES.map((r) => (
          <a key={r.to} href={r.to} className="role-card">
            <span className="glyph">{r.glyph}</span>
            <h3>{r.title}</h3>
            <ul className="role-bullets">
              {r.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <span className="enter">Enter →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
