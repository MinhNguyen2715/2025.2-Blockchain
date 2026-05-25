const ROLES = [
  {
    to: '#/verify',
    glyph: '✓',
    title: "I'm verifying",
    desc: 'Check a proof someone shared with you. Confirm a degree, course, or credential status — without ever seeing their grades.',
  },
  {
    to: '#/student',
    glyph: '🎓',
    title: "I'm a student",
    desc: 'View the credentials issued to you and generate a shareable proof that reveals only what you choose.',
  },
  {
    to: '#/university',
    glyph: '🏛',
    title: "I'm the university",
    desc: 'Issue and revoke credentials and authorize issuer wallets. Admin-key protected.',
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
            <p>{r.desc}</p>
            <span className="enter">Enter →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
