export function calculateAngle3D(a, b, c) {
  if (!a || !b || !c) return null;

  const ab = [a.x - b.x, a.y - b.y, a.z - b.z];
  const cb = [c.x - b.x, c.y - b.y, c.z - b.z];

  const dot = ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2];
  const normAb = Math.sqrt(ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2);
  const normCb = Math.sqrt(cb[0] ** 2 + cb[1] ** 2 + cb[2] ** 2);

  const cosine = dot / (normAb * normCb);
  const angleRad = Math.acos(Math.min(Math.max(cosine, -1), 1));

  return (angleRad * 180) / Math.PI;
}
