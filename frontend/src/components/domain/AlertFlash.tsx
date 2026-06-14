import { useEffect, useState } from 'react';

// A brief, restrained on-screen flash (severity-tinted inset border + soft vignette) when a
// new alert fires, alongside the banner + sound. Plays once for ~0.9s then removes itself.
export function AlertFlash({ severity }: { severity: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 900);
    return () => clearTimeout(t);
  }, []);
  if (done) return null;

  const rgb = severity === 'critical' ? '217,45,32' : severity === 'high' ? '247,144,9' : '61,121,187';
  return (
    <div
      aria-hidden
      className="alert-flash pointer-events-none fixed inset-0 z-[90]"
      style={{
        boxShadow: `inset 0 0 0 4px rgba(${rgb},0.7)`,
        background: `radial-gradient(ellipse at center, transparent 55%, rgba(${rgb},0.16) 100%)`,
      }}
    />
  );
}
