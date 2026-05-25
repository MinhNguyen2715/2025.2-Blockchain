export function Student() {
  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Holder</span>
        <h1>Student dashboard</h1>
        <p>
          View the credentials issued to your wallet and compose a proof to share with a
          verifier — revealing only the degree claim or the specific courses you select.
        </p>
      </div>

      <div className="panel placeholder">
        <div className="glyph">🎓</div>
        <h3>Coming in the next pass</h3>
        <p className="lead" style={{ marginTop: '0.5rem' }}>
          This page is designed and ready to be built against the live backend.
        </p>
        <ul className="checklist">
          <li>Connect wallet (or paste a wallet address) to load credentials</li>
          <li>
            List credentials from <code>GET /student/credentials/:walletAddress</code>
          </li>
          <li>Pick a credential and choose what to reveal (degree leaf and/or courses)</li>
          <li>
            Generate a proof via <code>POST /student/generate-proof</code>
          </li>
          <li>Copy or download the proof as a .json file to hand to a verifier</li>
        </ul>
      </div>
    </div>
  );
}
