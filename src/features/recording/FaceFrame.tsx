import type { ClipSpec } from './protocol';

/** Oval guide over the (mirrored) preview. Profile clips show a turn-direction hint. */
export function FaceFrame({ framing }: { framing: ClipSpec['framing'] }) {
  const profile = framing !== 'front';
  // Preview is mirrored, so "left profile" means the user turns their head to their left = screen left.
  const arrow = framing === 'profile_left' ? '←' : '→';
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <mask id="face-hole">
          <rect width="100" height="100" fill="white" />
          <ellipse cx="50" cy="48" rx={profile ? 20 : 22} ry="34" fill="black" />
        </mask>
      </defs>
      <rect width="100" height="100" fill="rgba(2,6,23,0.45)" mask="url(#face-hole)" />
      <ellipse
        cx="50"
        cy="48"
        rx={profile ? 20 : 22}
        ry="34"
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="0.6"
        strokeDasharray={profile ? '2 1.5' : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {profile && (
        <text x="50" y="94" textAnchor="middle" fontSize="8" fill="white">
          {arrow}
        </text>
      )}
    </svg>
  );
}
