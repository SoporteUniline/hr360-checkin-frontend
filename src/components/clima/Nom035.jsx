"use client";

// Resultados NOM-035: calificación final con semáforo oficial, categorías y dominios, Guía I confidencial (canalizar a
// valoración clínica), obligaciones de la norma e informe PDF para inspección de la STPS.
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { descargar } from "@/components/nomina/comun";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NIVELES, ORDEN_NIVELES, fechaCorta } from "@/lib/clima/modelo.mjs";
import { Aviso, Boton, Cargando, ChipEstado, ChipNivel, Tarjeta, Vacio, errorDe, get, ruta } from "./ui";

const hoyMx = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

function Escala({ nivel }) {
  return (
    <ol className="mt-3 grid grid-cols-5 gap-1" aria-label="Niveles de riesgo">
      {ORDEN_NIVELES.map((k) => (
        <li
          key={k}
          aria-current={k === nivel ? "true" : undefined}
          className={`rounded-lg px-1 py-2 text-center text-[11.5px] font-bold ${
            k === nivel ? `${NIVELES[k].fondo} ${NIVELES[k].tinta} ring-2 ring-offset-1 ring-current` : "bg-slate-50 text-slate-400"
          }`}
        >
          {NIVELES[k].texto}
        </li>
      ))}
    </ol>
  );
}

function GuiaI({ idEmpresa, campania }) {
  const { enqueueSnackbar } = useSnackbar();
  const [abierto, setAbierto] = useState(false);
  const g = useSWR(ruta(`/campanias/${campania.id}/guia1`, idEmpresa), get);
  const canalizar = async (p, canalizado) => {
    // Se marca al instante y se confirma con el servidor.
    g.mutate(
      (d) => ({
        ...d,
        personas: d.personas.map((x) => (x.id === p.id ? { ...x, canalizadoEn: canalizado ? new Date().toISOString() : null } : x)),
      }),
      false
    );
    try {
      await axios.patch(ruta(`/guia1/${p.id}`, idEmpresa), { canalizado, nota: p.nota ?? "" });
      g.mutate();
      enqueueSnackbar(canalizado ? `${p.nombre}: marcado como canalizado.` : "Se quitó la marca de canalizado.", { variant: "success" });
    } catch (e) {
      g.mutate();
      enqueueSnackbar(errorDe(e), { variant: "error" });
    }
  };
  const n = g.data?.requierenValoracion ?? 0;
  return (
    <Tarjeta titulo="Guía I · acontecimientos traumáticos" className="border-amber-200 bg-amber-50/40">
      {!g.data ? (
        <Cargando />
      ) : (
        <>
          <p className="text-[14px] text-slate-800">
            <strong>
              {n} {n === 1 ? "persona requiere" : "personas requieren"} valoración clínica.
            </strong>{" "}
            Confidencial: solo lo ven RH y el dueño.
          </p>
          <p className="mt-1 text-[12.5px] text-slate-500">
            {g.data.contestadas} cuestionarios de la Guía I contestados. Nunca aparece en reportes generales ni en el informe.
          </p>
          <Boton className="mt-3" onClick={() => setAbierto(true)} disabled={!g.data.personas.length}>
            Ver y canalizar →
          </Boton>
        </>
      )}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Guía I · confidencial</DialogTitle>
            <DialogDescription>
              Canaliza a la institución de seguridad social o privada, o al médico de la empresa (numeral 5.5).
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {(g.data?.personas ?? []).map((p) => (
              <li key={p.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 font-semibold text-slate-900">
                    {p.nombre}
                    <span className="font-normal text-slate-500"> · {p.area ?? "Sin área"}</span>
                  </span>
                  {p.requiereValoracion ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Requiere valoración</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Vivió un acontecimiento · sin criterios
                    </span>
                  )}
                </div>
                {p.motivos.length ? (
                  <ul className="mt-1 list-disc pl-5 text-[12.5px] text-slate-600">
                    {p.motivos.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                ) : null}
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-blue-600"
                    checked={Boolean(p.canalizadoEn)}
                    onChange={(e) => canalizar(p, e.target.checked)}
                  />
                  {p.canalizadoEn ? `Canalizado${p.canalizadoPor ? ` por ${p.canalizadoPor}` : ""}` : "Marcar como canalizado"}
                </label>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </Tarjeta>
  );
}

function Obligaciones({ idEmpresa, obligaciones }) {
  const { enqueueSnackbar } = useSnackbar();
  const c = useSWR(ruta("/nom035/cumplimiento", idEmpresa), get);
  const marcar = async (k, si) => {
    const nuevo = { ...c.data.cumplimiento, [k]: si ? hoyMx() : null };
    c.mutate({ ...c.data, cumplimiento: nuevo }, false);
    try {
      await axios.put(ruta("/nom035/cumplimiento", idEmpresa), nuevo);
      c.mutate();
    } catch (e) {
      c.mutate();
      enqueueSnackbar(errorDe(e), { variant: "error" });
    }
  };
  const marca = { politica: "politica_en", difusion: "difusion_en", programa: "programa_en" };
  return (
    <Tarjeta titulo="Obligaciones de la norma">
      <ul className="space-y-2">
        {obligaciones.map((o) => {
          const k = marca[o.clave];
          const hecho = k ? c.data?.cumplimiento?.[k] : o.clave === "guia1" || o.clave === "registros" ? true : null;
          return (
            <li key={o.clave} className="flex items-start gap-2 text-[13.5px]">
              {k ? (
                <input
                  type="checkbox"
                  aria-label={o.texto}
                  className="mt-0.5 size-5 shrink-0 accent-green-600"
                  checked={Boolean(hecho)}
                  onChange={(e) => marcar(k, e.target.checked)}
                />
              ) : (
                <span
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                    hecho ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {hecho ? "✓" : "•"}
                </span>
              )}
              <span className="min-w-0 text-slate-700">
                {o.texto}
                {o.proxima ? (
                  <strong className="text-slate-900">
                    {" "}
                    Próxima: {fechaCorta(o.proxima)} {o.proxima.slice(0, 4)}.
                  </strong>
                ) : null}
                {k && hecho ? <span className="text-green-700"> Hecho el {fechaCorta(hecho)}.</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </Tarjeta>
  );
}

export default function Nom035({ idEmpresa, inicio, extra = null }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const lista = useSWR(ruta("/campanias", idEmpresa), get);
  const nom = (lista.data?.campanias ?? []).filter((c) => c.tipo === "nom035" && c.estado !== "borrador");
  const [elegida, setElegida] = useState(null);
  const campania = nom.find((c) => c.id === elegida) ?? nom.find((c) => c.estado === "cerrada") ?? nom[0];
  const res = useSWR(campania ? ruta(`/campanias/${campania.id}/resultados`, idEmpresa) : null, get);
  const [bajando, setBajando] = useState(false);
  if (lista.error) return <Vacio titulo="No se pudo cargar la NOM-035" texto={errorDe(lista.error)} />;
  if (!lista.data) return <Cargando />;

  const aplicar = async () => {
    try {
      const r = await axios.post(ruta("/campanias", idEmpresa), { tipo: "nom035" });
      router.push(`/panel/clima/encuestas/lanzar/${r.data.campania.id}`);
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    }
  };
  const guias = inicio.empresa.guias;
  if (!campania) {
    return (
      <Vacio
        titulo="Aún no aplicas la NOM-035"
        texto={`Con ${inicio.empresa.activos} trabajadores activos te toca la ${guias
          .map((g) => `Guía ${g}`)
          .join(" y la ")}. Se aplica en línea, la Guía I va confidencial y la II/III anónima.`}
      >
        <Boton variante="primario" onClick={aplicar}>
          Aplicar NOM-035
        </Boton>
      </Vacio>
    );
  }
  const r = res.data;
  const n = r?.nom035;
  const guiaTxt =
    r?.guia === "III"
      ? "Guía de referencia III (más de 50 trabajadores)"
      : r?.guia === "II"
      ? "Guía de referencia II (16 a 50 trabajadores)"
      : "Guía de referencia I (hasta 15 trabajadores)";
  const bajar = async () => {
    setBajando(true);
    try {
      await descargar(axios, ruta(`/campanias/${campania.id}/informe`, idEmpresa), `informe-nom035-${campania.id}.pdf`);
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally {
      setBajando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-slate-900">NOM-035 · Factores de riesgo psicosocial</h2>
          <p className="text-[13px] text-slate-500">
            {guiaTxt} · aplicada del {fechaCorta(campania.abre_el)} al {fechaCorta(campania.cierra_el)} · {campania.contestadas} de{" "}
            {campania.invitados} contestaron
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {nom.length > 1 ? (
            <select
              aria-label="Aplicación"
              className="h-10 rounded-xl border border-slate-300 bg-white px-2 text-sm"
              value={campania.id}
              onChange={(e) => setElegida(Number(e.target.value))}
            >
              {nom.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} · {fechaCorta(c.cierra_el)}
                </option>
              ))}
            </select>
          ) : null}
          <ChipEstado estado={campania.estado} />
          <Boton variante="primario" onClick={bajar} disabled={bajando || !r?.campania || r.campania.estado !== "cerrada"}>
            {bajando ? "Preparando…" : "Informe para inspección STPS"}
          </Boton>
        </div>
      </div>
      {!r ? (
        <Cargando />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            {n ? (
              <>
                <Tarjeta titulo="Calificación final del cuestionario">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <p className={`text-[34px] font-extrabold leading-none ${NIVELES[n.final.nivel].tinta}`}>
                      {NIVELES[n.final.nivel].texto}
                    </p>
                    <p className="text-sm text-slate-500">
                      promedio {n.final.valor} · {n.respuestas} cuestionarios
                    </p>
                  </div>
                  <Escala nivel={n.final.nivel} />
                  <p className="mt-3 text-[13.5px] text-slate-700">{n.accion}</p>
                </Tarjeta>
                <Tarjeta titulo="Por categoría y dominio">
                  <ul className="space-y-3">
                    {n.categorias.map((c) => (
                      <li key={c.nombre} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-0 flex-1 font-semibold text-slate-900">{c.nombre}</span>
                          <span className="text-sm text-slate-500">{c.valor}</span>
                          <ChipNivel nivel={c.nivel} />
                        </div>
                        <ul className="mt-2 space-y-1">
                          {c.dominios.map((d) => (
                            <li key={d.nombre} className="flex flex-wrap items-center gap-2 pl-3 text-[13.5px]">
                              <span className="min-w-0 flex-1 text-slate-700">{d.nombre}</span>
                              <span className="text-slate-500">{d.valor}</span>
                              <ChipNivel nivel={d.nivel} />
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[12px] text-slate-500">
                    Calificación del centro: promedio de los cuestionarios. Distribución por nivel:{" "}
                    {ORDEN_NIVELES.map((k) => `${NIVELES[k].texto} ${n.distribucion[k]}`).join(" · ")}.
                  </p>
                </Tarjeta>
              </>
            ) : (
              <Aviso tono={r.campania.estado === "cerrada" ? "alerta" : "info"}>{r.motivo}</Aviso>
            )}
            {extra ? extra({ resultado: r }) : null}
          </div>
          <div className="min-w-0 space-y-4">
            {(campania.guias ?? []).includes("I") ? <GuiaI idEmpresa={idEmpresa} campania={campania} /> : null}
            <Obligaciones idEmpresa={idEmpresa} obligaciones={r.obligaciones ?? []} />
            <p className="text-[12px] text-slate-500">
              Fuente: {r.fuente?.publicacion ?? "DOF 23/10/2018"}. Cuestionarios transcritos palabra por palabra del Diario Oficial.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
