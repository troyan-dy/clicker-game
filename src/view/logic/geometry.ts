type Pt = readonly [number, number];

export function length(pts: readonly Pt[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return n;
}

export function along(pts: readonly Pt[], d: number): Pt {
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg && seg > 0) return [pts[i - 1][0] + ((pts[i][0] - pts[i - 1][0]) * d) / seg, pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * d) / seg];
    d -= seg;
  }
  return pts[pts.length - 1];
}

export function curve(a: Pt, b: Pt, c: Pt, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = 1 - u;
    // the middle point is on the curve: the control point is pushed out accordingly
    const mx = 2 * b[0] - (a[0] + c[0]) / 2;
    const my = 2 * b[1] - (a[1] + c[1]) / 2;
    pts.push([v * v * a[0] + 2 * v * u * mx + u * u * c[0], v * v * a[1] + 2 * v * u * my + u * u * c[1]]);
  }
  return pts;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}
