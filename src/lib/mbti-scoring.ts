// Likert responses → 4 continuous axes (CLAUDE.md §7). Pure functions only.
// 0 = E/S/T/J, 100 = I/N/F/P. The 16-type string is derived for display only.

export type Axis = 'EI' | 'SN' | 'TF' | 'JP';
export const AXES: readonly Axis[] = ['EI', 'SN', 'TF', 'JP'];
export type Axes = Record<Axis, number>;

export const AXIS_POLES: Record<Axis, [low: string, high: string]> = {
  EI: ['E', 'I'],
  SN: ['S', 'N'],
  TF: ['T', 'F'],
  JP: ['J', 'P'],
};

export interface ScoredItem {
  id: string;
  axis: Axis;
  keyed: 'high' | 'low';
}

/** Likert 1..5 → 0..4 toward the high pole; low-keyed items are reversed. */
export function itemScore(value: number, keyed: 'high' | 'low'): number {
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new RangeError(`Likert value out of range: ${value}`);
  return keyed === 'high' ? value - 1 : 5 - value;
}

/** Scores every axis; returns null until every item has an answer. */
export function scoreSurvey(items: readonly ScoredItem[], answers: Record<string, number>): Axes | null {
  if (items.some((it) => answers[it.id] === undefined)) return null;
  const out = {} as Axes;
  for (const axis of AXES) {
    const its = items.filter((it) => it.axis === axis);
    const sum = its.reduce((a, it) => a + itemScore(answers[it.id], it.keyed), 0);
    out[axis] = its.length ? Math.round((sum / (4 * its.length)) * 1000) / 10 : 50;
  }
  return out;
}

/** Display-only type string. Exactly 50 shows 'X' (no lean). */
export function typeString(axes: Axes): string {
  return AXES.map((a) => (axes[a] < 50 ? AXIS_POLES[a][0] : axes[a] > 50 ? AXIS_POLES[a][1] : 'X')).join('');
}

/** Strength of lean toward the nearer pole, 0 (balanced) .. 100 (extreme). */
export function leanStrength(value: number): number {
  return Math.abs(value - 50) * 2;
}
