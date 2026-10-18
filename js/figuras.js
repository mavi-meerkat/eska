// Ilustraciones animadas de cada ejercicio, todas con el mismo estilo:
// figura lineal redondeada, material del gimnasio en gris y la zona trabajada en el color de la fase.
// Ángulos en grados: 0 = hacia abajo, 90 = hacia la derecha, 180 = hacia arriba, -90 = hacia la izquierda.

const L = { torso: 46, neck: 6, headR: 9, up: 26, fo: 24, th: 36, sh: 34, foot: 10, shW: 14, hipW: 8 };
const R = Math.PI / 180;
const dir = (a) => [Math.sin(a * R), Math.cos(a * R)];
const add = (p, v, s = 1) => [p[0] + v[0] * s, p[1] + v[1] * s];
const angOf = (v) => Math.atan2(v[0], v[1]) / R;
const f1 = (n) => Math.round(n * 10) / 10;

function ik(S, T, l1, l2, bend) {
  let dx = T[0] - S[0], dy = T[1] - S[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.01, min = Math.abs(l1 - l2) + 0.01;
  if (d > max) { T = [S[0] + dx / d * max, S[1] + dy / d * max]; d = max; }
  if (d < min) { T = [S[0] + dx / d * min, S[1] + dy / d * min]; d = min; }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(T[1] - S[1], T[0] - S[0]);
  const ang = base + bend * a;
  return [[S[0] + l1 * Math.cos(ang), S[1] + l1 * Math.sin(ang)], T];
}

// --- Resolución de una pose a puntos ---
function solve(p) {
  const v = p.view || "side";
  const P = [p.x, p.y];
  let t = p.t ?? 180;
  if (p.sh) t = angOf([p.sh[0] - P[0], p.sh[1] - P[1]]);
  const td = dir(t);
  const top = add(P, td, L.torso);
  const head = add(P, td, L.torso + L.neck + L.headR);
  const J = { view: v, P, top, head, t };
  let sh1, sh2, hp1, hp2;
  if (v === "front") {
    const perp = dir(t - 90);
    sh1 = add(top, perp, -L.shW); sh2 = add(top, perp, L.shW);
    hp1 = add(P, perp, -L.hipW); hp2 = add(P, perp, L.hipW);
  } else {
    sh1 = top; hp1 = P; sh2 = add(top, [-3, -1.5]); hp2 = add(P, [-3, -1.5]);
  }
  J.sh = [sh1, sh2]; J.hp = [hp1, hp2];
  J.arm = [1, 2].map((i) => {
    const S = J.sh[i - 1];
    const k = p["k" + i] ?? 1, kf = p["kf" + i] ?? 1;
    let H = p["h" + i];
    if (p["hr" + i]) H = add(top, p["hr" + i]);
    if (p["hp" + i]) H = add(P, p["hp" + i]);
    if (H) {
      if (p["st" + i]) { // brazo recto visto en escorzo
        const E = [S[0] + (H[0] - S[0]) * 0.52, S[1] + (H[1] - S[1]) * 0.52];
        return { S, E, H };
      }
      const def = v === "front" ? (i === 1 ? -1 : 1) : 1;
      const [E, H2] = ik(S, H, L.up * k, L.fo * kf, p["eb" + i] ?? def);
      return { S, E, H: H2 };
    }
    if (p["eo" + i]) { const E = add(S, p["eo" + i]); return { S, E, H: add(E, dir(p["f" + i] ?? 0), L.fo * kf) }; }
    const E = add(S, dir(p["a" + i] ?? 0), L.up * k);
    return { S, E, H: add(E, dir(p["f" + i] ?? 0), L.fo * kf) };
  });
  J.leg = [1, 2].map((i) => {
    const Hp = J.hp[i - 1];
    const q = p["q" + i] ?? 1;
    let K, A;
    const F = p["ft" + i];
    if (F) {
      const def = v === "front" ? (i === 1 ? 1 : -1) : -1;
      [K, A] = ik(Hp, F, L.th * q, L.sh, p["kb" + i] ?? def);
    } else {
      K = add(Hp, dir(p["l" + i] ?? 0), L.th * q);
      A = add(K, dir(p["s" + i] ?? 0), L.sh);
    }
    let fa = p["fa" + i];
    if (fa == null) {
      if (v === "front") fa = i === 1 ? -100 : 100;
      else fa = angOf([A[0] - K[0], A[1] - K[1]]) + 90;
    }
    const T = add(A, dir(fa), v === "front" ? 6 : L.foot);
    return { H: Hp, K, A, T };
  });
  return J;
}

// --- Interpolación ---
function lerpPose(a, b, u) {
  if ((a.view || "side") !== (b.view || "side")) return b;
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (x == null) o[k] = y;
    else if (y == null) o[k] = x;
    else if (typeof x === "number" && typeof y === "number") o[k] = x + (y - x) * u;
    else if (Array.isArray(x) && Array.isArray(y)) o[k] = x.map((n, j) => n + (y[j] - n) * u);
    else o[k] = u < 0.5 ? x : y;
  }
  return o;
}
const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

// --- Constructor de SVG ---
class G {
  constructor() { this.s = []; }
  raw(x) { this.s.push(x); return this; }
  line(a, b, cls, w) { this.s.push(`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="${cls}"${w ? ` stroke-width="${w}"` : ""}/>`); return this; }
  poly(pts, cls, w) { this.s.push(`<polyline points="${pts.map((p) => f1(p[0]) + "," + f1(p[1])).join(" ")}" class="${cls}"${w ? ` stroke-width="${w}"` : ""}/>`); return this; }
  polygon(pts, cls) { this.s.push(`<polygon points="${pts.map((p) => f1(p[0]) + "," + f1(p[1])).join(" ")}" class="${cls}"/>`); return this; }
  circle(c, r, cls) { this.s.push(`<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" class="${cls}"/>`); return this; }
  rect(x, y, w, h, cls, rx = 3) { this.s.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" class="${cls}"/>`); return this; }
  ellipse(c, rx, ry, cls) { this.s.push(`<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="${rx}" ry="${ry}" class="${cls}"/>`); return this; }
  // Material
  pad(a, b, w = 8) { return this.line(a, b, "eqp", w); }
  bar(a, b, w = 3) { return this.line(a, b, "eqb", w); }
  cable(a, b) { return this.line(a, b, "cab"); }
  wheel(c) { return this.circle(c, 4.5, "eqw"); }
  column(x, y1 = 6, y2 = 150) { this.rect(x - 4, y1, 8, y2 - y1, "eqf", 2); return this; }
  // Mancuerna: "end" = vista de frente del disco; "h" horizontal; "v" vertical
  db(c, mode = "end", s = 1) {
    if (mode === "end") { this.circle(c, 5.5 * s, "dbp"); this.circle(c, 1.8 * s, "dbh"); return this; }
    const [x, y] = c;
    if (mode === "h") { this.line([x - 7 * s, y], [x + 7 * s, y], "dbb", 2.5); this.rect(x - 10 * s, y - 5 * s, 4 * s, 10 * s, "dbp", 1.5); this.rect(x + 6 * s, y - 5 * s, 4 * s, 10 * s, "dbp", 1.5); }
    else { this.line([x, y - 8 * s], [x, y + 8 * s], "dbb", 2.5); this.rect(x - 6 * s, y - 12 * s, 12 * s, 5 * s, "dbp", 1.5); this.rect(x - 6 * s, y + 7 * s, 12 * s, 5 * s, "dbp", 1.5); }
    return this;
  }
  grip(c) { return this.circle(c, 3, "grip"); }
  bench(x1, x2, y, legs = true) {
    if (legs) { this.line([x1 + 6, y + 4], [x1 + 6, 150], "eql"); this.line([x2 - 6, y + 4], [x2 - 6, 150], "eql"); }
    return this.rect(x1, y, x2 - x1, 7, "eqf", 3);
  }
  toString() { return this.s.join(""); }
}

// --- Dibujo de la figura ---
function drawFigure(g, J, hi, spec) {
  const has = (k) => hi.includes(k);
  const seg = (a, b, w, part, far) => {
    const on = has(part) || (part.startsWith("up") && has("arms")) || (part.startsWith("fo") && has("arms")) ||
      (part.startsWith("th") && has("legs")) || (part.startsWith("sh") && has("legs"));
    g.line(a, b, (on ? "hi" : "bd") + (far ? " far" : ""), w);
  };
  const leg = (l, far) => { seg(l.H, l.K, 9, "thigh", far); seg(l.K, l.A, 7, "shin", far); g.line(l.A, l.T, "bd" + (far ? " far" : ""), 5); };
  const arm = (a, far) => { seg(a.S, a.E, 7, "upper", far); seg(a.E, a.H, 6, "fore", far); };
  const torso = () => {
    const cls = has("torso") ? "hi" : "bd";
    if (J.view === "front") {
      const [s1, s2] = J.sh, [h1, h2] = J.hp;
      g.polygon([s1, s2, add(h2, [2, 0]), add(h1, [-2, 0])], cls + " fillb");
    } else {
      g.line(J.P, J.top, cls, 14);
    }
    if (has("hip")) g.circle(J.view === "front" ? J.P : add(J.P, dir(J.t + 90), 3), 6.5, "hi fillhi");
  };
  const head = () => {
    if (J.view === "front") {
      g.circle(add(J.head, dir(J.t), 10), 4.5, "bd fillb hair");
      g.circle(J.head, L.headR, "bd fillb");
    } else {
      const back = dir(J.t + (J.pose.boca ? -90 : 90)), up = dir(J.t);
      const c = add(add(J.head, back, 8.5), up, 2.5);
      g.line(c, add(add(c, back, 3), dir(J.t + (J.pose.boca ? -160 : 160)), 9), "bd hair", 5);
      g.line(J.top, add(J.top, dir(J.t), L.neck + 2), "bd", 6);
      g.circle(J.head, L.headR, "bd fillb");
    }
  };
  if (spec.custom) return spec.custom(g, J, hi);
  if (J.view === "front") {
    leg(J.leg[0]); leg(J.leg[1]);
    if (spec.behindHead) spec.behindHead(g, J);
    head(); torso();
    if (spec.mid) spec.mid(g, J);
    arm(J.arm[0]); arm(J.arm[1]);
  } else {
    arm(J.arm[1], true); leg(J.leg[1], true);
    if (spec.farProps) spec.farProps(g, J);
    head(); torso(); leg(J.leg[0]);
    if (spec.mid) spec.mid(g, J);
    arm(J.arm[0]);
  }
}

// --- Bases ---
const SIDE = { view: "side", x: 100, y: 77, t: 180, a1: 3, f1: 3, a2: -3, f2: -3, l1: 3, s1: 3, l2: -3, s2: -3 };
const FRONT = { view: "front", x: 100, y: 77, t: 180, a1: -8, f1: -5, a2: 8, f2: 5, l1: -4, s1: -2, l2: 4, s2: 2 };
const SEAT = { view: "side", x: 78, y: 110, t: 180, l1: 90, s1: 0, l2: 90, s2: 0 };
const P = (base, o) => ({ ...base, ...o });
const both = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) { r[k + "1"] = v; r[k + "2"] = v; } return r; };
const mirror = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) { r[k + "1"] = typeof v === "number" ? -v : [-v[0], v[1]]; r[k + "2"] = v; } return r; };
const dbEnd = (g, J) => g.db(J.arm[0].H);
const dbEndFar = (g, J) => g.db(add(J.arm[1].H, [0, 0]));
const dbFront = (g, J) => { g.db(J.arm[0].H, "h", 0.9); g.db(J.arm[1].H, "h", 0.9); };
const machineSeat = (g, x = 78, y = 110) => {
  g.pad([x - 9, y - 50], [x - 9, y + 2], 9);
  g.rect(x - 16, y + 3, 44, 7, "eqf");
  g.line([x, y + 10], [x, 150], "eql", 4);
  g.line([x - 22, 150], [x + 30, 150], "eql", 4);
};
const frontSeat = (g, y = 104, back = true) => {
  if (back) g.rect(82, y - 52, 36, 50, "eqf", 5);
  g.rect(76, y - 1, 48, 8, "eqf");
  g.line([100, y + 7], [100, 150], "eql", 4);
};

// --- Ejercicios ---
export const FIG = {
  pressMaqPlano: {
    hi: ["torso", "upper"], keys: [P(SEAT, { h1: [80, 72], h2: [80, 72] }), P(SEAT, { h1: [126, 70], h2: [126, 70] })],
    back: (g) => { g.column(50, 10); machineSeat(g); },
    farProps: (g, J) => g.line([50, 18], J.arm[1].H, "eqb", 4),
    front: (g, J) => { g.line([50, 18], J.arm[0].H, "eqb", 4); g.grip(J.arm[0].H); },
  },
  pressMaqInc: {
    hi: ["torso", "upper"], keys: [P(SEAT, { h1: [84, 66], h2: [84, 66] }), P(SEAT, { h1: [114, 30], h2: [114, 30] })],
    back: (g) => { g.column(50, 10); machineSeat(g); },
    farProps: (g, J) => g.line([50, 70], J.arm[1].H, "eqb", 4),
    front: (g, J) => { g.line([50, 70], J.arm[0].H, "eqb", 4); g.grip(J.arm[0].H); },
  },
  aperturas: {
    hi: ["torso", "upper"],
    keys: [{ view: "front", ...mirror({ a: 100, f: 104 }) }, { view: "front", ...mirror({ a: 172, f: 186 }) }],
    custom: (g, J, hi) => {
      // Vista desde los pies del banco: la apertura se ve completa.
      const p = J.pose;
      g.line([100, 104], [100, 150], "eql", 4); g.line([84, 150], [116, 150], "eql", 4);
      g.circle([100, 74], 8.5, "bd fillb");
      g.ellipse([100, 90], 22, 9, "hi fillhi");
      g.rect(80, 98, 40, 8, "eqf", 3);
      for (const s of [-1, 1]) {
        const S = [100 + s * 17, 89];
        const E = add(S, dir(p["a" + (s < 0 ? 1 : 2)]), L.up);
        const H = add(E, dir(p["f" + (s < 0 ? 1 : 2)]), L.fo);
        g.line(S, E, "hi", 7); g.line(E, H, "bd", 6); g.db(H);
        g.line([100 + s * 9, 96], [100 + s * 22, 118], "bd", 9); g.line([100 + s * 22, 118], [100 + s * 25, 147], "bd", 7);
      }
    },
  },
  elevFrontal: {
    hi: ["upper"], keys: [P(SIDE, both({ a: 4, f: 6 })), P(SIDE, { a1: 92, f1: 96, a2: 4, f2: 6 }), P(SIDE, both({ a: 4, f: 6 })), P(SIDE, { a1: 4, f1: 6, a2: 92, f2: 96 })],
    farProps: dbEndFar, front: dbEnd,
  },
  curlPolea: {
    hi: ["upper"], keys: [P(SIDE, { x: 88, ...both({ a: 6, f: 8 }) }), P(SIDE, { x: 88, ...both({ a: 4, f: 155 }) })],
    back: (g) => { g.column(176, 20); g.wheel([170, 138]); },
    front: (g, J) => { g.cable([170, 138], J.arm[0].H); g.grip(J.arm[0].H); },
  },
  pressMancInc: {
    hi: ["torso", "upper"],
    keys: [{ view: "side", x: 100, y: 106, t: 225, ...both({ a: 10, f: 175, l: 80, s: 0 }) }, { view: "side", x: 100, y: 106, t: 225, ...both({ a: 168, f: 172, l: 80, s: 0 }) }],
    back: (g) => { g.line([108, 116], [50, 58], "eqp", 9); g.bench(86, 124, 112); },
    farProps: dbEndFar, front: dbEnd,
  },
  pressMancPlano: {
    hi: ["torso", "upper"],
    keys: [{ view: "side", x: 120, y: 98, t: -90, ...both({ a: 0, f: 180, ft: [142, 146] }) }, { view: "side", x: 120, y: 98, t: -90, ...both({ a: 180, f: 180, ft: [142, 146] }) }],
    back: (g) => g.bench(46, 128, 104),
    farProps: dbEndFar, front: dbEnd,
  },
  pressHombro: {
    hi: ["upper"],
    keys: [{ view: "front", x: 100, y: 102, ...mirror({ a: 80, f: 180, l: 8, s: 2 }), q1: 0.35, q2: 0.35 },
      { view: "front", x: 100, y: 102, ...mirror({ a: 164, f: 172, l: 8, s: 2 }), q1: 0.35, q2: 0.35 }],
    back: (g) => frontSeat(g, 104), front: dbFront,
  },
  curlSimul: {
    hi: ["upper"], keys: [P(SIDE, both({ a: 6, f: 8 })), P(SIDE, both({ a: 4, f: 152 }))],
    farProps: dbEndFar, front: dbEnd,
  },
  curlAlterno: {
    hi: ["upper"],
    keys: [P(SIDE, both({ a: 6, f: 8 })), P(SIDE, { a1: 4, f1: 152, a2: 6, f2: 8 }), P(SIDE, both({ a: 6, f: 8 })), P(SIDE, { a1: 6, f1: 8, a2: 4, f2: 152 })],
    farProps: dbEndFar, front: dbEnd,
  },
  elevLateral: {
    hi: ["upper"], keys: [P(FRONT, mirror({ a: 6, f: 8 })), P(FRONT, mirror({ a: 86, f: 92 }))], front: dbFront,
  },
  elevCombinada: {
    hi: ["upper"],
    keys: [P(SIDE, both({ a: 4, f: 6 })), P(SIDE, both({ a: 92, f: 96 })), P(SIDE, both({ a: 4, f: 6 })),
      P(FRONT, mirror({ a: 6, f: 8 })), P(FRONT, mirror({ a: 86, f: 92 })), P(FRONT, mirror({ a: 6, f: 8 }))],
    farProps: (g, J) => J.view === "side" && dbEndFar(g, J),
    front: (g, J) => (J.view === "side" ? dbEnd(g, J) : dbFront(g, J)),
  },

  // --- Espalda ---
  jalonNuca: jalon(40, 34, true),
  jalonMedia: jalon(30, 27, false),
  jalonCorta: jalon(10, 8, false),
  remoCorta: remo(), remoLarga: remo(),
  cubana: {
    hi: ["upper", "fore"],
    // Codos a la altura de los hombros y a 90º; los antebrazos pasan de apuntar al frente a apuntar al techo.
    keys: [P(FRONT, { ...mirror({ a: 90, f: 172 }), kf1: 0.2, kf2: 0.2 }), P(FRONT, { ...mirror({ a: 90, f: 180 }), kf1: 1, kf2: 1 })],
    // La muñeca no gira: la mancuerna va en bloque con el antebrazo (siempre horizontal, de lado a lado).
    front: dbFront,
  },
  facePull: {
    hi: ["upper"],
    keys: [P(SIDE, { x: 84, ...both({ h: [128, 24], eb: -1 }) }), P(SIDE, { x: 84, ...both({ h: [96, 17], eb: -1, k: 0.55 }) })],
    back: (g) => { g.column(180, 6); g.wheel([174, 22]); },
    front: (g, J) => { const H = J.arm[0].H; g.cable([174, 22], H); g.line(H, add(H, [5, 7]), "rope", 3); g.line(H, add(H, [7, -4]), "rope", 3); },
  },
  tricepsCuerda: triceps(true),
  tricepsBarra: triceps(false),
  chestPull: {
    hi: ["torso", "upper"],
    // Codos hacia atrás y algo hacia arriba, manos a la parte alta del pecho, sacando pecho al final.
    keys: [P(SIDE, { x: 86, y: 77, t: 172, ...both({ eo: [23.5, -11], f: 115 }) }), P(SIDE, { x: 86, y: 77, t: 187, ...both({ eo: [-19, -5], f: 82 }) })],
    back: (g) => { g.column(182, 6); g.wheel([176, 24]); },
    front: (g, J) => { const H = J.arm[0].H; g.cable([176, 24], H); g.bar(add(H, [-1, -4]), add(H, [1, 4]), 4); },
  },
  fondosBanco: {
    hi: ["upper"],
    keys: [{ view: "side", x: 80, y: 104, t: 180, ...both({ h: [72, 107], ft: [138, 147] }) }, { view: "side", x: 82, y: 122, t: 180, ...both({ h: [72, 107], ft: [138, 147] }) }],
    back: (g) => g.bench(32, 78, 109),
  },
  aperturaAlterna: {
    hi: ["upper"], vb: "-14 -24 228 178",
    // Brazos estirados al frente y paralelos al suelo; sube uno hasta apuntar al techo y luego el otro.
    keys: [P(SIDE, both({ a: 90, f: 90 })), P(SIDE, { a1: 176, f1: 178, a2: 90, f2: 90 }), P(SIDE, both({ a: 90, f: 90 })), P(SIDE, { a1: 90, f1: 90, a2: 176, f2: 178 })],
    farProps: dbEndFar, front: dbEnd,
  },
  crucesInv: {
    hi: ["upper"],
    keys: [P(FRONT, { st1: 1, st2: 1, hr1: [8, 10], hr2: [-8, 10] }), P(FRONT, { st1: 1, st2: 1, hr1: [-64, 0], hr2: [64, 0] })],
    back: (g) => { g.column(10, 30); g.column(190, 30); g.wheel([14, 46]); g.wheel([186, 46]); },
    front: (g, J) => { g.cable([186, 46], J.arm[0].H); g.cable([14, 46], J.arm[1].H); g.grip(J.arm[0].H); g.grip(J.arm[1].H); },
  },

  // --- Pierna ---
  prensa: {
    hi: ["thigh"],
    keys: [{ view: "side", x: 64, y: 122, t: 232, a1: 30, f1: 60, a2: 30, f2: 60, ...both({ ft: [88, 96], kb: -1, fa: 225 }) },
      { view: "side", x: 64, y: 122, t: 232, a1: 30, f1: 60, a2: 30, f2: 60, ...both({ ft: [111, 73], kb: -1, fa: 225 }) }],
    back: (g) => {
      g.line([84, 104], [168, 20], "eqf", 10);
      g.line([74, 128], [24, 86], "eqp", 9); g.rect(52, 126, 34, 7, "eqf");
      g.line([64, 133], [64, 150], "eql", 4); g.line([30, 150], [180, 150], "eql", 4); g.line([150, 40], [150, 150], "eql", 4);
    },
    farProps: (g, J) => {
      const A = J.leg[0].A, d = dir(45 + 90), u = dir(135 - 90);
      const c = add(A, [4, 4]);
      g.line(add(c, [-14, -14]), add(c, [12, 12]), "eqb", 5);
      g.circle(add(c, [12, -4]), 9, "dbp");
    },
  },
  extCuad: {
    hi: ["thigh"],
    keys: [P(SEAT, { x: 78, y: 104, ...both({ s: 4 }), a1: 10, f1: 40, a2: 10, f2: 40 }), P(SEAT, { x: 78, y: 104, ...both({ s: 84 }), a1: 10, f1: 40, a2: 10, f2: 40 })],
    back: (g) => machineSeat(g, 78, 104),
    front: (g, J) => { const l = J.leg[0], s = angOf([l.A[0] - l.K[0], l.A[1] - l.K[1]]); const c = add(add(l.K, dir(s), 28), dir(s + 90), 6); g.line(l.K, c, "eqb", 4); g.circle(c, 5, "eqpad"); },
  },
  curlFemoral: {
    hi: ["thigh"],
    // Tumbada boca abajo: los talones suben hacia los glúteos.
    keys: [{ view: "side", x: 104, y: 94, t: -90, boca: 1, ...both({ l: 92, s: 92, fa: 2, a: -35, f: -95, k: 0.7 }) },
      { view: "side", x: 104, y: 94, t: -90, boca: 1, ...both({ l: 92, s: 205, fa: 115, a: -35, f: -95, k: 0.7 }) }],
    back: (g) => { g.rect(30, 100, 116, 8, "eqf", 4); g.line([50, 108], [50, 150], "eql", 4); g.line([128, 108], [128, 150], "eql", 4); g.line([36, 150], [150, 150], "eql", 4); },
    front: (g, J) => {
      const l = J.leg[0], s = angOf([l.A[0] - l.K[0], l.A[1] - l.K[1]]); const c = add(add(l.K, dir(s), 30), dir(s + 90), 6.5);
      g.line(add(l.K, [0, 8]), c, "eqb", 4); g.circle(c, 5.5, "eqpad");
    },
  },
  abductores: abd(true), aductores: abd(false),
  goblet: {
    hi: ["thigh"],
    keys: [{ view: "side", x: 100, y: 77, t: 180, ...both({ ft: [104, 147], hr: [12, 8] }) }, { view: "side", x: 82, y: 112, t: 150, ...both({ ft: [104, 147], hr: [12, 8] }) }],
    front: (g, J) => g.db(add(J.arm[0].H, [0, 2]), "v", 0.9),
  },
  rumano: {
    hi: ["thigh"],
    keys: [{ view: "side", x: 100, y: 77, t: 180, ...both({ ft: [102, 147], a: 2, f: 2 }) }, { view: "side", x: 84, y: 84, t: 102, ...both({ ft: [102, 147], a: 2, f: 2 }) }],
    farProps: dbEndFar, front: dbEnd,
  },
  hipThrust: {
    hi: ["hip", "thigh"],
    keys: [{ view: "side", x: 92, y: 138, sh: [58, 110], ...both({ ft: [142, 147], hp: [2, -9] }) }, { view: "side", x: 104, y: 112, sh: [58, 110], ...both({ ft: [142, 147], hp: [2, -9] }) }],
    back: (g) => g.bench(22, 64, 114),
    front: (g, J) => g.db(add(J.P, [2, -10]), "end", 1.2),
  },
  sumo: {
    hi: ["thigh"],
    keys: [{ view: "front", x: 100, y: 80, t: 180, ft1: [66, 147], ft2: [134, 147], fa1: -110, fa2: 110, hr1: [10, 46], hr2: [-10, 46], eb1: 1, eb2: -1 },
      { view: "front", x: 100, y: 110, t: 180, ft1: [66, 147], ft2: [134, 147], fa1: -110, fa2: 110, hr1: [10, 46], hr2: [-10, 46], eb1: 1, eb2: -1 }],
    front: (g, J) => g.db(add(J.top, [0, 56]), "v", 0.9),
  },
  hack: {
    hi: ["thigh"],
    keys: [{ view: "side", x: 96, y: 78, t: 200, ...both({ ft: [122, 146], a: 20, f: 168 }) }, { view: "side", x: 106, y: 104, t: 200, ...both({ ft: [122, 146], a: 20, f: 168 }) }],
    back: (g) => { g.line([126, 150], [60, -30], "eqf", 6); g.line([110, 150], [150, 136], "eqp", 6); },
    farProps: (g, J) => { const b = dir(J.t + 90); g.line(add(J.P, b, 9), add(add(J.top, dir(J.t), 4), b, 9), "eqp", 9); g.rect(J.top[0] - 2, J.top[1] - 9, 12, 6, "eqpad", 3); },
  },
  rumanoUni: {
    hi: ["thigh"],
    // Pierna de atrás apoyada en el banco (rodilla a 90º); la de delante en el suelo hace el peso muerto.
    keys: [{ view: "side", x: 98, y: 77, t: 180, ft1: [104, 147], l2: -4, s2: -94, fa2: -4, ...both({ a: 2, f: 2 }) },
      { view: "side", x: 92, y: 82, t: 106, ft1: [104, 147], l2: -10, s2: -100, fa2: -10, ...both({ a: 2, f: 2 }) }],
    back: (g) => g.bench(34, 92, 116),
    farProps: dbEndFar, front: dbEnd,
  },

  // --- Cardio ---
  cinta: {
    hi: ["legs"], dur: 520, hold: 0,
    keys: [P(SIDE, { y: 75, l1: 22, s1: 12, l2: -18, s2: -34, a1: -22, f1: -8, a2: 22, f2: 60 }),
      P(SIDE, { y: 75, l1: -18, s1: -34, l2: 22, s2: 12, a1: 22, f1: 60, a2: -22, f2: -8 })],
    back: (g) => {
      g.line([40, 146], [176, 146], "eqf", 7); g.line([172, 146], [166, 66], "eql", 4);
      g.line([166, 66], [150, 70], "eql", 4); g.rect(158, 56, 18, 10, "eqf", 3);
      g.line([40, 150], [180, 150], "eql", 3);
    },
  },
};

// Caminata al aire libre: la misma figura caminando, sin cinta y con un árbol al lado
FIG.caminata = {
  hi: ["legs"], dur: 520, hold: 0, keys: FIG.cinta.keys,
  back: (g) => {
    g.rect(154, 98, 9, 52, "tronco", 3);
    g.circle([158, 82], 20, "copa"); g.circle([144, 96], 13, "copa"); g.circle([172, 96], 13, "copa"); g.circle([158, 66], 12, "copa");
    g.line([14, 150], [190, 150], "camino", 4);
    g.ellipse([40, 30], 12, 4, "nube"); g.ellipse([52, 27], 9, 4, "nube");
  },
};

function jalon(ancho, anchoFin, nuca) {
  const start = { view: "front", x: 100, y: 104, t: 180, ...mirror({ l: 8, s: 2 }), q1: 0.35, q2: 0.35, h1: [100 - ancho, 12], h2: [100 + ancho, 12] };
  const end = { ...start, h1: [100 - anchoFin, nuca ? 52 : 66], h2: [100 + anchoFin, nuca ? 52 : 66] };
  const bar = (g, J) => {
    const a = J.arm[0].H, b = J.arm[1].H, ext = ancho > 20 ? 10 : 6;
    g.cable([100, 2], [(a[0] + b[0]) / 2, a[1] - 1]);
    g.bar([a[0] - ext, a[1]], [b[0] + ext, b[1]], 4);
  };
  return {
    hi: ["torso", "upper"], keys: [start, end],
    back: (g) => { frontSeat(g, 106, false); g.wheel([100, 4]); g.rect(80, 108, 40, 6, "eqpad", 3); },
    behindHead: nuca ? bar : null,
    front: nuca ? null : bar,
  };
}
function remo() {
  return {
    hi: ["torso", "upper"],
    keys: [{ view: "side", x: 64, y: 118, t: 162, ...both({ h: [122, 94], ft: [128, 122], kb: -1 }) },
      { view: "side", x: 64, y: 118, t: 186, ...both({ h: [76, 98], ft: [128, 122], kb: -1 }) }],
    back: (g) => { g.column(184, 60); g.wheel([178, 116]); g.rect(36, 122, 44, 7, "eqf"); g.line([58, 129], [58, 150], "eql", 4); g.line([136, 104], [136, 140], "eqb", 5); g.line([30, 150], [190, 150], "eql", 4); },
    front: (g, J) => { const H = J.arm[0].H; g.cable([178, 116], H); g.grip(H); },
  };
}
function triceps(cuerda) {
  return {
    hi: ["fore"],
    keys: [P(SIDE, { x: 90, t: 174, ...both({ a: 12, f: 150 }) }), P(SIDE, { x: 90, t: 174, ...both({ a: 10, f: 4 }) })],
    back: (g) => { g.column(130, 4); g.wheel([124, 10]); },
    front: (g, J) => {
      const H = J.arm[0].H; g.cable([124, 10], H);
      if (cuerda) { g.line(H, add(H, [-3, 7]), "rope", 3); g.line(H, add(H, [3, 7]), "rope", 3); }
      else g.bar(add(H, [-4, 0]), add(H, [5, 0]), 4);
    },
  };
}
function abd(abrir) {
  const base = { view: "front", x: 100, y: 102, t: 180, ...mirror({ a: 12, f: 2 }), fa1: -100, fa2: 100 };
  const cerrado = { ...base, ...mirror({ l: 40, s: 0 }), q1: 0.28, q2: 0.28 };
  const abierto = { ...base, ...mirror({ l: 82, s: 4 }), q1: 0.85, q2: 0.85 };
  return {
    hi: ["thigh"],
    keys: abrir ? [cerrado, abierto] : [abierto, cerrado],
    back: (g) => frontSeat(g, 104),
    front: (g, J) => J.leg.forEach((l, i) => {
      const s = (i === 0 ? -1 : 1) * (abrir ? 1 : -1);
      g.rect(l.K[0] + s * 7 - 3, l.K[1] - 8, 6, 16, "eqpad", 3);
    }),
  };
}

// --- Render y animación ---
function frame(id, pose, opts = {}) {
  const spec = FIG[id];
  const g = new G();
  const J = solve(pose);
  J.pose = pose;
  g.line([8, 150], [192, 150], "floor", 2);
  if (spec.back) spec.back(g, J, opts);
  drawFigure(g, J, spec.hi || [], spec);
  if (spec.front) spec.front(g, J, opts);
  return g.toString();
}

export function svgEstatico(id, opts = {}) {
  const spec = FIG[id] || FIG.cinta;
  const k = spec.keys[Math.min(spec.keys.length - 1, opts.key ?? 1)];
  return `<svg viewBox="${spec.vb || "0 0 200 156"}" class="fig" aria-hidden="true">${frame(FIG[id] ? id : "cinta", k, opts)}</svg>`;
}

const vivos = new Set();
let raf = 0;
function tick(now) {
  for (const a of vivos) {
    if (!a.el.isConnected) { vivos.delete(a); continue; }
    const spec = FIG[a.id], K = spec.keys, n = K.length;
    const dur = spec.dur ?? 1100, hold = spec.hold ?? 280, seg = dur + hold;
    const loop = n === 2 ? [0, 1] : K.map((_, i) => i);
    const total = seg * loop.length;
    const tt = (((now - a.t0) % total) + total) % total;
    const i = Math.floor(tt / seg), r = tt - i * seg;
    const from = K[loop[i]], to = K[loop[(i + 1) % loop.length]];
    const u = r < hold ? 0 : ease((r - hold) / dur);
    a.svg.innerHTML = frame(a.id, lerpPose(from, to, u), a.opts);
  }
  raf = vivos.size ? requestAnimationFrame(tick) : 0;
}
const quieto = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

export function animar(el, id, opts = {}) {
  if (!FIG[id]) id = "cinta";
  el.innerHTML = `<svg viewBox="${FIG[id].vb || "0 0 200 156"}" class="fig" role="img" aria-label="Ejemplo del ejercicio"></svg>`;
  const svg = el.firstChild;
  for (const a of vivos) if (a.el === el) vivos.delete(a);
  // Siempre animadas (aunque el iPhone tenga activado "Reducir movimiento"): el movimiento es la explicación del ejercicio.
  vivos.add({ el, svg, id, opts, t0: performance.now() });
  if (!raf) raf = requestAnimationFrame(tick);
}
export function pararAnimaciones() { vivos.clear(); }
export function _frame(id, k) { return frame(id, FIG[id].keys[k]); }
