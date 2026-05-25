import { ReactNode } from 'react';
import { WalletButton } from './WalletButton';

const NAV = [
  { to: '#/verify', label: 'Verify' },
  { to: '#/student', label: 'Student' },
  { to: '#/university', label: 'University' },
];

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="seal">◆</span>
          Diploma Verifier
        </a>
        <nav className="topnav">
          {NAV.map((n) => (
            <a key={n.to} href={n.to} className={path === n.to.slice(1) ? 'active' : ''}>
              {n.label}
            </a>
          ))}
        </nav>
        <span className="spacer" />
        <WalletButton />
      </header>

      <main className="content">{children}</main>

      <footer className="footer">
        Diploma Verifier · privacy-preserving credential checks on-chain ·{' '}
        <a href="#/smoke">endpoint diagnostics</a>
      </footer>
    </div>
  );
}
