// Catálogos fijos de la app: categorías, tipos, colores, temporadas y estilos.

export const CATS = [
  { id: "arriba", nombre: "Arriba", singular: "Parte de arriba", plural: "Partes de arriba" },
  { id: "abajo", nombre: "Abajo", singular: "Parte de abajo", plural: "Partes de abajo" },
  { id: "vestido", nombre: "Vestidos", singular: "Vestido o mono", plural: "Vestidos y monos" },
  { id: "encima", nombre: "Abrigos", singular: "Abrigo o chaqueta", plural: "Abrigos y chaquetas" },
  { id: "calzado", nombre: "Calzado", singular: "Calzado", plural: "Calzado" },
];
export const cat = (id) => CATS.find((c) => c.id === id) || CATS[0];

// Tipo de prenda: decide el dibujo cuando no hay foto.
export const TIPOS = {
  arriba: [{ id: "tee", nombre: "Camiseta" }, { id: "shirt", nombre: "Camisa / blusa" }, { id: "sweater", nombre: "Jersey / sudadera" }],
  abajo: [{ id: "pants", nombre: "Pantalón" }, { id: "skirt", nombre: "Falda" }],
  vestido: [{ id: "dress", nombre: "Vestido" }],
  encima: [{ id: "jacket", nombre: "Chaqueta / blazer" }, { id: "sweater", nombre: "Chaqueta de punto" }],
  calzado: [{ id: "shoe", nombre: "Zapato / zapatilla" }],
};

// n = neutro: combina con todo.
export const COLORES = [
  { id: "blanco", nombre: "Blanco", hex: "#F5F5F2", n: true },
  { id: "crudo", nombre: "Crudo", hex: "#EDE4D3", n: true },
  { id: "beige", nombre: "Beige", hex: "#D6C3A1", n: true },
  { id: "camel", nombre: "Camel", hex: "#C08A55", n: true },
  { id: "marron", nombre: "Marrón", hex: "#6B4A33", n: true },
  { id: "gris", nombre: "Gris", hex: "#8E908C", n: true },
  { id: "negro", nombre: "Negro", hex: "#1F1F1F", n: true },
  { id: "marino", nombre: "Azul marino", hex: "#24345C", n: true },
  { id: "vaquero", nombre: "Vaquero", hex: "#4E6E96", n: true },
  { id: "caqui", nombre: "Caqui", hex: "#7D7650", n: true },
  { id: "azul", nombre: "Azul", hex: "#3E7CC9" },
  { id: "celeste", nombre: "Celeste", hex: "#9CC3E6" },
  { id: "verde", nombre: "Verde", hex: "#4F7A5A" },
  { id: "amarillo", nombre: "Amarillo", hex: "#E6C34A" },
  { id: "naranja", nombre: "Naranja", hex: "#E07B39" },
  { id: "rojo", nombre: "Rojo", hex: "#B23A3A" },
  { id: "burdeos", nombre: "Burdeos", hex: "#6E2233" },
  { id: "rosa", nombre: "Rosa", hex: "#E8A2B4" },
  { id: "morado", nombre: "Morado", hex: "#6E4C8E" },
  { id: "lila", nombre: "Lila", hex: "#B7A7C6" },
  { id: "estampado", nombre: "Estampado", hex: "#B08FA0", estampado: true },
];
export const color = (id) => COLORES.find((c) => c.id === id) || COLORES[0];

// Parejas de colores llamativos que no se juntan en un mismo look.
export const CHOQUES = [["rojo", "rosa"], ["rojo", "naranja"], ["rosa", "naranja"], ["rojo", "burdeos"], ["morado", "naranja"], ["verde", "rojo"]];

export const TEMPORADAS = [
  { id: "primavera", nombre: "Primavera" },
  { id: "verano", nombre: "Verano" },
  { id: "otono", nombre: "Otoño" },
  { id: "invierno", nombre: "Invierno" },
];
export const ESTILOS = [
  { id: "casual", nombre: "Casual" },
  { id: "oficina", nombre: "Oficina" },
  { id: "fiesta", nombre: "Fiesta" },
  { id: "deporte", nombre: "Deporte" },
  { id: "casa", nombre: "Estar en casa" },
];

// Temporada de una fecha (hemisferio norte).
export function temporadaDe(d = new Date()) {
  const m = d.getMonth() + 1, dia = d.getDate(), k = m * 100 + dia;
  if (k >= 321 && k < 621) return "primavera";
  if (k >= 621 && k < 923) return "verano";
  if (k >= 923 && k < 1221) return "otono";
  return "invierno";
}

// Prendas de ejemplo para probar la app (sin foto: se dibujan).
export const EJEMPLOS = [
  { nombre: "Camisa vaquera", cat: "arriba", tipo: "shirt", color: "vaquero", temporadas: ["primavera", "otono"], estilos: ["casual", "oficina"] },
  { nombre: "Camiseta blanca", cat: "arriba", tipo: "tee", color: "blanco", temporadas: [], estilos: ["casual", "casa", "deporte"] },
  { nombre: "Jersey camel", cat: "arriba", tipo: "sweater", color: "camel", temporadas: ["otono", "invierno"], estilos: ["casual", "oficina"] },
  { nombre: "Blusa rosa", cat: "arriba", tipo: "shirt", color: "rosa", temporadas: ["primavera", "verano"], estilos: ["oficina", "fiesta"] },
  { nombre: "Vaquero recto", cat: "abajo", tipo: "pants", color: "vaquero", temporadas: [], estilos: ["casual"] },
  { nombre: "Chino beige", cat: "abajo", tipo: "pants", color: "beige", temporadas: ["primavera", "verano", "otono"], estilos: ["casual", "oficina"] },
  { nombre: "Pantalón negro", cat: "abajo", tipo: "pants", color: "negro", temporadas: [], estilos: ["oficina", "fiesta"] },
  { nombre: "Falda midi verde", cat: "abajo", tipo: "skirt", color: "verde", temporadas: ["primavera", "otono"], estilos: ["casual", "oficina"] },
  { nombre: "Vestido rojo", cat: "vestido", tipo: "dress", color: "rojo", temporadas: ["primavera", "verano"], estilos: ["fiesta"] },
  { nombre: "Blazer negra", cat: "encima", tipo: "jacket", color: "negro", temporadas: ["primavera", "otono", "invierno"], estilos: ["oficina", "fiesta", "casual"] },
  { nombre: "Cárdigan crudo", cat: "encima", tipo: "sweater", color: "crudo", temporadas: ["otono", "invierno"], estilos: ["casual", "casa"] },
  { nombre: "Botines marrones", cat: "calzado", tipo: "shoe", color: "marron", temporadas: ["otono", "invierno"], estilos: ["casual", "oficina"] },
  { nombre: "Zapatillas blancas", cat: "calzado", tipo: "shoe", color: "blanco", temporadas: [], estilos: ["casual", "deporte"] },
  { nombre: "Salones negros", cat: "calzado", tipo: "shoe", color: "negro", temporadas: [], estilos: ["oficina", "fiesta"] },
];
