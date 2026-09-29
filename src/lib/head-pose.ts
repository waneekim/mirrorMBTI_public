export interface HeadPose {
  /** Degrees. Rotation around the vertical axis (turning left/right). */
  yaw: number;
  /** Degrees. Nodding up/down. */
  pitch: number;
  /** Degrees. Tilting toward a shoulder. */
  roll: number;
}

const DEG = 180 / Math.PI;

/**
 * Extract yaw/pitch/roll from a 4x4 rigid transform (MediaPipe facialTransformationMatrix).
 * Layout is detected from where the translation sits, so both row- and column-major input work.
 * Decomposition is R = Rz(roll) · Ry(yaw) · Rx(pitch).
 */
export function headPoseFromMatrix(data: ArrayLike<number>): HeadPose {
  if (data.length < 16) throw new Error('expected a 4x4 matrix');
  const colMajor =
    Math.abs(data[12]) + Math.abs(data[13]) + Math.abs(data[14]) >=
    Math.abs(data[3]) + Math.abs(data[7]) + Math.abs(data[11]);
  const r = (row: number, col: number) => (colMajor ? data[col * 4 + row] : data[row * 4 + col]);

  const yaw = Math.atan2(-r(2, 0), Math.hypot(r(2, 1), r(2, 2)));
  const pitch = Math.atan2(r(2, 1), r(2, 2));
  const roll = Math.atan2(r(1, 0), r(0, 0));
  return { yaw: yaw * DEG, pitch: pitch * DEG, roll: roll * DEG };
}
