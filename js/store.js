// Datos guardados en el iPhone (localStorage) + cálculo de la fase del ciclo.
const KEY = (typeof window !== "undefined" && window.APP_KEY) || "gym-ana-v1";
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
export const hoy = () => (typeof window !== "undefined" && window.__HOY) || ymd(new Date());
export const diaISO = (d) => ((d.getDay() + 6) % 7) + 1; // lunes=1
export function lunesDe(s) { const d = parse(s); d.setDate(d.getDate() - (diaISO(d) - 1)); return ymd(d); }
export function sumaDias(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fechaCorta = (s) => { const d = parse(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };

// --- Ciclo: reglas, fases por semanas completas y predicción ---
// Reglas: [{ inicio: "YYYY-MM-DD", fin: "YYYY-MM-DD" | null }]
// Normas:
//  · Desde el día que marcas la regla, fase menstrual (los días anteriores de esa semana se quedan como estaban).
//  · Primer lunes tras la regla: si ya no sangras → folicular; si sigues sangrando → recomendación según el día del
//    ciclo (día 6+ → folicular, día ≤5 → menstrual) y eliges tú. Sin respuesta se aplica la recomendación.
//  · Después: folicular → ovulatoria → lútea (la lútea dura hasta la siguiente regla). Cada fase, semana completa.
//  · "Fase de esta semana" a mano: las semanas siguientes siguen en orden desde ahí.
export const diasEntre = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const med = (arr) => { const a = [...arr].sort((x, y) => x - y), n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; };

function migrar() {
  S.reglas = (S.reglas || []).map((r) => (typeof r === "string" ? { inicio: r, fin: null } : r)).sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  S.decision = S.decision || {};
  S.resp = S.resp || {};
  S.extras = S.extras || {};
  // Historial que Ana nos dio (primer día y duración); se añade una sola vez
  if (!S.histCargado) {
    S.manual = {}; // los ajustes manuales del sistema antiguo (Semana 1–4) ya no aplican
    const H = [["2025-10-27", 6], ["2025-11-27", 7], ["2025-12-27", 6], ["2026-01-29", 5], ["2026-02-28", 5], ["2026-03-30", 5], ["2026-05-01", 4], ["2026-05-31", 4], ["2026-06-27", 5], ["2026-07-27", 6], ["2026-08-23", 6], ["2026-09-20", 7]];
    for (const [i, d] of H) {
      const ex = S.reglas.find((r) => r.inicio === i);
      if (ex) { if (!ex.fin) ex.fin = sumaDias(i, d - 1); } else S.reglas.push({ inicio: i, fin: sumaDias(i, d - 1) });
    }
    S.reglas.sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
    S.histCargado = true;
  }
}
migrar();

export const reglas = () => S.reglas;
export const reglaDe = (fecha) => S.reglas.filter((r) => r.inicio <= fecha).pop() || null;
export function duracionHabitual() {
  const d = S.reglas.filter((r) => r.fin).map((r) => diasEntre(r.inicio, r.fin) + 1).slice(-6);
  return d.length ? Math.round(med(d)) : 5;
}
export const primerLunes = (R) => sumaDias(lunesDe(R.inicio), 7);
export const recomendacion = (R) => (diasEntre(R.inicio, primerLunes(R)) + 1 >= 6 ? 2 : 1);
function decisionAuto(R) {
  const M1 = primerLunes(R);
  if (S.decision[M1]) return S.decision[M1];
  const fin = R.fin || (M1 > hoy() ? sumaDias(R.inicio, duracionHabitual() - 1) : null); // a futuro, se estima
  if (fin && fin < M1) return 2;
  return recomendacion(R);
}
export function infoFase(fecha = hoy()) {
  const R = reglaDe(fecha), lunes = lunesDe(fecha);
  if (!R) return { fase: 1, sinRegla: true, lunes, diaCiclo: null, regla: null };
  const L0 = lunesDe(R.inicio), k = diasEntre(L0, lunes) / 7;
  const diaCiclo = diasEntre(R.inicio, fecha) + 1;
  const man = Object.keys(S.manual || {}).filter((m) => m >= L0 && m <= lunes).sort().pop();
  let fase, manual = false;
  if (man) { fase = Math.min(4, S.manual[man] + diasEntre(man, lunes) / 7); manual = man === lunes; }
  else if (k === 0) fase = 1;
  else { const seq = decisionAuto(R) === 1 ? [1, 2, 3] : [2, 3]; fase = seq[k - 1] ?? 4; }
  return { fase, semana: fase, diaCiclo, regla: R.inicio, R, lunes, manual, sinRegla: false };
}
export const infoSemana = infoFase; // compatibilidad

export function prediccion() {
  const ini = S.reglas.map((r) => r.inicio);
  if (ini.length < 2) return null;
  const L = []; for (let i = 1; i < ini.length; i++) { const d = diasEntre(ini[i - 1], ini[i]); if (d >= 20 && d <= 45) L.push(d); }
  const ult = L.slice(-6); if (!ult.length) return null;
  const m = Math.round(med(ult)), last = ini[ini.length - 1];
  return { ciclo: m, fecha: sumaDias(last, m), desde: sumaDias(last, Math.min(...ult)), hasta: sumaDias(last, Math.max(...ult)), ciclos: L };
}

export function registrarRegla(fecha = hoy()) {
  if (!S.reglas.some((r) => r.inicio === fecha)) S.reglas.push({ inicio: fecha, fin: null });
  S.reglas.sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  for (const m of Object.keys(S.manual || {})) if (m >= lunesDe(fecha)) delete S.manual[m];
  guardar();
}
export function borrarRegla(inicio) { S.reglas = S.reglas.filter((r) => r.inicio !== inicio); guardar(); }
export function ponDuracion(inicio, dias) { const R = S.reglas.find((r) => r.inicio === inicio); if (R) { R.fin = dias > 0 ? sumaDias(inicio, dias - 1) : null; guardar(); } }
export function forzarSemana(lunes, n) { if (n) S.manual[lunes] = n; else delete S.manual[lunes]; guardar(); }

// Pregunta diaria "¿Sigues sangrando?"
export function preguntaSangrado(fecha = hoy()) {
  const R = reglaDe(fecha);
  if (!R || R.fin || fecha <= R.inicio || diasEntre(R.inicio, fecha) > 9 || S.resp[fecha]) return null; // se pregunta hasta el día 10
  return R;
}
export function respondeSangrado(fecha, si) {
  const R = reglaDe(fecha); S.resp[fecha] = si ? "si" : "no";
  if (R && !si) R.fin = sumaDias(fecha, -1) < R.inicio ? R.inicio : sumaDias(fecha, -1);
  guardar();
}
// Segunda pregunta (solo la semana del primer lunes, si sigues sangrando y aún no has decidido)
export function preguntaFase(fecha = hoy()) {
  const R = reglaDe(fecha); if (!R || R.fin) return null;
  const M1 = primerLunes(R);
  if (lunesDe(fecha) !== M1 || S.decision[M1] || S.resp[fecha] !== "si") return null;
  return { R, M1, recomendada: recomendacion(R), diaLunes: diasEntre(R.inicio, M1) + 1 };
}
export function decideFase(M1, n) { S.decision[M1] = n; guardar(); }

// --- Actividades sueltas (caminata al aire libre) ---
export const extras = () => Object.entries(S.extras).map(([id, x]) => ({ id, ...x })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
export function addExtra(x) { const id = "x" + Date.now().toString(36); S.extras[id] = x; guardar(); return id; }
export function borrarExtra(id) { const x = S.extras[id]; delete S.extras[id]; guardar(); return x; }
export function restaurarExtra(id, x) { S.extras[id] = x; guardar(); }

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
  migrar(); guardar();
}
export function borrarTodo() { S = structuredClone(VACIO); migrar(); guardar(); }
