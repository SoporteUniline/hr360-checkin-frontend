"use client";

// Campana «Avisos de los próximos 7 días» (maquetas Main.dc.html y Movil.dc.html): en la barra superior del panel, junto
// a «Reloj checador», para RH y el dueño (toda su empresa) y en la app del empleado para un jefe (solo su equipo; sin
// equipo no aparece). Popover en escritorio y hoja desde abajo en celular. Cumpleaños y aniversarios se felicitan
// (diálogo Felicitar); el fin de contrato solo avisa a RH y lleva al contrato.
import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Bell, Cake, Check, FileClock, Loader2, Medal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEmpresaNomina, SelectorEmpresa } from "@/components/nomina/comun";
import {
  RUTA_CONTRATOS, RUTA_PLANTILLAS, agrupar, descripcion, enDias, esFelicitable, etiquetaCampana, filtrar, filtrosVisibles,
  mensajeError, textoAutomatico, textoContador, textoFelicitado, yaFelicitado,
} from "@/lib/avisos/avisos.mjs";
import { cn } from "@/lib/utils";
import { useAvisos, useSesionAvisos } from "./useAvisos";
import { Ventana } from "./Ventana";
import FelicitarDialog from "./FelicitarDialog";

const ICONOS = {
  cumpleanos: [Cake, "bg-pink-100 text-pink-700"],
  aniversario: [Medal, "bg-violet-100 text-violet-700"],
  contrato: [FileClock, "bg-amber-100 text-amber-800"],
};

// variante: "panel" (barra del panel de RH/dueño) o "empleado" (app del empleado: jefe con equipo).
export default function CampanaAvisos({ variante = "panel" }) {
  const pathname = usePathname();
  const { esRH, esEmpleado } = useSesionAvisos();
  const activo = variante === "panel" ? esRH && Boolean(pathname?.startsWith("/panel")) : esEmpleado;
  const { empresas, idEmpresa, setIdEmpresa } = useEmpresaNomina();
  const empresaPedida = variante === "panel" ? idEmpresa : null;
  // Con varias empresas en la sesión se espera a que se elija una (la primera); sin la lista, la de la sesión.
  const listo = variante !== "panel" || !empresas.length || Boolean(idEmpresa);
  const { data, error, isLoading, isValidating, mutate } = useAvisos({ activo: activo && listo, idEmpresa: empresaPedida });
  const movil = useIsMobile();
  const [abierta, setAbierta] = useState(false);
  const [felicitar, setFelicitar] = useState(null);

  if (!activo) return null;
  // Jefe sin equipo (o aún sin respuesta): no hay campana. RH y dueño la ven siempre.
  if (variante === "empleado" && !data?.visible) return null;

  const total = data?.total ?? 0;
  const contador = textoContador(total);
  const cambiar = (v) => {
    setAbierta(v);
    if (v) mutate(); // al abrir, datos frescos
  };
  const abrirFelicitar = (aviso) => {
    setAbierta(false);
    setFelicitar(aviso);
  };

  const boton = (
    <button
      type="button"
      aria-label={etiquetaCampana(total)}
      aria-haspopup="dialog"
      aria-expanded={abierta}
      data-campana-avisos
      onClick={movil ? () => cambiar(true) : undefined}
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/5 text-brand",
        "hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
      )}
    >
      <Bell aria-hidden="true" className="size-5" />
      {contador ? (
        <span aria-hidden="true" data-contador
          className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[11px] font-bold leading-none text-white">
          {contador}
        </span>
      ) : null}
    </button>
  );

  const panel = (
    <PanelAvisos
      data={data} error={error} cargando={isLoading || (isValidating && !data)} reintentar={() => mutate()}
      empresas={variante === "panel" ? empresas : []} idEmpresa={idEmpresa} setIdEmpresa={setIdEmpresa}
      onFelicitar={abrirFelicitar} cerrar={() => setAbierta(false)} movil={movil}
    />
  );

  return (
    <>
      {movil ? (
        <>
          {boton}
          <Ventana abierta={abierta} onOpenChange={cambiar} hoja titulo="Próximos 7 días" descripcion={data?.alcance === "equipo" ? "Tu equipo" : undefined}>
            {panel}
          </Ventana>
        </>
      ) : (
        <Popover.Root open={abierta} onOpenChange={cambiar}>
          <Popover.Trigger asChild>{boton}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={8} collisionPadding={16} aria-label="Próximos 7 días"
              className="z-50 flex max-h-[min(640px,calc(100dvh-5rem))] w-[440px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.18)] outline-none">
              <div className="flex items-baseline justify-between gap-3 px-[18px] pb-3 pt-[18px]">
                <h2 className="text-[17px] font-extrabold">Próximos 7 días{data?.alcance === "equipo" ? <span className="ml-1.5 text-[13px] font-semibold text-slate-600">· tu equipo</span> : null}</h2>
                {data?.puede_editar_plantillas ? <Link href={RUTA_PLANTILLAS} onClick={() => setAbierta(false)} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-brand hover:underline">Plantillas</Link> : null}
              </div>
              {panel}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
      <FelicitarDialog
        aviso={felicitar} abierta={Boolean(felicitar)} onOpenChange={(v) => { if (!v) setFelicitar(null); }}
        idEmpresa={empresaPedida} puedeEditar={Boolean(data?.puede_editar_plantillas)} movil={movil} onFelicitado={() => mutate()}
      />
    </>
  );
}

function PanelAvisos({ data, error, cargando, reintentar, empresas, idEmpresa, setIdEmpresa, onFelicitar, cerrar, movil }) {
  const ids = useId();
  const [filtro, setFiltro] = useState("todos");
  const avisos = data?.avisos ?? [];
  const filtros = filtrosVisibles(avisos);
  const actual = filtros.some((f) => f.clave === filtro) ? filtro : "todos";
  const grupos = agrupar(filtrar(avisos, actual));
  const pie = textoAutomatico(data?.auto);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {movil && data?.puede_editar_plantillas ? (
        <div className="flex justify-end px-4"><Link href={RUTA_PLANTILLAS} onClick={cerrar} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">Plantillas</Link></div>
      ) : null}
      {empresas.length > 1 ? <div className="px-[18px] pb-2"><SelectorEmpresa empresas={empresas} idEmpresa={idEmpresa} setIdEmpresa={setIdEmpresa} /></div> : null}
      {avisos.length ? (
        <div role="group" aria-label="Filtrar avisos" className={cn("flex gap-1.5 px-4 pb-3 sm:px-[18px]", movil ? "overflow-x-auto" : "flex-wrap")}>
          {filtros.map((f) => {
            const activo = f.clave === actual;
            const contrato = f.clave === "contrato";
            return (
              <button key={f.clave} type="button" aria-pressed={activo} onClick={() => setFiltro(f.clave)}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-3 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  movil ? "h-11" : "h-9",
                  activo ? "bg-slate-900 font-semibold text-white" : contrato ? "border border-amber-300 bg-amber-50 font-semibold text-amber-900" : "border border-slate-200 bg-white text-slate-700",
                )}>
                {f.etiqueta} · {f.n}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite" aria-busy={cargando || undefined}>
        {error && !data ? (
          <div role="alert" className="flex flex-col items-start gap-2 border-t border-slate-100 px-[18px] py-4 text-sm text-red-800">
            {mensajeError(error, "No se pudieron cargar los avisos.")}
            <button type="button" onClick={reintentar} className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold text-slate-900">Reintentar</button>
          </div>
        ) : cargando && !data ? (
          <p role="status" className="flex items-center gap-2 border-t border-slate-100 px-[18px] py-6 text-sm text-slate-600"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Cargando avisos…</p>
        ) : !avisos.length ? (
          <p className="border-t border-slate-100 px-[18px] py-6 text-sm text-slate-600">Sin cumpleaños, aniversarios ni contratos por vencer en los próximos 7 días.</p>
        ) : (
          grupos.map((g) => (
            <section key={g.grupo} aria-labelledby={`${ids}-${g.grupo}`} data-grupo={g.grupo}>
              <h3 id={`${ids}-${g.grupo}`} className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.06em] text-slate-600 sm:px-[18px]">{g.titulo}</h3>
              <ul>
                {g.items.map((a) => <FilaAviso key={a.clave} aviso={a} onFelicitar={onFelicitar} cerrar={cerrar} />)}
              </ul>
            </section>
          ))
        )}
      </div>

      {pie || data?.migracion === false ? (
        <div className="border-t border-slate-200 px-4 py-3 text-[13px] text-slate-600 sm:px-[18px]">
          {pie}
          {data?.migracion === false ? <span className="block">Aún no se guarda a quién ya felicitaste: falta preparar la base de datos.</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function FilaAviso({ aviso: a, onFelicitar, cerrar }) {
  const [Icono, colores] = ICONOS[a.tipo] ?? ICONOS.cumpleanos;
  const contrato = a.tipo === "contrato";
  const felicitado = esFelicitable(a) && yaFelicitado(a);
  return (
    <li data-aviso={a.clave} className={cn("flex items-center gap-3 border-t border-slate-100 px-4 py-3 sm:px-[18px]", contrato && "bg-amber-50")}>
      <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-xl ${colores}`}><Icono className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[14px] sm:text-[14px]">{a.nombre}</b>
        <span className={cn("block text-[13px]", contrato ? "font-semibold text-amber-900" : "text-slate-600")}>{descripcion(a)}</span>
        {felicitado ? <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-green-800"><Check aria-hidden="true" className="size-3.5" />{textoFelicitado(a)}</span> : null}
      </span>
      {contrato ? (
        <Link href={`${RUTA_CONTRATOS}?id=${a.id_contrato}`} onClick={cerrar}
          className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-amber-500 bg-white px-3.5 text-[13px] font-semibold text-amber-900 hover:bg-amber-50">
          Ver contrato
        </Link>
      ) : a.grupo === "semana" ? (
        <span className="shrink-0 text-[13px] text-slate-600">{enDias(a.dias)}</span>
      ) : (
        <button type="button" onClick={() => onFelicitar(a)} aria-label={`Felicitar a ${a.nombre}`}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center rounded-xl px-3.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
            a.grupo === "hoy" && !felicitado ? "bg-brand text-white hover:bg-blue-700" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
          )}>
          Felicitar
        </button>
      )}
    </li>
  );
}
