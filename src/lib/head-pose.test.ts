import { describe, expect, it } from 'vitest';
import { headPoseFromMatrix } from './head-pose';

const rad = (d: number) => (d * Math.PI) / 180;

/** Row-major 3x3 of Rz(roll)·Ry(yaw)·Rx(pitch). */
function rotation(yaw: number, pitch: number, roll: number): number[][] {
  const [cy, sy, cp, sp, cr, sr] = [Math.cos(rad(yaw)), Math.sin(rad(yaw)), Math.cos(rad(pitch)), Math.sin(rad(pitch)), Math.cos(rad(roll)), Math.sin(rad(roll))];
  const Rz = [[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]];
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const Rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]];
  const mul = (a: number[][], b: number[][]) => a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0)));
  return mul(mul(Rz, Ry), Rx);
}

/** 4x4 with translation (face ~40cm in front of the camera). */
function matrix(R: number[][], layout: 'col' | 'row'): number[] {
  const t = [1.5, -2, -40];
  const m = [
    [...R[0], t[0]],
    [...R[1], t[1]],
    [...R[2], t[2]],
    [0, 0, 0, 1],
  ];
  const out: number[] = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out.push(layout === 'row' ? m[i][j] : m[j][i]);
  return out;
}

describe('headPoseFromMatrix', () => {
  it('returns zero for identity rotation', () => {
    const p = headPoseFromMatrix(matrix(rotation(0, 0, 0), 'col'));
    expect(p.yaw).toBeCloseTo(0);
    expect(p.pitch).toBeCloseTo(0);
    expect(p.roll).toBeCloseTo(0);
  });

  it.each([
    [-70, 5, -3],
    [70, -8, 4],
    [25, 15, 10],
  ])('round-trips yaw=%d pitch=%d roll=%d in both layouts', (yaw, pitch, roll) => {
    for (const layout of ['col', 'row'] as const) {
      const p = headPoseFromMatrix(matrix(rotation(yaw, pitch, roll), layout));
      expect(p.yaw).toBeCloseTo(yaw, 6);
      expect(p.pitch).toBeCloseTo(pitch, 6);
      expect(p.roll).toBeCloseTo(roll, 6);
    }
  });

  it('flags profile clips via |yaw| ≥ 50°', () => {
    expect(Math.abs(headPoseFromMatrix(matrix(rotation(-68, 0, 0), 'col')).yaw)).toBeGreaterThanOrEqual(50);
  });

  it('rejects short input', () => {
    expect(() => headPoseFromMatrix([1, 0, 0])).toThrow();
  });
});
