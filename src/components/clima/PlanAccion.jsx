"use client";

// Plan de acción de una medición de clima: cada acción con dimensión, responsable (ficha de empleado), fecha límite y
// estado. Desde la siguiente medición de la misma plantilla el servidor dice si su dimensión subió (no se guarda).
// API: POST /campanias/:id/acciones · PATCH /acciones/:id · DELETE /acciones/:id (empresa de la sesión).
import { useState } from "react";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SelectorEmpleado from "@/components/nomina/SelectorEmpleado";
import { ESTADOS_ACCION, erroresAccion, fechaLarga, resumenPlan, textoSeguimiento } from "@/lib/clima/modelo.mjs";
import { Boton, errorDe, ruta } from "./ui";

const hoyMx = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const VACIA = { texto: "", dimension: "", id_responsable: "", fecha_limite: "", estado: "pendiente" };

function ChipDimension({ dim, atencion }) {
  if (!dim) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">General</span>;
  const fav = dim.favorabilidad?.favorable;
  return (
    <span
      className={`max-w-full truncate rounded-full px-2 py-0.5 text-xs font-bold ${
        atencion ? "bg-[#FEF3C7] text-[#92400E]" : "bg-slate-100 text-slate-700"
      }`}
    >
      {dim.nombre}
      {fav !== null && fav !== undefined ? ` · ${fav} %` : ""}
    </span>
  );
}

function Formulario({ idEmpresa, idCampania, dimensiones, accion, abierto, alCerrar, alGuardar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [datos, setDatos] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  if (abierto && !datos) {
    setDatos(
      accion
        ? {
            texto: accion.texto,
            dimension: accion.dimension ?? "",
            id_responsable: accion.responsable?.id ? String(accion.responsable.id) : "",
            fecha_limite: accion.fecha_limite ?? "",
            estado: accion.estado,
          }
        : { ...VACIA }
    );
  }
  const cerrar = () => {
    setDatos(null);
    setErrores({});
    setConfirmarBorrar(false);
    alCerrar();
  };
  const cambiar = (k, v) => setDatos((d) => ({ ...d, [k]: v }));
  const guardar = async (e) => {
    e.preventDefault();
    const errs = erroresAccion(datos);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setGuardando(true);
    try {
      const cuerpo = {
        texto: datos.texto.trim(),
        dimension: datos.dimension || null,
        id_responsable: Number(datos.id_responsable),
        fecha_limite: datos.fecha_limite,
        estado: datos.estado,
      };
      if (accion) await axios.patch(ruta(`/acciones/${accion.id}`, idEmpresa), { ...cuerpo, revision: accion.revision });
      else await axios.post(ruta(`/campanias/${idCampania}/acciones`, idEmpresa), cuerpo);
      enqueueSnackbar(accion ? "Acción actualizada." : "Acción agregada al plan.", { variant: "success" });
      await alGuardar();
      cerrar();
    } catch (err) {
      enqueueSnackbar(errorDe(err), { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  const borrar = async () => {
    setGuardando(true);
    try {
      await axios.delete(ruta(`/acciones/${accion.id}`, idEmpresa));
      enqueueSnackbar("Acción eliminada del plan.", { variant: "success" });
      await alGuardar();
      cerrar();
    } catch (err) {
      enqueueSnackbar(errorDe(err), { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  const campo = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus:border-brand focus:outline-none";
  return (
    <Dialog open={abierto} onOpenChange={(v) => (v ? null : cerrar())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{accion ? "Editar acción" : "Agregar acción"}</DialogTitle>
          <DialogDescription>Qué se va a hacer, quién responde y para cuándo.</DialogDescription>
        </DialogHeader>
        {datos ? (
          <form id="form-accion" onSubmit={guardar} noValidate className="grid gap-3 text-sm">
            <label className="font-medium text-slate-800">
              Acción
              <textarea
                className={`${campo} min-h-20 py-2`}
                maxLength={300}
                value={datos.texto}
                aria-invalid={Boolean(errores.texto)}
                aria-describedby={errores.texto ? "err-texto" : undefined}
                onChange={(e) => cambiar("texto", e.target.value)}
                placeholder="Ej. Plática 1 a 1 de plan de carrera con cada persona"
              />
              {errores.texto ? (
                <span id="err-texto" className="mt-1 block text-[13px] text-red-700">
                  {errores.texto}
                </span>
              ) : null}
            </label>
            <label className="font-medium text-slate-800">
              Dimensión
              <select className={campo} value={datos.dimension} onChange={(e) => cambiar("dimension", e.target.value)}>
                <option value="">General (sin dimensión)</option>
                {dimensiones.map((d) => (
                  <option key={d.clave} value={d.clave}>
                    {d.nombre}
                    {d.favorabilidad ? ` · ${d.favorabilidad.favorable} % favorable` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <SelectorEmpleado
                idEmpresa={idEmpresa}
                value={datos.id_responsable}
                onChange={(v) => cambiar("id_responsable", v)}
                etiqueta="Responsable"
                requerido
              />
              {errores.id_responsable ? <span className="mt-1 block text-[13px] text-red-700">{errores.id_responsable}</span> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="font-medium text-slate-800">
                Fecha límite
                <input
                  type="date"
                  className={campo}
                  min={accion ? undefined : hoyMx()}
                  value={datos.fecha_limite}
                  aria-invalid={Boolean(errores.fecha_limite)}
                  onChange={(e) => cambiar("fecha_limite", e.target.value)}
                />
                {errores.fecha_limite ? <span className="mt-1 block text-[13px] text-red-700">{errores.fecha_limite}</span> : null}
              </label>
              <label className="font-medium text-slate-800">
                Estado
                <select className={campo} value={datos.estado} onChange={(e) => cambiar("estado", e.target.value)}>
                  {Object.entries(ESTADOS_ACCION).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.texto}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </form>
        ) : null}
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          {accion ? (
            confirmarBorrar ? (
              <Boton variante="peligro" className="min-h-11" onClick={borrar} disabled={guardando}>
                Sí, eliminar
              </Boton>
            ) : (
              <Boton variante="peligro" className="min-h-11" onClick={() => setConfirmarBorrar(true)} disabled={guardando}>
                Eliminar
              </Boton>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Boton className="min-h-11" onClick={cerrar}>
              Cancelar
            </Boton>
            <Boton variante="primario" className="min-h-11" type="submit" form="form-accion" disabled={guardando}>
              {guardando ? "Guardando…" : accion ? "Guardar cambios" : "Agregar al plan"}
            </Boton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Accion({ a, dimensiones, atencion, onEditar, onEstado, cambiando }) {
  const dim = dimensiones.find((d) => d.clave === a.dimension) ?? null;
  const est = ESTADOS_ACCION[a.estado] ?? ESTADOS_ACCION.pendiente;
  const seg = textoSeguimiento(a, dim?.nombre);
  return (
    <li className="flex flex-col gap-2 rounded-[14px] border border-slate-200 p-3.5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <ChipDimension dim={dim} atencion={atencion.has(a.dimension)} />
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${est.clase}`}>{est.texto}</span>
      </div>
      <p className="break-words text-sm font-semibold text-slate-900">{a.texto}</p>
      <div className="grid grid-cols-2 gap-2 text-[13px] text-slate-600">
        <span className="min-w-0">
          Responsable
          <b className="block truncate text-slate-900">{a.responsable?.nombre ?? "Sin responsable"}</b>
        </span>
        <span>
          Fecha límite
          <b className="block text-slate-900">{fechaLarga(a.fecha_limite)}</b>
        </span>
      </div>
      <p className="text-[12.5px]" style={{ color: seg.tono }}>
        {seg.texto}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-[12.5px] text-slate-600">
          Estado
          <select
            aria-label={`Estado de «${a.texto.slice(0, 40)}»`}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm text-slate-900"
            value={a.estado}
            disabled={cambiando}
            onChange={(e) => onEstado(a, e.target.value)}
          >
            {Object.entries(ESTADOS_ACCION).map(([k, v]) => (
              <option key={k} value={k}>
                {v.texto}
              </option>
            ))}
          </select>
        </label>
        <Boton className="min-h-11" onClick={() => onEditar(a)} aria-label={`Editar «${a.texto.slice(0, 40)}»`}>
          Editar
        </Boton>
      </div>
    </li>
  );
}

export default function PlanAccion({ idEmpresa, idCampania, plan, dimensiones, atencion = [], conIa = false, alCambiar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [editando, setEditando] = useState(undefined); // undefined: cerrado · null: nueva · objeto: editar
  const [cambiando, setCambiando] = useState(false);
  const acciones = plan?.acciones ?? [];
  const previas = plan?.anterior?.acciones ?? [];
  const enAtencion = new Set(atencion.map((d) => d.clave));
  const estado = async (a, nuevo) => {
    setCambiando(true);
    try {
      await axios.patch(ruta(`/acciones/${a.id}`, idEmpresa), { estado: nuevo, revision: a.revision });
      await alCambiar();
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally {
      setCambiando(false);
    }
  };
  return (
    <section aria-labelledby="titulo-plan" className="min-w-0 rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-plan" className="text-[17px] font-extrabold text-slate-900">
          Plan de acción
        </h2>
        <span className="text-[12.5px] text-slate-600">{resumenPlan(acciones)}</span>
      </div>
      {acciones.length ? (
        <ul className="mt-3 flex flex-col gap-3">
          {acciones.map((a) => (
            <Accion key={a.id} a={a} dimensiones={dimensiones} atencion={enAtencion} onEditar={setEditando} onEstado={estado} cambiando={cambiando} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13.5px] text-slate-600">
          Aún no hay acciones. Elige lo que pide atención, quién responde y para cuándo; en la próxima encuesta verás si subió.
        </p>
      )}
      <button
        type="button"
        onClick={() => setEditando(null)}
        className="mt-3 min-h-11 w-full rounded-xl border border-dashed border-slate-400 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        + Agregar acción
      </button>
      {conIa ? (
        <a
          href="#adamia-plan"
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-[#C4B5FD] bg-[#F5F3FF] text-sm font-semibold text-[#5B21B6] hover:bg-violet-100"
        >
          Sugerir acciones con Adamia AI
        </a>
      ) : null}
      {previas.length ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <h3 className="text-[13px] font-bold text-slate-600">Plan de «{plan.anterior.nombre}»</h3>
          <ul className="mt-2 space-y-2">
            {previas.map((a) => {
              const dim = dimensiones.find((d) => d.clave === a.dimension);
              const seg = textoSeguimiento(a, dim?.nombre);
              return (
                <li key={a.id} className="text-[13px]">
                  <span className="font-semibold text-slate-900">{a.texto}</span>{" "}
                  <span className="text-slate-600">· {ESTADOS_ACCION[a.estado]?.texto}</span>
                  <span className="block" style={{ color: seg.tono }}>
                    {seg.texto}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <Formulario
        idEmpresa={idEmpresa}
        idCampania={idCampania}
        dimensiones={dimensiones}
        accion={editando || null}
        abierto={editando !== undefined}
        alCerrar={() => setEditando(undefined)}
        alGuardar={alCambiar}
      />
    </section>
  );
}
