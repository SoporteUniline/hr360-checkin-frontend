"use client";

// Mis encuestas: las encuestas abiertas para mí y contestar una pregunta por pantalla. La misma pantalla sirve para
//   - el empleado: /empleado/panel/encuestas (app del empleado);
//   - RH o el dueño que también son empleados: /panel/mis-encuestas (panel), con la empresa de cada encuesta.
// Quién contesta lo decide el servidor con la sesión; aquí solo va la empresa (validada contra la sesión).
import { useEffect } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { ClipboardList } from "lucide-react";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { fechaCorta } from "@/lib/clima/modelo.mjs";
import { RUTA_EMPLEADO, RUTA_PANEL, rutaEncuesta } from "@/lib/clima/pendientes.mjs";
import { BASE, Cargando, Vacio, codigoDe, errorDe, get } from "./ui";
import { LLAVE_MIS_ENCUESTAS } from "./AvisoEncuestas";
import Contestar from "./Contestar";

const AVISO_ANONIMA = "Tu opinión cuenta y es anónima: nadie de tu empresa ve tu nombre junto a tus respuestas.";

function Lista({ base, enPanel }) {
  const { dataUser } = useAuth();
  const { data, error } = useSWR(LLAVE_MIS_ENCUESTAS, get, {
    shouldRetryOnError: false,
  });
  if (error)
    return codigoDe(error) === "SIN_FICHA" || codigoDe(error) === "FICHA_DUPLICADA" ? (
      <Vacio titulo="No encontramos tu ficha de empleado" texto={errorDe(error)} />
    ) : (
      <Vacio titulo="No se pudieron cargar tus encuestas" texto={errorDe(error)} />
    );
  if (!data) return <Cargando />;
  const pendientes = data.encuestas.filter((e) => !e.contestada);
  const hechas = data.encuestas.filter((e) => e.contestada);
  // Con fichas en varias empresas se dice de cuál es cada encuesta.
  const varias = new Set(data.encuestas.map((e) => e.empresa)).size > 1;
  const nombreEmpresa = (id) => dataUser?.empresas_detalle?.find((x) => Number(x.id_empresa) === Number(id))?.nombre;
  return (
    <div className={enPanel ? "space-y-4" : "space-y-4 p-4 pb-24"}>
      {enPanel ? null : (
        <>
          <h1 className="text-xl font-extrabold text-slate-900">Encuestas</h1>
          <p className="text-[14px] text-slate-600">{AVISO_ANONIMA}</p>
        </>
      )}
      {!pendientes.length ? (
        <Vacio titulo="No tienes encuestas pendientes" texto="Cuando tu empresa lance una, aparecerá aquí." />
      ) : (
        <ul className={enPanel ? "grid gap-3 md:grid-cols-2" : "space-y-2"}>
          {pendientes.map((e) => (
            <li key={`${e.empresa}-${e.id}`} className="min-w-0">
              <Link
                href={rutaEncuesta(base, e)}
                className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 active:bg-slate-50"
              >
                <p className="break-words text-[16px] font-bold text-slate-900">{e.nombre}</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  {varias && nombreEmpresa(e.empresa) ? `${nombreEmpresa(e.empresa)} · ` : ""}
                  {e.tipo === "nom035" ? "NOM-035 · cuestionario oficial" : "Encuesta de clima"} · cierra el {fechaCorta(e.cierra_el)}
                </p>
                <span className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-bold text-white">
                  Contestar
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {hechas.length ? (
        <p className="text-[13px] text-slate-500">Ya contestaste: {hechas.map((e) => e.nombre).join(", ")}. ¡Gracias!</p>
      ) : null}
    </div>
  );
}

// Contestar ocupa toda la pantalla (encima del menú y de la barra de la app) para que se lea grande y nada tape
// «Anterior / Siguiente». «‹ Encuestas» regresa a la lista.
function PantallaCompleta({ base, titulo, children }) {
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-white" data-encuesta-pantalla-completa>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-2">
          <Link href={base} className="inline-flex min-h-11 shrink-0 items-center text-[17px] font-semibold text-brand">
            ‹ Encuestas
          </Link>
          <p className="min-w-0 flex-1 truncate text-right text-[15px] font-bold text-slate-700">{titulo}</p>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">{children}</div>
    </div>
  );
}

function Encuesta({ id, empresa, base }) {
  const { mutate } = useSWRConfig();
  const sufijo = empresa ? `?empresa=${empresa}` : "";
  const { data, error } = useSWR(`${BASE}/encuestas/${id}${sufijo}`, get, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const volver = (
    <Link href={base} className="font-semibold text-brand">
      Volver
    </Link>
  );
  if (error)
    return (
      <Vacio titulo="No se pudo abrir la encuesta" texto={errorDe(error)}>
        {volver}
      </Vacio>
    );
  if (!data) return <Cargando />;
  if (data.contestada)
    return (
      <Vacio titulo="Ya contestaste esta encuesta" texto="¡Gracias por tu tiempo!">
        {volver}
      </Vacio>
    );
  // Al enviar se actualiza la lista, el aviso y el número del menú (misma llave SWR).
  const enviar = (cuerpo) =>
    axios.post(`${BASE}/encuestas/${id}/respuestas${sufijo}`, cuerpo).then((r) => {
      mutate(LLAVE_MIS_ENCUESTAS);
      return r;
    });
  return (
    <PantallaCompleta base={base} titulo={data.encuesta.nombre}>
      <Contestar encuesta={data.encuesta} alEnviar={enviar} pantallaCompleta />
    </PantallaCompleta>
  );
}

// base: RUTA_EMPLEADO (app del empleado) o RUTA_PANEL (panel de RH o dueño).
export default function MisEncuestas({ id, empresa = null, base = RUTA_EMPLEADO }) {
  const enPanel = base === RUTA_PANEL;
  const contenido = id ? <Encuesta id={id} empresa={empresa} base={base} /> : <Lista base={base} enPanel={enPanel} />;
  if (!enPanel) return contenido;
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-1">
      <EncabezadoPagina icono={ClipboardList} titulo="Mis encuestas" subtitulo={AVISO_ANONIMA} />
      {contenido}
    </div>
  );
}
