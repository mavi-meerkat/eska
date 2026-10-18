import { FASES, EJ, BLOQUES, CARDIO_LIBRE, DIAS, NOMBRE_DIA, sesionDe } from "./data.js";
import * as db from "./store.js";
import { animar, svgEstatico, pararAnimaciones } from "./figuras.js";

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fase = (n) => FASES[n - 1];
const CORTO = { 1: "Mens.", 2: "Fol.", 3: "Ovul.", 4: "Lút." };
const DIF = { facil: "Fácil", normal: "Normal", dificil: "Difícil" };
const mmss = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : 0; };
const fmtKg = (n) => (Math.round(n * 10) / 10).toString().replace(".", ",");
// --- Tipos de carga ---
const MANC = [1, 2, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40];
const tipoPeso = (id) => EJ[id]?.peso || "mancuerna";
function pasoPeso(id, v, d) {
  v = +v || 0;
  const t = tipoPeso(id);
  if (t === "mancuerna") {
    if (d > 0) return MANC.find((x) => x > v + 1e-9) ?? v + 2.5;
    return [...MANC].reverse().find((x) => x < v - 1e-9) ?? 0;
  }
  if (t === "discos") { const st = EJ[id]?.paso || 2.5; return Math.max(0, Math.round((v + d * st) * 10) / 10); } // hack 5 kg · press máquina 2,5 kg · prensa 20 kg
  if (t === "placas") return Math.max(0, Math.round(v) + d);
  return 0;
}
function txtPeso(id, v) {
  v = +v || 0;
  const t = tipoPeso(id);
  if (t === "discos") return v ? `máquina + ${fmtKg(v)} kg` : "solo máquina";
  if (t === "placas") return v ? `placa ${fmtKg(v)}` : "sin placa";
  if (t === "corporal") return "peso corporal";
  return `${fmtKg(v)} kg`;
}
function cortoPeso(id, v) {
  v = +v || 0;
  const t = tipoPeso(id);
  if (t === "discos") return v ? `+${fmtKg(v)} kg` : "máq.";
  if (t === "placas") return `P${fmtKg(v)}`;
  if (t === "corporal") return "";
  return `${fmtKg(v)} kg`;
}
const serieTxt = (id, x) => { const p = cortoPeso(id, x.kg); return p ? `${p}×${x.reps}` : `${x.reps} reps`; };
const ETQ_PESO = { mancuerna: "kg", discos: "+ kg discos", placas: "placa" };
const VERSION_APP = "16 · 19 oct";
const SERIE_SEG = 40; // tiempo estimado de trabajo por serie
// Alternos (1 rep = los dos brazos) y unilaterales (todas las reps con una pierna y luego la otra) duran el doble.
const segSerie = (e) => SERIE_SEG * (e && EJ[e.id]?.doble ? 2 : 1);
const ICON = {
  hoy: '<path d="M4 9h16M8 3v4M16 3v4"/><rect x="4" y="5" width="16" height="16" rx="3"/><circle cx="12" cy="15" r="1.6" class="fillc"/>',
  plan: '<path d="M5 6h14M5 12h14M5 18h9"/>',
  prog: '<path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
};
const ico = (k) => `<svg viewBox="0 0 24 24" class="ico">${ICON[k]}</svg>`;

function ponFase(n) { document.documentElement.style.setProperty("--acc", fase(n).color); document.querySelector('meta[name="theme-color"]')?.setAttribute("content", fase(n).color); }

// ---------- Sonido (pitidos) ----------
let ctx = null;
function audioOn() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = "transient";
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch {}
}
function pitido(freq = 880, dur = 0.14, cuando = 0) {
  if (!db.st().ajustes.sonido || !ctx) return;
  try {
    const t = ctx.currentTime + cuando, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}
// Pitido suave (el elegido en la prueba): tono limpio de 1320 Hz, volumen medio.
function bip(dur = 0.16) {
  if (!db.st().ajustes.sonido || !ctx) return;
  try {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 1320;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.015);
    g.gain.setValueAtTime(0.35, t + dur - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}
// Cuenta atrás: un bip suave en 4, 3, 2 y 1; al llegar a 0, el mismo bip medio segundo más largo.
const bipCuenta = () => bip(0.16);
const pitidoFin = () => bip(0.66);

// ---------- Pantalla encendida ----------
let lock = null;
async function mantenerPantalla(on) {
  try {
    if (on && "wakeLock" in navigator && document.visibilityState === "visible") { if (!lock) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => (lock = null)); } }
    else if (!on && lock) { await lock.release(); lock = null; }
  } catch {}
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && enEntreno()) mantenerPantalla(true); });
const enEntreno = () => location.hash.startsWith("#/entreno/");

// ---------- Rutas ----------
function ruta() {
  const [, r, a, b] = (location.hash || "#/hoy").split("/");
  return { r: r || "hoy", a: a ? decodeURIComponent(a) : null, b };
}
function ir(h) { if (location.hash === h) render(); else location.hash = h; }
window.addEventListener("hashchange", render);

function render() {
  pararAnimaciones();
  const { r, a, b } = ruta();
  if (r !== "entreno") mantenerPantalla(false);
  let html = "";
  if (r === "entreno" && a) html = vEntreno(a);
  else if (r === "plan") html = vPlan(+(a || db.infoSemana().semana));
  else if (r === "ej" && a) html = vEjercicio(a, +(b || 0));
  else if (r === "progreso") html = vProgreso();
  else if (r === "ciclo" && a) html = vCiclo(a);
  else if (r === "ajustes") html = vAjustes();
  else html = vHoy();
  const tabs = r === "entreno" ? "" : barra(r === "ej" ? "plan" : r === "ciclo" ? "progreso" : r);
  $app.innerHTML = `${window.PRUEBA ? barraPrueba() : ""}<main class="vista ${r === "ciclo" ? "rciclo" : r}">${html}</main>${tabs}`;
  window.scrollTo(0, 0);
  montar(r, a, b);
}
// Barra de la versión de prueba: permite simular cualquier fecha
function barraPrueba() {
  return `<div class="simbar"><b>🧪 Prueba</b><input type="date" id="simHoy" value="${db.hoy()}"><button class="mini" data-act="simDia" data-d="1">+1 día</button><button class="mini" data-act="simReset">Reiniciar</button></div>`;
}
function barra(act) {
  const t = (k, h, n) => `<a href="#/${h}" class="tab ${act === k ? "on" : ""}">${ico(k === "progreso" ? "prog" : k)}<span>${n}</span></a>`;
  return `<nav class="tabs">${t("hoy", "hoy", "Hoy")}${t("plan", "plan", "Plan")}${t("progreso", "progreso", "Progreso")}${t("ajustes", "ajustes", "Ajustes")}</nav>`;
}

// ---------- Estimación de tiempos ----------
function estimar(s) {
  if (s.tipo === "cardio") return s.bloques.reduce((m, x) => m + x.min, 0) * 60;
  const n = s.ejercicios.length;
  return s.ejercicios.reduce((m, e) => m + s.vol.series * segSerie(e), 0) + n * (s.vol.series - 1) * s.vol.descanso + (n - 1) * db.st().ajustes.cambioEj;
}
function repartoTxt(s) {
  if (s.tipo === "cardio") return `${s.bloques.length} bloques en cinta`;
  const n = s.ejercicios.length;
  return `${n} ejercicios · ${s.vol.series} series de ${s.vol.reps} · descanso ${s.vol.descansoTxt || s.vol.descanso + " s"}`;
}

// ---------- HOY ----------
function planDe(fecha) {
  const ses = db.sesion(fecha);
  const info = db.infoSemana(fecha);
  const dia = ses?.dia || db.diaISO(db.parse(fecha));
  const semana = ses?.semana || info.semana;
  return { ses, info, dia, semana, plan: sesionDe(dia, semana) };
}
function estadoSesion(ses) {
  if (!ses) return "pend";
  if (ses.fin || ses.cardio?.hecho) return "hecho";
  if (ses.inicio || ses.cardio?.inicio) return "curso";
  return "pend";
}

const fc = (x) => db.fechaCorta(x);
function vHoy() {
  const f = db.hoy();
  const { ses, info, dia, semana, plan } = planDe(f);
  ponFase(semana);
  const F = fase(semana);
  const est = estadoSesion(ses);
  const pred = db.prediccion();

  // Avisos de la regla
  let aviso = "";
  if (info.sinRegla) aviso = `<div class="aviso">Aún no hay ninguna regla registrada. Pulsa el botón de abajo el primer día de la regla.</div>`;
  else if (pred && semana === 4 && f >= pred.desde && f > db.sumaDias(pred.hasta, 2)) aviso = `<div class="aviso">Tu regla se está retrasando: estaba prevista hacia el <b>${fc(pred.fecha)}</b> (${fc(pred.desde)}–${fc(pred.hasta)}). Sigues en fase lútea hasta que la registres.</div>`;
  else if (pred && semana === 4 && f >= db.sumaDias(pred.desde, -3)) aviso = `<div class="aviso">🩸 <b>Probablemente te baje pronto.</b> Previsión: ${fc(pred.fecha)} (entre el ${fc(pred.desde)} y el ${fc(pred.hasta)}).</div>`;

  // Preguntas del sangrado
  let preg = "";
  const pS = db.preguntaSangrado(f), pF = db.preguntaFase(f);
  if (pS) {
    preg = `<section class="card pregunta"><div class="etq">Día ${db.diasEntre(pS.inicio, f) + 1} desde que te bajó</div><h2>¿Sigues sangrando?</h2>
      <div class="difs"><button class="btn" data-act="sangra" data-v="si">Sí, sigo</button><button class="btn sec" data-act="sangra" data-v="no">No</button></div>
      <p class="nota">Si contestas que no, el último día de regla queda guardado como ${db.diaISO(db.parse(f)) === 1 ? "el domingo" : "ayer"}.</p></section>`;
  } else if (pF) {
    const r = pF.recomendada, op = (n, t) => `<button class="btn ${n === r ? "" : "sec"}" data-act="decideFase" data-n="${n}" data-m="${pF.M1}">${t}${n === r ? " · recomendado" : ""}</button>`;
    preg = `<section class="card pregunta"><div class="etq">Hoy es el día ${db.diasEntre(pF.R.inicio, f) + 1} del ciclo</div><h2>Esta semana, ¿qué fase hacemos?</h2>
      <p class="suave">Sigues sangrando. ${r === 2 ? "Como ya llevas 6 días o más, te recomiendo pasar a folicular." : "Como es el principio de la regla, te recomiendo mantener la menstrual toda la semana."}</p>
      <div class="opciones">${op(1, "Mantener menstrual")}${op(2, "Pasar a folicular")}</div>
      <p class="nota">Si no eliges, se aplica la recomendada. La fase no cambia hasta el lunes.</p></section>`;
  }

  let tarjeta;
  if (plan.tipo === "descanso") {
    tarjeta = `<section class="card hoycard reposo"><div class="etq">${NOMBRE_DIA[dia]}</div><h2>Día de descanso</h2>
      <p class="suave">Si quieres recuperar un entreno de esta semana, elígelo aquí:</p>
      <div class="chips">${[1, 2, 3, 4, 5].map((d) => `<button class="chip" data-act="cambiaDia" data-d="${d}">${NOMBRE_DIA[d]}</button>`).join("")}</div></section>`;
  } else {
    const fig = plan.tipo === "cardio" ? "cinta" : plan.ejercicios[0].id;
    const boton = est === "hecho" ? `<a class="btn sec" href="#/entreno/${f}">Ver entreno de hoy ✓</a>` : `<a class="btn" href="#/entreno/${f}" data-act="audio">${est === "curso" ? "Continuar entreno" : "Empezar entreno"}</a>`;
    tarjeta = `<section class="card hoycard">
      <div class="hoyfig" data-fig="${fig}"></div>
      <div class="etq">${NOMBRE_DIA[dia]}${ses && ses.dia !== db.diaISO(db.parse(f)) ? " (recuperado)" : ""}</div>
      <h2>${esc(plan.titulo)}</h2>
      <p class="suave">${esc(plan.tipo === "cardio" ? plan.subtitulo : plan.vol.intensidad)}</p>
      <div class="reparto"><div><b>≈ ${Math.round(estimar(plan) / 60)} min</b><span>duración</span></div><div><b>${plan.tipo === "cardio" ? plan.bloques.length : plan.ejercicios.length}</b><span>${plan.tipo === "cardio" ? "fases" : "ejercicios"}</span></div><div><b>${plan.tipo === "cardio" ? "Cinta" : plan.vol.descanso + " s"}</b><span>${plan.tipo === "cardio" ? "máquina" : "descanso"}</span></div></div>
      ${plan.intro ? `<p class="intro">${esc(plan.intro)}</p>` : ""}
      ${boton}
      ${est === "pend" ? `<details class="cambiar"><summary>Hacer otro entreno hoy</summary><div class="chips">${[1, 2, 3, 4, 5].filter((d) => d !== dia).map((d) => `<button class="chip" data-act="cambiaDia" data-d="${d}">${NOMBRE_DIA[d]}</button>`).join("")}</div></details>` : ""}
    </section>`;
  }

  // Actividad extra: caminata al aire libre
  const hoyEx = db.extras().filter((x) => x.fecha === f);
  const extra = `<section class="card extra"><div class="fila"><div><h3 class="sinmb">Actividad extra</h3><p class="suave chico">Caminata al aire libre, cualquier día</p></div><button class="mini prim" data-act="caminata">🌳 Añadir</button></div>
    ${hoyEx.length ? `<ul class="lista compacta">${hoyEx.map((x) => `<li class="sesli"><span>🌳 ${txtCaminata(x)}</span><button class="papelera" data-act="borrarExtra" data-id="${x.id}" aria-label="Eliminar">🗑</button></li>`).join("")}</ul>` : ""}</section>`;

  // Tira de la semana (cada día con su fase)
  const lunes = info.lunes;
  const tira = [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const fe = db.sumaDias(lunes, d - 1), s = db.sesion(fe), e = estadoSesion(s);
    const fd = s?.semana || db.infoFase(fe).fase;
    const p = sesionDe(s?.dia || d, fd);
    const ic = p.tipo === "descanso" ? "·" : p.tipo === "cardio" ? "♥" : { A: "Pec", B: "Esp", C: "Pie" }[p.bloque];
    const link = p.tipo !== "descanso" || s ? `href="#/entreno/${fe}"` : "";
    const ex = db.extras().some((x) => x.fecha === fe);
    return `<a ${link} class="dia ${fe === f ? "hoy" : ""} ${e}" style="--fc:${fase(fd).color}"><span>${NOMBRE_DIA[d].slice(0, 1)}</span><b>${ic}</b><i>${e === "hecho" ? "✓" : ""}</i>${ex ? `<em>🌳</em>` : ""}<u></u></a>`;
  }).join("");

  return `<header class="cab">
      <div><div class="fecha">${NOMBRE_DIA[db.diaISO(db.parse(f))]}, ${fc(f)}</div><h1>${F.nombre}</h1></div>
      <div class="fasebadge"><b>${info.diaCiclo ? "Día " + info.diaCiclo : "—"}</b><span>del ciclo</span></div>
    </header>
    <div class="ciclo"><span>${pred ? `Próxima regla: ~${fc(pred.fecha)} (${fc(pred.desde)}–${fc(pred.hasta)})` : F.lema}${info.manual ? " · fase fijada a mano" : ""}</span>
      <div class="ruleta">${FASES.map((x) => `<i style="background:${x.color}" class="${x.n === semana ? "on" : ""}"></i>`).join("")}</div></div>
    ${preg}
    ${aviso}
    ${tarjeta}
    <section class="card"><h3>Esta semana</h3><div class="tira">${tira}</div></section>
    ${extra}
    <button class="btn regla" data-act="regla">🩸 Hoy me ha bajado la regla</button>
    <p class="nota">Si te bajó otro día, regístralo en Ajustes.</p>
    <div id="hoja" class="hoja" hidden></div>`;
}
// Caminata al aire libre
const ritmo = (km, min) => { if (!(km > 0 && min > 0)) return ""; const p = min / km, m = Math.floor(p), sg = Math.round((p - m) * 60); return `${m}:${String(sg === 60 ? 0 : sg).padStart(2, "0")} min/km`; };
const velo = (km, min) => (km > 0 && min > 0 ? fmtKg(Math.round((km / (min / 60)) * 10) / 10) + " km/h" : "");
const txtCaminata = (x) => `${fmtKg(x.km)} km · ${x.min} min · ${velo(x.km, x.min)} · ${ritmo(x.km, x.min)}`;
function abrirCaminata() {
  const h = document.getElementById("hoja"); if (!h) return;
  h.innerHTML = `<div class="hcont"><div class="hcab"><b>🌳 Caminata al aire libre</b><button class="mini" data-act="hojaCerrar">Cerrar</button></div>
    <div class="bigfig" data-fig2="caminata"></div>
    <label class="fila">Día<input type="date" id="cwF" value="${db.hoy()}" max="${db.hoy()}"></label>
    <label class="fila">Kilómetros<input id="cwKm" inputmode="decimal" placeholder="Ej. 5,2" class="campo"></label>
    <label class="fila">Tiempo (minutos)<input id="cwMin" inputmode="numeric" placeholder="Ej. 50" class="campo"></label>
    <p class="nota centro" id="cwCalc">Introduce km y minutos.</p>
    <button class="btn" data-act="guardaCaminata">Guardar caminata</button></div>`;
  h.hidden = false;
  animar(h.querySelector("[data-fig2]"), "caminata");
  const calc = () => { const km = num(document.getElementById("cwKm").value), mn = num(document.getElementById("cwMin").value); document.getElementById("cwCalc").textContent = km > 0 && mn > 0 ? `${velo(km, mn)} · ${ritmo(km, mn)}` : "Introduce km y minutos."; };
  h.querySelectorAll(".campo").forEach((i) => i.addEventListener("input", calc));
}

// ---------- PLAN ----------
function vPlan(sem) {
  sem = Math.min(4, Math.max(1, sem || 1));
  ponFase(sem);
  const seg = FASES.map((x) => `<a href="#/plan/${x.n}" class="seg ${x.n === sem ? "on" : ""}" style="--c:${x.color}">${CORTO[x.n]}</a>`).join("");
  const dias = [1, 2, 3, 4, 5].map((d) => {
    const p = sesionDe(d, sem);
    let cuerpo;
    if (p.tipo === "fuerza") {
      cuerpo = `<p class="suave">${esc(repartoTxt(p))}</p>${p.intro ? `<p class="intro">${esc(p.intro)}</p>` : ""}<ul class="lista">${p.ejercicios.map((e) =>
        `<li><a href="#/ej/${e.id}/${sem}" class="ejrow"><div class="thumb">${svgEstatico(e.id)}</div><div><b>${esc(e.nombre)}</b><span>${esc(e.zona)}${e.detalle ? " · " + esc(e.detalle) : ""}</span></div></a></li>`).join("")}</ul>`;
    } else {
      cuerpo = `${tablaCardio(p.bloques)}<p class="nota">En el bloque principal eliges tú la velocidad y la inclinación mientras entrenas.</p>`;
    }
    return `<details class="card dplan" ${d === db.diaISO(db.parse(db.hoy())) ? "open" : ""}><summary><span class="etq">${NOMBRE_DIA[d]}</span><b>${esc(p.titulo)}</b><em>≈ ${Math.round(estimar(p) / 60)} min</em></summary>${cuerpo}</details>`;
  }).join("");
  const F = fase(sem);
  return `<header class="cab"><div><div class="fecha">Plan por fases</div><h1>${F.nombre.replace("Fase ", "")}</h1></div><div class="fasebadge"><b>${F.nombre}</b><span>${F.lema}</span></div></header>
    <div class="segs">${seg}</div>${dias}`;
}
function tablaCardio(bl) {
  return `<table class="tcardio"><thead><tr><th>Bloque</th><th>Min</th><th>km/h</th><th>Incl.</th></tr></thead><tbody>${bl.map((x) =>
    `<tr class="${x.tipo.startsWith("Recup") || x.tipo === "Enfriamiento" ? "suave" : ""}"><td>${esc(x.tipo)}</td><td>${x.min}</td><td>${x.vel}</td><td>${x.inc} %</td></tr>`).join("")}</tbody></table>`;
}

// ---------- DETALLE DE EJERCICIO ----------
function vEjercicio(id, sem) {
  const e = EJ[id];
  if (!e) return `<p>Ejercicio no encontrado.</p>`;
  if (sem) ponFase(sem);
  const donde = [];
  for (const [k, bl] of Object.entries(BLOQUES)) for (const [s, w] of Object.entries(bl.semanas)) if (w.ej.some((x) => x.id === id)) donde.push(CORTO[s]);
  const h = db.historial(id);
  const filas = h.length ? h.map((r) => `<tr><td>${db.fechaCorta(r.fecha)}<small>${CORTO[r.semana]}</small></td><td>${r.series.map((x) => serieTxt(id, x)).join(" · ") || "—"}</td><td>${r.dif ? `<span class="dif ${r.dif}">${DIF[r.dif]}</span>` : ""}</td></tr>`).join("")
    : `<tr><td colspan="3" class="suave">Todavía no hay registros.</td></tr>`;
  return `<a class="volver" href="javascript:history.back()">‹ Volver</a>
    <section class="card"><div class="bigfig" data-fig="${id}"></div><h2>${esc(e.nombre)}</h2>
    <div class="pills"><span>${esc(e.zona)}</span><span>${esc(e.equipo)}</span><span>En el plan: ${donde.join(", ")}</span></div>
    ${e.nota ? `<p class="intro">${esc(e.nota)}</p>` : ""}</section>
    <section class="card"><h3>Historial</h3>${grafica(h, id)}<table class="thist"><thead><tr><th>Fecha</th><th>Peso × reps</th><th></th></tr></thead><tbody>${filas}</tbody></table></section>`;
}
function grafica(h, id) {
  const pts = [...h].reverse().map((r) => db.maxKg(r.series)).filter((x, i, a) => a.length);
  if (pts.length < 2) return "";
  const max = Math.max(...pts, 1), min = Math.min(...pts), W = 300, H = 70, rng = max - min || 1;
  const xy = pts.map((v, i) => [10 + (i * (W - 20)) / (pts.length - 1), H - 10 - ((v - min) / rng) * (H - 22)]);
  return `<svg viewBox="0 0 ${W} ${H}" class="graf"><polyline points="${xy.map((p) => p.join(",")).join(" ")}"/>${xy.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5"/>${i === xy.length - 1 ? `<text x="${p[0] - 4}" y="${Math.max(13, p[1] - 8)}" text-anchor="end">${esc(cortoPeso(id, pts[i]))}</text>` : ""}`).join("")}</svg>`;
}

// ---------- PROGRESO ----------
function vProgreso() {
  const ses = Object.values(db.st().sesiones).filter((s) => estadoSesion(s) !== "pend").sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const ids = [...new Set(ses.flatMap((s) => Object.values(s.ej || {}).map((r) => r.id)))];
  const ej = ids.map((id) => ({ id, h: db.historial(id) })).filter((x) => x.h.length).sort((a, b) => (a.h[0].fecha < b.h[0].fecha ? 1 : -1));
  const lista = ej.length ? ej.map(({ id, h }) => {
    const ult = h[0], mejor = Math.max(...h.map((r) => db.maxKg(r.series)));
    return `<li><a href="#/ej/${id}" class="ejrow"><div class="thumb">${svgEstatico(id)}</div><div><b>${esc(EJ[id].nombre)}</b><span>Última: ${txtPeso(id, db.maxKg(ult.series))} (${db.fechaCorta(ult.fecha)}) · Mejor: ${txtPeso(id, mejor)}</span></div>${ult.dif ? `<span class="dif ${ult.dif}">${DIF[ult.dif]}</span>` : ""}</a></li>`;
  }).join("") : `<li class="suave vacio">Cuando completes tu primer entreno verás aquí tus pesos y cómo evolucionan.</li>`;
  const hist = ses.slice(0, 30).map((s) => {
    const p = sesionDe(s.dia, s.semana);
    const dur = s.fin && s.inicio ? Math.round((s.fin - s.inicio) / 60000) + " min" : s.cardio?.hecho ? (s.cardio.minutos ?? Math.round(estimar(p) / 60)) + " min" : "en curso";
    const dif = s.cardio?.dif;
    return `<li class="sesli"><a href="#/entreno/${s.fecha}" class="sesrow"><i style="background:${fase(s.semana).color}"></i><div><b>${esc(p.titulo)}</b><span>${NOMBRE_DIA[db.diaISO(db.parse(s.fecha))]} ${db.fechaCorta(s.fecha)} · ${fase(s.semana).nombre} · ${dur}</span>${p.tipo === "cardio" && s.cardio?.tramos?.length ? `<span class="tramotxt">${esc(textoCardio(s.cardio, p))}</span>` : ""}</div>${dif ? `<span class="dif ${dif}">${DIF[dif]}</span>` : ""}</a><button class="papelera" data-act="borrarSes" data-f="${s.fecha}" aria-label="Eliminar este entreno">🗑</button></li>`;
  }).join("");
  ponFase(db.infoSemana().semana);
  const caminatas = db.extras().map((x) => `<li class="sesli"><div class="sesrow"><i style="background:${fase(x.fase || 1).color}"></i><div><b>🌳 Caminata al aire libre</b><span>${NOMBRE_DIA[db.diaISO(db.parse(x.fecha))]} ${fc(x.fecha)} · ${fase(x.fase || 1).nombre}</span><span class="tramotxt">${txtCaminata(x)}</span></div></div><button class="papelera" data-act="borrarExtra" data-id="${x.id}" aria-label="Eliminar">🗑</button></li>`);
  const cs = ciclos().reverse().map((c) => `<li><a href="#/ciclo/${c.regla}" class="sesrow"><i style="background:${FASES[0].color}"></i><div><b>Ciclo del ${db.fechaCorta(c.regla)}</b><span>${c.siguiente ? "hasta el " + db.fechaCorta(db.sumaDias(c.siguiente, -1)) : "en curso"}</span></div><span class="flecha">›</span></a></li>`).join("");
  const todas = Object.values(db.st().sesiones).filter((s) => estadoSesion(s) === "hecho");
  return `<header class="cab"><div><div class="fecha">Tu evolución</div><h1>Progreso</h1></div></header>
    <section class="card"><h3>Dificultad por fase</h3>${barrasDif(cuentaDif(todas))}<p class="nota">Todas tus valoraciones (cada ejercicio y cada cardio) agrupadas por semana del ciclo.</p></section>
    ${cs ? `<section class="card"><h3>Resúmenes de ciclo</h3><ul class="lista">${cs}</ul></section>` : ""}
    <section class="card"><h3>Ejercicios</h3><ul class="lista">${lista}</ul></section>
    ${hist || caminatas.length ? `<section class="card"><h3>Entrenos realizados</h3><ul class="lista">${mezclaHist(ses.slice(0, 30), hist, caminatas)}</ul></section>` : ""}`;
}

// Mezcla entrenos y caminatas por fecha (más reciente primero)
function mezclaHist(ses, histHtml, camHtml) {
  const filas = histHtml ? histHtml.split(/(?=<li class="sesli">)/) : [];
  const items = ses.map((s, i) => ({ f: s.fecha, h: filas[i] || "" })).concat(db.extras().map((x, i) => ({ f: x.fecha, h: camHtml[i] })));
  return items.sort((a, b) => (a.f < b.f ? 1 : -1)).map((x) => x.h).join("");
}
// ---------- RESUMEN DE CICLO Y DIFICULTAD POR FASE ----------
const PESO_DIF = { facil: 1, normal: 2, dificil: 3 };
function difsDe(s) {
  const out = Object.values(s.ej || {}).map((r) => r.dif).filter(Boolean);
  if (s.cardio?.dif) out.push(s.cardio.dif);
  return out;
}
function cuentaDif(sesiones) {
  const c = {}; for (const n of [1, 2, 3, 4]) c[n] = { facil: 0, normal: 0, dificil: 0 };
  for (const s of sesiones) for (const d of difsDe(s)) c[s.semana][d]++;
  return c;
}
function barrasDif(c) {
  return `<div class="difbar">${FASES.map((F) => {
    const x = c[F.n], tot = x.facil + x.normal + x.dificil;
    const media = tot ? (x.facil + 2 * x.normal + 3 * x.dificil) / tot : 0;
    return `<div class="dbrow"><span class="dbn"><i style="background:${F.color}"></i>${F.nombre.replace("Fase ", "")}</span>
      <div class="dbb">${tot ? ["facil", "normal", "dificil"].map((k) => x[k] ? `<u class="${k}" style="flex:${x[k]}">${x[k]}</u>` : "").join("") : `<em>sin datos</em>`}</div>
      <span class="dbm">${tot ? (media < 1.6 ? "Fácil" : media < 2.4 ? "Normal" : "Difícil") : ""}</span></div>`;
  }).join("")}<div class="dbley"><span><u class="facil"></u>Fácil</span><span><u class="normal"></u>Normal</span><span><u class="dificil"></u>Difícil</span></div></div>`;
}
// Ciclos: de una regla a la siguiente (por semanas de lunes a domingo)
function ciclos() {
  const R = db.reglas().map((r) => r.inicio);
  return R.map((r, i) => ({ ini: db.lunesDe(r), fin: R[i + 1] ? db.lunesDe(R[i + 1]) : null, regla: r, siguiente: R[i + 1] || null }));
}
function vCiclo(regla) {
  const c = ciclos().find((x) => x.regla === regla);
  if (!c) return `<a class="volver" href="#/progreso">‹ Progreso</a><section class="card"><p>No encuentro ese ciclo.</p></section>`;
  const finTxt = c.fin || db.sumaDias(db.lunesDe(db.hoy()), 7);
  const todas = Object.values(db.st().sesiones);
  const ses = todas.filter((s) => s.fecha >= c.ini && s.fecha < finTxt && estadoSesion(s) === "hecho");
  const semanas = Math.max(1, Math.round((db.parse(finTxt) - db.parse(c.ini)) / (7 * 86400000)));
  const previstos = semanas * 5;
  const cd = cuentaDif(ses);
  // Récords: mejor peso del ciclo frente al mejor peso anterior al ciclo
  const recs = [];
  const ids = [...new Set(ses.flatMap((s) => Object.values(s.ej || {}).map((r) => r.id)))];
  for (const id of ids) {
    if (tipoPeso(id) === "corporal") continue;
    const h = db.historial(id);
    const dentro = h.filter((r) => r.fecha >= c.ini && r.fecha < finTxt), antes = h.filter((r) => r.fecha < c.ini);
    const mD = Math.max(0, ...dentro.map((r) => db.maxKg(r.series))), mA = Math.max(0, ...antes.map((r) => db.maxKg(r.series)));
    if (antes.length && mD > mA) recs.push(`<li><b>${esc(EJ[id].nombre)}</b><span>${txtPeso(id, mA)} → <strong>${txtPeso(id, mD)}</strong></span></li>`);
  }
  // Fase que mejor y peor se te dio (media de dificultad)
  const medias = FASES.map((F) => { const x = cd[F.n], t = x.facil + x.normal + x.dificil; return { F, t, m: t ? (x.facil + 2 * x.normal + 3 * x.dificil) / t : null }; }).filter((x) => x.t);
  const mejor = medias.length > 1 ? medias.reduce((a, b) => (b.m < a.m ? b : a)) : null;
  const peor = medias.length > 1 ? medias.reduce((a, b) => (b.m > a.m ? b : a)) : null;
  const porSemana = [1, 2, 3, 4].map((n) => ses.filter((s) => s.semana === n).length);
  ponFase(1);
  return `<a class="volver" href="#/progreso">‹ Progreso</a>
    <header class="cab"><div><div class="fecha">Ciclo del ${db.fechaCorta(c.regla)}${c.siguiente ? " al " + db.fechaCorta(db.sumaDias(c.siguiente, -1)) : " · en curso"}</div><h1>Resumen del ciclo</h1></div></header>
    <section class="card"><div class="reparto"><div><b>${ses.length}/${previstos}</b><span>entrenos</span></div><div><b>${recs.length}</b><span>récords</span></div><div><b>${semanas}</b><span>semanas</span></div></div>
      <div class="semrow">${FASES.map((F, i) => `<div style="--c:${F.color}"><b>${porSemana[i]}</b><span>${CORTO[F.n]}</span></div>`).join("")}</div></section>
    ${mejor && mejor.F !== peor.F ? `<section class="card"><h3>Cómo te fue</h3><p>🌟 Mejor fase: <b style="color:${mejor.F.color}">${mejor.F.nombre}</b><br>🌧 Más dura: <b style="color:${peor.F.color}">${peor.F.nombre}</b></p></section>` : ""}
    <section class="card"><h3>Dificultad por fase</h3>${barrasDif(cd)}</section>
    <section class="card"><h3>Récords del ciclo</h3>${recs.length ? `<ul class="lista compacta">${recs.join("")}</ul>` : `<p class="suave">Este ciclo no has superado pesos anteriores${ids.length ? "" : " (todavía no hay datos)"}.</p>`}</section>
    <a class="btn" href="#/hoy">Volver a Hoy</a>`;
}

// ---------- AJUSTES ----------
function vAjustes() {
  const S = db.st(), info = db.infoSemana();
  ponFase(info.semana);
  const pred = db.prediccion();
  const R = db.reglas();
  const reglas = [...R].reverse().map((r, i, arr) => {
    const dur = r.fin ? db.diasEntre(r.inicio, r.fin) + 1 : null, sig = arr[i - 1];
    return `<li class="regrow"><span>🩸 ${fc(r.inicio)} ${db.parse(r.inicio).getFullYear()}${sig ? `<small>ciclo de ${db.diasEntre(r.inicio, sig.inicio)} días</small>` : `<small>ciclo actual</small>`}</span>
      <div class="durst"><button data-act="durRegla" data-f="${r.inicio}" data-d="-1">−</button><b>${dur ? dur + " días" : "¿?"}</b><button data-act="durRegla" data-f="${r.inicio}" data-d="1">+</button></div>
      <button class="papelera" data-act="borraRegla" data-f="${r.inicio}" aria-label="Borrar">🗑</button></li>`;
  }).join("") || `<li class="suave">Ninguna todavía.</li>`;
  const nombresF = ["Auto", "Menstrual", "Folicular", "Ovulatoria", "Lútea"];
  return `<header class="cab"><div><div class="fecha">Configuración</div><h1>Ajustes</h1></div></header>
    <section class="card"><h3>Regla</h3>
      ${pred ? `<div class="reparto"><div><b>${pred.ciclo} días</b><span>ciclo habitual</span></div><div><b>${db.duracionHabitual()} días</b><span>regla habitual</span></div><div><b>${fc(pred.fecha)}</b><span>próxima (aprox.)</span></div></div>` : ""}
      <p class="suave chico" style="margin-top:10px">Añade una regla pasada con su primer día y cuántos días duró:</p>
      <div class="fila"><input type="date" id="fRegla" value="${db.hoy()}" max="${db.hoy()}"><input id="dRegla" inputmode="numeric" placeholder="días" class="dias"><button class="mini prim" data-act="addRegla">Añadir</button></div>
      <details class="histreglas"><summary><span>🩸 Historial de reglas</span><em>${R.length}</em></summary>
        <ul class="lista compacta">${reglas}</ul></details></section>
    <section class="card"><h3>Fase de esta semana</h3><p class="suave">${info.manual ? "Fijada a mano." : `Calculada: ${fase(info.semana).nombre}.`} Si la cambias, las semanas siguientes siguen en orden desde ahí (folicular → ovulatoria → lútea).</p>
      <div class="segs fases5">${nombresF.map((t, n) => `<button class="seg ${(n === 0 && !info.manual) || (info.manual && info.semana === n) ? "on" : ""}" style="--c:${n ? fase(n).color : "var(--txt2)"}" data-act="manual" data-n="${n}">${t}</button>`).join("")}</div></section>
    <section class="card"><h3>Tiempos</h3>
      <label class="fila">Descanso al cambiar de ejercicio<select id="cambioEj">${[60, 90, 120, 150].map((s) => `<option value="${s}" ${S.ajustes.cambioEj === s ? "selected" : ""}>${s} s</option>`).join("")}</select></label>
      <label class="fila">Pitidos al terminar el descanso<input type="checkbox" id="sonido" class="sw" ${S.ajustes.sonido ? "checked" : ""}></label>
      <button class="mini" data-act="probar">Probar sonido</button>
      <p class="nota">Si el iPhone está en silencio puede que no suene: la pantalla también parpadea al acabar cada descanso.</p></section>
    <section class="card"><h3>Copia de seguridad</h3><p class="suave">Tus datos se guardan solo en este iPhone. Haz una copia de vez en cuando y guárdala en Archivos o iCloud.</p>
      <div class="fila"><button class="mini prim" data-act="exportar">Exportar copia</button><label class="mini">Importar copia<input type="file" id="imp" accept=".json,application/json" hidden></label></div></section>
    <section class="card"><h3>Instalar en el iPhone</h3><ol class="pasos"><li>Abre esta página en Safari, Chrome o Brave.</li><li>Pulsa <b>Compartir</b> (el cuadrado con la flecha).</li><li>Elige <b>Añadir a pantalla de inicio</b> y confirma.</li><li>Abre la app desde el icono: funciona sin conexión.</li></ol></section>
    <section class="card"><h3>Versión</h3><div class="fila"><span>Versión ${VERSION_APP}</span><button class="mini prim" data-act="actualizar">Buscar actualización</button></div></section>
    <button class="btn peligro" data-act="borrarTodo">Borrar todos los datos</button>`;
}

// ---------- ENTRENO ----------
function vEntreno(fecha) {
  const { ses, dia, semana, plan } = planDe(fecha);
  ponFase(semana);
  if (plan.tipo === "descanso") return `<a class="volver" href="#/hoy">‹ Hoy</a><section class="card"><h2>Día de descanso</h2></section>`;
  const s = ses || db.crearSesion(fecha, dia, semana);
  const empezado = s.inicio || s.fin || s.cardio?.inicio || Object.values(s.ej || {}).some((r) => r.series?.some((x) => x.hecho));
  if (!s.energia && !empezado) return vEnergia(s, plan);
  return plan.tipo === "cardio" ? vCardio(s, plan) : vFuerza(s, plan);
}
const ENERGIA = { alta: "⚡ Con energía", normal: "🙂 Normal", baja: "🪫 Con poca energía" };
function vEnergia(s, p) {
  return `<header class="wbar"><button class="x" data-act="salir" aria-label="Salir">✕</button><div class="wt"><b>${esc(p.titulo)}</b><span>${fase(s.semana).nombre}</span></div></header>
    <section class="card energia"><h2>¿Cómo te encuentras hoy?</h2>
      <p class="suave">${p.tipo === "cardio" ? "Te daré una pista para elegir la velocidad y la inclinación del bloque principal." : "Si hoy tienes poca energía, bajaré un escalón los pesos propuestos."}</p>
      <div class="energias">${Object.entries(ENERGIA).map(([k, t]) => `<button class="en ${k}" data-act="energia" data-v="${k}">${t}</button>`).join("")}</div>
    </section>`;
}
function consejoEnergia(s, tipo) {
  if (s.energia === "baja") return tipo === "cardio" ? "Hoy con poca energía: elige velocidades e inclinaciones suaves en el bloque principal." : "Hoy con poca energía: los pesos propuestos bajan un escalón. Escucha a tu cuerpo.";
  if (s.energia === "alta") return tipo === "cardio" ? "Hoy con energía: puedes apretar un poco más en el bloque principal." : "Hoy con energía: apura la parte alta del rango de repeticiones.";
  return "";
}

function ultimaVez(id, fechaActual, semana) {
  const h = db.historial(id).filter((r) => r.fecha < fechaActual);
  return { mismaFase: h.find((r) => r.semana === semana), ult: h[0] };
}
function consejo(r, id) {
  if (!r || !r.dif || tipoPeso(id) === "corporal") return "";
  const kg = db.maxKg(r.series), sube = pasoPeso(id, kg, 1);
  if (r.dif === "facil") return `Te resultó fácil: prueba a subir (${txtPeso(id, kg)} → ${txtPeso(id, sube)}).`;
  if (r.dif === "dificil") return `Te costó: mantén ${txtPeso(id, kg)} y cuida la técnica.`;
  return `Bien: repite ${txtPeso(id, kg)} o sube un poco si te ves con fuerza.`;
}

function vFuerza(s, p) {
  const n = p.ejercicios.length;
  if (s.fin && s.idx == null) s.idx = 0;
  const i = Math.min(s.idx ?? 0, n - 1);
  const base = p.ejercicios[i];
  const r = (s.ej[i] = s.ej[i] || { id: base.id, series: [], dif: null });
  // Máquina estropeada: el ejercicio puede estar saltado (r.averia) o sustituido (r.sust)
  const e = r.sust ? { ...EJ[r.sust], id: r.sust, detalle: `En lugar de: ${base.nombre} (máquina estropeada)` } : base;
  if (r.id !== e.id) { r.id = e.id; r.series = []; r.dif = null; }
  const { mismaFase, ult } = ultimaVez(e.id, s.fecha, s.semana);
  const ref = mismaFase || ult;
  // Peso por defecto: el de la última vez que hiciste este ejercicio en la MISMA semana del ciclo (S1 con S1…).
  const kgDe = (k) => { const sr = mismaFase?.series; if (!sr || !sr.length) return 0; return +(sr[k] || sr[sr.length - 1]).kg || 0; };
  const repsDef = p.vol.repsMax;
  const sinPeso = /sin cargar/i.test(e.detalle);
  const tp = tipoPeso(e.id);
  if (!r.series.length) {
    // Ajuste automático: fácil → sube un escalón; difícil → baja uno; poca energía hoy → baja uno más.
    let pasos = 0; const motivos = [];
    if (mismaFase && !sinPeso && tp !== "corporal") {
      if (mismaFase.dif === "facil") { pasos++; motivos.push("la última vez te resultó fácil"); }
      if (mismaFase.dif === "dificil") { pasos--; motivos.push("la última vez te costó"); }
      if (s.energia === "baja") { pasos--; motivos.push("hoy tienes poca energía"); }
    }
    const ajusta = (v) => { for (let j = 0; j < Math.abs(pasos); j++) v = pasoPeso(e.id, v, Math.sign(pasos)); return v; };
    for (let k = 0; k < p.vol.series; k++) r.series[k] = { kg: ajusta(kgDe(k)), reps: repsDef, hecho: false };
    r.ajuste = pasos ? `${pasos > 0 ? "He subido" : "He bajado"} el peso ${Math.abs(pasos) > 1 ? Math.abs(pasos) + " escalones" : "un escalón"} porque ${motivos.join(" y ")}.` : "";
  }
  for (let k = 0; k < p.vol.series; k++) r.series[k] = r.series[k] || { kg: kgDe(k), reps: repsDef, hecho: false };
  db.guardar();

  const dots = p.ejercicios.map((x, k) => {
    const rr = s.ej[k], ok = rr && (rr.dif || rr.averia);
    return `<button class="dot ${k === i ? "on" : ""} ${ok ? "ok" : ""} ${rr?.averia ? "av" : ""}" data-act="irEj" data-i="${k}">${rr?.averia ? "⚠" : k + 1}</button>`;
  }).join("");
  const filas = r.series.map((x, k) => `<div class="serie ${x.hecho ? "hecha" : ""}" data-k="${k}">
      <span class="sn">${k + 1}</span>
      ${tp === "corporal" ? `<div class="step corp">Peso corporal</div>` : `<div class="step"><button data-act="kg" data-k="${k}" data-d="-1">−</button><input readonly data-act="pesoSel" data-campo="kg" data-k="${k}" value="${fmtKg(+x.kg || 0)}"><button data-act="kg" data-k="${k}" data-d="1">+</button><small>${ETQ_PESO[tp]}</small></div>`}
      <div class="step"><button data-act="reps" data-k="${k}" data-d="-1">−</button><input inputmode="numeric" data-campo="reps" data-k="${k}" value="${x.reps}"><button data-act="reps" data-k="${k}" data-d="1">+</button><small>reps</small></div>
      <button class="check" data-act="serie" data-k="${k}" aria-label="Serie hecha">✓</button></div>`).join("");
  const todas = r.series.every((x) => x.hecho);
  const ultTxt = ref ? `<div class="ultima"><b>Última vez${mismaFase ? ` en la semana ${s.semana}` : ` (semana ${ref.semana})`}:</b> ${ref.series.map((x) => serieTxt(e.id, x)).join(" · ")}${ref.dif ? ` <span class="dif ${ref.dif}">${DIF[ref.dif]}</span>` : ""}<br><span class="suave">${esc(r.ajuste || consejo(ref, e.id))}</span></div>` : "";
  const enTxt = consejoEnergia(s, "fuerza");
  const ultimo = i === n - 1;
  const restante = estimarRestante(s, p);
  return `<header class="wbar"><button class="x" data-act="salir" aria-label="Salir">✕</button><div class="wt"><b>${esc(p.subtitulo)}</b><span>${fase(s.semana).nombre}${s.energia ? " · " + ENERGIA[s.energia].split(" ")[0] : ""}</span></div><div class="reloj"><b data-reloj>${s.inicio ? mmss((Date.now() - s.inicio) / 1000) : "0:00"}</b><span>≈ ${Math.round(restante / 60)} min rest.</span></div></header>
    <div class="dots">${dots}</div>
    <section class="card ejcard">
      <div class="bigfig" data-fig="${e.id}"></div>
      <div class="etq">Ejercicio ${i + 1} de ${n} · ${esc(e.zona)}</div>
      <h2>${esc(e.nombre)}</h2>
      ${e.detalle ? `<p class="detalle">${esc(e.detalle)}</p>` : ""}${e.nota ? `<p class="intro">${esc(e.nota)}</p>` : ""}
      <div class="pauta"><div><b>${p.vol.series}</b><span>series</span></div><div><b>${p.vol.reps}</b><span>${e.doble === "pierna" ? "reps por pierna" : e.doble === "brazo" ? "reps (2 brazos)" : "reps"}</span></div><div><b>${p.vol.descansoTxt || p.vol.descanso + " s"}</b><span>descanso</span></div></div>
      ${r.averia ? "" : ultTxt}${enTxt && !r.averia ? `<p class="nota">${esc(enTxt)}</p>` : ""}
      ${avisoAveria(base, r)}
    </section>
    ${r.averia ? `<section class="card averia-ok"><h3>⚠️ Ejercicio saltado</h3><p class="suave">La máquina estaba estropeada. No cuenta para tus pesos ni tus récords.</p><button class="mini" data-act="averiaDeshacer">Deshacer</button></section>` : `<section class="card series">`}${r.averia ? "" : sinPeso ? `<p class="nota">Sin cargar peso: deja 0 discos (solo el peso propio de la máquina).</p>` : tp === "discos" ? `<p class="nota">Apunta los kg de discos que añades; la máquina ya tiene su propio peso.</p>` : tp === "placas" ? `<p class="nota">Apunta el número de placa.</p>` : ""}${r.averia ? "" : `${filas}${esMaquina(base.id) && !r.sust ? `<button class="averia-btn" data-act="averia">⚠️ Máquina estropeada</button>` : ""}${r.sust ? `<button class="averia-btn" data-act="averiaDeshacer">↩︎ Volver a ${esc(base.nombre)}</button>` : ""}</section>`}
    <section class="card difsel ${todas ? "" : "apagado"}" ${r.averia ? "hidden" : ""}><h3>¿Cómo te ha resultado?</h3><div class="difs">${Object.entries(DIF).map(([k, t]) => `<button class="dif ${k} ${r.dif === k ? "on" : ""}" data-act="dif" data-v="${k}">${t}</button>`).join("")}</div></section>
    <footer class="wfoot">
      <button class="btn sec" data-act="irEj" data-i="${i - 1}" ${i === 0 ? "disabled" : ""}>‹ Anterior</button>
      ${ultimo ? `<button class="btn" data-act="terminar">Terminar entreno</button>` : `<button class="btn" data-act="irEj" data-i="${i + 1}">Siguiente ›</button>`}
    </footer>
    ${s.fin ? resumenFuerza(s, p) : ""}
    <div id="descanso" class="descanso" hidden></div>
    <div id="hoja" class="hoja" hidden></div>`;
}
// Valores posibles de peso para el selector rápido
function valoresPeso(id, actual) {
  const t = tipoPeso(id);
  let v;
  if (t === "mancuerna") v = MANC.slice(0, 14);
  else if (t === "discos") { const st = EJ[id]?.paso || 2.5, max = st >= 20 ? 300 : st >= 5 ? 120 : 60; v = []; for (let x = 0; x <= max + 1e-9; x += st) v.push(Math.round(x * 10) / 10); }
  else v = Array.from({ length: 21 }, (_, i) => i);
  if (actual && !v.some((x) => Math.abs(x - actual) < 1e-9)) v = [...v, actual].sort((a, b) => a - b);
  return v;
}
function abrirHoja(id, k, actual) {
  const h = document.getElementById("hoja"); if (!h) return;
  const t = tipoPeso(id);
  const tit = t === "placas" ? "Elige la placa" : t === "discos" ? "Kg de discos que añades" : "Elige el peso de la mancuerna";
  h.innerHTML = `<div class="hcont"><div class="hcab"><b>${tit}</b><small>Serie ${k + 1}</small><button class="mini" data-act="hojaCerrar">Cerrar</button></div>
    <div class="hgrid">${valoresPeso(id, actual).map((v) => `<button class="hv ${Math.abs(v - actual) < 1e-9 ? "on" : ""}" data-act="pesoSet" data-k="${k}" data-v="${v}">${t === "discos" && !v ? "Solo máq." : t === "placas" && !v ? "Sin placa" : fmtKg(v)}</button>`).join("")}</div>
    <div class="hotro"><input id="pesoOtro" inputmode="decimal" placeholder="Otro valor"><button class="mini prim" data-act="pesoOtro" data-k="${k}">Usar</button></div></div>`;
  h.hidden = false;
  h.querySelector(".hv.on")?.scrollIntoView({ block: "center" });
}
// --- Máquina estropeada ---
const ALTERNATIVAS = {
  abductores: ["hipThrust"], aductores: ["sumo"], prensa: ["goblet"], hack: ["goblet"], extCuad: ["goblet"], curlFemoral: ["rumano"],
  pressMaqPlano: ["pressMancPlano"], pressMaqInc: ["pressMancInc"],
  curlPolea: ["curlSimul", "curlAlterno"],
  jalonNuca: ["remoCorta", "remoLarga", "cubana"], jalonMedia: ["remoCorta", "remoLarga", "cubana"], jalonCorta: ["remoCorta", "remoLarga", "cubana"], chestPull: ["remoCorta", "remoLarga", "cubana"],
  remoCorta: ["jalonMedia", "chestPull", "cubana"], remoLarga: ["jalonMedia", "chestPull", "cubana"],
  facePull: ["aperturaAlterna", "cubana"], crucesInv: ["aperturaAlterna", "cubana"],
  tricepsCuerda: ["fondosBanco"], tricepsBarra: ["fondosBanco"],
};
const esMaquina = (id) => !!ALTERNATIVAS[id];
function avisoAveria(base, r) {
  const f = db.averias()[base.id];
  if (!f || r.sust || r.averia || r.series.some((x) => x.hecho)) return "";
  return `<div class="aviso-av">⚠️ El ${fc(f)} esta máquina estaba estropeada. ¿Ya funciona?
    <div class="difs"><button class="mini prim" data-act="averiaArreglada">Sí, ya funciona</button><button class="mini" data-act="averia">No</button></div></div>`;
}
function abrirAveria(base) {
  const h = document.getElementById("hoja"); if (!h) return;
  h.innerHTML = `<div class="hcont"><div class="hcab"><b>⚠️ ${esc(base.nombre)}</b><button class="mini" data-act="hojaCerrar">Cerrar</button></div>
    <p class="suave chico">¿Qué hacemos con este ejercicio?</p>
    <div class="altlista">${ALTERNATIVAS[base.id].map((a) => `<button class="altrow" data-act="averiaSust" data-v="${a}"><div class="thumb">${svgEstatico(a)}</div><div><b>Sustituir por ${esc(EJ[a].nombre)}</b><span>${esc(EJ[a].equipo)}</span></div></button>`).join("")}
    <button class="altrow salta" data-act="averiaSalta"><div class="thumb ic">⏭</div><div><b>Saltar este ejercicio</b><span>Pasas al siguiente; no cuenta para pesos ni récords</span></div></button></div></div>`;
  h.hidden = false;
}
function estimarRestante(s, p) {
  let t = 0;
  p.ejercicios.forEach((e, k) => {
    if (s.ej[k]?.averia) return;
    const pend = (s.ej[k]?.series || []).filter((x) => x && x.hecho).length;
    const quedan = p.vol.series - pend;
    if (quedan > 0) t += quedan * segSerie(e) + Math.max(0, quedan - 1) * p.vol.descanso + (k > (s.idx ?? 0) ? db.st().ajustes.cambioEj : 0);
  });
  return t;
}
function avisoCopia(s) {
  if (db.diaISO(db.parse(s.fecha)) !== 5 || db.st().ajustes.ultimaCopia === db.hoy()) return "";
  return `<div class="copia"><b>💾 Es viernes: toca copia de seguridad</b><span>Guárdala en Archivos o iCloud para no perder tus registros.</span><button class="btn" data-act="exportar">Exportar copia</button></div>`;
}
function resumenFuerza(s, p) {
  const dur = Math.round((s.fin - (s.inicio || s.fin)) / 60000);
  const filas = p.ejercicios.map((e, k) => {
    const r = s.ej[k] || { series: [] };
    if (r.averia) return `<li><b>${esc(e.nombre)}</b><span>⚠️ máquina estropeada · saltado</span></li>`;
    const id = r.sust || e.id, ok = (r.series || []).filter((x) => x.hecho);
    return `<li><b>${esc(r.sust ? EJ[r.sust].nombre : e.nombre)}</b>${r.sust ? `<span>⚠️ en lugar de ${esc(e.nombre)}</span>` : ""}<span>${ok.length ? ok.map((x) => serieTxt(id, x)).join(" · ") : "sin registrar"}</span>${r.dif ? `<span class="dif ${r.dif}">${DIF[r.dif]}</span>` : ""}</li>`;
  }).join("");
  return `<section class="card resumen"><h3>✓ Entreno completado · ${dur} min</h3><ul class="lista compacta">${filas}</ul><p class="nota">Puedes corregir cualquier dato tocando el número del ejercicio arriba.</p>${avisoCopia(s)}<a class="btn" href="#/hoy">Volver a Hoy</a><button class="btn borrar" data-act="borrarSes" data-f="${s.fecha}">🗑 Eliminar este entreno</button></section>`;
}

// --- Cardio libre ---
const f1c = (n) => (+n).toFixed(1).replace(".", ",");
function cardioTiempos(p) { let acc = 0; return p.bloques.map((b) => { const ini = acc; acc += b.min * 60; return { ...b, ini, fin: acc }; }); }
function cardioReal(c) { if (!c?.inicio) return 0; const ahora = c.pausa || Date.now(); return (ahora - c.inicio - (c.pausado || 0)) / 1000; }
function cardioTrans(c) { if (!c?.inicio) return 0; const ahora = c.pausa || Date.now(); return (ahora - c.inicio - (c.pausado || 0)) / 1000 + (c.salto || 0); }
const faseDe = (bl, t) => bl.find((b) => t < b.fin) || bl[bl.length - 1];
// Minutos por combinación de velocidad e inclinación en el bloque principal
function combosCardio(c, p) {
  const bl = cardioTiempos(p), pri = bl[1], tr = c?.tramos || [];
  if (!tr.length) return [];
  const tPri = c.corte != null ? c.corte : Math.min(pri.min * 60, Math.max(0, Math.min(cardioTrans(c), bl[2].fin) - pri.ini));
  const m = new Map();
  tr.forEach((x, i) => { const hasta = i < tr.length - 1 ? tr[i + 1].desde : tPri; const k = `${x.vel}|${x.inc}`; m.set(k, (m.get(k) || 0) + Math.max(0, hasta - x.desde)); });
  return [...m.entries()].map(([k, sg]) => { const [v, i] = k.split("|"); return { vel: +v, inc: +i, s: sg }; }).filter((x) => x.s >= 1);
}
const minTxt = (sg) => (sg >= 60 ? `${Math.round(sg / 60)} min` : `${Math.round(sg)} s`);
function textoCardio(c, p) { return combosCardio(c, p).map((x) => `${minTxt(x.s)} a ${f1c(x.vel)} km/h · ${x.inc} %`).join(" · "); }

function vCardio(s, p) {
  const bl = cardioTiempos(p), total = bl[2].fin, c = s.cardio || {};
  const t = Math.min(total, cardioTrans(c)), fa = faseDe(bl, t), pri = bl[1];
  const vel = c.vel ?? 5.0, inc = c.inc ?? 5;
  const enPri = c.inicio && !c.hecho && fa.id === "pri";
  const priAcabado = c.inicio && (c.hecho || t >= pri.fin);
  const incFig = !c.inicio || fa.id === "cal" ? CARDIO_LIBRE.cal.inc : fa.id === "enf" ? CARDIO_LIBRE.enf.inc : inc;
  const tPri = c.corte != null ? c.corte : Math.max(0, Math.min(pri.min * 60, t - pri.ini));
  const tramos = (c.tramos || []).map((x, i, arr) => {
    const hasta = i < arr.length - 1 ? arr[i + 1].desde : tPri, actual = i === arr.length - 1 && enPri;
    return `<li class="${actual ? "actual" : ""}"><i>Tramo ${i + 1}<br>min ${mmss(x.desde)}</i><span>${f1c(x.vel)} km/h · ${x.inc} %</span><em ${actual ? "data-tdur" : ""}>${mmss(hasta - x.desde)}</em></li>`;
  }).join("");
  const sel = (id, val, uni) => `<div class="csel"><button data-act="cMas" data-t="${id}" data-d="-1">−</button><button class="val" data-act="cHoja" data-t="${id}">${val}<small> ${uni}</small></button><button data-act="cMas" data-t="${id}" data-d="1">+</button></div>`;
  const fijo = (F, txt) => `<div class="fijo"><div><b>${f1c(F.vel)}</b><span>km/h</span></div><div><b>${F.inc} %</b><span>inclinación</span></div></div><p class="nota centro">${txt}</p>`;
  const ctrl = c.hecho ? "" : !c.inicio ? `<button class="btn" data-act="cGo">Empezar</button>`
    : `<button class="btn sec" data-act="cPausa">${c.pausa ? "Reanudar" : "Pausa"}</button><button class="btn sec" data-act="cSalta">Saltar fase ›</button>`;
  const combos = combosCardio(c, p);
  const resumen = c.hecho ? `<section class="card difsel"><h3>${c.dif ? "✓ Cardio completado" : "¡Hecho! ¿Cómo te ha resultado?"}</h3>
      <ul class="lista compacta resum"><li><span>Calentamiento</span><b>${CARDIO_LIBRE.cal.min} min · ${f1c(CARDIO_LIBRE.cal.vel)} km/h · ${CARDIO_LIBRE.cal.inc} %</b></li>
      ${combos.length ? combos.map((x) => `<li><span>Bloque principal</span><b>${minTxt(x.s)} · ${f1c(x.vel)} km/h · ${x.inc} %</b></li>`).join("") : `<li><span>Bloque principal</span><b>sin datos</b></li>`}
      ${c.corte != null && c.corte < pri.min * 60 - 1 ? `<li><span>✂︎ Bloque cortado</span><b>en el min ${mmss(c.corte)} de ${pri.min}</b></li>` : ""}
      <li><span>Enfriamiento</span><b>${CARDIO_LIBRE.enf.min} min · ${f1c(CARDIO_LIBRE.enf.vel)} km/h · ${CARDIO_LIBRE.enf.inc} %</b></li></ul>
      <div class="difs">${Object.entries(DIF).map(([k, tx]) => `<button class="dif ${k} ${c.dif === k ? "on" : ""}" data-act="cDif" data-v="${k}">${tx}</button>`).join("")}</div>
      ${c.dif ? `${avisoCopia(s)}<a class="btn" href="#/hoy">Volver a Hoy</a>` : ""}<button class="btn borrar" data-act="borrarSes" data-f="${s.fecha}">🗑 Eliminar este entreno</button></section>` : "";
  return `<header class="wbar"><button class="x" data-act="salir" aria-label="Salir">✕</button><div class="wt"><b>${esc(p.titulo)} · ${Math.round(total / 60)} min</b><span>${fase(s.semana).nombre}</span></div><div class="reloj"><b data-ctot>${mmss(t)}</b><span>de ${mmss(total)}</span></div></header>
    ${resumen}
    ${consejoEnergia(s, "cardio") && !c.hecho ? `<p class="nota energia-nota">${esc(consejoEnergia(s, "cardio"))}</p>` : ""}
    <section class="card cardiocard">
      <div class="bigfig" data-fig="cinta" style="--inc:${incFig}"></div>
      <div class="fases">${bl.map((f) => `<div style="flex:${Math.max(f.min, 9)}" class="${f.id === fa.id && c.inicio && !c.hecho ? "on" : ""} ${c.inicio && t >= f.fin ? "ok" : ""}"><b>${f.id === "cal" ? "Calentar" : f.id === "enf" ? "Enfriar" : "Bloque principal"}</b><span>${f.min} min</span><u data-fu="${f.id}" style="width:${c.inicio ? Math.min(100, Math.max(0, ((t - f.ini) / (f.fin - f.ini)) * 100)) : 0}%"></u></div>`).join("")}</div>
      ${c.hecho ? `<p class="etq centro">Completado</p>` : `<div class="etq centro">${c.inicio ? fa.tipo : "Preparada"}</div><div class="cuenta" data-ccuenta>${mmss(c.inicio ? fa.fin - t : bl[0].fin)}</div>`}
      ${!c.hecho && (!c.inicio || fa.id === "cal") ? fijo(CARDIO_LIBRE.cal, "Calentamiento fijo: 2 min a 4,0 km/h y 2 %") : ""}
      ${!c.hecho && c.inicio && fa.id === "enf" ? fijo(CARDIO_LIBRE.enf, "Enfriamiento fijo: 2 min a 3,0 km/h y 0 %") : ""}
      <div class="wfoot dentro">${ctrl}</div>
    </section>
    <section class="card bloque ${enPri ? "activo" : ""}">
      <h3>Bloque principal · ${pri.min} min</h3>
      <p class="suave chico">${enPri ? "Elige lo que estás haciendo ahora en la cinta." : priAcabado ? "Bloque terminado." : "Puedes dejarlo elegido antes de que empiece."}</p>
      ${priAcabado ? "" : `<div class="selrow"><span>Velocidad</span>${sel("vel", f1c(vel), "km/h")}</div><div class="selrow"><span>Inclinación</span>${sel("inc", inc, "%")}</div>`}
      ${tramos ? `<ul class="tramos">${tramos}</ul>` : ""}
    </section>
    ${c.hecho ? "" : `<button class="btn nuevos" data-act="cNuevos" ${enPri ? "" : "disabled"}>＋ Nuevos parámetros</button>
    <p class="nota centro" data-tpri>${enPri ? `Marca el minuto ${mmss(tPri)} del bloque y empieza un tramo nuevo.` : "Se activa durante el bloque principal."}</p>
    <button class="btn cortar" data-act="cCortar" ${enPri ? "" : "disabled"}>✂︎ Cortar</button>
    <p class="nota centro">Termina el bloque principal ahora y pasa directamente al enfriamiento.</p>`}
    <section class="card"><h3>Enfriamiento · ${CARDIO_LIBRE.enf.min} min</h3><p class="suave chico">Fijo: 3,0 km/h y 0 %</p>
    ${c.inicio && !c.hecho ? `<button class="mini" data-act="cFin">Terminar ya</button>` : ""}</section>
    <div id="hoja" class="hoja" hidden></div>`;
}
function abrirHojaCardio(tipo, s) {
  const h = document.getElementById("hoja"); if (!h) return;
  const R = CARDIO_LIBRE[tipo], vals = [];
  for (let x = R.min; x <= R.max + 1e-9; x += R.paso) vals.push(Math.round(x * 10) / 10);
  const actual = s.cardio?.[tipo] ?? (tipo === "vel" ? 5.0 : 5);
  h.innerHTML = `<div class="hcont"><div class="hcab"><b>${tipo === "vel" ? "Velocidad (km/h)" : "Inclinación (%)"}</b><button class="mini" data-act="hojaCerrar">Cerrar</button></div>
    <div class="hgrid">${vals.map((v) => `<button class="hv ${Math.abs(v - actual) < 1e-9 ? "on" : ""}" data-act="cPon" data-t="${tipo}" data-v="${v}">${tipo === "vel" ? f1c(v) : v}</button>`).join("")}</div></div>`;
  h.hidden = false; h.querySelector(".hv.on")?.scrollIntoView({ block: "center" });
}
// Cambiar velocidad/inclinación corrige el tramo en curso; "Nuevos parámetros" abre uno nuevo.
function ponCardio(s, p, tipo, v) {
  const R = CARDIO_LIBRE[tipo];
  s.cardio = s.cardio || {};
  s.cardio[tipo] = Math.min(R.max, Math.max(R.min, Math.round(v * 10) / 10));
  const c = s.cardio, bl = cardioTiempos(p), t = cardioTrans(c);
  if (c.inicio && !c.hecho && faseDe(bl, t).id === "pri" && c.tramos?.length) { const tr = c.tramos[c.tramos.length - 1]; tr.vel = c.vel ?? 5.0; tr.inc = c.inc ?? 5; }
  db.guardar(); render();
}

// ---------- Montaje, temporizadores y eventos ----------
let reloj = 0;
function montar(r, a) {
  document.querySelectorAll("[data-fig]").forEach((el) => animar(el, el.dataset.fig));
  clearInterval(reloj);
  if (r === "entreno") { reloj = setInterval(() => tickEntreno(a), 250); tickEntreno(a); }
  if (r === "ajustes") {
    document.getElementById("cambioEj")?.addEventListener("change", (ev) => { db.st().ajustes.cambioEj = +ev.target.value; db.guardar(); });
    document.getElementById("sonido")?.addEventListener("change", (ev) => { db.st().ajustes.sonido = ev.target.checked; db.guardar(); });
    document.getElementById("imp")?.addEventListener("change", async (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      try { db.importar(await f.text()); toast("Copia importada"); render(); } catch (e) { toast(e.message || "No se pudo importar"); }
    });
  }
}

let ultimoBloque = -1, ultimoAviso = -1, aviso10 = -1, faseCardio = "";
function tickEntreno(fecha) {
  const { ses: s, plan: p } = planDe(fecha);
  if (!s) return;
  const rel = document.querySelector("[data-reloj]");
  if (rel && s.inicio && !s.fin) rel.textContent = mmss((Date.now() - s.inicio) / 1000);
  if (p.tipo === "fuerza") return tickDescanso(s, p);
  // cardio
  const bl = cardioTiempos(p), total = bl[2].fin, c = s.cardio || {};
  const t = Math.min(total, cardioTrans(c)), fa = faseDe(bl, t);
  const q = (sel) => document.querySelector(sel);
  if (q("[data-ctot]")) q("[data-ctot]").textContent = mmss(t);
  if (!c.inicio || c.hecho) return;
  if (q("[data-ccuenta]")) q("[data-ccuenta]").textContent = mmss(fa.fin - t);
  for (const f of bl) { const u = q(`[data-fu="${f.id}"]`); if (u) u.style.width = Math.min(100, Math.max(0, ((t - f.ini) / (f.fin - f.ini)) * 100)) + "%"; }
  if (fa.id === "pri") {
    const tPri = t - bl[1].ini, tr = c.tramos?.[c.tramos.length - 1];
    if (tr && q("[data-tdur]")) q("[data-tdur]").textContent = mmss(tPri - tr.desde);
    if (q("[data-tpri]")) q("[data-tpri]").textContent = `Marca el minuto ${mmss(tPri)} del bloque y empieza un tramo nuevo.`;
  }
  if (c.pausa) return;
  // Al entrar en el bloque principal se abre el primer tramo con lo que tengas elegido
  if (fa.id === "pri" && !c.tramos?.length) { c.tramos = [{ desde: 0, vel: c.vel ?? 5.0, inc: c.inc ?? 5 }]; db.guardar(); }
  // Pitidos en los últimos 4 s del calentamiento y del bloque principal; al acabarlos, pitido final + destello
  const resto = Math.ceil(fa.fin - t);
  if ((fa.id === "cal" || fa.id === "pri") && resto <= 4 && resto > 0 && ultimoAviso !== fa.id + resto) { ultimoAviso = fa.id + resto; bipCuenta(); }
  if (faseCardio && fa.id !== faseCardio) {
    if (faseCardio === "cal" || faseCardio === "pri") { pitidoFin(); destello(); }
    faseCardio = fa.id; render(); return;
  }
  faseCardio = fa.id;
  if (t >= total) { c.hecho = true; c.pausa = Date.now(); c.minutos = Math.round(cardioReal(c) / 60); s.cardio = c; db.guardar(); mantenerPantalla(false); render(); }
}

function tickDescanso(s, p) {
  const box = document.getElementById("descanso");
  if (!box) return;
  const d = s.descanso;
  const ocultar = () => { box.hidden = true; document.body.classList.remove("con-descanso"); };
  if (!d) return ocultar();
  const resta = (d.fin - Date.now()) / 1000;
  if (resta <= 0) { s.descanso = null; db.guardar(); ocultar(); pitidoFin(); destello(); return; }
  const seg = Math.ceil(resta);
  if (seg <= 4 && ultimoAviso !== seg) { ultimoAviso = seg; bipCuenta(); }
  // Barra de descanso abajo: no tapa el ejercicio, así puedes ir ajustando el peso de la siguiente serie.
  if (box.hidden || box.dataset.id !== String(d.fin0)) {
    box.dataset.id = d.fin0;
    box.innerHTML = `<div class="anillo"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="fondo"/><circle cx="60" cy="60" r="50" class="prog" data-anillo/></svg><b data-dcuenta></b></div>
      <div class="dtxt"><div class="etq">${d.tipo === "cambio" ? "Cambio de ejercicio" : "Descanso"}</div><b data-dsig></b></div>
      <div class="dbtns"><button class="mini" data-act="dMas" data-d="-15">−15</button><button class="mini" data-act="dMas" data-d="15">+15</button><button class="mini fuerte" data-act="dSalta">Saltar</button></div>`;
    box.hidden = false;
    document.body.classList.add("con-descanso");
  }
  const r = s.ej[s.idx ?? 0];
  const k = r ? r.series.findIndex((x) => !x.hecho) : -1;
  const sigEj = p.ejercicios[s.idx ?? 0];
  box.querySelector("[data-dsig]").textContent = d.tipo === "cambio" ? `Siguiente: ${sigEj.nombre}`
    : k >= 0 ? `Siguiente: serie ${k + 1} de ${p.vol.series}${tipoPeso(r.id) !== "corporal" ? " · " + txtPeso(r.id, r.series[k].kg) : ""}` : "Última serie hecha";
  box.querySelector("[data-dcuenta]").textContent = mmss(resta);
  const C = 2 * Math.PI * 50, an = box.querySelector("[data-anillo]");
  an.style.strokeDasharray = C; an.style.strokeDashoffset = C * (1 - Math.min(1, resta / (d.total || 1)));
}
function destello() { document.body.classList.remove("flash"); void document.body.offsetWidth; document.body.classList.add("flash"); }
// Si el entreno de hoy aún no se ha empezado, se vuelve a crear con la fase actualizada
function limpiaHoy() {
  const f = db.hoy(), s = db.sesion(f);
  if (s && estadoSesion(s) === "pend" && !Object.values(s.ej || {}).some((r) => r.series?.some((x) => x.hecho))) db.borrarSesion(f);
}
function toastAccion(t, etiqueta, fn, ms = 5500) {
  document.querySelectorAll(".toast").forEach((x) => x.remove());
  const d = document.createElement("div"); d.className = "toast accion";
  d.innerHTML = `<span>${esc(t)}</span><button>${esc(etiqueta)}</button>`;
  d.querySelector("button").addEventListener("click", () => { d.remove(); fn(); });
  document.body.append(d); setTimeout(() => d.remove(), ms);
}
function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 2600); }
function empezarDescanso(s, seg, tipo) { const fin = Date.now() + seg * 1000; s.descanso = { fin, fin0: fin, total: seg, tipo }; ultimoAviso = -1; db.guardar(); }

// Delegación de eventos
$app.addEventListener("click", async (ev) => {
  if (ev.target.id === "hoja") { ev.target.hidden = true; return; }
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  const { a: fecha } = ruta();
  if (act === "audio") { audioOn(); return; }
  audioOn();
  const S = db.st();
  const ctxE = () => planDe(fecha);

  switch (act) {
    case "regla": {
      if (!confirm("¿Registrar hoy como primer día de la regla? Desde hoy, fase menstrual.")) return;
      const previa = db.reglas().map((r) => r.inicio).filter((x) => x < db.hoy()).pop();
      db.registrarRegla(); limpiaHoy(); toast("Regla registrada · fase menstrual");
      if (previa) ir(`#/ciclo/${previa}`); else render(); return;
    }
    case "addRegla": {
      const v = document.getElementById("fRegla").value, d = Math.round(num(document.getElementById("dRegla").value));
      if (!v) return;
      db.registrarRegla(v); if (d > 0) db.ponDuracion(v, d); limpiaHoy(); toast("Regla añadida"); render(); return;
    }
    case "durRegla": { const r = db.reglas().find((x) => x.inicio === el.dataset.f); const cur = r?.fin ? db.diasEntre(r.inicio, r.fin) + 1 : db.duracionHabitual(); db.ponDuracion(el.dataset.f, Math.max(1, Math.min(12, cur + +el.dataset.d))); render(); return; }
    case "sangra": { db.respondeSangrado(db.hoy(), el.dataset.v === "si"); limpiaHoy(); render(); return; }
    case "decideFase": { db.decideFase(el.dataset.m, +el.dataset.n); limpiaHoy(); toast(+el.dataset.n === 1 ? "Esta semana: fase menstrual" : "Esta semana: fase folicular"); render(); return; }
    case "caminata": abrirCaminata(); return;
    case "hojaCerrar": { const h = document.getElementById("hoja"); if (h) h.hidden = true; return; }
    case "guardaCaminata": {
      const fe = document.getElementById("cwF").value || db.hoy(), km = num(document.getElementById("cwKm").value), mn = Math.round(num(document.getElementById("cwMin").value));
      if (!(km > 0) || !(mn > 0)) { toast("Pon los km y los minutos"); return; }
      db.addExtra({ fecha: fe, tipo: "caminata", km: Math.round(km * 100) / 100, min: mn, fase: db.infoFase(fe).fase });
      document.getElementById("hoja").hidden = true; toast("Caminata guardada"); render(); return;
    }
    case "borrarExtra": {
      const id = el.dataset.id; if (!confirm("¿Eliminar esta caminata?")) return;
      const x = db.borrarExtra(id); render();
      toastAccion("Caminata eliminada", "Deshacer", () => { db.restaurarExtra(id, x); render(); }); return;
    }
    case "borraRegla": if (confirm("¿Borrar esta regla del historial?")) { db.borrarRegla(el.dataset.f); limpiaHoy(); render(); } return;
    case "manual": { db.forzarSemana(db.infoSemana().lunes, +el.dataset.n); limpiaHoy(); render(); return; }
    case "probar": pitidoFin(); destello(); return;
    case "simDia": { try { localStorage.setItem("prueba-hoy", db.sumaDias(db.hoy(), 1)); } catch {} location.reload(); return; }
    case "simReset": { if (!confirm("¿Borrar todos los datos de la prueba y volver a hoy?")) return; try { localStorage.removeItem(window.APP_KEY); localStorage.removeItem("prueba-hoy"); } catch {} location.reload(); return; }
    case "actualizar": {
      toast("Buscando actualización…");
      try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch {}
      setTimeout(() => location.reload(), 1200); return;
    }
    case "exportar": return exportarCopia();
    case "borrarTodo": if (confirm("Se borrarán todos tus registros de este iPhone. ¿Seguro?") && confirm("¿De verdad? No se puede deshacer.")) { db.borrarTodo(); render(); } return;
    case "cambiaDia": {
      const f = db.hoy(); const info = db.infoSemana(f);
      db.borrarSesion(f); db.crearSesion(f, +el.dataset.d, info.semana); ir(`#/entreno/${f}`); return;
    }
    case "salir": mantenerPantalla(false); ir("#/hoy"); return;
    case "borrarSes": {
      const f = el.dataset.f, ses = db.sesion(f); if (!ses) return;
      const p = sesionDe(ses.dia, ses.semana);
      if (!confirm(`¿Eliminar el entreno ${p.titulo} del ${NOMBRE_DIA[db.diaISO(db.parse(f))].toLowerCase()} ${db.fechaCorta(f)} (${fase(ses.semana).nombre.toLowerCase()})?\n\nSe borrarán sus pesos y valoraciones. El resto de tus entrenos no cambia.`)) return;
      const copia = structuredClone(ses);
      db.borrarSesion(f);
      if (ruta().r === "entreno") ir("#/progreso"); else render();
      toastAccion("Entreno eliminado", "Deshacer", () => { db.st().sesiones[f] = copia; db.guardar(); render(); toast("Entreno recuperado"); });
      return;
    }
    case "energia": { const { ses } = planDe(fecha); if (ses) { ses.energia = el.dataset.v; db.guardar(); render(); } return; }
  }

  const { ses: s, plan: p } = ctxE();
  if (!s) return;
  const i = s.idx ?? 0;
  const r = s.ej[i];
  switch (act) {
    case "irEj": { const k = +el.dataset.i; if (k < 0 || k >= p.ejercicios.length) return; s.idx = k; s.descanso = null; db.guardar(); render(); return; }
    case "kg": case "reps": {
      const k = +el.dataset.k, d = +el.dataset.d, x = r.series[k];
      if (act === "kg") x.kg = pasoPeso(r.id, x.kg, d);
      else x.reps = Math.max(0, (+x.reps || 0) + d);
      // propaga el peso a las series siguientes sin hacer
      if (act === "kg") for (let j = k + 1; j < r.series.length; j++) if (!r.series[j].hecho) r.series[j].kg = x.kg;
      db.guardar(); refrescaSeries(r); return;
    }
    case "serie": {
      const k = +el.dataset.k, x = r.series[k];
      x.hecho = !x.hecho;
      if (!s.inicio) s.inicio = Date.now();
      mantenerPantalla(true);
      const quedan = r.series.some((y) => !y.hecho);
      if (x.hecho && quedan) empezarDescanso(s, p.vol.descanso, "serie");
      db.guardar(); refrescaSeries(r); tickDescanso(s, p);
      const sig = r.series.findIndex((y) => !y.hecho);
      if (x.hecho && sig >= 0) document.querySelector(`.serie[data-k="${sig}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (!quedan) document.querySelector(".difsel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    case "dif": {
      r.dif = el.dataset.v; if (!s.inicio) s.inicio = Date.now();
      if (i < p.ejercicios.length - 1 && !s.fin) { s.idx = i + 1; empezarDescanso(s, S.ajustes.cambioEj, "cambio"); }
      db.guardar(); render(); return;
    }
    case "terminar": {
      const faltan = p.ejercicios.some((_, k) => !s.ej[k]?.dif && !s.ej[k]?.averia);
      if (faltan && !confirm("Hay ejercicios sin marcar cómo te han ido. ¿Terminar igualmente?")) return;
      s.fin = Date.now(); s.inicio = s.inicio || s.fin; s.descanso = null; db.guardar(); mantenerPantalla(false); render();
      document.querySelector(".resumen")?.scrollIntoView({ behavior: "smooth" }); return;
    }
    case "dMas": if (s.descanso) { s.descanso.fin += +el.dataset.d * 1000; s.descanso.total = Math.max(1, s.descanso.total + +el.dataset.d); db.guardar(); } return;
    case "pesoSel": { const k = +el.dataset.k; abrirHoja(r.id, k, +r.series[k].kg || 0); return; }
    case "hojaCerrar": document.getElementById("hoja").hidden = true; return;
    case "pesoSet": case "pesoOtro": {
      const k = +el.dataset.k;
      const v = act === "pesoSet" ? +el.dataset.v : num(document.getElementById("pesoOtro").value);
      if (act === "pesoOtro" && !(v >= 0)) return;
      r.series[k].kg = v;
      for (let j = k + 1; j < r.series.length; j++) if (!r.series[j].hecho) r.series[j].kg = v;
      document.getElementById("hoja").hidden = true;
      db.guardar(); refrescaSeries(r); tickDescanso(s, p); return;
    }
    case "averia": abrirAveria(p.ejercicios[i]); return;
    case "averiaArreglada": db.quitaAveria(p.ejercicios[i].id); toast("Anotado: la máquina ya funciona"); render(); return;
    case "averiaSust": {
      const b0 = p.ejercicios[i]; db.marcaAveria(b0.id, s.fecha);
      Object.assign(r, { sust: el.dataset.v, id: el.dataset.v, series: [], dif: null, averia: false, ajuste: "" });
      document.getElementById("hoja").hidden = true; db.guardar(); render(); toast("Sustituido por " + EJ[el.dataset.v].nombre); return;
    }
    case "averiaSalta": {
      const b0 = p.ejercicios[i]; db.marcaAveria(b0.id, s.fecha);
      Object.assign(r, { averia: true, sust: null, id: b0.id, series: [], dif: null });
      if (!s.inicio) s.inicio = Date.now();
      document.getElementById("hoja").hidden = true;
      if (i < p.ejercicios.length - 1) s.idx = i + 1;
      db.guardar(); render(); toast("Ejercicio saltado por avería"); return;
    }
    case "averiaDeshacer": { const b0 = p.ejercicios[i]; Object.assign(r, { averia: false, sust: null, id: b0.id, series: [], dif: null }); db.guardar(); render(); return; }
    case "dSalta": s.descanso = null; db.guardar(); tickDescanso(s, p); return;
    // cardio
    case "cGo": {
      const prev = s.cardio || {};
      s.cardio = { inicio: Date.now(), pausado: 0, pausa: null, salto: 0, vel: prev.vel ?? 5.0, inc: prev.inc ?? 5, tramos: [] };
      faseCardio = "cal"; ultimoAviso = -1; db.guardar(); mantenerPantalla(true); render(); return;
    }
    case "cPausa": {
      const c = s.cardio; if (c.pausa) { c.pausado += Date.now() - c.pausa; c.pausa = null; mantenerPantalla(true); } else c.pausa = Date.now();
      db.guardar(); render(); return;
    }
    case "cCortar": {
      const bl = cardioTiempos(p), t = cardioTrans(s.cardio), f = faseDe(bl, t);
      if (f.id !== "pri") return;
      const min = t - bl[1].ini;
      if (!confirm(`¿Cortar el bloque principal en el minuto ${mmss(min)} y pasar al enfriamiento?`)) return;
      s.cardio.corte = min;
      s.cardio.salto = (s.cardio.salto || 0) + (bl[1].fin - t) + 0.05;
      db.guardar(); return; // el reloj detecta el cambio de fase: pitido final, destello y enfriamiento
    }
    case "cSalta": {
      const bl = cardioTiempos(p), t = cardioTrans(s.cardio), f = faseDe(bl, t);
      if (f.id === "pri") s.cardio.corte = t - bl[1].ini;
      s.cardio.salto = (s.cardio.salto || 0) + (f.fin - t) + 0.05; db.guardar(); return;
    }
    case "cMas": { const tp = el.dataset.t, R = CARDIO_LIBRE[tp], act = s.cardio?.[tp] ?? (tp === "vel" ? 5.0 : 5); ponCardio(s, p, tp, act + (+el.dataset.d) * R.paso); return; }
    case "cHoja": abrirHojaCardio(el.dataset.t, s); return;
    case "cPon": document.getElementById("hoja").hidden = true; ponCardio(s, p, el.dataset.t, +el.dataset.v); return;
    case "cNuevos": {
      const c = s.cardio, bl = cardioTiempos(p), t = cardioTrans(c);
      if (faseDe(bl, t).id !== "pri") return;
      c.tramos = c.tramos || []; c.tramos.push({ desde: t - bl[1].ini, vel: c.vel ?? 5.0, inc: c.inc ?? 5 });
      db.guardar(); render(); toast(`Tramo ${c.tramos.length} desde el min ${mmss(t - bl[1].ini)}`); return;
    }
    case "cFin": if (confirm("¿Terminar el cardio ahora?")) { s.cardio.hecho = true; s.cardio.pausa = s.cardio.pausa || Date.now(); s.cardio.minutos = Math.round(cardioReal(s.cardio) / 60); db.guardar(); mantenerPantalla(false); render(); } return;
    case "cDif": s.cardio.dif = el.dataset.v; db.guardar(); render(); return;
  }
});
$app.addEventListener("change", (ev) => {
  if (ev.target.id === "simHoy") { try { localStorage.setItem("prueba-hoy", ev.target.value); } catch {} location.reload(); return; }
  const el = ev.target.closest("[data-campo]");
  if (!el) return;
  const { ses: s } = planDe(ruta().a);
  const r = s.ej[s.idx ?? 0], k = +el.dataset.k;
  if (el.dataset.campo === "kg") { r.series[k].kg = num(el.value); for (let j = k + 1; j < r.series.length; j++) if (!r.series[j].hecho) r.series[j].kg = r.series[k].kg; }
  else r.series[k].reps = Math.max(0, Math.round(num(el.value)));
  db.guardar(); refrescaSeries(r);
});
$app.addEventListener("focusin", (ev) => { if (ev.target.matches("[data-campo]")) setTimeout(() => ev.target.select(), 30); });

function refrescaSeries(r) {
  r.series.forEach((x, k) => {
    const row = document.querySelector(`.serie[data-k="${k}"]`); if (!row) return;
    row.classList.toggle("hecha", !!x.hecho);
    const kg = row.querySelector('[data-campo="kg"]'), rp = row.querySelector('[data-campo="reps"]');
    if (kg && document.activeElement !== kg) kg.value = fmtKg(+x.kg || 0);
    if (document.activeElement !== rp) rp.value = x.reps;
  });
  document.querySelector(".difsel")?.classList.toggle("apagado", !r.series.every((x) => x.hecho));
}

function copiaHecha() { db.st().ajustes.ultimaCopia = db.hoy(); db.guardar(); document.querySelectorAll(".copia").forEach((x) => x.remove()); toast("Copia exportada"); }
async function exportarCopia() {
  const txt = db.exportar(), nombre = `entreno-copia-${db.hoy()}.json`;
  try {
    const file = new File([txt], nombre, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Copia de mi entreno" }); copiaHecha(); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  copiaHecha();
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// Arranque
render();
if (!window.PRUEBA && "serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
