// Apoyos de las pantallas de nómina (R1). Puras: scripts/test-nomina.mjs.
export const PERIODICIDADES = ["Semanal", "Catorcenal", "Quincenal", "Mensual", "Diario", "Por hora"];

export const ESTADOS = {
  borrador: { texto: "Borrador", tono: "gris" },
  por_autorizar: { texto: "Por autorizar", tono: "ambar" },
  autorizado: { texto: "Autorizada", tono: "verde" },
  cancelado: { texto: "Cancelada", tono: "rojo" },
};

export const ENVIOS = {
  pendiente: { texto: "Enviando…", tono: "azul" },
  enviado: { texto: "Enviado", tono: "verde" },
  sin_correo: { texto: "Sin correo", tono: "ambar" },
  error: { texto: "No se envió", tono: "rojo" },
};

export const dinero = (v) => Number(v || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const aFecha = (s) => new Date(`${s}T00:00:00Z`);
const texto = (d) => d.toISOString().slice(0, 10);
const sumar = (s, n) => texto(new Date(aFecha(s).getTime() + n * 86400000));

// Fechas sugeridas para una nómina nueva según la periodicidad, a partir de «hoy» (AAAA-MM-DD).
export function periodoSugerido(periodicidad, hoy) {
  const d = aFecha(hoy);
  const lunes = sumar(hoy, -((d.getUTCDay() + 6) % 7));
  const anio = d.getUTCFullYear();
  const mes = d.getUTCMonth();
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const iso = (dia) => texto(new Date(Date.UTC(anio, mes, dia)));
  switch (periodicidad) {
    case "Semanal":
    case "Por hora":
      return { inicio: lunes, fin: sumar(lunes, 6) };
    case "Catorcenal":
      return { inicio: lunes, fin: sumar(lunes, 13) };
    case "Quincenal":
      return d.getUTCDate() <= 15 ? { inicio: iso(1), fin: iso(15) } : { inicio: iso(16), fin: iso(ultimo) };
    case "Mensual":
      return { inicio: iso(1), fin: iso(ultimo) };
    default:
      return { inicio: hoy, fin: hoy };
  }
}

export const fechaCorta = (s) => {
  if (!s) return "—";
  const [a, m, d] = String(s).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

// Qué acciones ve cada quien según el estado (el backend vuelve a validar todo).
export function acciones(estado, puedeAutorizar) {
  return {
    recalcular: estado === "borrador",
    editar: estado === "borrador",
    enviar: estado === "borrador",
    regresar: estado === "por_autorizar",
    autorizar: estado === "por_autorizar" && puedeAutorizar,
    cancelar: ["borrador", "por_autorizar"].includes(estado) || (estado === "autorizado" && puedeAutorizar),
    reenviar: estado === "autorizado",
  };
}
