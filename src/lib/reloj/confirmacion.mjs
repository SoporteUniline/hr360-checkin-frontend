// Chips de la confirmación al checar (reloj de la empresa y app del empleado, aprobado 27/11/2026). Lógica pura: los
// datos los manda el servidor (backend: services/confirmacionChecada.js) como campos ADITIVOS de la respuesta:
//   puntualidad { estado: 'a_tiempo' | 'retardo' | 'sin_horario' | 'salio_antes', minutos, con_permiso? },
//   salida_programada 'HH:mm' | null, regreso_comida 'HH:mm' | null.
// Si un campo no viene (servidor viejo, checada pendiente o sin horario) no se muestra nada de él.
// Probado en scripts/test-reloj-confirmacion.mjs.
import { hora12 } from "../hora12.mjs";

const HORA = /^\d{1,2}:\d{2}/;
const minutosValidos = (m) => m != null && Number.isFinite(Number(m)) && Number(m) > 0;

// tono: 'verde' | 'ambar' | 'neutro'. Orden: puntualidad primero, después la hora que le importa.
export function chipsConfirmacion(data) {
  if (!data || typeof data !== "object" || data.pending) return [];
  const chips = [];
  const p = data.puntualidad;
  const estado = p && typeof p === "object" ? p.estado : null;
  if (estado === "a_tiempo") chips.push(p.con_permiso ? { clave: "permiso", texto: "Entró con permiso", tono: "verde" } : { clave: "a_tiempo", texto: "A tiempo", tono: "verde" });
  else if (estado === "retardo" && minutosValidos(p.minutos)) chips.push({ clave: "retardo", texto: `Retardo · ${Number(p.minutos)} min`, tono: "ambar" });
  else if (estado === "salio_antes" && minutosValidos(p.minutos)) chips.push({ clave: "salio_antes", texto: `Salió antes · ${Number(p.minutos)} min`, tono: "ambar" });
  if (HORA.test(String(data.regreso_comida ?? ""))) {
    chips.push({ clave: "regreso", texto: `Regresa a las ${hora12(data.regreso_comida)}`, tono: "neutro" });
  } else if (HORA.test(String(data.salida_programada ?? "")) && esEntrada(data)) {
    // «Tu salida» solo al entrar: al salir ya no ayuda (y al salir antes lo dice el chip ámbar).
    chips.push({ clave: "salida", texto: `Tu salida: ${hora12(data.salida_programada)}`, tono: "neutro" });
  }
  return chips;
}

// La entrada se reconoce por su puntualidad de entrada o por el mensaje de siempre («Entrada registrada»).
function esEntrada(data) {
  const estado = data?.puntualidad?.estado;
  if (estado === "a_tiempo" || estado === "retardo" || estado === "sin_horario") return true;
  if (estado === "salio_antes") return false;
  return /entrada/i.test(String(data?.movimiento || data?.message || ""));
}

export const TONOS_CHIP = {
  verde: "bg-emerald-100 text-emerald-800",
  ambar: "bg-amber-100 text-amber-800",
  neutro: "bg-white text-slate-700 ring-1 ring-slate-200",
};
