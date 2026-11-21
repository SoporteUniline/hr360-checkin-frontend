import { ARTICULOS } from "@/lib/blog/articulos";

// Opciones del formulario de pop-ups (panel de ADAMIA).
export const PAGINAS = [
  { valor: "todas", texto: "Todas las páginas" },
  { valor: "inicio", texto: "Inicio" },
  { valor: "blog", texto: "Lista del blog" },
  { valor: "articulos", texto: "Artículos del blog" },
];

export const DISPARADORES = [
  { valor: "tiempo", texto: "A los X segundos" },
  { valor: "scroll", texto: "Al bajar parte de la página" },
  { valor: "salida", texto: "Al intentar salir (en celular: a los 20 s)" },
];

export const DISPOSITIVOS = [
  { valor: "todos", texto: "Escritorio y celular" },
  { valor: "escritorio", texto: "Solo escritorio" },
  { valor: "celular", texto: "Solo celular" },
];

// A dónde lleva el botón: páginas de venta, blog, artículos o una dirección propia.
export const ENLACES = [
  { valor: "/cotiza", texto: "Cotizar" },
  { valor: "/contratar-plan", texto: "Contratar plan" },
  { valor: "/contacto", texto: "Solicitar demo (contacto)" },
  { valor: "/blog", texto: "Blog" },
  ...ARTICULOS.map((a) => ({ valor: `/blog/${a.slug}`, texto: `Artículo: ${a.titulo}` })),
];

export const VACIO = {
  nombre: "",
  titulo: "",
  texto: "",
  boton_texto: "Cotizar ahora",
  boton_url: "/cotiza",
  cupon: "",
  paginas: ["todas"],
  disparador: "tiempo",
  segundos: 8,
  scroll_pct: 50,
  frecuencia_dias: 7,
  dispositivos: "todos",
  fecha_inicio: "",
  fecha_fin: "",
  prioridad: 0,
  estado: "pausado",
};

// "2026-11-27 09:00:00" → "2026-11-27T09:00" (input datetime-local).
export const aInputFecha = (v) => (v ? String(v).replace(" ", "T").slice(0, 16) : "");

export const textoDe = (lista, valor) => lista.find((o) => o.valor === valor)?.texto ?? valor;
