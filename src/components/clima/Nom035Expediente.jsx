"use client";

// NOM-035 lista para inspección (26/11/2026): por centro de trabajo (sucursal), lista de verificación por numeral,
// política editable con acuses, evidencias con archivo, registro de difusión, programa de intervención con avance y el
// expediente en un solo PDF. API: /nom035/centros, /nom035/expediente(/pdf), /nom035/politica, /nom035/evidencias,
// /nom035/difusiones y el plan de acción de siempre (/campanias/:id/acciones, /acciones/:id).
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { descargar } from "@/components/nomina/comun";
import SelectorEmpleado from "@/components/nomina/SelectorEmpleado";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fechaCorta } from "@/lib/clima/modelo.mjs";
import {
  ESTADO_LISTA, MEDIOS, TIPOS_EVIDENCIA, erroresDifusion, erroresEvidencia, hoyMx, tamano,
} from "@/lib/clima/inspeccion.mjs";
import { Aviso, Boton, Cargando, Tarjeta, Vacio, codigoDe, errorDe, get, ruta } from "./ui";
import { TEXTO_PREPARANDO, usePrepararFoto } from "@/lib/imagenes/usePrepararFoto";

const CAMPO = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900";
const ETIQUETA = "mb-1 block text-[13px] font-semibold text-slate-700";
const ESTADOS_ACCION = { pendiente: "Pendiente", en_curso: "En curso", lograda: "Lograda", no_lograda: "No lograda" };

function Falla({ texto }) {
  return texto ? <span className="mt-1 block text-[13px] text-red-700">{texto}</span> : null;
}

function ChipLista({ estado }) {
  const e = ESTADO_LISTA[estado] ?? ESTADO_LISTA.falta;
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-bold ${e.clase}`}>{e.texto}</span>;
}

function Lista({ x }) {
  return (
    <Tarjeta titulo="Lista de verificación por numeral" accion={<span className="text-[13px] font-semibold text-slate-600">Avance {x.resumen.avance} %</span>}>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Avance ${x.resumen.avance} %`}>
        <div className="h-full rounded-full bg-green-600" style={{ width: `${x.resumen.avance}%` }} />
      </div>
      <ul className="divide-y divide-slate-100">
        {x.lista.map((i) => (
          <li key={i.clave} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5">
            <span className="w-full shrink-0 text-[13px] font-bold text-slate-500 sm:w-24">{i.numeral}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-slate-900">{i.titulo}</span>
              <span className="block text-[13px] text-slate-600">{i.detalle}</span>
            </span>
            <ChipLista estado={i.estado} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-slate-500">{x.nota}</p>
    </Tarjeta>
  );
}

function Politica({ idEmpresa }) {
  const { enqueueSnackbar } = useSnackbar();
  const p = useSWR(ruta("/nom035/politica", idEmpresa), get);
  const [texto, setTexto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  if (!p.data) return <Tarjeta titulo="Política de prevención (5.1)">{p.error ? <Aviso tono="alerta">{errorDe(p.error)}</Aviso> : <Cargando />}</Tarjeta>;
  const pol = p.data.politica;
  const guardar = async (publicar) => {
    setGuardando(true);
    try {
      await axios.put(ruta("/nom035/politica", idEmpresa), { texto, revision: pol?.revision ?? null, publicar });
      enqueueSnackbar(publicar ? "Política publicada: ya se puede acusar de leído en la app." : "Política guardada.", { variant: "success" });
      setTexto(null);
      p.mutate();
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Tarjeta
      titulo="Política de prevención (5.1)"
      accion={
        <Boton variante={pol ? "secundario" : "primario"} onClick={() => setTexto(pol?.texto ?? p.data.modelo)}>
          {pol ? "Editar" : "Redactar con el modelo"}
        </Boton>
      }
    >
      {pol ? (
        <p className="text-[13.5px] text-slate-700">
          Revisión {pol.revision}
          {pol.publicada_en ? ` · publicada el ${fechaCorta(pol.publicada_en)} ${pol.publicada_en.slice(0, 4)}` : " · sin publicar"}.{" "}
          <strong>
            {p.data.acuses} de {p.data.activos}
          </strong>{" "}
          personas acusaron de leído en su app.
        </p>
      ) : (
        <p className="text-[13.5px] text-slate-600">Aún no hay política. Empieza con el modelo y ajústalo a tu empresa (no es asesoría legal).</p>
      )}
      <Dialog open={texto !== null} onOpenChange={(v) => !v && setTexto(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Política de prevención de riesgos psicosociales</DialogTitle>
            <DialogDescription>Al publicar, cada persona la ve en su app y puede acusar de leído. Publicar otra vez pide acuses nuevos.</DialogDescription>
          </DialogHeader>
          <label className="block">
            <span className="sr-only">Texto de la política</span>
            <textarea
              className="min-h-[50vh] w-full rounded-xl border border-slate-300 p-3 text-[14px] leading-relaxed"
              value={texto ?? ""}
              onChange={(e) => setTexto(e.target.value)}
            />
          </label>
          <DialogFooter className="gap-2">
            <Boton onClick={() => guardar(false)} disabled={guardando}>
              Guardar borrador
            </Boton>
            <Boton variante="primario" onClick={() => guardar(true)} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar y publicar"}
            </Boton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tarjeta>
  );
}

function Evidencias({ idEmpresa, idCentro, idCampania, alCambiar }) {
  const { enqueueSnackbar } = useSnackbar();
  const q = idCentro ? `?centro=${idCentro}` : "";
  const ev = useSWR(ruta(`/nom035/evidencias${q}`, idEmpresa), get);
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState({ tipo: "", descripcion: "", fecha: hoyMx(), archivo: null });
  const [errores, setErrores] = useState({});
  const [subiendo, setSubiendo] = useState(false);
  // (27/11/2026) Una evidencia que es foto se convierte a WebP (2400 px, < 900 KB) al elegirla; el PDF va tal cual.
  // El expediente en PDF solo LISTA las evidencias (no incrusta la imagen), así que WebP no lo afecta.
  const { preparando, preparar } = usePrepararFoto("documento");
  const elegirArchivo = async (elegido) => {
    setErrores((x) => ({ ...x, archivo: undefined }));
    if (!elegido || elegido.type === "application/pdf" || /\.pdf$/i.test(elegido.name ?? "")) { setDatos((d) => ({ ...d, archivo: elegido ?? null })); return; }
    const foto = await preparar(elegido);
    if (foto.error) { setDatos((d) => ({ ...d, archivo: null })); setErrores((x) => ({ ...x, archivo: foto.error })); return; }
    setDatos((d) => ({ ...d, archivo: foto.archivo }));
  };
  const subir = async (e) => {
    e.preventDefault();
    if (preparando) return;
    const errs = erroresEvidencia(datos);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    const f = new FormData();
    f.append("archivo", datos.archivo);
    f.append("tipo", datos.tipo);
    f.append("descripcion", datos.descripcion.trim());
    f.append("fecha", datos.fecha);
    if (idCentro) f.append("id_centro", String(idCentro));
    if (idCampania) f.append("id_campania", String(idCampania));
    setSubiendo(true);
    try {
      await axios.post(ruta("/nom035/evidencias", idEmpresa), f, { headers: { "Content-Type": "multipart/form-data" } });
      enqueueSnackbar("Evidencia guardada en el expediente.", { variant: "success" });
      setAbierto(false);
      setDatos({ tipo: "", descripcion: "", fecha: hoyMx(), archivo: null });
      ev.mutate();
      alCambiar();
    } catch (err) {
      enqueueSnackbar(errorDe(err), { variant: "error" });
    } finally {
      setSubiendo(false);
    }
  };
  const abrir = async (x) => {
    try {
      const r = await axios.get(ruta(`/nom035/evidencias/${x.id}/archivo`, idEmpresa));
      window.open(r.data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      enqueueSnackbar(errorDe(err), { variant: "error" });
    }
  };
  const quitar = async (x) => {
    if (!window.confirm(`¿Quitar «${x.descripcion}» del expediente? El archivo se conserva en el historial.`)) return;
    try {
      await axios.delete(ruta(`/nom035/evidencias/${x.id}`, idEmpresa));
      ev.mutate();
      alCambiar();
    } catch (err) {
      enqueueSnackbar(errorDe(err), { variant: "error" });
    }
  };
  const lista = ev.data?.evidencias ?? [];
  return (
    <Tarjeta titulo="Evidencias con archivo" accion={<Boton onClick={() => setAbierto(true)}>Subir evidencia</Boton>}>
      {!ev.data ? (
        <Cargando />
      ) : !lista.length ? (
        <p className="text-[13.5px] text-slate-600">Sube la política firmada, listas de asistencia, constancias de canalización y fotos de la capacitación.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {lista.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-slate-900">{x.descripcion}</span>
                <span className="block text-[13px] text-slate-500">
                  {TIPOS_EVIDENCIA[x.tipo]} · {fechaCorta(x.fecha)} · {tamano(x.bytes)}
                </span>
              </span>
              <Boton variante="fantasma" onClick={() => abrir(x)} aria-label={`Ver ${x.nombre}`}>
                Ver
              </Boton>
              <Boton variante="fantasma" className="text-red-700 hover:bg-red-50" onClick={() => quitar(x)} aria-label={`Quitar ${x.descripcion}`}>
                Quitar
              </Boton>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Subir evidencia</DialogTitle>
            <DialogDescription>PDF o imagen de hasta 10 MB. Se guarda en almacenamiento privado; solo RH y el dueño la ven.</DialogDescription>
          </DialogHeader>
          <form onSubmit={subir} className="space-y-3" noValidate>
            <label className="block">
              <span className={ETIQUETA}>Obligación</span>
              <select className={CAMPO} value={datos.tipo} onChange={(e) => setDatos({ ...datos, tipo: e.target.value })}>
                <option value="">Elige…</option>
                {Object.entries(TIPOS_EVIDENCIA).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <Falla texto={errores.tipo} />
            </label>
            <label className="block">
              <span className={ETIQUETA}>Descripción</span>
              <input className={CAMPO} maxLength={300} value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} />
              <Falla texto={errores.descripcion} />
            </label>
            <label className="block">
              <span className={ETIQUETA}>Fecha</span>
              <input type="date" className={CAMPO} value={datos.fecha} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })} />
              <Falla texto={errores.fecha} />
            </label>
            <label className="block">
              <span className={ETIQUETA}>Archivo</span>
              <input type="file" accept="application/pdf,image/*" className="block w-full text-[14px]" disabled={preparando} onChange={(e) => elegirArchivo(e.target.files?.[0])} />
              {preparando ? <span role="status" className="mt-1 block text-[13px] text-slate-600">{TEXTO_PREPARANDO}</span> : null}
              <Falla texto={errores.archivo} />
            </label>
            <DialogFooter>
              <Boton type="submit" variante="primario" disabled={subiendo || preparando}>
                {subiendo ? "Subiendo…" : "Guardar evidencia"}
              </Boton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Tarjeta>
  );
}

function Difusion({ idEmpresa, idCentro, aplicaciones, alCambiar }) {
  const { enqueueSnackbar } = useSnackbar();
  const d = useSWR(ruta("/nom035/difusiones", idEmpresa), get);
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState({ tipo: "resultados", medio: "reunion", fecha: hoyMx(), personas: "", descripcion: "", id_campania: aplicaciones[0]?.id ?? "" });
  const [errores, setErrores] = useState({});
  const guardar = async (e) => {
    e.preventDefault();
    const errs = erroresDifusion(datos);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    try {
      await axios.post(ruta("/nom035/difusiones", idEmpresa), {
        ...datos,
        personas: datos.personas === "" ? null : Number(datos.personas),
        id_campania: datos.tipo === "resultados" ? Number(datos.id_campania) : null,
        id_centro: idCentro ?? null,
      });
      enqueueSnackbar("Difusión registrada.", { variant: "success" });
      setAbierto(false);
      d.mutate();
      alCambiar();
    } catch (err) {
      enqueueSnackbar(errorDe(err), { variant: "error" });
    }
  };
  const lista = (d.data?.difusiones ?? []).filter((x) => !idCentro || !x.idCentro || x.idCentro === idCentro).slice(0, 8);
  return (
    <Tarjeta titulo="Difusión a los trabajadores (5.7)" accion={<Boton onClick={() => setAbierto(true)}>Registrar difusión</Boton>}>
      {!d.data ? (
        <Cargando />
      ) : !lista.length ? (
        <p className="text-[13.5px] text-slate-600">Registra cuándo y cómo diste a conocer la política y los resultados.</p>
      ) : (
        <ul className="space-y-1.5">
          {lista.map((x) => (
            <li key={x.id} className="text-[13.5px] text-slate-700">
              <strong className="text-slate-900">{x.tipo === "politica" ? "Política" : "Resultados"}</strong> · {MEDIOS[x.medio]} · {fechaCorta(x.fecha)}
              {x.personas !== null ? ` · ${x.personas} personas` : ""}
              {x.descripcion ? <span className="block text-[13px] text-slate-500">{x.descripcion}</span> : null}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar difusión</DialogTitle>
            <DialogDescription>Si tienes lista firmada o fotos, súbelas también como evidencia.</DialogDescription>
          </DialogHeader>
          <form onSubmit={guardar} className="space-y-3" noValidate>
            <label className="block">
              <span className={ETIQUETA}>Qué se difundió</span>
              <select className={CAMPO} value={datos.tipo} onChange={(e) => setDatos({ ...datos, tipo: e.target.value })}>
                <option value="resultados">Resultados de una aplicación</option>
                <option value="politica">Política de prevención</option>
              </select>
              <Falla texto={errores.tipo} />
            </label>
            {datos.tipo === "resultados" ? (
              <label className="block">
                <span className={ETIQUETA}>Aplicación</span>
                <select className={CAMPO} value={datos.id_campania} onChange={(e) => setDatos({ ...datos, id_campania: e.target.value })}>
                  <option value="">Elige…</option>
                  {aplicaciones.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} · {fechaCorta(a.cierra_el)}
                    </option>
                  ))}
                </select>
                <Falla texto={errores.id_campania} />
              </label>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={ETIQUETA}>Medio</span>
                <select className={CAMPO} value={datos.medio} onChange={(e) => setDatos({ ...datos, medio: e.target.value })}>
                  {Object.entries(MEDIOS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={ETIQUETA}>Fecha</span>
                <input type="date" className={CAMPO} value={datos.fecha} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })} />
                <Falla texto={errores.fecha} />
              </label>
            </div>
            <label className="block">
              <span className={ETIQUETA}>Personas que la recibieron (opcional)</span>
              <input type="number" inputMode="numeric" min="0" className={CAMPO} value={datos.personas} onChange={(e) => setDatos({ ...datos, personas: e.target.value })} />
            </label>
            <label className="block">
              <span className={ETIQUETA}>Descripción (opcional)</span>
              <input className={CAMPO} maxLength={500} value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} />
            </label>
            <DialogFooter>
              <Boton type="submit" variante="primario">
                Registrar
              </Boton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Tarjeta>
  );
}

function Programa({ idEmpresa, campania, acciones, dominios, alCambiar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});
  const nombreDominio = new Map(dominios.map((d) => [d.clave, d.nombre]));
  const cerrada = campania.estado === "cerrada";
  const guardar = async (e) => {
    e.preventDefault();
    const errs = {};
    if (editando.texto.trim().length < 3) errs.texto = "Escribe qué se va a hacer.";
    if (!editando.id_responsable) errs.id_responsable = "Elige a la persona responsable.";
    if (!editando.fecha_limite) errs.fecha_limite = "Elige la fecha límite.";
    setErrores(errs);
    if (Object.keys(errs).length) return;
    const cuerpo = {
      texto: editando.texto.trim(),
      dimension: editando.dimension || null,
      id_responsable: Number(editando.id_responsable),
      fecha_inicio: editando.fecha_inicio || null,
      fecha_limite: editando.fecha_limite,
      avance: Number(editando.avance) || 0,
      estado: editando.estado,
    };
    try {
      if (editando.id) await axios.patch(ruta(`/acciones/${editando.id}`, idEmpresa), { ...cuerpo, revision: editando.revision });
      else await axios.post(ruta(`/campanias/${campania.id}/acciones`, idEmpresa), cuerpo);
      enqueueSnackbar("Programa actualizado.", { variant: "success" });
      setEditando(null);
      alCambiar();
    } catch (err) {
      enqueueSnackbar(errorDe(err), { variant: "error" });
    }
  };
  const nueva = () => setEditando({ texto: "", dimension: "", id_responsable: "", fecha_inicio: hoyMx(), fecha_limite: "", avance: 0, estado: "pendiente" });
  return (
    <Tarjeta
      titulo="Programa de intervención (8.4)"
      accion={cerrada ? <Boton onClick={nueva}>Agregar acción</Boton> : null}
    >
      {!cerrada ? (
        <p className="text-[13.5px] text-slate-600">El programa se arma cuando la aplicación cierra y ya hay resultados.</p>
      ) : !acciones.length ? (
        <p className="text-[13.5px] text-slate-600">Agrega acciones para los dominios en nivel medio o mayor, con responsable, fechas y avance.</p>
      ) : (
        <ul className="space-y-2">
          {acciones.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[13px] font-bold text-slate-700">{nombreDominio.get(a.dimension) ?? "General"}</span>
                <span className="text-[13px] font-semibold text-slate-500">{ESTADOS_ACCION[a.estado]}</span>
              </div>
              <p className="mt-1 text-[14px] font-semibold text-slate-900">{a.texto}</p>
              <p className="text-[13px] text-slate-500">
                {a.responsable?.nombre ?? "Sin responsable"} · {a.fecha_inicio ? `del ${fechaCorta(a.fecha_inicio)} ` : ""}
                {a.fecha_limite ? `al ${fechaCorta(a.fecha_limite)}` : "sin fecha"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Avance ${a.avance ?? 0} %`}>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${a.avance ?? 0}%` }} />
                </div>
                <span className="w-10 text-right text-[13px] font-bold text-slate-700">{a.avance ?? 0} %</span>
                <Boton
                  variante="fantasma"
                  onClick={() =>
                    setEditando({
                      ...a,
                      dimension: a.dimension ?? "",
                      id_responsable: a.responsable?.id ? String(a.responsable.id) : "",
                      fecha_inicio: a.fecha_inicio ?? "",
                      fecha_limite: a.fecha_limite ?? "",
                      avance: a.avance ?? 0,
                    })
                  }
                >
                  Editar
                </Boton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={Boolean(editando)} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando?.id ? "Editar acción" : "Nueva acción del programa"}</DialogTitle>
            <DialogDescription>Numeral 8.4: acciones, responsables, fechas y seguimiento de su avance.</DialogDescription>
          </DialogHeader>
          {editando ? (
            <form onSubmit={guardar} className="space-y-3" noValidate>
              <label className="block">
                <span className={ETIQUETA}>Dominio</span>
                <select className={CAMPO} value={editando.dimension} onChange={(e) => setEditando({ ...editando, dimension: e.target.value })}>
                  <option value="">General</option>
                  {dominios.map((d) => (
                    <option key={d.clave} value={d.clave}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={ETIQUETA}>Acción</span>
                <textarea className={`${CAMPO} min-h-20 py-2`} maxLength={300} value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} />
                <Falla texto={errores.texto} />
              </label>
              <div>
                <SelectorEmpleado idEmpresa={idEmpresa} value={editando.id_responsable} onChange={(v) => setEditando({ ...editando, id_responsable: v })} etiqueta="Responsable" requerido />
                <Falla texto={errores.id_responsable} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={ETIQUETA}>Inicio</span>
                  <input type="date" className={CAMPO} value={editando.fecha_inicio} onChange={(e) => setEditando({ ...editando, fecha_inicio: e.target.value })} />
                </label>
                <label className="block">
                  <span className={ETIQUETA}>Fecha límite</span>
                  <input type="date" className={CAMPO} value={editando.fecha_limite} onChange={(e) => setEditando({ ...editando, fecha_limite: e.target.value })} />
                  <Falla texto={errores.fecha_limite} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={ETIQUETA}>Avance: {editando.avance} %</span>
                  <input type="range" min="0" max="100" step="5" className="h-11 w-full accent-blue-600" value={editando.avance} onChange={(e) => setEditando({ ...editando, avance: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className={ETIQUETA}>Estado</span>
                  <select className={CAMPO} value={editando.estado} onChange={(e) => setEditando({ ...editando, estado: e.target.value })}>
                    {Object.entries(ESTADOS_ACCION).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <DialogFooter>
                <Boton type="submit" variante="primario">
                  Guardar
                </Boton>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </Tarjeta>
  );
}

export default function Nom035Expediente({ idEmpresa }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const centros = useSWR(ruta("/nom035/centros", idEmpresa), get);
  const [centro, setCentro] = useState("");
  const [campania, setCampania] = useState(null);
  const params = new URLSearchParams();
  if (campania) params.set("campania", String(campania));
  else if (centro) params.set("centro", centro);
  const q = params.toString();
  const x = useSWR(ruta(`/nom035/expediente${q ? `?${q}` : ""}`, idEmpresa), get, { shouldRetryOnError: false });
  const [bajando, setBajando] = useState(false);
  if (x.error) {
    return codigoDe(x.error) === "SIN_MIGRACION" ? (
      <Vacio titulo="Falta preparar la base de datos" texto="El expediente NOM-035 necesita la migración 20261220. Pídesela a soporte." />
    ) : (
      <Vacio titulo="No se pudo cargar el expediente" texto={errorDe(x.error)} />
    );
  }
  if (!x.data || !centros.data) return <Cargando texto="Armando el expediente…" />;
  const e = x.data;
  const idCentro = e.centro?.id ?? null;
  const refrescar = () => x.mutate();
  const aplicar = async () => {
    try {
      const r = await axios.post(ruta("/campanias", idEmpresa), { tipo: "nom035", id_centro: idCentro });
      router.push(`/panel/clima/encuestas/lanzar/${r.data.campania.id}`);
    } catch (err) {
      enqueueSnackbar(errorDe(err), { variant: "error" });
    }
  };
  const bajar = async () => {
    setBajando(true);
    try {
      await descargar(axios, ruta(`/nom035/expediente/pdf?campania=${e.campania.id}`, idEmpresa), `expediente-nom035-${e.campania.id}.pdf`);
    } catch (err) {
      enqueueSnackbar(errorDe(err, "No se pudo generar el expediente."), { variant: "error" });
    } finally {
      setBajando(false);
    }
  };
  const infoCentro = centros.data.centros.find((c) => c.id === idCentro);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label className="block max-w-sm">
            <span className={ETIQUETA}>Centro de trabajo</span>
            <select
              className={CAMPO}
              value={centro}
              onChange={(ev) => {
                setCentro(ev.target.value);
                setCampania(null);
              }}
            >
              <option value="">Toda la empresa ({centros.data.empresa.activos} activos)</option>
              {centros.data.centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} · {c.activos} activos · {c.guias.map((g) => `Guía ${g}`).join(" y ")}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-[13px] text-slate-500">
            La norma aplica por centro de trabajo: la guía se elige con los trabajadores de cada sucursal.
            {centros.data.sinCentro ? ` ${centros.data.sinCentro} persona(s) activas no tienen sucursal en su ficha.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {e.aplicaciones.length > 1 ? (
            <select aria-label="Aplicación" className={`${CAMPO} w-auto`} value={e.campania?.id ?? ""} onChange={(ev) => setCampania(Number(ev.target.value))}>
              {e.aplicaciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} · {fechaCorta(a.cierra_el)}
                </option>
              ))}
            </select>
          ) : null}
          <Boton variante="primario" onClick={bajar} disabled={!e.campania || bajando}>
            {bajando ? "Preparando…" : "Expediente en PDF"}
          </Boton>
        </div>
      </div>
      {!e.campania ? (
        <Vacio
          titulo={`Aún no aplicas la NOM-035${e.centro ? ` en ${e.centro.nombre}` : ""}`}
          texto={infoCentro ? `Con ${infoCentro.activos} trabajadores en este centro te toca la ${infoCentro.guias.map((g) => `Guía ${g}`).join(" y la ")}.` : "Aplica la norma para armar el expediente."}
        >
          <Boton variante="primario" onClick={aplicar}>
            Aplicar NOM-035{e.centro ? ` en ${e.centro.nombre}` : ""}
          </Boton>
        </Vacio>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <Lista x={e} />
          {e.campania ? <Programa idEmpresa={idEmpresa} campania={e.campania} acciones={e.programa} dominios={e.dominios} alCambiar={refrescar} /> : null}
        </div>
        <div className="min-w-0 space-y-4">
          <Politica idEmpresa={idEmpresa} />
          <Difusion idEmpresa={idEmpresa} idCentro={idCentro} aplicaciones={e.aplicaciones.filter((a) => a.estado === "cerrada")} alCambiar={refrescar} />
          <Evidencias idEmpresa={idEmpresa} idCentro={idCentro} idCampania={e.campania?.id ?? null} alCambiar={refrescar} />
        </div>
      </div>
    </div>
  );
}
