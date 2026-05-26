import { useEffect, useState } from 'react';

export function hasInjectedProvider(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

/** Prompt the injected wallet for an account. Returns null if unavailable/rejected. */
export async function connectWallet(): Promise<string | null> {
  if (!hasInjectedProvider()) return null;
  try {
    const accs = (await window.ethereum!.request({
      method: 'eth_requestAccounts',
    })) as string[];
    return accs && accs.length ? accs[0] : null;
  } catch {
    return null;
  }
}

/** Reflect an already-authorized account (no prompt) and track changes. */
export function useInjectedAccount(): string | null {
  const [account, setAccount] = useState<string | null>(null);
  useEffect(() => {
    if (!hasInjectedProvider()) return;
    window
      .ethereum!.request({ method: 'eth_accounts' })
      .then((a) => {
        const list = a as string[];
        if (list && list.length) setAccount(list[0]);
      })
      .catch(() => undefined);
    const onChange = (...args: unknown[]) => {
      const list = args[0] as string[];
      setAccount(list && list.length ? list[0] : null);
    };
    window.ethereum!.on?.('accountsChanged', onChange);
    return () => window.ethereum!.removeListener?.('accountsChanged', onChange);
  }, []);
  return account;
}
