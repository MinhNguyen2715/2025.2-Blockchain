import { useEffect, useState } from 'react';

/**
 * Dependency-free hash router. Routes look like `#/verify`.
 * Returns the current path ('/', '/verify', ...) and re-renders on change.
 */
export function useHashRoute(): string {
  const [path, setPath] = useState(parseHash());
  useEffect(() => {
    const onChange = () => setPath(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

function parseHash(): string {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw || raw === '/') return '/';
  return raw.replace(/\/+$/, '') || '/';
}

/** Navigate programmatically. */
export function navigate(to: string): void {
  window.location.hash = to.startsWith('/') ? to : `/${to}`;
}
