import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { formatError, ErrorView } from '../lib/errors';

const ADDR_PLACEHOLDER = '0x0000000000000000000000000000000000000000';

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

/**
 * Platform-admin console. Hidden from the role nav — reachable at #/admin only.
 * The only action here is authorizing a new issuer (university) wallet.
 * This is the one place the administration key is required.
 */
export function Admin() {
  const [adminKey, setAdminKey] = useState('');
  const [issuerAddress, setIssuerAddress] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorView | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function addIssuer() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await apiFetch('/university/add-issuer', {
      method: 'POST',
      adminKey,
      body: {
        issuerAddress: issuerAddress.trim(),
        issuerName: issuerName.trim(),
      },
    });
    setBusy(false);
    if ('error' in res || !res.ok) {
      setError(formatError(res));
      return;
    }
    setSuccess(`Authorized ${issuerName.trim() || issuerAddress.trim()}.`);
    setIssuerAddress('');
    setIssuerName('');
  }

  return (
    <div>
      <div className="page-head">
        <span className="eyebrow">Platform admin</span>
        <h1>Admin console</h1>
        <p>
          Authorize a new issuer (university) wallet so the issuer can start issuing credentials.
          This is the only action that requires the administration key.
        </p>
      </div>

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

      <section className="group">
        <h2>Authorize an issuer</h2>
        <div className="panel">
          <label className="field">
            Issuer wallet address
            <input
              className="mono"
              value={issuerAddress}
              onChange={(e) => setIssuerAddress(e.target.value)}
              placeholder={ADDR_PLACEHOLDER}
              spellCheck={false}
            />
          </label>
          <label className="field">
            Issuer name
            <input
              value={issuerName}
              onChange={(e) => setIssuerName(e.target.value)}
              placeholder="e.g. Hanoi University of Science and Technology"
            />
          </label>

          {error && <ErrorPanel err={error} />}
          {success && (
            <div className="result-banner ok">
              <span className="verdict">✅ Issuer authorized</span>
              <span className="claims">{success}</span>
            </div>
          )}

          <div className="actions" style={{ marginTop: '1.2rem' }}>
            <button className="btn lg" onClick={addIssuer} disabled={busy}>
              {busy ? 'Authorizing…' : 'Authorize issuer'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
