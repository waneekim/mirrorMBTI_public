import type { ReactNode } from 'react';

export function Section({ title, subtitle, children, muted = false }: { title: string; subtitle?: string; children: ReactNode; muted?: boolean }) {
  return (
    <section className={`rounded-2xl bg-slate-900 p-4 ring-1 ring-white/5 ${muted ? 'opacity-60' : ''}`}>
      <h3 className="font-semibold">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
