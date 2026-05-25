export function University() {
  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Issuer · admin</span>
        <h1>University console</h1>
        <p>
          Issue and revoke credentials and authorize issuer wallets. Every action here requires
          the admin API key, sent as the <code>x-admin-api-key</code> header.
        </p>
      </div>

      <div className="panel placeholder">
        <div className="glyph">🏛</div>
        <h3>Coming in the next pass</h3>
        <p className="lead" style={{ marginTop: '0.5rem' }}>
          This page is designed and ready to be built against the live backend.
        </p>
        <ul className="checklist">
          <li>Admin API key field (kept in memory only, never persisted)</li>
          <li>
            Issue credential — holder, degree, and transcript rows via{' '}
            <code>POST /university/issue</code>
          </li>
          <li>
            Revoke a credential via <code>POST /university/revoke</code>
          </li>
          <li>
            Authorize a new issuer wallet via <code>POST /university/add-issuer</code>
          </li>
          <li>Clear 401 state when the key is missing, so the gate is legible</li>
        </ul>
      </div>
    </div>
  );
}
