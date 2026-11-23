"use client";

// Marco común del módulo Nómina (22/11/2026: «homologar diseño»): mismo encabezado, pestañas Nóminas / Bonos y descuentos /
// Préstamos, selector de empresa y botón principal; misma tabla con renglones que llevan al detalle y mismo estado vacío.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { mensajeError } from "./comun";

export const PESTANAS = [
  { href: "/panel/nomina", texto: "Nóminas", subtitulo: "Calcula, revisa y autoriza el pago de tu equipo. Recibos sin timbrar." },
  { href: "/panel/nomina/bonos", texto: "Bonos y descuentos", subtitulo: "Catálogo de bonos y descuentos y a quién se le aplican." },
  { href: "/panel/nomina/prestamos", texto: "Préstamos", subtitulo: "Sin intereses. Se descuentan en la nómina cuando la persona firma su acuerdo." },
];

export function ModuloNomina({ acciones, children }) {
  const pathname = usePathname();
  const actual = [...PESTANAS].reverse().find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`)) ?? PESTANAS[0];
  return (
    <div className="space-y-5 p-1">
      <EncabezadoPagina icono={Wallet} titulo="Nómina" subtitulo={actual.subtitulo} acciones={acciones ? <div className="flex flex-wrap items-center justify-end gap-2">{acciones}</div> : null} />
      <nav aria-label="Secciones de nómina" className="-mt-1 flex gap-1 overflow-x-auto border-b border-slate-200">
        {PESTANAS.map((p) => {
          const activa = p === actual;
          return (
            <Link key={p.href} href={p.href} aria-current={activa ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-[13.5px] font-semibold transition-colors ${activa ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {p.texto}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}

// Encabezado de un detalle: regreso a su sección + título.
export function EncabezadoDetalle({ regreso, textoRegreso, icono, titulo, subtitulo, acciones }) {
  return (
    <>
      <Link href={regreso} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft className="size-4" /> {textoRegreso}</Link>
      <EncabezadoPagina icono={icono} titulo={titulo} subtitulo={subtitulo} acciones={acciones} />
    </>
  );
}

export function Cargando({ texto = "Cargando…" }) {
  return <p role="status" className="text-sm text-slate-500">{texto}</p>;
}

export function ErrorCarga({ error, texto }) {
  return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{mensajeError(error, texto)}</p>;
}

export function Vacio({ titulo, texto, children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-semibold text-[#080d36]">{titulo}</p>
      {texto ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{texto}</p> : null}
      {children ? <div className="mt-4 flex justify-center">{children}</div> : null}
    </div>
  );
}

// Tabla común. columnas: [{ titulo, clase }]; el contenido son <FilaEnlace>.
export function Tabla({ columnas, minimo = 760, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-[13px] tabular-nums" style={{ minWidth: minimo }}>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
            {columnas.map((c, i) => <th key={c.titulo || i} className={`px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500 ${c.clase ?? ""}`}>{c.titulo}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// Renglón que lleva a su detalle: clic (o Enter) en cualquier parte; los botones y enlaces de adentro conservan su acción.
// La primera celda lleva un enlace real (Ctrl/⌘+clic abre otra pestaña y el lector de pantalla lo anuncia).
export function FilaEnlace({ href, etiqueta, children }) {
  const router = useRouter();
  const ir = (e) => {
    if (e.target.closest("a,button,input,select,textarea,label,[data-no-row-click]")) return;
    if (e.metaKey || e.ctrlKey) { window.open(href, "_blank", "noopener"); return; }
    router.push(href);
  };
  return (
    <tr className="cursor-pointer border-t border-slate-100 hover:bg-blue-50/40" onClick={ir}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) router.push(href); }} tabIndex={0} aria-label={etiqueta}>
      {children}
    </tr>
  );
}

export const celda = "px-3 py-2.5";
export function CeldaEnlace({ href, children, secundario }) {
  return (
    <td className={celda}>
      <Link href={href} className="font-semibold text-[#080d36] hover:text-brand hover:underline">{children}</Link>
      {secundario ? <p className="text-[11.5px] text-slate-500">{secundario}</p> : null}
    </td>
  );
}
