// Plan de entreno (fuente: "TREN SUPERIOR DELANTERO.pdf" de Ana).
// Cada semana = una fase del ciclo. Lunes A, martes B, miércoles cardio 1, jueves C, viernes cardio 2.

export const FASES = [
  { n: 1, id: "menstrual", nombre: "Fase menstrual", lema: "Baja energía", color: "#C2456B" },
  { n: 2, id: "folicular", nombre: "Fase folicular", lema: "Alta energía", color: "#2E8B6A" },
  { n: 3, id: "ovulatoria", nombre: "Fase ovulatoria", lema: "Fuerza máxima", color: "#D08A1E" },
  { n: 4, id: "lutea", nombre: "Fase lútea", lema: "Energía decreciente", color: "#7A5BB5" },
];

// Catálogo de ejercicios: nombre, zona trabajada y figura (ver figuras.js).
// peso: "mancuerna" (por defecto) · "discos" (peso propio de la máquina + discos) · "placas" (número de placa) · "corporal".
export const EJ = {
  pressMaqPlano:   { nombre: "Press de pecho en máquina plano", zona: "Pecho", equipo: "Máquina", peso: "discos", paso: 2.5 },
  pressMaqInc:     { nombre: "Press de pecho en máquina inclinado", zona: "Pecho", equipo: "Máquina", peso: "discos", paso: 2.5 },
  aperturas:       { nombre: "Aperturas de pecho con mancuernas", zona: "Pecho", equipo: "Mancuernas · banco plano" },
  elevFrontal:     { nombre: "Elevaciones frontales alternas con mancuernas", zona: "Hombro", equipo: "Mancuernas", doble: "brazo", nota: "Ejercicio alterno: 1 repetición = los dos brazos, por eso cuenta el doble de tiempo." },
  curlPolea:       { nombre: "Curl de bíceps en polea baja", zona: "Bíceps", equipo: "Polea baja", peso: "placas" },
  pressMancInc:    { nombre: "Press con mancuernas en banco inclinado", zona: "Pecho", equipo: "Mancuernas · banco inclinado" },
  pressMancPlano:  { nombre: "Press con mancuernas en banco plano", zona: "Pecho", equipo: "Mancuernas · banco plano" },
  pressHombro:     { nombre: "Press de hombros con mancuernas", zona: "Hombro", equipo: "Mancuernas · banco" },
  curlSimul:       { nombre: "Curl de bíceps con mancuernas (simultáneo)", zona: "Bíceps", equipo: "Mancuernas" },
  elevCombinada:   { nombre: "Elevaciones combinadas (frontal + lateral)", zona: "Hombro", equipo: "Mancuernas", nota: "1 elevación frontal + 1 elevación lateral = 1 repetición." },
  curlAlterno:     { nombre: "Curl de bíceps con mancuernas (alterno)", zona: "Bíceps", equipo: "Mancuernas", doble: "brazo", nota: "Ejercicio alterno: 1 repetición = los dos brazos, por eso cuenta el doble de tiempo." },
  elevLateral:     { nombre: "Elevaciones laterales con mancuernas", zona: "Hombro", equipo: "Mancuernas" },

  jalonNuca:       { nombre: "Jalón trasnuca con barra larga", zona: "Espalda", equipo: "Polea alta", peso: "placas" },
  jalonMedia:      { nombre: "Jalón al pecho con barra media", zona: "Espalda", equipo: "Polea alta", peso: "placas" },
  jalonCorta:      { nombre: "Jalón al pecho con barra corta", zona: "Espalda", equipo: "Polea alta", peso: "placas" },
  remoCorta:       { nombre: "Remo en polea baja con barra corta", zona: "Espalda", equipo: "Polea baja", peso: "placas" },
  remoLarga:       { nombre: "Remo en polea baja con barra larga", zona: "Espalda", equipo: "Polea baja", peso: "placas" },
  cubana:          { nombre: "Rotación cubana / «Espantapájaros»", zona: "Espalda · manguito rotador", equipo: "Mancuernas" },
  facePull:        { nombre: "Face Pull en polea alta", zona: "Hombro posterior", equipo: "Polea alta · cuerda", peso: "placas" },
  tricepsCuerda:   { nombre: "Extensión de tríceps con cuerda doble", zona: "Tríceps", equipo: "Polea alta · cuerda", peso: "placas" },
  chestPull:       { nombre: "Chest Pull en polea alta", zona: "Espalda", equipo: "Polea alta", peso: "placas" },
  fondosBanco:     { nombre: "Fondos de tríceps en banco", zona: "Tríceps", equipo: "Banco", peso: "corporal" },
  tricepsBarra:    { nombre: "Extensión de tríceps con barra", zona: "Tríceps", equipo: "Polea alta · barra", peso: "placas" },
  aperturaAlterna: { nombre: "Elevación / apertura alterna con mancuernas", zona: "Espalda · hombro posterior", equipo: "Mancuernas", doble: "brazo", nota: "Ejercicio alterno: 1 repetición = los dos brazos, por eso cuenta el doble de tiempo." },
  crucesInv:       { nombre: "Cruces invertidos en polea", zona: "Hombro posterior", equipo: "Polea", peso: "placas" },

  prensa:          { nombre: "Prensa de piernas", zona: "Cuádriceps", equipo: "Máquina", peso: "discos", paso: 20 },
  extCuad:         { nombre: "Extensión de cuádriceps", zona: "Cuádriceps", equipo: "Máquina", peso: "placas" },
  curlFemoral:     { nombre: "Curl femoral en máquina", zona: "Isquios", equipo: "Máquina", peso: "placas" },
  abductores:      { nombre: "Máquina de abductores (abrir)", zona: "Glúteo", equipo: "Máquina", peso: "placas" },
  aductores:       { nombre: "Máquina de aductores (cerrar)", zona: "Aductores", equipo: "Máquina", nota: "Misma máquina, seguido del anterior.", peso: "placas" },
  goblet:          { nombre: "Sentadilla Goblet con mancuerna", zona: "Cuádriceps", equipo: "Mancuerna" },
  rumano:          { nombre: "Peso muerto rumano con mancuernas", zona: "Isquios", equipo: "Mancuernas" },
  hipThrust:       { nombre: "Hip Thrust con mancuerna", zona: "Glúteo", equipo: "Mancuerna · banco" },
  sumo:            { nombre: "Sentadilla Sumo con mancuerna", zona: "Aductores", equipo: "Mancuerna" },
  hack:            { nombre: "Sentadilla Hack en máquina", zona: "Cuádriceps", equipo: "Máquina", peso: "discos", paso: 5 },
  rumanoUni:       { nombre: "Peso muerto rumano a una pierna", zona: "Isquios", equipo: "Mancuernas ligeras · banco", doble: "pierna", nota: "Ejercicio por pierna: haces las repeticiones con una pierna y luego con la otra, por eso cuenta el doble de tiempo." },
};

// Volumen por fase (para espalda y pierna el PDF no lo indica: se usan los de tren superior delantero).
const VOL = {
  1: { series: 3, reps: "12–15", repsMax: 15, descanso: 45, intensidad: "Baja (pesos ligeros y el propio peso de las máquinas)" },
  2: { series: 3, reps: "8–10", repsMax: 10, descanso: 60, intensidad: "Alta (pesos desafiantes, las últimas repeticiones deben costar)" },
  3: { series: 3, reps: "6–8", repsMax: 8, descanso: 60, intensidad: "Muy alta (tu peso máximo posible manteniendo la técnica)" },
  4: { series: 3, reps: "10–12", repsMax: 12, descanso: 60, intensidad: "Moderada (pesos medios-ligeros)" },
};

const e = (id, detalle = "") => ({ id, detalle });

export const BLOQUES = {
  A: {
    nombre: "Pecho, hombro y bíceps", corto: "Tren superior delantero",
    semanas: {
      1: { intro: "Primero las dos máquinas para quitarte esa zona y luego bancos y polea.", vol: { ...VOL[1], descanso: 45 },
        ej: [e("pressMaqPlano", "Sin cargar peso"), e("pressMaqInc", "Sin cargar peso"), e("aperturas", "Peso ligero, bajada lenta"), e("elevFrontal"), e("curlPolea")] },
      2: { intro: "Todo en la zona de peso libre (bancos y mancuernas), sin pisar las máquinas.", vol: VOL[2],
        ej: [e("pressMancInc"), e("pressMancPlano"), e("aperturas"), e("pressHombro"), e("curlSimul", "Ambos brazos a la vez")] },
      3: { intro: "Todo en la zona de bancos para aprovechar al máximo tu fuerza con las mancuernas.", vol: VOL[3],
        ej: [e("pressMancPlano", "Busca tus mancuernas más pesadas"), e("pressMancInc"), e("aperturas", "Muy controladas en la apertura"), e("elevCombinada"), e("curlAlterno", "Toda la fuerza en un brazo cada vez")] },
      4: { intro: "Una única máquina al principio y rápido a peso libre con mancuernas más ligeras y polea.", vol: { ...VOL[4], descanso: 60, descansoTxt: "45–60 s" },
        ej: [e("pressMaqInc", "Sin cargar peso"), e("pressMancPlano", "Menos peso que en las semanas 2 y 3"), e("aperturas"), e("elevLateral"), e("curlPolea")] },
    },
  },
  B: {
    nombre: "Espalda, hombro posterior y tríceps", corto: "Tren superior posterior",
    semanas: {
      1: { intro: "", vol: VOL[1], ej: [e("jalonNuca"), e("jalonMedia"), e("remoCorta"), e("cubana"), e("facePull"), e("tricepsCuerda")] },
      2: { intro: "", vol: VOL[2], ej: [e("jalonMedia"), e("jalonCorta"), e("remoLarga"), e("chestPull"), e("facePull"), e("fondosBanco")] },
      3: { intro: "", vol: VOL[3], ej: [e("jalonMedia"), e("jalonCorta"), e("remoCorta", "Peso máximo"), e("chestPull", "Peso máximo"), e("facePull", "Peso máximo"), e("tricepsBarra")] },
      4: { intro: "", vol: VOL[4], ej: [e("jalonNuca"), e("jalonCorta"), e("remoLarga"), e("aperturaAlterna"), e("crucesInv", "Con el peso único disponible"), e("tricepsCuerda")] },
    },
  },
  C: {
    nombre: "Tren inferior", corto: "Tren inferior",
    semanas: {
      1: { intro: "Supervivencia y cero estrés lumbar. Todo en máquina: te sientas y trabajas sin estabilizar el tronco.", vol: VOL[1],
        ej: [e("prensa", "Bajada controlada, sin presionar la barriga"), e("extCuad"), e("curlFemoral"), e("abductores"), e("aductores")] },
      2: { intro: "Alta energía y rango de movimiento. Entran el Hip Thrust y la Sentadilla Sumo, con mancuernas.", vol: VOL[2],
        ej: [e("prensa", "Bajando profundo"), e("goblet"), e("rumano"), e("hipThrust"), e("sumo")] },
      3: { intro: "Tu pico de fuerza: los pesos más pesados del mes, de forma segura.", vol: VOL[3],
        ej: [e("prensa", "Busca tu récord de peso"), e("hack", "Fuerza máxima guiada"), e("rumano"), e("hipThrust", "Peso máximo"), e("sumo", "Peso máximo")] },
      4: { intro: "Debilidad y bombeo. Sin prensa pesada: aislamos en máquinas y trabajo unilateral.", vol: VOL[4],
        ej: [e("goblet", "Peso ligero/medio"), e("extCuad"), e("rumanoUni", "Casi sin peso en las manos"), e("abductores"), e("aductores")] },
    },
  },
};

// Cardio libre: calentamiento y enfriamiento fijos; en el bloque principal eliges velocidad e inclinación
export const CARDIO_LIBRE = {
  cal: { min: 2, vel: 4.0, inc: 2 },
  enf: { min: 2, vel: 3.0, inc: 0 },
  principal: { s1: 25, s2: 45 },
  vel: { min: 4.0, max: 7.0, paso: 0.1 },
  inc: { min: 0, max: 8, paso: 1 },
};

// Lunes=1 … domingo=7
export const DIAS = {
  1: { tipo: "fuerza", bloque: "A" },
  2: { tipo: "fuerza", bloque: "B" },
  3: { tipo: "cardio", sesion: "s1", nombre: "Cardio corto · 29 min" },
  4: { tipo: "fuerza", bloque: "C" },
  5: { tipo: "cardio", sesion: "s2", nombre: "Cardio largo · 49 min" },
  6: { tipo: "descanso" },
  7: { tipo: "descanso" },
};
export const NOMBRE_DIA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function sesionDe(dia, semana) {
  const d = DIAS[dia];
  if (d.tipo === "fuerza") {
    const bl = BLOQUES[d.bloque], s = bl.semanas[semana];
    return { tipo: "fuerza", key: `${d.bloque}${semana}`, bloque: d.bloque, titulo: bl.nombre, subtitulo: bl.corto, intro: s.intro, vol: s.vol,
      ejercicios: s.ej.map((x) => ({ ...x, ...EJ[x.id] })) };
  }
  if (d.tipo === "cardio") {
    // Cardio libre: calentamiento y enfriamiento fijos; en el bloque principal eliges velocidad e inclinación.
    const min = CARDIO_LIBRE.principal[d.sesion];
    return { tipo: "cardio", key: d.sesion, sesion: d.sesion, titulo: d.sesion === "s1" ? "Cardio corto" : "Cardio largo", subtitulo: "Calentamiento · bloque libre · enfriamiento",
      intro: "", nota: "",
      bloques: [
        { id: "cal", tipo: "Calentamiento", min: CARDIO_LIBRE.cal.min, vel: "4,0", inc: "2" },
        { id: "pri", tipo: "Bloque principal", min, vel: "4,0–7,0", inc: "0–8" },
        { id: "enf", tipo: "Enfriamiento", min: CARDIO_LIBRE.enf.min, vel: "3,0", inc: "0" },
      ] };
  }
  return { tipo: "descanso", key: "descanso", titulo: "Descanso" };
}
