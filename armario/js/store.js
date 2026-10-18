// Datos guardados en el móvil: fichas en localStorage, fotos en IndexedDB.
import { EJEMPLOS, TIPOS } from "./datos.js";

const KEY = "armario-ana-v1";
const VACIO = { prendas: [], looks: [], vetos: [], ajustes: {} };

let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || null; } catch { S = null; }
S = { ...structuredClone(VACIO), ...(S || {}) };

const oyentes = new Set();
export const st = () => S;
export const alCambiar = (fn) => oyentes.add(fn);
export function guardar() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn("No se pudo guardar", e); }
  oyentes.forEach((fn) => fn());
}
try { navigator.storage?.persist?.(); } catch {}

export const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const firma = (ids) => [...ids].sort().join("|");

// --- Prendas ---
export const prenda = (id) => S.prendas.find((p) => p.id === id) || null;
export function crearPrenda(d) {
  const p = { id: nuevoId(), nombre: "", cat: "arriba", tipo: "tee", color: "blanco", temporadas: [], estilos: [], foto: false, usos: [], creada: hoy(), ...d };
  S.prendas.push(p); guardar(); return p;
}
export function editarPrenda(id, d) { const p = prenda(id); if (p) { Object.assign(p, d); guardar(); } return p; }
export async function borrarPrenda(id) {
  S.prendas = S.prendas.filter((p) => p.id !== id);
  S.looks = S.looks.filter((l) => !l.piezas.includes(id));
  S.vetos = S.vetos.filter((v) => !v.split("|").includes(id));
  guardar();
  await borrarFoto(id);
}
export function usarHoy(ids) {
  const h = hoy();
  ids.forEach((id) => { const p = prenda(id); if (p && !p.usos.includes(h)) p.usos.push(h); });
  guardar();
}
export function cargarEjemplos() {
  EJEMPLOS.forEach((e) => crearPrenda({ ...e, tipo: e.tipo || TIPOS[e.cat][0].id }));
}

// --- Looks guardados y descartados ---
export const lookGuardado = (ids) => S.looks.find((l) => firma(l.piezas) === firma(ids)) || null;
export function guardarLook(ids) {
  if (lookGuardado(ids)) return;
  S.looks.unshift({ id: nuevoId(), piezas: [...ids], creado: hoy(), usos: [] });
  guardar();
}
export function quitarLook(ids) { const f = firma(ids); S.looks = S.looks.filter((l) => firma(l.piezas) !== f); guardar(); }
export function usarLookHoy(ids) {
  const l = lookGuardado(ids), h = hoy();
  if (l && !l.usos.includes(h)) l.usos.push(h);
  usarHoy(ids);
}
export function vetar(ids) { const f = firma(ids); if (!S.vetos.includes(f)) S.vetos.push(f); quitarLook(ids); }
export function quitarVetos() { S.vetos = []; guardar(); }

// --- Fotos (IndexedDB) ---
let dbP = null;
function db() {
  if (!dbP) dbP = new Promise((ok, mal) => {
    const r = indexedDB.open("armario-fotos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("fotos");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
  return dbP;
}
async function tx(modo, fn) {
  const d = await db();
  return new Promise((ok, mal) => {
    const t = d.transaction("fotos", modo), s = t.objectStore("fotos");
    const r = fn(s);
    t.oncomplete = () => ok(r?.result);
    t.onerror = () => mal(t.error);
  });
}
const urls = new Map();
export async function guardarFoto(id, grande, mini) {
  await tx("readwrite", (s) => { s.put(grande, id); s.put(mini, id + ":m"); });
  [id, id + ":m"].forEach((k) => { if (urls.has(k)) { URL.revokeObjectURL(urls.get(k)); urls.delete(k); } });
}
export async function borrarFoto(id) {
  try { await tx("readwrite", (s) => { s.delete(id); s.delete(id + ":m"); }); } catch {}
  [id, id + ":m"].forEach((k) => { if (urls.has(k)) { URL.revokeObjectURL(urls.get(k)); urls.delete(k); } });
}
export async function leerFoto(id, mini = false) {
  const k = mini ? id + ":m" : id;
  if (urls.has(k)) return urls.get(k);
  const b = await tx("readonly", (s) => s.get(k));
  if (!b) return null;
  const u = URL.createObjectURL(b); urls.set(k, u); return u;
}

// --- Copia de seguridad ---
const aDataURL = (b) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
export async function exportar() {
  const fotos = {};
  for (const p of S.prendas) if (p.foto) {
    const g = await tx("readonly", (s) => s.get(p.id)), m = await tx("readonly", (s) => s.get(p.id + ":m"));
    if (g && m) fotos[p.id] = [await aDataURL(g), await aDataURL(m)];
  }
  return new Blob([JSON.stringify({ app: "armario", v: 1, fecha: hoy(), datos: S, fotos })], { type: "application/json" });
}
export function leerCopia(texto) {
  let j;
  try { j = JSON.parse(texto); } catch { throw new Error("Este archivo no es una copia del armario."); }
  if (j.app !== "armario" || !j.datos || !Array.isArray(j.datos.prendas)) throw new Error("Este archivo no es una copia del armario.");
  return j;
}
// modo "sustituir": deja el armario igual que la copia. "anadir": suma las prendas nuevas a las que ya hay.
export async function importar(j, modo = "sustituir") {
  const fotos = j.fotos || {};
  const blob = async (u) => (await fetch(u)).blob();
  if (modo === "sustituir") {
    for (const [id, [g, m]] of Object.entries(fotos)) await guardarFoto(id, await blob(g), await blob(m));
    S = { ...structuredClone(VACIO), ...j.datos };
    guardar();
    return j.datos.prendas.length;
  }
  const hay = new Set(S.prendas.map((p) => p.id));
  const nuevas = j.datos.prendas.filter((p) => !hay.has(p.id));
  for (const p of nuevas) if (fotos[p.id]) await guardarFoto(p.id, await blob(fotos[p.id][0]), await blob(fotos[p.id][1]));
  S.prendas.push(...nuevas);
  const ids = new Set(S.prendas.map((p) => p.id)), firmas = new Set(S.looks.map((l) => firma(l.piezas)));
  for (const l of j.datos.looks || []) if (l.piezas.every((id) => ids.has(id)) && !firmas.has(firma(l.piezas))) S.looks.push(l);
  for (const v of j.datos.vetos || []) if (!S.vetos.includes(v)) S.vetos.push(v);
  guardar();
  return nuevas.length;
}
export async function borrarTodo() {
  for (const p of S.prendas) await borrarFoto(p.id);
  S = structuredClone(VACIO); guardar();
}
