"use client";

// Monitor: primera pantalla de RH y dueño. Quién está, quién falta y quién pide atención a esta hora.
// Carga ayer y hoy (los turnos nocturnos de ayer siguen vivos) y se refresca con cada checada.
import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Activity, ArrowRight } from "lucide-react";
import { useAuth, useEmpresaTimezone } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import useAsistenciaData from "@/hooks/useAsistenciaData";
import useRefrescoChecadas from "@/hooks/useRefrescoChecadas";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import ErrorPage from "@/components/ErrorPage";
import { LIMITE_TODOS } from "@/lib/asistencia/consultaPeriodo.mjs";
import { ahoraEn, textoFechaHoy } from "@/lib/asistencia/hoy.mjs";
import { hora12 } from "@/lib/hora12.mjs";
import { cn } from "@/lib/utils";
import { CuentaHorasProvider } from "@/app/panel/registro-asistencia/CuentaHorasContext";
import RelojDiaDialog from "@/app/panel/registro-asistencia/RelojDiaDialog";
import VistaMonitor from "./VistaMonitor";

dayjs.extend(utc);
dayjs.extend(timezone);

const ZONA_BASE = "America/Mexico_City"; // la consulta de asistencias filtra por fecha de CDMX
const RUTA_HISTORIAL = "/panel/registro-asistencia";

function EnlaceHistorial({ className = "" }) {
  return (
    <Link href={RUTA_HISTORIAL}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-slate-200 bg-white px-3.5 text-[13.5px] font-semibold",
        "text-slate-700 hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:min-h-9",
        className,
      )}>
      Ver historial en Asistencias <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

export default function MonitorPage() {
  const { dataUser } = useAuth();
  const isMobile = useIsMobile();
  const idEmpresa = dataUser?.empresas?.length > 0 ? "all" : null;
  const zona = useEmpresaTimezone(idEmpresa);
  const hoy = dayjs().tz(ZONA_BASE).format("YYYY-MM-DD");
  const ayer = dayjs().tz(ZONA_BASE).subtract(1, "day").format("YYYY-MM-DD");

  const { data, error, isLoading, mutate } = useAsistenciaData(
    idEmpresa, ayer, hoy, 1, LIMITE_TODOS, "", [], "", "", false, false, false, false, false, false, "fecha", "desc",
  );
  useRefrescoChecadas(idEmpresa, mutate);
  const registros = Array.isArray(data?.registros) ? data.registros : [];

  // Fecha y hora del encabezado: cambia con el minuto y con cada recarga.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (data) setAhora(new Date());
  }, [data]);
  const hora = hora12(ahoraEn(zona, ahora).hora);

  // Tocar a una persona abre el reloj de su día: la misma ventana con la que se corrige en Asistencias.
  const [relojDe, setRelojDe] = useState(null);

  const contenido = error && !registros.length
    ? <ErrorPage message="No se pudo cargar el Monitor" />
    : <VistaMonitor registros={registros} zona={zona} cargando={isLoading || !idEmpresa} onAbrirDia={setRelojDe} />;

  const ventanaDia = relojDe ? (
    <RelojDiaDialog registro={relojDe} onCerrar={() => setRelojDe(null)} onGuardado={() => mutate()} />
  ) : null;

  // Un solo árbol para celular y escritorio: cruzar el punto de quiebre (girar una tableta) no reinicia filtros ni grupos.
  return (
    <CuentaHorasProvider registros={registros}>
      <div className={isMobile
        ? "-m-5 h-[calc(100dvh-3.5rem)] overflow-y-auto overflow-x-hidden bg-[#f6f7fb] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]"
        : ""}>
        <div className={isMobile ? "space-y-3.5" : "space-y-5"}>
          {isMobile ? (
            <header className="space-y-0.5">
              <h1 className="text-[22px] font-bold leading-tight text-slate-900">Monitor</h1>
              <p className="text-[13px] text-slate-600">{textoFechaHoy(zona, ahora, { corto: true })} · {hora} · se actualiza solo</p>
            </header>
          ) : (
            <EncabezadoPagina icono={Activity} titulo="Monitor" subtitulo={`${textoFechaHoy(zona, ahora)} · ${hora} · se actualiza solo`}
              acciones={<EnlaceHistorial />} />
          )}
          {contenido}
          {isMobile ? <EnlaceHistorial className="w-full justify-center" /> : null}
        </div>
      </div>
      {ventanaDia}
    </CuentaHorasProvider>
  );
}

