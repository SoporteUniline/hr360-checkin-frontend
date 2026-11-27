// Centro de ayuda · piezas de servidor compartidas por las páginas públicas (íconos, chips, encabezado de impresión).
/* eslint-disable @next/next/no-img-element -- logo pequeño para la hoja impresa */
import { Briefcase, BookOpen, Calendar, Clock, Folder, Heart, ListChecks, Megaphone, Package, Rocket, Settings, Smartphone, Sparkles, Target, UserPlus, Users, Wallet } from "lucide-react";
import { NOMBRE_AUDIENCIA } from "@/lib/ayuda/frontmatter.mjs";

const ICONOS = { rocket: Rocket, megaphone: Megaphone, clock: Clock, calendar: Calendar, users: Users, folder: Folder, "user-plus": UserPlus, wallet: Wallet, settings: Settings, heart: Heart, target: Target, briefcase: Briefcase, "list-checks": ListChecks, package: Package, sparkles: Sparkles, smartphone: Smartphone, book: BookOpen };

export function IconoModulo({ nombre, size = 22 }) {
  const Icono = ICONOS[nombre] ?? BookOpen;
  return <span className="ay-icono" aria-hidden="true"><Icono size={size} /></span>;
}

const LARGO_AUDIENCIA = { rh: "Para Recursos Humanos", jefe: "Para jefes de equipo", empleado: "Para empleados", dueno: "Para el dueño de la cuenta" };
export const CORTO_AUDIENCIA = { rh: "RH", jefe: "Jefes", empleado: "Empleados", dueno: "Dueño" };
export function ChipsAudiencia({ audiencia = [], largo = false }) {
  if (!audiencia.length) return null;
  return (
    <ul className="ay-chips" aria-label="Para quién es">
      {audiencia.map((a) => <li key={a} className="ay-chip">{largo ? LARGO_AUDIENCIA[a] ?? NOMBRE_AUDIENCIA[a] ?? a : CORTO_AUDIENCIA[a] ?? a}</li>)}
    </ul>
  );
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const fechaLarga = (f) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(f ?? ""));
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : "";
};

/** Encabezado que solo sale al imprimir o guardar como PDF. */
export function CabezaImpresion({ texto }) {
  return (
    <div className="ay-solo-impresion ay-impresion-cabeza" aria-hidden="true">
      <img src="/assets/logo.png" alt="" width={110} height={30} />
      <span>{texto}</span>
    </div>
  );
}

export function DatosEstructurados({ datos }) {
  // JSON-LD con «<», «>» y «&» escapados (jsonSeguro): no puede cerrar la etiqueta ni inyectar HTML.
  return datos.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: d }} />);
}
