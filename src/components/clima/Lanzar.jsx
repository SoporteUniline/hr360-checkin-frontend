"use client";

// Lanzar una encuesta: ¿quién contesta? (toda la empresa, por área/puesto/antigüedad o personas), ¿cuándo? (fechas y
// recordatorio) y ¿por dónde les llega? Se guarda el borrador y luego se lanza (el servidor congela las preguntas).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { ANTIGUEDADES, MINIMO_NOM035, claveAntiguedad, masDias, resumenDestinatarios } from "@/lib/clima/modelo.mjs";
import { Aviso, Boton, Cargando, Tarjeta, Vacio, errorDe, get, ruta } from "./ui";

const hoyMx = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const campo = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";

function Modo({ activo, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`min-h-11 rounded-xl border-2 px-4 text-sm font-semibold ${
        activo ? "border-brand bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Canal({ titulo, detalle, activo, alCambiar, pendiente }) {
  return (
    <label
      className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 ${
        pendiente ? "border-dashed border-slate-300 bg-slate-50" : "border-slate-200 bg-white"
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 size-5 accent-blue-600"
        checked={activo}
        disabled={pendiente}
        onChange={(e) => alCambiar(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">
          {titulo}
          {pendiente ? <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">Próximamente</span> : null}
        </span>
        <span className="block text-[12.5px] text-slate-500">{detalle}</span>
      </span>
    </label>
  );
}

export default function Lanzar({ id, idEmpresa, inicio }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const camp = useSWR(ruta(`/campanias/${id}`, idEmpresa), get, { revalidateOnFocus: false });
  const opciones = useSWR(ruta("/opciones", idEmpresa), get, { revalidateOnFocus: false });
  const [f, setF] = useState(null);
  const [busca, setBusca] = useState("");
  const [lanzando, setLanzando] = useState(false);
  useEffect(() => {
    const c = camp.data?.campania;
    if (!c || f) return;
    const hoy = hoyMx();
    setF({
      nombre: c.nombre,
      abre_el: c.abre_el ?? hoy,
      cierra_el: c.cierra_el ?? masDias(hoy, 10),
      recordatorio_dias: c.recordatorio_dias ?? 3,
      canales: { app: true, correo: true, whatsapp: false, reloj: false, ...c.canales },
      destinatarios: { modo: "todos", areas: [], puestos: [], personas: [], antiguedad: {}, ...c.destinatarios },
    });
  }, [camp.data, f]);
  const destinatarios = f?.destinatarios;
  const previa = useSWR(
    destinatarios ? [ruta("/destinatarios/vista-previa", idEmpresa), JSON.stringify(destinatarios)] : null,
    ([url, d]) => axios.post(url, { destinatarios: JSON.parse(d) }).then((r) => r.data),
    { keepPreviousData: true }
  );
  const personas = useMemo(
    () => (opciones.data?.personas ?? []).filter((p) => !busca || p.nombre.toLowerCase().includes(busca.toLowerCase())).slice(0, 80),
    [opciones.data, busca]
  );

  if (camp.error) return <Vacio titulo="No se pudo abrir la encuesta" texto={errorDe(camp.error)} />;
  if (!f || !opciones.data) return <Cargando />;
  const c = camp.data.campania;
  if (c.estado !== "borrador") {
    return (
      <Vacio titulo="Esta encuesta ya se lanzó" texto="Puedes ver su avance en Encuestas y plantillas.">
        <Link href="/panel/clima/encuestas" className="font-semibold text-brand">
          Ir a encuestas
        </Link>
      </Vacio>
    );
  }
  const d = f.destinatarios;
  const setD = (cambios) => setF((v) => ({ ...v, destinatarios: { ...v.destinatarios, ...cambios } }));
  const alternar = (lista, valor) => (lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);
  const nom = c.tipo === "nom035";
  const preguntas = nom ? null : (c.definicion?.secciones ?? []).reduce((s, x) => s + x.preguntas.length, 0);
  const total = previa.data?.total ?? 0;

  const programar = async () => {
    setLanzando(true);
    try {
      await axios.patch(ruta(`/campanias/${id}`, idEmpresa), { ...f, revision: c.revision });
      const r = await axios.post(ruta(`/campanias/${id}/lanzar`, idEmpresa));
      enqueueSnackbar(`Encuesta programada para ${r.data.invitados} personas.${r.data.aviso ? ` ${r.data.aviso}` : ""}`, {
        variant: r.data.aviso ? "warning" : "success",
      });
      router.push("/panel/clima/encuestas");
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
      setLanzando(false);
      camp.mutate();
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href={nom ? "/panel/clima/encuestas" : `/panel/clima/encuestas/editor/${c.idPlantilla}`}
        className="text-sm font-semibold text-brand"
      >
        ‹ {nom ? "Encuestas" : "Editar preguntas"}
      </Link>
      <h2 className="text-lg font-extrabold text-slate-900">Lanzar «{f.nombre}»</h2>
      {nom ? (
        <Aviso>
          Con {inicio.empresa.activos} trabajadores activos aplica la{" "}
          <strong>{inicio.empresa.guias.map((g) => `Guía ${g}`).join(" y la ")}</strong> de la NOM-035.
          {inicio.empresa.muestraGuiaIII
            ? ` La norma permite una muestra de ${inicio.empresa.muestraGuiaIII} personas, pero se recomienda invitar a todos.`
            : ""}
        </Aviso>
      ) : null}

      <Tarjeta titulo="1 · ¿Quién contesta?">
        <div className="flex flex-wrap gap-2">
          <Modo activo={d.modo === "todos"} onClick={() => setD({ modo: "todos" })}>
            Toda la empresa
          </Modo>
          <Modo activo={d.modo === "filtro"} onClick={() => setD({ modo: "filtro" })}>
            Por área o puesto
          </Modo>
          <Modo activo={d.modo === "personas"} onClick={() => setD({ modo: "personas" })}>
            Personas específicas
          </Modo>
        </div>
        {d.modo === "filtro" ? (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <fieldset className="min-w-0">
              <legend className="text-[13px] font-semibold text-slate-600">Áreas</legend>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {opciones.data.areas.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={d.areas.includes(a)}
                    onClick={() => setD({ areas: alternar(d.areas, a) })}
                    className={`rounded-full border px-3 py-1.5 text-[13px] ${
                      d.areas.includes(a) ? "border-brand bg-blue-50 font-semibold text-blue-900" : "border-slate-300 text-slate-700"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="min-w-0">
              <legend className="text-[13px] font-semibold text-slate-600">Puestos</legend>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {opciones.data.puestos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={d.puestos.includes(p.id)}
                    onClick={() => setD({ puestos: alternar(d.puestos, p.id) })}
                    className={`rounded-full border px-3 py-1.5 text-[13px] ${
                      d.puestos.includes(p.id) ? "border-brand bg-blue-50 font-semibold text-blue-900" : "border-slate-300 text-slate-700"
                    }`}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="min-w-0">
              <span className="text-[13px] font-semibold text-slate-600">Antigüedad</span>
              <select
                className={`${campo} mt-1`}
                value={claveAntiguedad(d.antiguedad)}
                onChange={(e) => {
                  const a = ANTIGUEDADES.find((x) => x.clave === e.target.value);
                  setD({ antiguedad: { minMeses: a.minMeses, maxMeses: a.maxMeses } });
                }}
              >
                {ANTIGUEDADES.map((a) => (
                  <option key={a.clave} value={a.clave}>
                    {a.texto}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        {d.modo === "personas" ? (
          <div className="mt-3">
            <input
              className={campo}
              placeholder="Buscar por nombre"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar persona"
            />
            <ul className="mt-2 grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
              {personas.map((p) => (
                <li key={p.id}>
                  <label className="flex min-h-10 items-center gap-2 rounded-lg px-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="size-4 accent-blue-600"
                      checked={d.personas.includes(p.id)}
                      onChange={() => setD({ personas: alternar(d.personas, p.id) })}
                    />
                    <span className="min-w-0 truncate text-sm">
                      {p.nombre}
                      <span className="text-slate-400"> · {p.area ?? "Sin área"}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {resumenDestinatarios(d, opciones.data.puestos).map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-[12.5px] font-semibold text-slate-700">
              {t}
            </span>
          ))}
          <span className="text-sm">
            <strong className="text-slate-900">{total} personas</strong> la recibirán.
          </span>
        </div>
        {previa.data?.gruposChicos?.length ? (
          <p className="mt-2 text-[12.5px] text-amber-800">
            {nom
              ? `Con menos de ${MINIMO_NOM035} por área (${previa.data.gruposChicos.join(", ")}), esos resultados se verán solo juntos.`
              : `Equipos pequeños (${previa.data.gruposChicos.join(", ")}): las respuestas no llevan nombre, pero RH podría deducir quién contestó.`}
          </p>
        ) : null}
      </Tarjeta>

      <Tarjeta titulo="2 · ¿Cuándo?">
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="text-[13px] font-semibold text-slate-600">Abre</span>
            <input
              type="date"
              className={`${campo} mt-1`}
              value={f.abre_el}
              onChange={(e) => setF((v) => ({ ...v, abre_el: e.target.value }))}
            />
          </label>
          <label>
            <span className="text-[13px] font-semibold text-slate-600">Cierra</span>
            <input
              type="date"
              className={`${campo} mt-1`}
              value={f.cierra_el}
              min={f.abre_el}
              onChange={(e) => setF((v) => ({ ...v, cierra_el: e.target.value }))}
            />
          </label>
          <label>
            <span className="text-[13px] font-semibold text-slate-600">Recordatorio</span>
            <select
              className={`${campo} mt-1`}
              value={f.recordatorio_dias ?? ""}
              onChange={(e) => setF((v) => ({ ...v, recordatorio_dias: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">Sin recordatorio</option>
              {[2, 3, 5, 7].map((n) => (
                <option key={n} value={n}>
                  A los {n} días, a quien no ha contestado
                </option>
              ))}
            </select>
          </label>
        </div>
      </Tarjeta>

      <Tarjeta titulo="3 · ¿Por dónde les llega?">
        <div className="grid gap-2 md:grid-cols-2">
          <Canal
            titulo="App del empleado"
            detalle="Aparece en «Encuestas» de su espacio."
            activo={f.canales.app}
            alCambiar={(v) => setF((x) => ({ ...x, canales: { ...x.canales, app: v } }))}
          />
          <Canal
            titulo="Correo"
            detalle="Invitación y recordatorio, sin liga personal."
            activo={f.canales.correo}
            alCambiar={(v) => setF((x) => ({ ...x, canales: { ...x.canales, correo: v } }))}
          />
          <Canal titulo="WhatsApp" detalle="Liga personal, sin contraseña." activo={false} pendiente alCambiar={() => {}} />
          <Canal titulo="Reloj checador" detalle="Al checar salida: «¿contestas en 5 min?»" activo={false} pendiente alCambiar={() => {}} />
        </div>
      </Tarjeta>

      <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <p className="min-w-0 flex-1 text-sm text-slate-700">
          <strong>{total} personas</strong>
          {preguntas ? ` · ${preguntas} preguntas` : nom ? " · cuestionario oficial" : ""} ·{" "}
          {nom ? "Guía I confidencial y Guía II/III anónima" : "anónima"}
          <span className="block text-[12.5px] text-slate-500">
            Mientras está abierta ves quién falta; los resultados se ven al cerrar (protege el anonimato).
          </span>
        </p>
        <Boton variante="primario" onClick={programar} disabled={lanzando || !total}>
          {lanzando ? "Programando…" : "Programar encuesta"}
        </Boton>
      </div>
    </div>
  );
}
