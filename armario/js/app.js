// Mi Armario: vistas y navegación.
import { CATS, cat, TIPOS, COLORES, color, TEMPORADAS, ESTILOS, temporadaDe } from "./datos.js";
import * as db from "./store.js";
import { calcular, looksDe, sociosDe, filtrar, falta, HUECOS } from "./combos.js";
import { procesar } from "./foto.js";
import { svgPrenda, ico } from "./dibujo.js";

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (n) => n.toLocaleString("es-ES");
const plural = (n, a, b) => `${num(n)} ${n === 1 ? a : b}`;

// --- Utilidades visuales ---
function tinte(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const m = (v) => Math.round(v * 0.2 + 236 * 0.8);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function imagen(p, mini = true, cls = "") {
  const c = color(p.color);
  const dentro = p.foto ? `<img data-foto="${esc(p.id)}"${mini ? ' data-mini="1"' : ""} alt="">` : svgPrenda(p.tipo, c.hex, c.estampado);
  const tipoFoto = !p.foto ? "" : p.recorte ? " recorte" : " conFoto";
  return `<div class="ima ${cls}${tipoFoto}" style="--tinte:${tinte(c.hex)}">${dentro}</div>`;
}
async function hidratar(raiz = $app) {
  for (const el of raiz.querySelectorAll("img[data-foto]")) {
    if (el.src) continue;
    const u = await db.leerFoto(el.dataset.foto, !!el.dataset.mini);
    if (u) el.src = u; else el.closest(".ima")?.classList.add("sinFoto");
  }
}
let tTimer;
function aviso(txt) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = txt; t.classList.add("ver");
  clearTimeout(tTimer); tTimer = setTimeout(() => t.classList.remove("ver"), 2200);
}
const ir = (h) => { location.hash = h; };

function barra(activa) {
  const it = (id, href, icono, txt) => `<a href="${href}" class="tab${activa === id ? " on" : ""}"${activa === id ? ' aria-current="page"' : ""}>${ico(icono)}<span>${txt}</span></a>`;
  return `<nav class="barra" aria-label="Navegación principal">
    ${it("armario", "#/", "percha", "Armario")}
    ${it("looks", "#/looks", "capas", "Looks")}
    <a href="#/nueva" class="tab mas" aria-label="Añadir prenda">${ico("mas")}</a>
    ${it("ajustes", "#/ajustes", "ajustes", "Ajustes")}
  </nav>`;
}

// Elección "aleatoria" pero estable durante el día.
function semilla(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

function lookDeHoy() {
  const { looks } = calcular();
  if (!looks.length) return null;
  const t = temporadaDe(), ok = (id) => { const p = db.prenda(id); return p && (!p.temporadas.length || p.temporadas.includes(t)); };
  const deTemporada = looks.filter((l) => l.every(ok));
  const lista = deTemporada.length ? deTemporada : looks;
  return lista[semilla(db.hoy()) % lista.length];
}
const ordenHuecos = (ids) => HUECOS.map((h) => ids.find((id) => db.prenda(id)?.cat === h)).filter(Boolean);

// ============ ARMARIO ============
let filtro = "todo", busca = "";
function vArmario() {
  const S = db.st(), { looks, corto } = calcular();
  if (!S.prendas.length) {
    return `<main class="vista">
      <h1>Mi armario</h1>
      <div class="vacio">
        <div class="vacioDib">${svgPrenda("shirt", "#9CC3E6")}${svgPrenda("pants", "#4E6E96")}${svgPrenda("shoe", "#C08A55")}</div>
        <h2>Tu armario está vacío</h2>
        <p class="suave">Haz una foto a cada prenda y la app te enseñará todo lo que tienes y todas las combinaciones que puedes hacer.</p>
        <p class="nota">Consejo: fotografía la prenda extendida sobre la cama o una pared lisa, con buena luz.</p>
        <a class="btn" href="#/nueva">${ico("camara")} Añadir mi primera prenda</a>
        <button class="btn sec" data-acc="ejemplos">Probar con prendas de ejemplo</button>
      </div>
    </main>${barra("armario")}`;
  }
  const hoyL = lookDeHoy();
  const cuenta = (c) => S.prendas.filter((p) => c === "todo" || p.cat === c).length;
  const chips = [{ id: "todo", nombre: "Todo" }, ...CATS].filter((c) => c.id === "todo" || cuenta(c.id))
    .map((c) => `<button class="chip${filtro === c.id ? " on" : ""}" data-filtro="${c.id}" aria-pressed="${filtro === c.id}">${c.nombre} <span>${cuenta(c.id)}</span></button>`).join("");
  return `<main class="vista">
    <header class="cab">
      <h1>Mi armario</h1>
      <p class="suave">${plural(S.prendas.length, "prenda", "prendas")} · ${corto ? "más de " : ""}${plural(looks.length, "combinación posible", "combinaciones posibles")}</p>
    </header>
    ${hoyL ? `<a class="hoy" href="#/looks?l=${hoyL.join(",")}">
      <div class="hoyTxt"><span class="hoyEtq">${ico("sol")} Look para hoy</span><strong>${esc(ordenHuecos(hoyL).map((id) => db.prenda(id).nombre).join(", "))}</strong></div>
      <div class="hoyMinis">${ordenHuecos(hoyL).slice(0, 4).map((id) => imagen(db.prenda(id))).join("")}</div>
    </a>` : `<p class="intro">${esc(falta())}</p>`}
    <div class="buscador">
      <label for="busca" class="oculto">Buscar en tu armario</label>
      ${ico("buscar")}
      <input id="busca" type="search" placeholder="Buscar: nombre o color" value="${esc(busca)}" autocomplete="off">
    </div>
    <div class="chipsFila">${chips}</div>
    <div id="rejilla" class="rejilla">${rejilla()}</div>
  </main>${barra("armario")}`;
}
function rejilla() {
  const q = busca.trim().toLowerCase();
  const lista = db.st().prendas.filter((p) => (filtro === "todo" || p.cat === filtro) &&
    (!q || p.nombre.toLowerCase().includes(q) || color(p.color).nombre.toLowerCase().includes(q)));
  if (!lista.length) return `<p class="nota">No hay prendas que coincidan.</p>`;
  return [...lista].reverse().map((p) => {
    const n = looksDe(p.id);
    return `<a class="tarjeta" href="#/prenda/${p.id}">${imagen(p)}<span class="tNom">${esc(p.nombre)}</span><span class="tMeta">${n ? plural(n, "look posible", "looks posibles") : "Sin combinaciones aún"}</span></a>`;
  }).join("");
}
function eArmario() {
  $app.querySelector('[data-acc="ejemplos"]')?.addEventListener("click", () => { db.cargarEjemplos(); aviso("Prendas de ejemplo añadidas"); render(); });
  $app.querySelectorAll("[data-filtro]").forEach((b) => b.addEventListener("click", () => { filtro = b.dataset.filtro; render(); }));
  const i = document.getElementById("busca");
  i?.addEventListener("input", () => { busca = i.value; document.getElementById("rejilla").innerHTML = rejilla(); hidratar(); });
}

// ============ PRENDA ============
function vPrenda(id) {
  const p = db.prenda(id);
  if (!p) return `<main class="vista"><p>Esta prenda ya no está en tu armario.</p><a class="btn" href="#/">Volver al armario</a></main>${barra("armario")}`;
  const n = looksDe(id), socios = sociosDe(id).map(db.prenda).filter(Boolean);
  socios.sort((a, b) => HUECOS.indexOf(a.cat) - HUECOS.indexOf(b.cat));
  const c = color(p.color);
  const etiquetas = [...p.temporadas.map((t) => TEMPORADAS.find((x) => x.id === t)?.nombre), ...p.estilos.map((e) => ESTILOS.find((x) => x.id === e)?.nombre)].filter(Boolean);
  const usos = p.usos.length, ultima = usos ? [...p.usos].sort().pop() : null;
  const tipo = (TIPOS[p.cat] || []).find((t) => t.id === p.tipo)?.nombre;
  return `<main class="vista">
    <div class="arriba"><a href="#/" class="redondo" aria-label="Volver al armario">${ico("atras")}</a>
      <a href="#/editar/${p.id}" class="redondo" aria-label="Editar prenda">${ico("lapiz")}</a></div>
    <div class="heroe">${imagen(p, false, "grande")}<span class="pastilla"><i style="background:${c.hex}"></i>${esc(c.nombre)}</span></div>
    <h1 class="tit">${esc(p.nombre)}</h1>
    <p class="suave">${esc(cat(p.cat).singular)}${tipo && TIPOS[p.cat].length > 1 ? " · " + esc(tipo) : ""}</p>
    <div class="etiquetas">${etiquetas.length ? etiquetas.map((e) => `<span>${esc(e)}</span>`).join("") : `<span>Todo el año</span><span>Cualquier estilo</span>`}</div>
    <div class="cifras">
      <div><b class="acento">${num(n)}</b><span>${n === 1 ? "look posible" : "looks posibles"}</span></div>
      <div><b>${num(socios.length)}</b><span>${socios.length === 1 ? "prenda que combina" : "prendas que combinan"}</span></div>
      <div><b>${num(usos)}</b><span>${usos === 1 ? "vez usada" : "veces usada"}${ultima ? `<br>última: ${fecha(ultima)}` : ""}</span></div>
    </div>
    ${socios.length ? `<h3>Combina con</h3><div class="fila">${socios.map((s) => `<a class="miniT" href="#/prenda/${s.id}">${imagen(s)}<span>${esc(s.nombre)}</span></a>`).join("")}</div>`
      : n ? "" : `<p class="intro">${esc(calcular().looks.length ? "Esta prenda aún no encaja en ningún look: revisa su temporada y estilo, o añade prendas que vayan con ella." : falta())}</p>`}
    ${n ? `<a class="btn" href="#/looks?f=${p.id}">${ico("capas")} Crear looks con esta prenda</a>` : ""}
    <button class="btn sec" data-acc="usada">${ico("check")} Me la he puesto hoy</button>
  </main>${barra("armario")}`;
}
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fecha(s) { const [y, m, d] = s.split("-").map(Number); return `${d} ${MESES[m - 1]}${y !== new Date().getFullYear() ? " " + y : ""}`; }
function ePrenda(id) {
  $app.querySelector('[data-acc="usada"]')?.addEventListener("click", () => {
    const p = db.prenda(id);
    if (p.usos.includes(db.hoy())) { aviso("Ya estaba apuntada hoy"); return; }
    db.usarHoy([id]); aviso("Apuntado: te la has puesto hoy"); render();
  });
}

// ============ LOOKS ============
const L = { actual: null, fijas: new Set(), modo: "crear", clave: "" };
const NOMBRE_HUECO = { encima: "Encima", arriba: "Arriba", abajo: "Abajo", vestido: "Vestido", calzado: "Calzado" };

function aObj(ids) {
  const o = { encima: null, arriba: null, abajo: null, vestido: null, calzado: null };
  for (const id of ids) { const p = db.prenda(id); if (p) o[p.cat] = id; }
  return o;
}
const igual = (a, b) => db.firma(a) === db.firma(b);

function vLooks(qs) {
  const clave = qs.toString();
  if (clave !== L.clave) {
    L.clave = clave; L.fijas = new Set((qs.get("f") || "").split(",").filter((id) => db.prenda(id)));
    const ini = (qs.get("l") || "").split(",").filter((id) => db.prenda(id));
    L.actual = ini.length ? ini : null;
    if (qs.get("ver") === "guardados") L.modo = "guardados"; else if (qs.has("f") || qs.has("l")) L.modo = "crear";
  }
  const S = db.st();
  const seg = `<div class="segmento" role="tablist">
    <button role="tab" aria-selected="${L.modo === "crear"}" class="${L.modo === "crear" ? "on" : ""}" data-modo="crear">Combinar</button>
    <button role="tab" aria-selected="${L.modo === "guardados"}" class="${L.modo === "guardados" ? "on" : ""}" data-modo="guardados">Mis looks <span>${S.looks.length}</span></button>
  </div>`;
  const cab = `<header class="cab"><h1>Looks</h1></header>${seg}`;
  if (L.modo === "guardados") return `<main class="vista">${cab}${vGuardados()}</main>${barra("looks")}`;

  const fijas = [...L.fijas], lista = filtrar(fijas);
  if (!lista.length) {
    const txt = fijas.length ? "Con las prendas fijadas no sale ninguna combinación." : falta();
    return `<main class="vista">${cab}<p class="intro">${esc(txt)}</p>
      ${fijas.length ? `<button class="btn sec" data-acc="soltar">Soltar las prendas fijadas</button>` : `<a class="btn" href="#/nueva">${ico("mas")} Añadir prenda</a>`}
    </main>${barra("looks")}`;
  }
  if (!L.actual || !lista.some((l) => igual(l, L.actual))) L.actual = lista[0];
  const act = aObj(L.actual), idx = lista.findIndex((l) => igual(l, L.actual));
  const objs = lista.map(aObj);
  const { hayCalzado } = calcular();
  const hayCapas = S.prendas.some((p) => p.cat === "encima");
  const conVestido = !!act.vestido;
  const huecos = [hayCapas && "encima", ...(conVestido ? ["vestido"] : ["arriba", "abajo"]), hayCalzado && "calzado"].filter(Boolean);
  const hayVestidos = objs.some((o) => o.vestido), hayConjuntos = objs.some((o) => !o.vestido);

  const fichas = huecos.map((h) => {
    const alt = alternativas(objs, act, h), fija = act[h] && L.fijas.has(act[h]);
    const p = act[h] ? db.prenda(act[h]) : null;
    const flechas = !fija && alt.length > 1;
    return `<div class="ficha" style="--tinte:${p ? tinte(color(p.color).hex) : "#E8E8E4"}">
      <div class="fCab"><span>${NOMBRE_HUECO[h]}</span>
        ${p ? `<button class="fijar${fija ? " on" : ""}" data-fijar="${p.id}" aria-pressed="${fija}" aria-label="${fija ? "Soltar" : "Fijar"} ${esc(p.nombre)}">${ico("chincheta")}</button>` : ""}</div>
      <div class="fIma">${p ? imagen(p, true, "limpia") : `<div class="sinCapa">Sin capa</div>`}</div>
      <span class="fNom">${p ? esc(p.nombre) : "Sin capa"}</span>
      ${flechas ? `<div class="fPie">
        <button class="flecha" data-mover="${h}" data-d="-1" aria-label="${NOMBRE_HUECO[h]}: anterior">${ico("atras")}</button>
        <span class="fCont">${alt.indexOf(act[h]) + 1}/${alt.length}</span>
        <button class="flecha" data-mover="${h}" data-d="1" aria-label="${NOMBRE_HUECO[h]}: siguiente">${ico("sig")}</button>
      </div>` : `<div class="fPie vacio44"></div>`}
    </div>`;
  }).join("");

  const piezas = L.actual.map(db.prenda);
  const comunes = (campo, todos) => {
    let set = null;
    for (const p of piezas) if (p[campo].length) set = set ? set.filter((x) => p[campo].includes(x)) : [...p[campo]];
    return (set || []).map((x) => todos.find((t) => t.id === x)?.nombre).filter(Boolean);
  };
  const tags = [...comunes("estilos", ESTILOS), ...comunes("temporadas", TEMPORADAS)];
  const guardado = !!db.lookGuardado(L.actual);
  const fijasTxt = fijas.map((id) => db.prenda(id)?.nombre).filter(Boolean);

  return `<main class="vista">${cab}
    <p class="suave sub">${fijasTxt.length ? `Con ${esc(fijasTxt.join(" y "))} · ` : ""}${plural(lista.length, "look posible", "looks posibles")}</p>
    ${hayVestidos && hayConjuntos && !fijas.length ? `<div class="chipsFila peq">
      <button class="chip${!conVestido ? " on" : ""}" data-tipo="conjunto" aria-pressed="${!conVestido}">Conjunto</button>
      <button class="chip${conVestido ? " on" : ""}" data-tipo="vestido" aria-pressed="${conVestido}">Con vestido</button></div>` : ""}
    <div class="tablero n${huecos.length}">${fichas}</div>
    <div class="info"><span>Look <b>${num(idx + 1)}</b> de ${num(lista.length)}</span>
      <div class="etiquetas peq">${tags.slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("")}</div></div>
    <div class="acciones">
      <button class="btn sec borde" data-acc="azar">${ico("azar")} Sorpréndeme</button>
      <button class="btn${guardado ? " negro" : ""}" data-acc="guardar">${ico(guardado ? "check" : "marcador")} ${guardado ? "Guardado" : "Guardar look"}</button>
    </div>
    <div class="acciones peq">
      <button class="mini" data-acc="hoy">${ico("check")} Me lo pongo hoy</button>
      <button class="mini" data-acc="vetar">${ico("descarta")} No me convence</button>
    </div>
    <p class="nota">Pulsa la chincheta para fijar una prenda: el resto irá cambiando a su alrededor.</p>
  </main>${barra("looks")}`;
}
// Opciones para un hueco manteniendo igual el resto del look.
function alternativas(objs, act, h) {
  const vistos = new Set(), out = [];
  for (const o of objs) {
    let ok = true;
    for (const k of HUECOS) if (k !== h && o[k] !== act[k]) { ok = false; break; }
    if (ok && !vistos.has(o[h])) { vistos.add(o[h]); out.push(o[h]); }
  }
  const orden = new Map(db.st().prendas.map((p, i) => [p.id, i]));
  return out.sort((a, b) => (a === null ? -1 : b === null ? 1 : orden.get(a) - orden.get(b)));
}
function vGuardados() {
  const S = db.st();
  if (!S.looks.length) return `<p class="intro">Aún no has guardado ningún look. En «Combinar», pulsa «Guardar look» en los que te gusten.</p>`;
  return S.looks.map((l) => {
    const ps = ordenHuecos(l.piezas).map(db.prenda).filter(Boolean);
    return `<div class="guardado">
      <a class="gMinis" href="#/looks?l=${l.piezas.join(",")}" aria-label="Abrir look">${ps.map((p) => imagen(p)).join("")}</a>
      <div class="gTxt"><strong>${esc(ps.map((p) => p.nombre).join(", "))}</strong>
        <span class="suave">${l.usos.length ? `Puesto ${plural(l.usos.length, "vez", "veces")} · última: ${fecha([...l.usos].sort().pop())}` : `Guardado el ${fecha(l.creado)}`}</span></div>
      <div class="gAcc">
        <button class="mini" data-hoy="${l.piezas.join(",")}">${ico("check")} Hoy</button>
        <button class="mini" data-quitar="${l.piezas.join(",")}" aria-label="Quitar de mis looks">${ico("papelera")}</button>
      </div>
    </div>`;
  }).join("");
}
function eLooks() {
  $app.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => { L.modo = b.dataset.modo; render(); }));
  $app.querySelectorAll("[data-fijar]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.fijar; L.fijas.has(id) ? L.fijas.delete(id) : L.fijas.add(id); render();
  }));
  $app.querySelectorAll("[data-mover]").forEach((b) => b.addEventListener("click", () => {
    const h = b.dataset.mover, d = +b.dataset.d;
    const lista = filtrar([...L.fijas]), objs = lista.map(aObj), act = aObj(L.actual);
    const alt = alternativas(objs, act, h), i = alt.indexOf(act[h]);
    const sig = alt[(i + d + alt.length) % alt.length];
    const nuevo = { ...act, [h]: sig };
    const enc = lista.find((l, k) => HUECOS.every((x) => objs[k][x] === nuevo[x]));
    if (enc) { L.actual = enc; render(); }
  }));
  $app.querySelectorAll("[data-tipo]").forEach((b) => b.addEventListener("click", () => {
    const quiero = b.dataset.tipo === "vestido";
    const l = filtrar([...L.fijas]).find((x) => !!aObj(x).vestido === quiero);
    if (l) { L.actual = l; render(); }
  }));
  const acc = (n, fn) => $app.querySelector(`[data-acc="${n}"]`)?.addEventListener("click", fn);
  acc("soltar", () => { L.fijas.clear(); render(); });
  acc("azar", () => {
    const lista = filtrar([...L.fijas]);
    if (lista.length < 2) { aviso("No hay más combinaciones"); return; }
    let l; do { l = lista[Math.floor(Math.random() * lista.length)]; } while (igual(l, L.actual));
    L.actual = l; render();
  });
  acc("guardar", () => {
    if (db.lookGuardado(L.actual)) { db.quitarLook(L.actual); aviso("Quitado de Mis looks"); }
    else { db.guardarLook(L.actual); aviso("Guardado en Mis looks"); }
    render();
  });
  acc("hoy", () => { db.usarLookHoy(L.actual); aviso("Apuntado: hoy llevas este look"); });
  acc("vetar", () => {
    const lista = filtrar([...L.fijas]), i = lista.findIndex((l) => igual(l, L.actual));
    db.vetar(L.actual);
    const resto = filtrar([...L.fijas]);
    L.actual = resto.length ? resto[Math.min(i, resto.length - 1)] : null;
    aviso("No volverá a salir este look"); render();
  });
  $app.querySelectorAll("[data-hoy]").forEach((b) => b.addEventListener("click", () => { db.usarLookHoy(b.dataset.hoy.split(",")); aviso("Apuntado: hoy llevas este look"); render(); }));
  $app.querySelectorAll("[data-quitar]").forEach((b) => b.addEventListener("click", () => { db.quitarLook(b.dataset.quitar.split(",")); aviso("Quitado de Mis looks"); render(); }));
}

// ============ AÑADIR / EDITAR ============
let F = null;
function nuevoF(p) {
  return p ? { id: p.id, nombre: p.nombre, cat: p.cat, tipo: p.tipo, color: p.color, temporadas: [...p.temporadas], estilos: [...p.estilos], foto: p.foto, nueva: null, url: null, det: null, quitarFoto: false }
    : { id: null, nombre: "", cat: "arriba", tipo: "tee", color: "blanco", temporadas: [], estilos: [], foto: false, nueva: null, url: null, det: null, quitarFoto: false };
}
function vForm(id) {
  const p = id ? db.prenda(id) : null;
  if (id && !p) return vPrenda(id);
  if (!F || F.id !== (id || null)) F = nuevoF(p);
  const c = color(F.color);
  const tieneFoto = (F.nueva || (F.foto && !F.quitarFoto));
  const zona = F.nueva ? `<img src="${F.url}" alt="Foto de la prenda">`
    : tieneFoto ? `<img data-foto="${esc(F.id)}" alt="Foto de la prenda"${p?.recorte ? ' class="rec"' : ""}>`
    : `<div class="zonaVacia">${svgPrenda(F.tipo, c.hex, c.estampado)}<span>${ico("camara")} Hacer o elegir foto</span></div>`;
  const chipsDe = (lista, sel, campo, multi) => lista.map((x) => {
    const on = multi ? sel.includes(x.id) : sel === x.id;
    return `<button type="button" class="chip${on ? " on" : ""}" data-campo="${campo}" data-v="${x.id}" aria-pressed="${on}">${esc(x.nombre)}</button>`;
  }).join("");
  return `<main class="vista form">
    <div class="arriba"><h1 class="h2">${id ? "Editar prenda" : "Nueva prenda"}</h1>
      <a href="${id ? "#/prenda/" + id : "#/"}" class="redondo" aria-label="Cerrar sin guardar">${ico("cerrar")}</a></div>
    <label class="zonaFoto" style="--tinte:${tinte(c.hex)}">
      <input type="file" accept="image/*" id="foto" class="oculto">
      ${zona}
      ${tieneFoto ? `<span class="camaraBtn" aria-hidden="true">${ico("camara")}</span>` : ""}
      <span class="oculto">Hacer o elegir foto</span>
    </label>
    ${tieneFoto ? `<button type="button" class="enlace" data-acc="quitarFoto">Quitar foto y usar dibujo</button>` : `<p class="nota">Sin foto, la prenda se verá con un dibujo de su color.</p>`}
    <div class="campo"><label for="nombre">Nombre</label>
      <input id="nombre" type="text" maxlength="60" placeholder="Ej.: camisa vaquera" value="${esc(F.nombre)}" autocomplete="off"></div>
    <fieldset class="campo"><legend>Categoría</legend><div class="chips">${chipsDe(CATS.map((x) => ({ id: x.id, nombre: x.singular })), F.cat, "cat", false)}</div></fieldset>
    ${TIPOS[F.cat].length > 1 ? `<fieldset class="campo"><legend>Tipo</legend><div class="chips">${chipsDe(TIPOS[F.cat], F.tipo, "tipo", false)}</div></fieldset>` : ""}
    <fieldset class="campo"><legend>Color principal${F.det ? ` <span class="det">detectado en la foto: ${esc(color(F.det).nombre)}</span>` : ""}</legend>
      <div class="colores">${COLORES.map((x) => `<button type="button" class="muestra${F.color === x.id ? " on" : ""}${x.estampado ? " estampado" : ""}" data-campo="color" data-v="${x.id}" aria-pressed="${F.color === x.id}" aria-label="${esc(x.nombre)}" title="${esc(x.nombre)}" style="--c:${x.hex}"></button>`).join("")}</div>
      <p class="nota">${esc(c.nombre)}${c.n ? " · neutro, combina con todo" : c.estampado ? " · solo un estampado por look" : ""}</p>
    </fieldset>
    <fieldset class="campo"><legend>Temporada <span class="det">sin marcar = todo el año</span></legend><div class="chips">${chipsDe(TEMPORADAS, F.temporadas, "temporadas", true)}</div></fieldset>
    <fieldset class="campo"><legend>Estilo <span class="det">sin marcar = cualquiera</span></legend><div class="chips">${chipsDe(ESTILOS, F.estilos, "estilos", true)}</div></fieldset>
    <button class="btn" data-acc="guardar">${id ? "Guardar cambios" : "Guardar en mi armario"}</button>
    ${id ? `<button class="btn peligro" data-acc="borrar">${ico("papelera")} Borrar prenda</button>` : ""}
  </main>`;
}
function eForm(id) {
  const nom = document.getElementById("nombre");
  nom.addEventListener("input", () => { F.nombre = nom.value; });
  $app.querySelectorAll("[data-campo]").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.campo, v = b.dataset.v;
    if (k === "temporadas" || k === "estilos") F[k] = F[k].includes(v) ? F[k].filter((x) => x !== v) : [...F[k], v];
    else F[k] = v;
    if (k === "cat" && !TIPOS[v].some((t) => t.id === F.tipo)) F.tipo = TIPOS[v][0].id;
    render(true);
  }));
  document.getElementById("foto").addEventListener("change", async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    aviso("Preparando la foto…");
    try {
      const r = await procesar(f);
      if (F.url) URL.revokeObjectURL(F.url);
      F.nueva = r; F.url = URL.createObjectURL(r.grande); F.det = r.color; F.color = r.color; F.quitarFoto = false;
      render(true);
    } catch (err) { aviso(err.message || "No se pudo usar esa foto"); }
  });
  $app.querySelector('[data-acc="quitarFoto"]')?.addEventListener("click", () => {
    if (F.url) URL.revokeObjectURL(F.url);
    F.nueva = null; F.url = null; F.det = null; F.quitarFoto = true; render(true);
  });
  $app.querySelector('[data-acc="guardar"]').addEventListener("click", async (ev) => {
    ev.currentTarget.disabled = true;
    const datos = {
      nombre: F.nombre.trim() || `${cat(F.cat).singular} ${color(F.color).nombre.toLowerCase()}`,
      cat: F.cat, tipo: F.tipo, color: F.color, temporadas: F.temporadas, estilos: F.estilos,
    };
    try {
      let p;
      if (id) p = db.editarPrenda(id, datos); else p = db.crearPrenda(datos);
      if (F.nueva) { await db.guardarFoto(p.id, F.nueva.grande, F.nueva.mini); db.editarPrenda(p.id, { foto: true, recorte: false }); }
      else if (F.quitarFoto && p.foto) { await db.borrarFoto(p.id); db.editarPrenda(p.id, { foto: false, recorte: false }); }
      if (F.url) URL.revokeObjectURL(F.url);
      F = null;
      aviso(id ? "Cambios guardados" : "Prenda añadida a tu armario");
      ir(`#/prenda/${p.id}`);
    } catch (err) {
      ev.currentTarget.disabled = false;
      aviso("No se pudo guardar. ¿Queda espacio en el móvil?");
    }
  });
  $app.querySelector('[data-acc="borrar"]')?.addEventListener("click", async () => {
    const p = db.prenda(id);
    if (!confirm(`¿Borrar «${p.nombre}» del armario? También se quitará de tus looks guardados.`)) return;
    await db.borrarPrenda(id); F = null; aviso("Prenda borrada"); ir("#/");
  });
}

// ============ AJUSTES ============
function vAjustes() {
  const S = db.st();
  return `<main class="vista">
    <header class="cab"><h1>Ajustes</h1></header>
    <section class="card">
      <h3>Copia de seguridad</h3>
      <p class="suave">Tus prendas y fotos se guardan solo en este móvil. Haz una copia de vez en cuando y guárdala en Archivos o iCloud. Al importar puedes añadir prendas a las que ya tienes o sustituirlo todo.</p>
      <button class="btn" data-acc="exportar">Exportar copia</button>
      <label class="btn sec">Importar copia o prendas<input type="file" accept=".json,application/json" id="importar" class="oculto"></label>
    </section>
    <section class="card">
      <h3>Cómo se combinan</h3>
      <p class="suave">Un look lleva parte de arriba y de abajo (o un vestido), calzado y, si quieres, algo encima. Las prendas tienen que compartir temporada y estilo. Los colores neutros van con todo; como mucho entran dos colores llamativos y un estampado, y se evitan parejas que chocan, como rojo y rosa.</p>
      ${S.vetos.length ? `<button class="btn sec" data-acc="vetos">Recuperar ${plural(S.vetos.length, "look descartado", "looks descartados")}</button>` : ""}
    </section>
    <section class="card">
      <h3>Instalar en el iPhone</h3>
      <p class="suave">Ábrela en Safari, Chrome o Brave, pulsa Compartir y luego «Añadir a pantalla de inicio». Funciona sin conexión.</p>
    </section>
    <section class="card">
      <h3>Más</h3>
      <button class="btn sec" data-acc="ejemplos">Añadir prendas de ejemplo</button>
      ${S.prendas.length ? `<button class="btn peligro" data-acc="borrarTodo">Borrar todo el armario</button>` : ""}
    </section>
    <p class="nota centro">Mi Armario · ${plural(S.prendas.length, "prenda", "prendas")} · ${plural(S.looks.length, "look guardado", "looks guardados")}</p>
  </main>${barra("ajustes")}`;
}
function eAjustes() {
  const acc = (n, fn) => $app.querySelector(`[data-acc="${n}"]`)?.addEventListener("click", fn);
  acc("exportar", async () => {
    aviso("Preparando la copia…");
    const b = await db.exportar(), nombre = `armario-${db.hoy()}.json`;
    const f = new File([b], nombre, { type: "application/json" });
    try {
      if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: "Copia de Mi Armario" }); return; }
    } catch (e) { if (e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  });
  document.getElementById("importar")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    try {
      const j = db.leerCopia(await f.text()), n = j.datos.prendas.length;
      let modo = "sustituir";
      if (db.st().prendas.length) {
        if (confirm(`El archivo trae ${plural(n, "prenda", "prendas")}.\n\nAceptar: añadirlas a las que ya tienes.\nCancelar: ver otras opciones.`)) modo = "anadir";
        else if (!confirm("¿Sustituir todo tu armario por el contenido del archivo? Lo que tienes ahora se borrará.")) return;
      }
      const hechas = await db.importar(j, modo);
      aviso(modo === "anadir" ? (hechas ? `${plural(hechas, "prenda añadida", "prendas añadidas")}` : "Esas prendas ya estaban en tu armario") : "Copia importada");
      ir("#/");
    } catch (err) { aviso(err.message || "No se pudo importar"); }
  });
  acc("vetos", () => { db.quitarVetos(); aviso("Looks recuperados"); render(); });
  acc("ejemplos", () => { db.cargarEjemplos(); aviso("Prendas de ejemplo añadidas"); ir("#/"); });
  acc("borrarTodo", async () => {
    if (!confirm("¿Borrar todas las prendas, fotos y looks? No se puede deshacer (salvo que tengas una copia).")) return;
    await db.borrarTodo(); aviso("Armario vacío"); ir("#/");
  });
}

// ============ RUTAS ============
let ultimaRuta = "";
function render(mismaVista = false) {
  const h = location.hash.slice(1) || "/";
  const [ruta, q = ""] = h.split("?");
  const qs = new URLSearchParams(q);
  const partes = ruta.split("/").filter(Boolean);
  const y = window.scrollY;
  if (partes[0] !== "nueva" && partes[0] !== "editar") F = null;
  let html, ev;
  switch (partes[0]) {
    case "prenda": html = vPrenda(partes[1]); ev = () => ePrenda(partes[1]); break;
    case "looks": html = vLooks(qs); ev = eLooks; break;
    case "nueva": html = vForm(null); ev = () => eForm(null); break;
    case "editar": html = vForm(partes[1]); ev = () => (db.prenda(partes[1]) ? eForm(partes[1]) : ePrenda(partes[1])); break;
    case "ajustes": html = vAjustes(); ev = eAjustes; break;
    default: html = vArmario(); ev = eArmario;
  }
  $app.innerHTML = html;
  ev();
  hidratar();
  if (h !== ultimaRuta && !mismaVista) window.scrollTo(0, 0); else window.scrollTo(0, y);
  ultimaRuta = h;
}
window.addEventListener("hashchange", () => render());
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {}));
}
