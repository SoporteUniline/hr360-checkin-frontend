"use client";

// Encuestas y plantillas: crear con Adamia AI, las 5 plantillas profesionales (se copian a la empresa), empezar en
// blanco, tus plantillas y el seguimiento de cada encuesta (participación, recordar, cerrar).
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { fechaCorta } from "@/lib/clima/modelo.mjs";
import { Boton, Cargando, ChipEstado, ChipIA, Tarjeta, errorDe, get, ruta } from "./ui";

const COLOR_CATEGORIA = {
  Obligatoria: "bg-red-100 text-red-800",
  Clima: "bg-blue-100 text-blue-800",
  Retención: "bg-emerald-100 text-emerald-800",
  Liderazgo: "bg-amber-100 text-amber-900",
  Pulso: "bg-violet-100 text-violet-800",
};

function TarjetaPlantilla({ t, guias, alUsar, ocupado }) {
  const nom = t.tipo === "nom035";
  const guia = guias.includes("III") ? "Guía III (más de 50)" : guias.includes("II") ? "Guía II (16 a 50)" : "solo Guía I (hasta 15)";
  return (
    <article className={`flex min-w-0 flex-col rounded-2xl border bg-white p-4 ${nom ? "border-red-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${COLOR_CATEGORIA[t.categoria]}`}>
          {t.categoria}
        </span>
        {nom ? <span className="text-[11px] font-semibold text-red-700">Recomendada para ti</span> : null}
      </div>
      <h3 className="mt-2 text-[15px] font-bold text-slate-900">{t.nombre}</h3>
      <p className="mt-1 flex-1 text-[13px] text-slate-600">
        {nom ? (
          <>
            Cuestionario oficial de la STPS. Para tu empresa: <strong>{guia}</strong>. Incluye la Guía I de acontecimientos traumáticos.
          </>
        ) : (
          t.descripcion
        )}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {nom
          ? "Resultados con semáforo oficial"
          : `${t.preguntas} preguntas · ${t.minutos} min${t.abiertas ? ` · ${t.abiertas} abiertas` : ""}${
              t.recurrencia === "mensual" ? " · automática cada mes" : ""
            }`}
      </p>
      <Boton variante={nom ? "primario" : "secundario"} className="mt-3 w-full" disabled={ocupado} onClick={() => alUsar(t)}>
        {nom ? "Aplicar NOM-035" : "Usar plantilla"}
      </Boton>
    </article>
  );
}

function Seguimiento({ c, idEmpresa, alCambiar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [ver, setVer] = useState(false);
  const part = useSWR(ver ? ruta(`/campanias/${c.id}/participacion`, idEmpresa) : null, get);
  const accion = async (fn, exito) => {
    try {
      const r = await fn();
      enqueueSnackbar(exito(r?.data), { variant: "success" });
      alCambiar();
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    }
  };
  const pct = c.invitados ? Math.round((c.contestadas / c.invitados) * 100) : 0;
  const router = useRouter();
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{c.nombre}</p>
          <p className="text-[12.5px] text-slate-500">
            {c.tipo === "nom035"
              ? `NOM-035 · Guías ${(c.guias ?? []).join(" y ") || "por definir"}`
              : c.recurrencia === "mensual"
              ? "Pulso mensual"
              : "Clima"}
            {c.abre_el ? ` · ${fechaCorta(c.abre_el)} al ${fechaCorta(c.cierra_el)}` : ""}
            {c.estado !== "borrador" ? ` · ${c.contestadas} de ${c.invitados} (${pct} %)` : ""}
          </p>
        </div>
        <ChipEstado estado={c.estado} />
        <div className="flex flex-wrap gap-2">
          {c.estado === "borrador" ? <Boton onClick={() => router.push(`/panel/clima/encuestas/lanzar/${c.id}`)}>Continuar</Boton> : null}
          {["activa", "programada"].includes(c.estado) ? (
            <>
              <Boton onClick={() => setVer((v) => !v)} aria-expanded={ver}>
                Participación
              </Boton>
              {c.estado === "activa" ? (
                <Boton
                  onClick={() =>
                    accion(
                      () => axios.post(ruta(`/campanias/${c.id}/recordar`, idEmpresa)),
                      (d) => `Recordatorio encolado para ${d.encolados} persona(s).`
                    )
                  }
                >
                  Recordar
                </Boton>
              ) : null}
              <Boton
                variante="peligro"
                onClick={() =>
                  accion(
                    () => axios.post(ruta(`/campanias/${c.id}/cerrar`, idEmpresa)),
                    () => "Encuesta cerrada. Ya puedes ver los resultados."
                  )
                }
              >
                Cerrar
              </Boton>
            </>
          ) : null}
          {c.estado === "cerrada" ? (
            <Boton variante="fantasma" onClick={() => router.push(c.tipo === "nom035" ? "/panel/clima/nom035" : "/panel/clima")}>
              Ver resultados →
            </Boton>
          ) : null}
        </div>
      </div>
      {ver ? (
        <div className="mt-2 rounded-xl bg-slate-50 p-3">
          {!part.data ? (
            <Cargando />
          ) : (
            <>
              <p className="text-[13px] text-slate-600">Quién ya contestó (nunca qué contestó). Los pendientes reciben el recordatorio.</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {part.data.personas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1 text-[13px]">
                    <span className="min-w-0 truncate">{p.nombre}</span>
                    <span className={p.estado === "contestada" ? "font-semibold text-green-700" : "text-slate-400"}>
                      {p.estado === "contestada" ? "Contestó" : "Pendiente"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

export default function Encuestas({ idEmpresa, inicio }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const campanias = useSWR(ruta("/campanias", idEmpresa), get);
  const plantillas = useSWR(ruta("/plantillas", idEmpresa), get);
  const [ocupado, setOcupado] = useState(false);

  const usar = async (t) => {
    setOcupado(true);
    try {
      if (t.tipo === "nom035") {
        const r = await axios.post(ruta("/campanias", idEmpresa), { tipo: "nom035" });
        router.push(`/panel/clima/encuestas/lanzar/${r.data.campania.id}`);
      } else {
        const r = await axios.post(ruta("/plantillas", idEmpresa), { clave_origen: t.clave });
        router.push(`/panel/clima/encuestas/editor/${r.data.plantilla.id}`);
      }
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
      setOcupado(false);
    }
  };
  const enBlanco = async () => {
    setOcupado(true);
    try {
      const r = await axios.post(ruta("/plantillas", idEmpresa), { nombre: "Encuesta nueva" });
      router.push(`/panel/clima/encuestas/editor/${r.data.plantilla.id}`);
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-[13.5px] text-slate-600">
        Empieza con una plantilla profesional (se puede editar todo) o pídele a Adamia AI que la arme contigo.
      </p>

      <section aria-label="Plantillas profesionales">
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <h2 className="text-[15px] font-bold text-slate-900">Plantillas profesionales</h2>
          <span className="text-[12.5px] text-slate-500">Sin costo · diseñadas por especialistas en RH</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {inicio.catalogo.map((t) => (
            <TarjetaPlantilla key={t.clave} t={t} guias={inicio.empresa.guias} alUsar={usar} ocupado={ocupado} />
          ))}
          <article className="flex min-w-0 flex-col items-start justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-4">
            <h3 className="text-[15px] font-bold text-slate-900">Empezar en blanco</h3>
            <p className="mt-1 text-[13px] text-slate-600">Arma tus propias secciones y preguntas.</p>
            <Boton className="mt-3" disabled={ocupado} onClick={enBlanco}>
              Encuesta en blanco
            </Boton>
          </article>
        </div>
      </section>

      {plantillas.data?.plantillas?.length ? (
        <Tarjeta titulo="Tus plantillas">
          <ul className="divide-y divide-slate-100">
            {plantillas.data.plantillas.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{t.nombre}</span>
                {t.claveOrigen ? (
                  <span className="text-xs text-slate-500">
                    de «{inicio.catalogo.find((c) => c.clave === t.claveOrigen)?.nombre ?? t.claveOrigen}»
                  </span>
                ) : (
                  <ChipIA>propia</ChipIA>
                )}
                <Boton onClick={() => router.push(`/panel/clima/encuestas/editor/${t.id}`)}>Editar y lanzar</Boton>
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : null}

      <Tarjeta titulo="Tus encuestas">
        {!campanias.data ? (
          <Cargando />
        ) : !campanias.data.campanias.length ? (
          <p className="text-sm text-slate-500">Todavía no lanzas encuestas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {campanias.data.campanias.map((c) => (
              <Seguimiento key={c.id} c={c} idEmpresa={idEmpresa} alCambiar={() => campanias.mutate()} />
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
