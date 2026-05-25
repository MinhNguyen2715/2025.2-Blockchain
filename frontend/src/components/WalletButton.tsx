import { useEffect, useState } from 'react';

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Connect-wallet control using the injected EIP-1193 provider (e.g. MetaMask).
 * No wallet SDK dependency. Falls back gracefully when no provider is present.
 */
export function WalletButton() {
  const [account, setAccount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasProvider = typeof window !== 'undefined' && !!window.ethereum;

  useEffect(() => {
    if (!hasProvider) return;
    // Reflect an already-authorized account without prompting.
    window
      .ethereum!.request({ method: 'eth_accounts' })
      .then((accs) => {
        const list = accs as string[];
        if (list && list.length) setAccount(list[0]);
      })
      .catch(() => undefined);

    const onAccountsChanged = (...args: unknown[]) => {
      const list = args[0] as string[];
      setAccount(list && list.length ? list[0] : null);
    };
    window.ethereum!.on?.('accountsChanged', onAccountsChanged);
    return () => window.ethereum!.removeListener?.('accountsChanged', onAccountsChanged);
  }, [hasProvider]);

  async function connect() {
    if (!hasProvider) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    setBusy(true);
    try {
      const accs = (await window.ethereum!.request({
        method: 'eth_requestAccounts',
      })) as string[];
      if (accs && accs.length) setAccount(accs[0]);
    } catch {
      /* user rejected */
    } finally {
      setBusy(false);
    }
  }

  if (account) {
    return (
      <span className="wallet connected" title={account}>
        <span className="dot" />
        {short(account)}
      </span>
    );
  }

  return (
    <button className="wallet" onClick={connect} disabled={busy}>
      {busy ? 'Connecting…' : hasProvider ? 'Connect Wallet' : 'Install MetaMask'}
    </button>
  );
}
