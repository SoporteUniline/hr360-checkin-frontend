// Iconos (lucide) y color suave por categoría para los desplegables de Asistencias, el reloj, Permisos y el catálogo
// de motivos. Solo presentación: nada de esto cambia valores ni reglas.
//  · Qué pasó, por `rol` del tipo (lib/asistencia/quePasoMotivo.mjs): asistencia ✓ verde, inasistencia ✗ roja,
//    entrada/salida ámbar, medio azul, días de ley violeta.
//  · Motivos, por nombre normalizado (sin emoji ni acentos); uno desconocido lleva etiqueta.
//  · Horas no trabajadas, goce, concepto de la checada y motivos de corrección.
import {
  AlarmClock, ArrowLeftRight, Backpack, Ban, Banknote, Briefcase, CalendarCheck, Car, CircleCheck, CircleMinus, CircleOff,
  CircleX, Clock, ClockPlus, Coins, Copy, FileText, GraduationCap, House, HouseWifi, Keyboard, Lock, LogOut, MapPin, Pencil,
  Presentation, RefreshCcw, SquarePen, Stethoscope, Tag, Thermometer, UserRoundCheck, Users, Utensils, WifiOff, Wrench,
} from "lucide-react";
import { TONOS } from "@/components/ui/SelectConIconos";
import { sinEmoji } from "@/lib/asistencia/tiposGoce.mjs";

const plano = (s) => sinEmoji(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
// Texto mostrado sin el emoji del catálogo (al inicio) ni el 🔒 del final: el icono ya lo dice.
export const textoLimpio = (s) => sinEmoji(String(s ?? "").replace(/\s*🔒\s*$/u, "")) || String(s ?? "");

export const ICONO_ROL = {
  asistencia: { icono: CircleCheck, tono: TONOS.verde },
  inasistencia: { icono: CircleX, tono: TONOS.rojo },
  entrada: { icono: AlarmClock, tono: TONOS.ambar },
  salida: { icono: LogOut, tono: TONOS.ambar },
  medio: { icono: ArrowLeftRight, tono: TONOS.azul },
  ley: { icono: Lock, tono: TONOS.violeta },
  heredado: { icono: FileText, tono: TONOS.gris },
  propio: { icono: Tag, tono: TONOS.gris },
  sistema: { icono: Clock, tono: TONOS.gris },
};
export const iconoRol = (rol) => ICONO_ROL[rol] ?? ICONO_ROL.propio;

const MOTIVOS = [
  [/medic|doctor|consulta/, Stethoscope],
  [/personal/, House],
  [/tramite/, FileText],
  [/escuela|hijo|escolar/, Backpack],
  [/capacitacion|curso/, GraduationCap],
  [/laboral|trabajo/, Briefcase],
  [/enfermedad|enferm/, Thermometer],
  [/familia/, Users],
];
export function iconoMotivo(nombre, { otro = false } = {}) {
  const n = plano(nombre);
  if (otro || /^otro/.test(n)) return { icono: Pencil, tono: TONOS.gris };
  return { icono: MOTIVOS.find(([re]) => re.test(n))?.[1] ?? Tag, tono: TONOS.indigo };
}

export const ICONO_HORAS = {
  reponen: { icono: RefreshCcw, tono: TONOS.azul },
  descuentan: { icono: CircleMinus, tono: TONOS.rojo },
  pagan: { icono: Banknote, tono: TONOS.verde },
};
export const ICONO_GOCE = { con: { icono: Coins, tono: TONOS.verde }, sin: { icono: CircleOff, tono: TONOS.gris } };
export const ICONO_CONCEPTO = {
  jornada: { icono: Briefcase, tono: TONOS.azul },
  comida: { icono: Utensils, tono: TONOS.ambar },
  extra: { icono: ClockPlus, tono: TONOS.violeta },
};
// Permiso por horas de siempre (Permisos): llega tarde / sale antes / sale y regresa.
export const ICONO_TIPO_HORAS = {
  llega_tarde: ICONO_ROL.entrada, sale_antes: ICONO_ROL.salida, sale_regresa: ICONO_ROL.medio,
};
// Motivos de corrección del reloj (motivos.correccion del servidor).
const CORRECCION = {
  olvido: AlarmClock, reloj: Wrench, captura: Keyboard, fuera: MapPin, duplicada: Copy, permiso: CalendarCheck,
  remoto: HouseWifi, comision: Car, evento: Presentation, sin_dispositivo: WifiOff, otro: Pencil,
};
export const iconoCorreccion = (clave) => ({ icono: CORRECCION[String(clave ?? "").replace(/:.*$/, "")] ?? Tag, tono: TONOS.gris });
export const ICONO_AUTORIZA = { persona: { icono: UserRoundCheck, tono: TONOS.azul }, no: { icono: Ban, tono: TONOS.gris } };
export const ICONO_CAMBIA = { si: { icono: SquarePen, tono: TONOS.azul }, no: { icono: Lock, tono: TONOS.gris } };
