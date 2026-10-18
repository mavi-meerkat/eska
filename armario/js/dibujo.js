// Dibujos de prendas (cuando no hay foto) e iconos.

const FORMAS = {
  tee: ['M38 18 L50 13 Q60 23 70 13 L82 18 L106 35 L95 52 L84 45 L84 106 L36 106 L36 45 L25 52 L14 35 Z', 'M50 13 Q60 23 70 13'],
  shirt: ['M40 16 L51 11 L60 22 L69 11 L80 16 L100 30 L109 92 L96 95 L86 48 L86 107 L34 107 L34 48 L24 95 L11 92 L20 30 Z', 'M51 11 L55 27 L60 22 L65 27 L69 11 M60 22 L60 105', [[64, 42], [64, 60], [64, 78]]],
  sweater: ['M40 16 Q60 28 80 16 L100 28 L109 94 L96 97 L86 50 L86 106 L34 106 L34 50 L24 97 L11 94 L20 28 Z', 'M35 98 L85 98 M12 87 L24 89 M108 87 L96 89 M44 19 Q60 30 76 19'],
  jacket: ['M41 14 L52 10 L60 18 L68 10 L79 14 L101 28 L110 96 L97 99 L87 50 L87 108 L33 108 L33 50 L23 99 L10 96 L19 28 Z', 'M52 10 L46 34 L58 58 L60 108 M68 10 L74 34 L62 58 M40 78 L52 78 M68 78 L80 78', [[64, 70]]],
  pants: ['M35 10 L85 10 L93 110 L69 110 L60 46 L51 110 L27 110 Z', 'M35 18 L85 18 M60 18 L60 46 M44 18 Q45 28 37 30 M76 18 Q75 28 83 30'],
  skirt: ['M40 16 L80 16 L100 104 L20 104 Z', 'M40 24 L80 24 M52 24 L46 104 M68 24 L74 104'],
  dress: ['M46 8 L53 8 Q60 18 67 8 L74 8 L77 36 L72 47 L98 110 L22 110 L48 47 L43 36 Z', 'M46 47 Q60 52 74 47'],
  shoe: ['M12 74 L12 50 Q26 49 34 38 L54 44 Q74 58 98 62 Q110 66 110 78 L110 86 L12 86 Z', 'M12 78 L110 78 M42 46 L48 54 M50 48 L56 56 M58 52 L63 59'],
};

const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

export function svgPrenda(tipo, hex, estampado = false) {
  const [cuerpo, lineas, botones = []] = FORMAS[tipo] || FORMAS.tee;
  const osc = lum(hex) < 0.42, l = osc ? "#fff" : "#161616", o = osc ? 0.4 : 0.26;
  const pid = "e" + Math.random().toString(36).slice(2, 8);
  const relleno = estampado ? `url(#${pid})` : hex;
  const patron = estampado ? `<defs><pattern id="${pid}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${hex}"/><circle cx="4" cy="4" r="2.4" fill="#fff" fill-opacity=".7"/><circle cx="11" cy="11" r="2.4" fill="#3A2A44" fill-opacity=".45"/></pattern></defs>` : "";
  return `<svg class="dib" viewBox="0 0 120 120" aria-hidden="true">${patron}<path d="${cuerpo}" fill="${relleno}" stroke="${l}" stroke-opacity="${o}" stroke-width="2" stroke-linejoin="round"/><path d="${lineas}" fill="none" stroke="${l}" stroke-opacity="${o}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${botones.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="${l}" fill-opacity="${o}"/>`).join("")}</svg>`;
}

const P = {
  percha: '<path d="M10 7.5a2 2 0 1 1 3.2 1.6c-.8.6-1.2 1-1.2 1.9v.6"/><path d="M12 11.6 3.4 17.3a1 1 0 0 0 .55 1.83h16.1a1 1 0 0 0 .55-1.83Z"/>',
  capas: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  atras: '<path d="m15 5-7 7 7 7"/>',
  sig: '<path d="m9 5 7 7-7 7"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  lapiz: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  chincheta: '<path d="M9 4h6l-1 6 3 3H7l3-3Z"/><path d="M12 13v7"/>',
  azar: '<path d="M4 7h3.5c4 0 5 10 9 10H20"/><path d="M4 17h3.5c1.6 0 2.6-1.6 3.4-3.4M13.4 10.4C14.2 8.6 15 7 16.5 7H20"/><path d="m17 4 3 3-3 3M17 14l3 3-3 3"/>',
  marcador: '<path d="M6 4h12v16l-6-4-6 4Z"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
  percha2: '<path d="M7 5h10l3 4-3 2v9H7v-9L4 9Z"/>',
  pulgar: '<path d="M7 11v9H4v-9Z"/><path d="M7 11 11 3c1.7 0 2.6 1.2 2.3 2.8L12.6 10H19a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7"/>',
  descarta: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
  papelera: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
export const ico = (n, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
