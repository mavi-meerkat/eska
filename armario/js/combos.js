// Reglas de combinación: qué prendas forman un look válido.
// Un look = (parte de arriba + parte de abajo, o un vestido) + calzado + capa encima opcional.
// Las prendas deben compartir temporada y estilo (si los tienen marcados) y no juntar colores que chocan.
import { color, CHOQUES, TEMPORADAS, ESTILOS } from "./datos.js";
import { st, alCambiar, firma, prenda } from "./store.js";

export const HUECOS = ["encima", "arriba", "abajo", "vestido", "calzado"];
const MAX = 300000;

const bits = (lista, todos) => (lista && lista.length ? lista.reduce((m, id) => m | (1 << todos.findIndex((t) => t.id === id)), 0) : (1 << todos.length) - 1);
const CHOQUE = new Set(CHOQUES.flatMap(([a, b]) => [a + "|" + b, b + "|" + a]));

function info(p) {
  const c = color(p.color);
  return { id: p.id, cat: p.cat, temp: bits(p.temporadas, TEMPORADAS), est: p.estilos?.length ? bits(p.estilos, ESTILOS) : -1, col: c.n ? null : c.id, est2: !!c.estampado };
}

// ¿Este conjunto de prendas (infos) es un look aceptable?
function encajan(lista) {
  let temp = 15, est = -1;
  const llam = new Set(); let estampados = 0;
  for (const i of lista) {
    temp &= i.temp; if (!temp) return false;
    if (i.est !== -1) { est = est === -1 ? i.est : est & i.est; if (!est) return false; }
    if (i.est2) estampados++;
    else if (i.col) llam.add(i.col);
  }
  if (estampados > 1) return false;
  if (llam.size + estampados > 2) return false;
  const l = [...llam];
  for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) if (CHOQUE.has(l[a] + "|" + l[b])) return false;
  return true;
}

let cache = null;
alCambiar(() => { cache = null; });

// Todas las combinaciones posibles, con estadísticas por prenda.
export function calcular() {
  if (cache) return cache;
  const S = st(), vetos = new Set(S.vetos);
  const por = { arriba: [], abajo: [], vestido: [], encima: [], calzado: [] };
  S.prendas.forEach((p) => por[p.cat]?.push(info(p)));
  const zapatos = por.calzado.length ? por.calzado : [null];
  const capas = [null, ...por.encima];
  const bases = [];
  for (const a of por.arriba) for (const b of por.abajo) if (encajan([a, b])) bases.push([a, b]);
  for (const v of por.vestido) bases.push([v]);

  const looks = [], n = new Map(), socios = new Map();
  S.prendas.forEach((p) => { n.set(p.id, 0); socios.set(p.id, new Set()); });
  let corto = false;
  fuera: for (const base of bases) for (const z of zapatos) {
    const conZ = z ? [...base, z] : base;
    if (!encajan(conZ)) continue;
    for (const c of capas) {
      const l = c ? [c, ...conZ] : conZ;
      if (c && !encajan(l)) continue;
      const ids = l.map((i) => i.id);
      if (vetos.size && vetos.has(firma(ids))) continue;
      looks.push(ids);
      for (const id of ids) { n.set(id, n.get(id) + 1); const s = socios.get(id); ids.forEach((o) => o !== id && s.add(o)); }
      if (looks.length >= MAX) { corto = true; break fuera; }
    }
  }
  cache = { looks, n, socios, corto, hayCalzado: por.calzado.length > 0 };
  return cache;
}

export const looksDe = (id) => calcular().n.get(id) || 0;
export const sociosDe = (id) => [...(calcular().socios.get(id) || [])];

// Convierte una lista de ids en un objeto por hueco.
export function porHueco(ids) {
  const o = { encima: null, arriba: null, abajo: null, vestido: null, calzado: null };
  ids.forEach((id) => { const p = prenda(id); if (p) o[p.cat] = id; });
  return o;
}
export const ids = (o) => HUECOS.map((h) => o[h]).filter(Boolean);

// Looks que respetan las prendas fijadas.
export function filtrar(fijas) {
  const f = fijas.filter(Boolean);
  if (!f.length) return calcular().looks;
  return calcular().looks.filter((l) => f.every((id) => l.includes(id)));
}

// Qué le falta al armario para poder crear looks.
export function falta() {
  const S = st(), hay = (c) => S.prendas.some((p) => p.cat === c);
  if (!S.prendas.length) return "Añade tu primera prenda para empezar a combinar.";
  if (!hay("vestido") && !(hay("arriba") && hay("abajo"))) {
    if (!hay("arriba")) return "Añade alguna parte de arriba (o un vestido) para crear looks.";
    return "Añade alguna parte de abajo (o un vestido) para crear looks.";
  }
  return "Ninguna combinación encaja: revisa las temporadas y estilos de tus prendas, o recupera los looks descartados en Ajustes.";
}
