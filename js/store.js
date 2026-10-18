// Datos guardados en el iPhone (localStorage) + cálculo de semana/fase.
const KEY = "gym-ana-v1";
const VACIO = { reglas: [], manual: {}, sesiones: {}, ajustes: { sonido: true, cambioEj: 90 } };

let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || null; } catch { S = null; }
S = { ...structuredClone(VACIO), ...(S || {}) };
S.ajustes = { ...VACIO.ajustes, ...(S.ajustes || {}) };

export const st = () => S;
export function guardar() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn("No se pudo guardar", e); }
}
try { navigator.storage?.persist?.(); } catch {}

// --- Fechas (siempre en hora local) ---
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const hoy = () => ymd(new Date());
export const diaISO = (d) => ((d.getDay() + 6) % 7) + 1; // lunes=1
export function lunesDe(s) { const d = parse(s); d.setDate(d.getDate() - (diaISO(d) - 1)); return ymd(d); }
export function sumaDias(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
const diasEntre = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fechaCorta = (s) => { const d = parse(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };

// --- Regla y semana del plan ---
// La semana (lunes–domingo) en la que empieza la regla es la Semana 1; cada lunes siguiente suma una.
export function infoSemana(fecha = hoy()) {
  const lunes = lunesDe(fecha);
  const reglas = [...S.reglas].sort();
  const regla = reglas.filter((r) => lunesDe(r) <= lunes).pop() || null;
  let semana = 1, pasada = false, sinRegla = !regla;
  if (regla) {
    const n = Math.floor(diasEntre(lunesDe(regla), lunes) / 7) + 1;
    semana = Math.min(4, n); pasada = n > 4;
  }
  const manual = S.manual[lunes];
  const diaCiclo = regla && regla <= fecha ? diasEntre(regla, fecha) + 1 : null;
  return { semana: manual || semana, auto: semana, manual: !!manual, pasada, sinRegla, regla, diaCiclo, lunes };
}
export function registrarRegla(fecha = hoy()) {
  if (!S.reglas.includes(fecha)) S.reglas.push(fecha);
  S.reglas.sort();
  delete S.manual[lunesDe(fecha)];
  guardar();
}
export function borrarRegla(fecha) { S.reglas = S.reglas.filter((r) => r !== fecha); guardar(); }
export function forzarSemana(lunes, n) { if (n) S.manual[lunes] = n; else delete S.manual[lunes]; guardar(); }

// --- Sesiones ---
export const sesion = (fecha) => S.sesiones[fecha] || null;
export function crearSesion(fecha, dia, semana) {
  const prev = S.sesiones[fecha];
  if (prev && prev.dia === dia && prev.semana === semana) return prev;
  S.sesiones[fecha] = { fecha, dia, semana, ej: {}, inicio: null, fin: null, cardio: null };
  guardar();
  return S.sesiones[fecha];
}
export function borrarSesion(fecha) { delete S.sesiones[fecha]; guardar(); }

// Historial de un ejercicio: [{fecha, semana, series:[{kg,reps}], dif}], del más reciente al más antiguo.
export function historial(id) {
  const out = [];
  for (const s of Object.values(S.sesiones)) {
    for (const r of Object.values(s.ej || {})) {
      if (r.id !== id) continue;
      const series = (r.series || []).filter((x) => x && x.hecho);
      if (series.length || r.dif) out.push({ fecha: s.fecha, semana: s.semana, series, dif: r.dif });
    }
  }
  return out.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}
export const maxKg = (series) => series.reduce((m, x) => Math.max(m, +x.kg || 0), 0);

// --- Copia de seguridad ---
export function exportar() { return JSON.stringify({ app: "gym-ana", v: 1, fecha: new Date().toISOString(), datos: S }, null, 1); }
export function importar(txt) {
  const o = JSON.parse(txt);
  const d = o.datos || o;
  if (!d || typeof d !== "object" || !d.sesiones) throw new Error("El archivo no es una copia de esta app.");
  S = { ...structuredClone(VACIO), ...d, ajustes: { ...VACIO.ajustes, ...(d.ajustes || {}) } };
  guardar();
}
export function borrarTodo() { S = structuredClone(VACIO); guardar(); }
