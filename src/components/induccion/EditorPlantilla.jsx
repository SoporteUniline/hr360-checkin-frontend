"use client";
// Editor de una plantilla de inducción (maqueta 0, aprobada 27/12/2026): 1 · Documentos que pides (catálogo base de
// ADAMIA o propios, obligatorio, antigüedad máxima y vigencia), 2 · Lo que firma (tus formatos de Plantillas de
// documentos) y su ruta de bienvenida (tu contenido), 3 · Tareas y responsables (persona, rol o su jefe directo; plazo
// contado desde el día de ingreso). «Aplica a»: general, un puesto, un área o una sucursal. Se guarda completa con control
// de versión (si alguien más guardó, 409 y se pide recargar). Backend: /checador/induccion/plantillas.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { ChevronDown, ChevronLeft, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
import axios from "@/lib/axios";
import { useEmpresaNomina } from "@/components/nomina/comun";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ALCANCES, API, OPCIONES_DIA, RUTA_PLANTILLAS, TIPOS_PASO, etiquetaDia } from "@/lib/induccion/induccion.mjs";
import { AvisoError, Campo, botonPrimario, botonSecundario, entrada, errorDe, get, opcionesSwr, tarjeta } from "./comun";

const VACIA = { nombre: "", alcance: "general", alcance_valor: "", contenido: { documentos: [], firmas: [], ruta: [], tareas: [] } };
const uid = () => Math.random().toString(36).slice(2, 8);
const mover = (lista, i, d) => { const n = [...lista]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; };

function chipDocumento(d) {
  const partes = [d.obligatorio ? "Obligatorio" : "Opcional"];
  if (d.propio) partes.unshift("Propio");
  if (d.antiguedad_meses) partes.push(`máx. ${d.antiguedad_meses} meses`);
  if (d.vence_meses) partes.push(`vence en ${d.vence_meses === 12 ? "1 año" : `${d.vence_meses} meses`}`);
  return partes.join(" · ");
}

function Botonera({ alSubir, alBajar, alQuitar, nombre }) {
  return (
    <span className="flex shrink-0 gap-1">
      <button type="button" aria-label={`Subir ${nombre}`} onClick={alSubir} className="grid size-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:size-8"><ChevronUp className="size-4" aria-hidden="true" /></button>
      <button type="button" aria-label={`Bajar ${nombre}`} onClick={alBajar} className="grid size-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:size-8"><ChevronDown className="size-4" aria-hidden="true" /></button>
      <button type="button" aria-label={`Quitar ${nombre}`} onClick={alQuitar} className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 lg:size-8"><Trash2 className="size-4" aria-hidden="true" /></button>
    </span>
  );
}

function DialogoDocumento({ abierto, alCerrar, catalogo, usados, alAgregar }) {
  const [modo, setModo] = useState("base");
  const [clave, setClave] = useState("");
  const [propio, setPropio] = useState({ nombre: "", categoria: "Identificación", caras: 1, vence_meses: "", obligatorio: true });
  const [error, setError] = useState("");
  const disponibles = (catalogo?.documentos_base ?? []).filter((d) => !usados.includes(d.clave));
  const agregar = (e) => {
    e.preventDefault();
    if (modo === "base") {
      const d = disponibles.find((x) => x.clave === clave);
      if (!d) { setError("Elige un documento."); return; }
      alAgregar({ ...d, obligatorio: true, propio: false });
    } else {
      if (propio.nombre.trim().length < 2) { setError("Escribe el nombre del documento."); return; }
      alAgregar({ clave: `propio_${uid()}`, nombre: propio.nombre.trim(), categoria: propio.categoria, caras: Number(propio.caras), vence_meses: propio.vence_meses ? Number(propio.vence_meses) : null, antiguedad_meses: null, obligatorio: propio.obligatorio, propio: true, tipo: "archivo" });
    }
    setClave(""); setPropio({ nombre: "", categoria: "Identificación", caras: 1, vence_meses: "", obligatorio: true }); setError(""); alCerrar();
  };
  return (
    <Dialog open={abierto} onOpenChange={(a) => { if (!a) alCerrar(); }}>
      <DialogContent>
        <form onSubmit={agregar} noValidate className="grid gap-4">
          <DialogHeader><DialogTitle>Agregar documento</DialogTitle><DialogDescription>Elige del catálogo de ADAMIA o agrega uno propio de tu empresa.</DialogDescription></DialogHeader>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only">Tipo de documento</legend>
            {[["base", "Del catálogo"], ["propio", "Propio"]].map(([v, t]) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"><input type="radio" name="modo-doc" checked={modo === v} onChange={() => { setModo(v); setError(""); }} className="size-5 accent-[#2563EB]" />{t}</label>
            ))}
          </fieldset>
          {modo === "base" ? (
            <Campo id="doc-base" etiqueta="Documento" error={error}>
              <select id="doc-base" className={entrada} value={clave} onChange={(e) => { setClave(e.target.value); setError(""); }} aria-invalid={Boolean(error)}>
                <option value="">Elegir…</option>
                {disponibles.map((d) => <option key={d.clave} value={d.clave}>{d.nombre}</option>)}
              </select>
            </Campo>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo id="doc-propio" etiqueta="Nombre" error={error} className="sm:col-span-2"><input id="doc-propio" className={entrada} value={propio.nombre} maxLength={150} onChange={(e) => { setPropio({ ...propio, nombre: e.target.value }); setError(""); }} aria-invalid={Boolean(error)} /></Campo>
              <Campo id="doc-cat" etiqueta="Carpeta del expediente"><select id="doc-cat" className={entrada} value={propio.categoria} onChange={(e) => setPropio({ ...propio, categoria: e.target.value })}>{(catalogo?.categorias ?? []).map((c) => <option key={c}>{c}</option>)}</select></Campo>
              <Campo id="doc-caras" etiqueta="Fotos"><select id="doc-caras" className={entrada} value={propio.caras} onChange={(e) => setPropio({ ...propio, caras: e.target.value })}><option value={1}>Una</option><option value={2}>Frente y vuelta</option></select></Campo>
              <Campo id="doc-vence" etiqueta="Vence (meses, opcional)"><input id="doc-vence" type="number" min={1} max={120} inputMode="numeric" className={entrada} value={propio.vence_meses} onChange={(e) => setPropio({ ...propio, vence_meses: e.target.value })} /></Campo>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-[#2563EB]" checked={propio.obligatorio} onChange={(e) => setPropio({ ...propio, obligatorio: e.target.checked })} />Obligatorio</label>
            </div>
          )}
          <DialogFooter className="gap-2"><button type="button" className={botonSecundario} onClick={alCerrar}>Cancelar</button><button type="submit" className={botonPrimario}>Agregar</button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SelectResponsable({ id, valor, catalogo, alCambiar, error }) {
  const v = !valor ? "" : valor.tipo === "jefe" ? "jefe" : valor.tipo === "rol" ? `rol:${valor.id_rol}` : `persona:${valor.id_empleado}`;
  const cambiar = (e) => {
    const [tipo, n] = e.target.value.split(":");
    alCambiar(!tipo ? null : tipo === "jefe" ? { tipo: "jefe" } : tipo === "rol" ? { tipo: "rol", id_rol: Number(n) } : { tipo: "persona", id_empleado: Number(n) });
  };
  return (
    <select id={id} aria-label="Responsable" aria-invalid={Boolean(error)} className={entrada} value={v} onChange={cambiar}>
      <option value="">Elegir…</option>
      <option value="jefe">Su jefe directo</option>
      <optgroup label="Roles">{(catalogo?.roles ?? []).map((r) => <option key={r.id_rol} value={`rol:${r.id_rol}`}>{r.persona ? `${r.persona.split(" ")[0]} (${r.nombre})` : `${r.nombre} (sin persona)`}</option>)}</optgroup>
      <optgroup label="Personas">{(catalogo?.personas ?? []).map((p) => <option key={p.id} value={`persona:${p.id}`}>{p.nombre}</option>)}</optgroup>
    </select>
  );
}

function EditorPaso({ paso, i, error, alCambiar }) {
  const set = (k) => (e) => alCambiar({ ...paso, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
      <Campo id={`paso-${i}-tipo`} etiqueta="Tipo"><select id={`paso-${i}-tipo`} className={entrada} value={paso.tipo} onChange={set("tipo")}>{Object.entries(TIPOS_PASO).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Campo>
      <Campo id={`paso-${i}-titulo`} etiqueta="Título" error={error(`ruta.${i}.titulo`)}><input id={`paso-${i}-titulo`} className={entrada} value={paso.titulo} maxLength={120} onChange={set("titulo")} /></Campo>
      <Campo id={`paso-${i}-desc`} etiqueta="Descripción corta" className="sm:col-span-2"><input id={`paso-${i}-desc`} className={entrada} value={paso.descripcion ?? ""} maxLength={160} onChange={set("descripcion")} /></Campo>
      {["contenido", "curso"].includes(paso.tipo) ? (
        <>
          <Campo id={`paso-${i}-texto`} etiqueta="Texto" className="sm:col-span-2"><textarea id={`paso-${i}-texto`} className={`${entrada} min-h-20 py-2`} value={paso.texto ?? ""} maxLength={4000} onChange={set("texto")} /></Campo>
          <Campo id={`paso-${i}-video`} etiqueta="Video (enlace https)" error={error(`ruta.${i}.video_url`)}><input id={`paso-${i}-video`} className={entrada} inputMode="url" value={paso.video_url ?? ""} onChange={set("video_url")} placeholder="https://" /></Campo>
          <Campo id={`paso-${i}-pdf`} etiqueta="PDF (enlace https)" error={error(`ruta.${i}.pdf_url`)}><input id={`paso-${i}-pdf`} className={entrada} inputMode="url" value={paso.pdf_url ?? ""} onChange={set("pdf_url")} placeholder="https://" /></Campo>
        </>
      ) : null}
      {paso.tipo === "encuesta" ? (
        <Campo id={`paso-${i}-ciclo`} etiqueta="Encuesta de Clima" error={error(`ruta.${i}.ciclo`)} ayuda="La de ciclo de vida que ya tienes en Clima; se abre sola.">
          <select id={`paso-${i}-ciclo`} className={entrada} value={paso.ciclo ?? ""} onChange={set("ciclo")}><option value="">Elegir…</option><option value="ingreso30">A los 30 días</option><option value="ingreso90">A los 90 días</option></select>
        </Campo>
      ) : null}
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-[#2563EB]" checked={Boolean(paso.obligatorio)} onChange={set("obligatorio")} />Obligatorio</label>
    </div>
  );
}

export default function EditorPlantilla({ id }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const empresa = useEmpresaNomina();
  const nueva = id === "nueva";
  const q = empresa.idEmpresa ? `?empresa=${empresa.idEmpresa}` : null;
  const remota = useSWR(!nueva && q ? `${API}/plantillas/${id}${q}` : null, get, opcionesSwr);
  const catalogo = useSWR(q ? `${API}/catalogo${q}` : null, get, opcionesSwr);
  const [f, setF] = useState(nueva ? VACIA : null);
  const [version, setVersion] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [dialogoDoc, setDialogoDoc] = useState(false);
  const [abierto, setAbierto] = useState(null); // paso en edición
  useEffect(() => {
    const p = remota.data?.plantilla;
    if (p && !f) { setF({ nombre: p.nombre, alcance: p.alcance, alcance_valor: p.alcance_valor ?? "", contenido: p.contenido }); setVersion(p.version); }
  }, [remota.data, f]);
  const c = catalogo.data;
  const nombreEmpresa = empresa.empresas.find((e) => e.id === empresa.idEmpresa)?.nombre;
  const error = (k) => errores[k];
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrores((e) => ({ ...e, [k]: undefined })); };
  const setC = (k, v) => setF((x) => ({ ...x, contenido: { ...x.contenido, [k]: typeof v === "function" ? v(x.contenido[k]) : v } }));
  const valores = useMemo(() => ({ puesto: c?.puestos ?? [], area: c?.areas ?? [], sucursal: c?.sucursales ?? [] }), [c]);

  const guardar = async () => {
    setGuardando(true);
    setErrores({});
    try {
      const cuerpo = { empresa: empresa.idEmpresa, nombre: f.nombre, alcance: f.alcance, alcance_valor: f.alcance === "general" ? null : f.alcance_valor, contenido: f.contenido };
      const r = nueva ? await axios.post(`${API}/plantillas`, cuerpo) : await axios.put(`${API}/plantillas/${id}`, { ...cuerpo, version });
      enqueueSnackbar("Plantilla guardada. Los ingresos nuevos ya la usan; los que están en proceso siguen con la suya.", { variant: "success" });
      if (nueva) router.replace(`${RUTA_PLANTILLAS}/${r.data.plantilla.id}`);
      else { setVersion(r.data.plantilla.version); setF({ ...f, contenido: r.data.plantilla.contenido }); }
    } catch (e) {
      setErrores(e?.response?.data?.campos ?? {});
      enqueueSnackbar(errorDe(e, "No se pudo guardar la plantilla."), { variant: "error" });
    } finally { setGuardando(false); }
  };
  const archivar = async () => {
    try {
      await axios.post(`${API}/plantillas/${id}/archivar`, { empresa: empresa.idEmpresa });
      router.push(RUTA_PLANTILLAS);
    } catch (e) { enqueueSnackbar(errorDe(e), { variant: "error" }); }
  };

  if (remota.error) return <div className="mx-auto max-w-6xl p-1"><AvisoError error={remota.error} porDefecto="No se pudo abrir la plantilla." /></div>;
  if (!f) return <p role="status" className="p-5 text-sm text-slate-500">Cargando plantilla…</p>;
  const k = f.contenido;
  const resumenErrores = Object.values(errores).filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-1" data-pantalla="editor-plantilla">
      <header className="grid gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link href={RUTA_PLANTILLAS} aria-label="Regresar a Plantillas de inducción" className="grid size-11 shrink-0 place-items-center rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"><ChevronLeft className="size-5" aria-hidden="true" /></Link>
          <div className="min-w-0">
            <p className="text-[13px] font-bold tracking-wide text-slate-500">CONFIGURACIÓN DE TU EMPRESA{nombreEmpresa ? ` · ${nombreEmpresa.toUpperCase()}` : ""}</p>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-[26px]">Plantilla de inducción{f.nombre ? `: ${f.nombre}` : ""}</h1>
            <p className="text-sm text-slate-600">Tú decides qué se pide, qué se firma y quién hace cada cosa. ADAMIA trae una sugerida para empezar.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] md:items-end">
          <Campo id="pl-nombre" etiqueta="Nombre" error={error("nombre")}><input id="pl-nombre" className={entrada} value={f.nombre} maxLength={120} onChange={(e) => set("nombre", e.target.value)} aria-invalid={Boolean(error("nombre"))} /></Campo>
          <Campo id="pl-alcance" etiqueta="Aplica a" error={error("alcance_valor")}>
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
              <select id="pl-alcance" className={entrada} value={f.alcance} onChange={(e) => { set("alcance", e.target.value); set("alcance_valor", ""); }}>{ALCANCES.map((a) => <option key={a.valor} value={a.valor}>{a.valor === "general" ? "General" : a.texto}</option>)}</select>
              {f.alcance !== "general" ? (
                <select aria-label="¿Cuál?" className={entrada} value={f.alcance_valor} onChange={(e) => set("alcance_valor", e.target.value)} aria-invalid={Boolean(error("alcance_valor"))}>
                  <option value="">Elegir…</option>{valores[f.alcance].map((x) => <option key={x}>{x}</option>)}
                </select>
              ) : <span className="flex min-h-11 items-center text-[13px] text-slate-500">Toda la empresa</span>}
            </div>
          </Campo>
          <button type="button" onClick={guardar} disabled={guardando || !empresa.idEmpresa} className={botonPrimario}><Save className="size-4" aria-hidden="true" />{guardando ? "Guardando…" : "Guardar plantilla"}</button>
        </div>
      </header>
      {resumenErrores.length ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b>Revisa:</b> {resumenErrores.slice(0, 4).join(" · ")}</div> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-label="Documentos que pides" className={`${tarjeta} grid content-start gap-3 p-4`}>
          <div><h2 className="text-base font-bold text-slate-900">1 · Documentos que pides</h2><p className="text-[13px] text-slate-500">Elige del catálogo o agrega los tuyos.</p></div>
          <ul className="grid gap-2">
            {k.documentos.map((d, i) => (
              <li key={d.clave} className="grid gap-2 rounded-lg border border-slate-200 p-2.5" data-doc={d.clave}>
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0"><b className="block text-sm text-slate-900">{d.nombre}</b><span className={`text-[13px] ${d.obligatorio ? "text-blue-800" : "text-slate-500"}`}>{chipDocumento(d)}</span></span>
                  <Botonera nombre={d.nombre} alSubir={() => setC("documentos", (l) => mover(l, i, -1))} alBajar={() => setC("documentos", (l) => mover(l, i, 1))} alQuitar={() => setC("documentos", (l) => l.filter((_, j) => j !== i))} />
                </div>
                <label className="flex min-h-11 items-center gap-2 text-[13px]"><input type="checkbox" className="size-5 accent-[#2563EB]" checked={d.obligatorio} onChange={(e) => setC("documentos", (l) => l.map((x, j) => (j === i ? { ...x, obligatorio: e.target.checked } : x)))} />Obligatorio</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-[13px] text-slate-600">Antigüedad máx. (meses)
                    <input type="number" min={1} max={24} inputMode="numeric" placeholder="Sin límite" className={entrada} value={d.antiguedad_meses ?? ""} onChange={(e) => setC("documentos", (l) => l.map((x, j) => (j === i ? { ...x, antiguedad_meses: e.target.value ? Number(e.target.value) : null } : x)))} />
                  </label>
                  <label className="grid gap-1 text-[13px] text-slate-600">Vence en (meses)
                    <input type="number" min={1} max={120} inputMode="numeric" placeholder="No vence" className={entrada} value={d.vence_meses ?? ""} onChange={(e) => setC("documentos", (l) => l.map((x, j) => (j === i ? { ...x, vence_meses: e.target.value ? Number(e.target.value) : null } : x)))} />
                  </label>
                </div>
                {error(`documentos.${i}.nombre`) || error(`documentos.${i}.vence_meses`) || error(`documentos.${i}.antiguedad_meses`) ? <span className="text-[13px] text-red-700">{error(`documentos.${i}.nombre`) || error(`documentos.${i}.vence_meses`) || error(`documentos.${i}.antiguedad_meses`)}</span> : null}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setDialogoDoc(true)} className={`${botonSecundario} border-dashed`}><Plus className="size-4" aria-hidden="true" />Agregar documento</button>
        </section>

        <section aria-label="Lo que firma" className={`${tarjeta} grid content-start gap-3 p-4`}>
          <div><h2 className="text-base font-bold text-slate-900">2 · Lo que firma y su ruta</h2><p className="text-[13px] text-slate-500">Tus propios formatos, de Plantillas de documentos.</p></div>
          <ul className="grid gap-2">
            {k.firmas.map((fi, i) => (
              <li key={fi.id_plantilla_doc} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5" data-firma={fi.id_plantilla_doc}>
                <span className="min-w-0 text-sm text-slate-900">{fi.nombre} <span className="block text-[13px] text-slate-500">tu formato «{c?.formatos?.find((x) => x.id === fi.id_plantilla_doc)?.nombre ?? fi.nombre}» · {fi.obligatorio !== false ? "obligatorio" : "opcional"}</span>{error(`firmas.${i}`) ? <span className="block text-[13px] text-red-700">{error(`firmas.${i}`)}</span> : null}</span>
                <Botonera nombre={fi.nombre} alSubir={() => setC("firmas", (l) => mover(l, i, -1))} alBajar={() => setC("firmas", (l) => mover(l, i, 1))} alQuitar={() => setC("firmas", (l) => l.filter((_, j) => j !== i))} />
              </li>
            ))}
          </ul>
          <label htmlFor="agregar-formato" className="text-sm font-semibold text-slate-800">Agregar formato a firmar</label>
          <select id="agregar-formato" className={entrada} value="" onChange={(e) => { const fo = c?.formatos?.find((x) => x.id === Number(e.target.value)); if (fo) setC("firmas", (l) => [...l, { id_plantilla_doc: fo.id, nombre: fo.nombre, obligatorio: true }]); }}>
            <option value="">{c?.formatos?.length ? "Elegir de tus Plantillas de documentos…" : "Aún no tienes formatos en Gestión documental"}</option>
            {(c?.formatos ?? []).filter((fo) => !k.firmas.some((x) => x.id_plantilla_doc === fo.id)).map((fo) => <option key={fo.id} value={fo.id}>{fo.nombre}</option>)}
          </select>

          <h3 className="mt-2 text-sm font-bold text-slate-800">Ruta de bienvenida (tu contenido)</h3>
          <ul className="grid gap-2">
            {k.ruta.map((p, i) => (
              <li key={p.id} className="grid gap-2 rounded-lg border border-slate-200 p-2.5" data-paso={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setAbierto(abierto === p.id ? null : p.id)} aria-expanded={abierto === p.id} className="min-h-11 min-w-0 flex-1 text-left text-sm text-slate-900">
                    <b>{p.titulo || "Paso sin título"}</b> <span className="block text-[13px] text-slate-500">{TIPOS_PASO[p.tipo]}{p.obligatorio ? " · obligatorio" : ""}{p.video_url ? " · video" : ""}{p.pdf_url ? " · PDF" : ""}</span>
                  </button>
                  <Botonera nombre={p.titulo || "paso"} alSubir={() => setC("ruta", (l) => mover(l, i, -1))} alBajar={() => setC("ruta", (l) => mover(l, i, 1))} alQuitar={() => setC("ruta", (l) => l.filter((_, j) => j !== i))} />
                </div>
                {abierto === p.id || Object.keys(errores).some((e) => e.startsWith(`ruta.${i}.`)) ? <EditorPaso paso={p} i={i} error={error} alCambiar={(n) => setC("ruta", (l) => l.map((x, j) => (j === i ? n : x)))} /> : null}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => { const n = { id: `paso_${uid()}`, tipo: "contenido", titulo: "", descripcion: "", texto: "", obligatorio: false }; setC("ruta", (l) => [...l, n]); setAbierto(n.id); }} className={`${botonSecundario} border-dashed`}><Plus className="size-4" aria-hidden="true" />Agregar paso</button>
        </section>

        <section aria-label="Tareas y responsables" className={`${tarjeta} grid content-start gap-3 p-4`}>
          <div><h2 className="text-base font-bold text-slate-900">3 · Tareas y responsables</h2><p className="text-[13px] text-slate-500">Quién hace qué y cuándo, contado desde el día de ingreso.</p></div>
          <ul className="grid gap-2">
            {k.tareas.map((t, i) => (
              <li key={t.id} className="grid gap-2 rounded-lg border border-slate-200 p-2.5" data-tarea={t.id}>
                <div className="flex items-start gap-1">
                  <input aria-label="Tarea" className={`${entrada} min-w-0 flex-1`} value={t.titulo} maxLength={200} onChange={(e) => setC("tareas", (l) => l.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))} aria-invalid={Boolean(error(`tareas.${i}.titulo`))} />
                  <Botonera nombre={t.titulo || "tarea"} alSubir={() => setC("tareas", (l) => mover(l, i, -1))} alBajar={() => setC("tareas", (l) => mover(l, i, 1))} alQuitar={() => setC("tareas", (l) => l.filter((_, j) => j !== i))} />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
                  <SelectResponsable id={`t-${t.id}-resp`} valor={t.responsable} catalogo={c} error={error(`tareas.${i}.responsable`)} alCambiar={(r) => setC("tareas", (l) => l.map((x, j) => (j === i ? { ...x, responsable: r } : x)))} />
                  <select aria-label="Cuándo" className={entrada} value={t.dia ?? 1} onChange={(e) => setC("tareas", (l) => l.map((x, j) => (j === i ? { ...x, dia: Number(e.target.value) } : x)))}>
                    {[...new Set([...OPCIONES_DIA.map((o) => o.valor), t.dia ?? 1])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>{etiquetaDia(d)}</option>)}
                  </select>
                </div>
                <label className="flex min-h-11 items-center gap-2 text-[13px]"><input type="checkbox" className="size-5 accent-[#2563EB]" checked={t.liga === "activos"} onChange={(e) => setC("tareas", (l) => l.map((x, j) => (j === i ? { ...x, liga: e.target.checked ? "activos" : null } : x)))} />Ligar a Activos y uniformes (entrega)</label>
                {error(`tareas.${i}.titulo`) || error(`tareas.${i}.responsable`) || error(`tareas.${i}.dia`) ? <span className="text-[13px] text-red-700">{error(`tareas.${i}.titulo`) || error(`tareas.${i}.responsable`) || error(`tareas.${i}.dia`)}</span> : null}
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-slate-500">Responsable: una persona, un rol (RH, Sistemas) o «su jefe directo», que se resuelve con cada ingreso.{c && !c.tareas_activo ? " Activa el módulo Tareas para que cada una llegue como tarea al responsable." : ""}</p>
          <button type="button" onClick={() => setC("tareas", (l) => [...l, { id: `t_${uid()}`, titulo: "", descripcion: "", responsable: { tipo: "jefe" }, dia: 1, liga: null }])} className={`${botonSecundario} border-dashed`}><Plus className="size-4" aria-hidden="true" />Agregar tarea</button>
        </section>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-slate-500">Puedes tener una plantilla general y otras por puesto, área o sucursal. Cambiar la plantilla no afecta a quien ya está en proceso.</p>
        {!nueva ? <button type="button" onClick={archivar} className={`${botonSecundario} text-red-700`}><Trash2 className="size-4" aria-hidden="true" />Archivar plantilla</button> : null}
      </div>
      <DialogoDocumento abierto={dialogoDoc} alCerrar={() => setDialogoDoc(false)} catalogo={c} usados={k.documentos.map((d) => d.clave)} alAgregar={(d) => setC("documentos", (l) => [...l, d])} />
    </div>
  );
}
