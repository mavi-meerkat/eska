// Fotos: reduce el tamaño para que quepan muchas y detecta el color principal de la prenda.
import { COLORES } from "./datos.js";

function cargar(file) {
  return new Promise((ok, mal) => {
    const u = URL.createObjectURL(file), img = new Image();
    img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(u), 1000); };
    img.onerror = () => { URL.revokeObjectURL(u); mal(new Error("No se pudo leer la foto.")); };
    img.src = u;
  });
}
function lienzo(img, lado) {
  const k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
const aBlob = (c, q) => new Promise((ok) => c.toBlob((b) => ok(b), "image/jpeg", q));

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// Distancia aproximada a cómo vemos los colores (más peso al verde).
const dist = (a, b) => { const r = (a[0] + b[0]) / 2, dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return (2 + r / 256) * dr * dr + 4 * dg * dg + (2 + (255 - r) / 256) * db * db; };

// Color de la prenda: ignora el fondo (lo que se parece a los bordes de la foto) y busca el tono más repetido del centro.
export function colorPrincipal(c) {
  const x = c.getContext("2d", { willReadFrequently: true });
  const w = c.width, h = c.height, d = x.getImageData(0, 0, w, h).data;
  const px = (i, j) => { const o = (j * w + i) * 4; return [d[o], d[o + 1], d[o + 2]]; };
  const borde = [];
  for (let i = 0; i < w; i += 4) { borde.push(px(i, 0), px(i, h - 1)); }
  for (let j = 0; j < h; j += 4) { borde.push(px(0, j), px(w - 1, j)); }
  const fondo = [0, 1, 2].map((k) => borde.reduce((s, p) => s + p[k], 0) / borde.length);
  const cubos = new Map();
  const x0 = Math.floor(w * 0.18), x1 = Math.ceil(w * 0.82), y0 = Math.floor(h * 0.15), y1 = Math.ceil(h * 0.85);
  for (let j = y0; j < y1; j += 2) for (let i = x0; i < x1; i += 2) {
    const p = px(i, j);
    if (dist(p, fondo) < 2600) continue;
    const k = (p[0] >> 5) * 64 + (p[1] >> 5) * 8 + (p[2] >> 5);
    const b = cubos.get(k) || [0, 0, 0, 0];
    b[0] += p[0]; b[1] += p[1]; b[2] += p[2]; b[3]++;
    cubos.set(k, b);
  }
  let mejor = null;
  for (const b of cubos.values()) if (!mejor || b[3] > mejor[3]) mejor = b;
  const rgb = mejor && mejor[3] > 30 ? [mejor[0] / mejor[3], mejor[1] / mejor[3], mejor[2] / mejor[3]] : fondo;
  let id = "blanco", min = Infinity;
  for (const col of COLORES) if (!col.estampado) { const v = dist(rgb, hexRgb(col.hex)); if (v < min) { min = v; id = col.id; } }
  return id;
}

export async function procesar(file) {
  const img = await cargar(file);
  const g = lienzo(img, 1100), m = lienzo(img, 420);
  return { grande: await aBlob(g, 0.82), mini: await aBlob(m, 0.8), color: colorPrincipal(m) };
}
