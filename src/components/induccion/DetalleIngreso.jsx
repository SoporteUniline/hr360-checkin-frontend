"use client";
// Nuevos ingresos → una persona (maqueta 2 «Checklist del primer día» + revisión de RH). Antes del alta: lo que llenó y
// subió desde su celular, aprobar o rechazar cada documento con motivo (la persona ve qué corregir), firmas, rostro y
// «Dar de alta» (crea su ficha o la vincula y pasa todo al expediente). Siempre: el checklist del primer día repartido por
// responsable (cada tarea es una Tarea real del responsable, con aviso si se atrasa). Backend: /checador/induccion/procesos/:id.
import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { ChevronLeft, ExternalLink, FileText, RefreshCw, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import axios from "@/lib/axios";
import { useEmpresaNomina } from "@/components/nomina/comun";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API, RUTA_TABLERO, agruparTareas, etiquetaDia, fechaCorta, fechaLarga, hora12 } from "@/lib/induccion/induccion.mjs";
import { Avatar, AvisoError, Barra, Campo, ariaCampo, botonPrimario, botonSecundario, entrada, errorDe, get, opcionesSwr, tarjeta } from "./comun";

const ESTADO = { recibido: ["Por revisar", "bg-amber-100 text-amber-900"], aprobado: ["Aprobado", "bg-green-100 text-green-800"], rechazado: ["Rechazado", "bg-red-100 text-red-800"] };
const CAMPOS_DATOS = [["curp", "CURP"], ["rfc", "RFC"], ["nss", "NSS"], ["fecha_nacimiento", "Nacimiento"], ["direccion", "Domicilio"], ["telefono", "Teléfono"], ["correo", "Correo"], ["contacto_emergencia", "Emergencia"], ["telefono_emergencia", "Tel. emergencia"], ["banco", "Banco"], ["clabe", "CLABE"]];

function Tarea({ t, hoy, personas, alCambiar }) {
  // Marca al instante (optimista); se deshace si el servidor no la guarda.
  const [marcada, setMarcada] = useState(null);
  useEffect(() => { setMarcada(null); }, [t.estado]);
  const hecha = marcada ?? t.estado === "hecha";
  const atrasada = !hecha && t.fecha_limite < hoy;
  const id = `t-${t.id}`;
  return (
    <li className="grid gap-1">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-slate-50">
        <input id={id} type="checkbox" checked={hecha} onChange={async (e) => { const v = e.target.checked; setMarcada(v); if (!(await alCambiar(t, { hecha: v }))) setMarcada(null); }} className="mt-0.5 size-5 shrink-0 accent-[#2563EB]" />
        <span className="min-w-0 text-sm text-slate-800">
          <span className={hecha ? "text-slate-500 line-through" : "font-semibold"}>{t.titulo}</span>
          <span className={`block text-[13px] ${atrasada ? "font-semibold text-red-700" : "text-slate-500"}`}>
            {etiquetaDia(t.dia)} · {fechaCorta(t.fecha_limite, hoy)}{atrasada ? " · atrasada" : ""}{t.estado === "revision" ? " · en revisión" : ""}
          </span>
          {t.descripcion ? <span className="block text-[13px] text-slate-500">{t.descripcion}</span> : null}
        </span>
      </label>
      {t.liga === "activos" ? <Link href="/panel/activos" className="ml-9 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-[#2563EB] hover:underline">Registrar la entrega en Activos y uniformes <ExternalLink className="size-3.5" aria-hidden="true" /></Link> : null}
      {!t.id_responsable ? (
        <div className="ml-9 grid gap-1">
          <label htmlFor={`${id}-resp`} className="text-[13px] font-semibold text-amber-800">Sin responsable: elige quién la hace</label>
          <select id={`${id}-resp`} className={entrada} defaultValue="" onChange={(e) => e.target.value && alCambiar(t, { id_responsable: Number(e.target.value) })}>
            <option value="">Elegir persona…</option>
            {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
      ) : null}
    </li>
  );
}

function Revision({ p, idEmpresa, alCambiar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [rechazar, setRechazar] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const abrir = async (d) => {
    // La pestaña se abre en el clic (si se abre después de esperar al servidor, el navegador la bloquea) y sin acceso a esta.
    const ventana = window.open("", "_blank");
    if (ventana) ventana.opener = null;
    try {
      const r = await axios.get(`${API}/procesos/${p.id}/documentos/${d.id}/archivo?empresa=${idEmpresa}`);
      if (ventana) ventana.location.href = r.data.url;
      else enqueueSnackbar("Permite las ventanas emergentes para ver el archivo.", { variant: "warning" });
    } catch (e) {
      ventana?.close();
      enqueueSnackbar(errorDe(e, "No se pudo abrir el archivo."), { variant: "error" });
    }
  };
  const decidir = async (d, decision, mot) => {
    try {
      await axios.put(`${API}/procesos/${p.id}/documentos/${d.id}`, { empresa: idEmpresa, decision, motivo: mot });
      await alCambiar();
      return true;
    } catch (e) {
      setError(errorDe(e));
      enqueueSnackbar(errorDe(e), { variant: "error" });
      return false;
    }
  };
  const abiertos = ["invitado", "en_proceso", "por_revisar"].includes(p.estado);
  return (
    <section aria-labelledby="rev-docs" className={`${tarjeta} grid gap-3 p-4`}>
      <h2 id="rev-docs" className="text-base font-bold text-slate-900">Documentos</h2>
      <ul className="grid gap-2">
        {p.requeridos.map((r) => {
          const subidos = p.documentos.filter((d) => d.clave === r.clave);
          return (
            <li key={r.clave} className="grid gap-2 rounded-xl border border-slate-200 p-3" data-requerido={r.clave}>
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="size-4 text-slate-500" aria-hidden="true" />
                <b className="text-sm text-slate-900">{r.nombre}</b>
                <span className="text-[13px] text-slate-500">{r.obligatorio ? "Obligatorio" : "Opcional"}{r.antiguedad_meses ? ` · máx. ${r.antiguedad_meses} meses` : ""}{r.vence_meses ? ` · vence en ${r.vence_meses} meses` : ""}</span>
                {r.con_dato ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[13px] font-semibold text-green-800">Lo escribió en sus datos</span> : null}
                {!subidos.length && !r.con_dato ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[13px] font-semibold text-slate-600">Pendiente</span> : null}
              </div>
              {subidos.map((d) => (
                <div key={d.id} className="flex flex-col gap-2 sm:flex-row sm:items-center" data-documento={d.id}>
                  <span className="min-w-0 flex-1 text-[13px] text-slate-700">
                    {d.nombre} <span className={`ml-1 rounded-full px-2 py-0.5 font-semibold ${ESTADO[d.estado]?.[1] ?? ""}`}>{ESTADO[d.estado]?.[0] ?? d.estado}</span>
                    {d.motivo ? <span className="block text-red-700">Motivo: {d.motivo}</span> : null}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => abrir(d)} className={`${botonSecundario} min-h-11 px-3 text-[13px]`}>Ver</button>
                    {abiertos && d.estado !== "aprobado" ? <button type="button" onClick={() => decidir(d, "aprobar")} className={`${botonPrimario} min-h-11 px-3 text-[13px]`}>Aprobar</button> : null}
                    {abiertos && d.estado !== "rechazado" ? <button type="button" onClick={() => { setRechazar(d); setMotivo(""); setError(""); }} className={`${botonSecundario} min-h-11 px-3 text-[13px] text-red-700`}>Rechazar</button> : null}
                  </div>
                </div>
              ))}
            </li>
          );
        })}
      </ul>
      <Dialog open={Boolean(rechazar)} onOpenChange={(a) => { if (!a) setRechazar(null); }}>
        <DialogContent>
          <form onSubmit={async (e) => { e.preventDefault(); if (motivo.trim().length < 3) { setError("Escribe qué debe corregir."); return; } if (await decidir(rechazar, "rechazar", motivo.trim())) setRechazar(null); }} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Rechazar «{rechazar?.nombre}»</DialogTitle>
              <DialogDescription>La persona verá este motivo en su celular para corregirlo.</DialogDescription>
            </DialogHeader>
            <Campo id="motivo-rechazo" etiqueta="¿Qué debe corregir?" error={error}>
              <textarea {...ariaCampo("motivo-rechazo", error)} className={`${entrada} min-h-24 py-2`} value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(""); }} maxLength={300} placeholder="Ej. Tiene más de 3 meses; sube uno reciente." />
            </Campo>
            <DialogFooter className="gap-2"><button type="button" className={botonSecundario} onClick={() => setRechazar(null)}>Cancelar</button><button type="submit" className={`${botonPrimario} bg-red-600 hover:bg-red-700`}>Rechazar</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function DetalleIngreso({ id }) {
  const { enqueueSnackbar } = useSnackbar();
  const { idEmpresa } = useEmpresaNomina();
  const q = idEmpresa ? `?empresa=${idEmpresa}` : null;
  const detalle = useSWR(q ? `${API}/procesos/${id}${q}` : null, get, opcionesSwr);
  const catalogo = useSWR(q ? `${API}/catalogo${q}` : null, get, opcionesSwr);
  const [confirmar, setConfirmar] = useState(null); // alta | cancelar
  const [motivo, setMotivo] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [liga, setLiga] = useState(null);
  const p = detalle.data?.proceso;
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

  const cambiarTarea = async (t, cambio) => {
    try {
      await axios.put(`${API}/procesos/${id}/tareas/${t.id}`, { empresa: idEmpresa, ...cambio });
      await detalle.mutate();
      return true;
    } catch (e) { enqueueSnackbar(errorDe(e), { variant: "error" }); return false; }
  };
  const reenviar = async () => {
    setTrabajando(true);
    try {
      const r = await axios.post(`${API}/procesos/${id}/reenviar`, { empresa: idEmpresa });
      setLiga(r.data.liga);
      enqueueSnackbar(r.data.envio?.estado === "enviado" ? "Le reenviamos la liga por WhatsApp." : r.data.envio?.estado === "respaldo" ? "Le reenviamos la liga por correo." : "Liga nueva lista: compártesela tú.", { variant: "success" });
      await detalle.mutate();
    } catch (e) { enqueueSnackbar(errorDe(e), { variant: "error" }); } finally { setTrabajando(false); }
  };
  const ejecutar = async () => {
    const accion = confirmar;
    setTrabajando(true);
    try {
      if (accion === "alta") {
        const r = await axios.post(`${API}/procesos/${id}/alta`, { empresa: idEmpresa });
        enqueueSnackbar(r.data.vinculado ? "Listo: se vinculó a su ficha y sus documentos pasaron al expediente." : "Listo: quedó dado de alta como empleado con su expediente.", { variant: "success" });
      } else {
        if (motivo.trim().length < 3) { enqueueSnackbar("Escribe por qué se cancela.", { variant: "warning" }); return; }
        await axios.post(`${API}/procesos/${id}/cancelar`, { empresa: idEmpresa, motivo: motivo.trim() });
        enqueueSnackbar("Ingreso cancelado. Sus datos se borraron.", { variant: "success" });
      }
      setConfirmar(null);
      await detalle.mutate();
    } catch (e) { enqueueSnackbar(errorDe(e), { variant: "error" }); } finally { setTrabajando(false); }
  };

  if (detalle.error) return <div className="mx-auto max-w-6xl p-1"><AvisoError error={detalle.error} porDefecto="No se pudo cargar este ingreso." /></div>;
  if (!p) return <p role="status" className="p-5 text-sm text-slate-500">Cargando…</p>;
  const grupos = agruparTareas(p.tareas);
  const hechas = p.tareas.filter((t) => t.estado === "hecha").length;
  const nombre = [p.nombre, p.apellido_paterno].filter(Boolean).join(" ");
  const abierto = ["invitado", "en_proceso", "por_revisar"].includes(p.estado);
  const ingreso = p.estado === "alta" ? (p.fecha_ingreso === hoy ? "ingresó hoy" : `ingresó el ${fechaLarga(p.fecha_ingreso)}`) : `ingresa el ${fechaLarga(p.fecha_ingreso)}${p.hora_ingreso ? ` a las ${hora12(p.hora_ingreso)}` : ""}`;
  const hizo = [
    [p.avance.datos, "Datos personales"],
    [p.avance.documentos.listos >= p.avance.documentos.total && p.avance.documentos.total > 0, `${p.avance.documentos.listos} de ${p.avance.documentos.total} documentos`],
    [p.avance.firma, p.firmas.length ? `${p.firmas.map((f) => f.nombre).join(", ")}` : "Sin documentos a firmar"],
    [p.avance.rostro, "Rostro para el checador"],
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-1" data-pantalla="detalle-ingreso">
      <header className="flex flex-wrap items-center gap-3">
        <Link href={RUTA_TABLERO} aria-label="Regresar a Nuevos ingresos" className="grid size-11 place-items-center rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"><ChevronLeft className="size-5" aria-hidden="true" /></Link>
        <Avatar persona={p} id={p.id} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-[22px]">{nombre}{p.estado === "alta" ? " · primer día" : ""}</h1>
          <p className="text-sm text-slate-600">{[p.puesto, p.sucursal ? `Sucursal ${p.sucursal}` : null, p.jefe ? `jefe: ${p.jefe}` : null, ingreso].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="grid w-full gap-1 sm:w-48">
          <span className="text-sm font-bold text-slate-800" data-checklist-cuenta>{hechas} de {p.tareas.length} listas</span>
          <Barra porcentaje={p.tareas.length ? (hechas / p.tareas.length) * 100 : 0} etiqueta="Checklist del primer día" />
        </div>
      </header>

      {p.estado === "cancelado" ? <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Cancelado: {p.motivo_cancelacion}</p> : null}

      {abierto ? (
        <section aria-label="Acciones" className={`${tarjeta} flex flex-col gap-3 p-4 lg:flex-row lg:items-center`}>
          <p className="flex-1 text-sm text-slate-700" data-siguiente>
            <b>{p.siguiente.texto}.</b> {p.estado === "por_revisar" ? "Revisa cada documento; al aprobar todo, dalo de alta." : p.abierto ? "La persona sigue llenando su preingreso desde su celular." : "Aún no abre su liga."}
            {p.vence_en ? <span className="block text-[13px] text-slate-500">Su liga vence el {fechaLarga(p.vence_en.slice(0, 10))}.</span> : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={reenviar} disabled={trabajando} className={botonSecundario}><RefreshCw className="size-4" aria-hidden="true" />Reenviar liga</button>
            <button type="button" onClick={() => { setMotivo(""); setConfirmar("cancelar"); }} className={`${botonSecundario} text-red-700`}><XCircle className="size-4" aria-hidden="true" />Cancelar ingreso</button>
            <button type="button" onClick={() => setConfirmar("alta")} disabled={!p.avance.listo_para_alta || trabajando} className={botonPrimario} data-dar-alta><UserCheck className="size-4" aria-hidden="true" />Revisar y dar de alta</button>
          </div>
          {liga ? <code className="block w-full break-all rounded-lg bg-slate-50 p-2 font-mono text-[13px]" data-liga-nueva>{liga}</code> : null}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {grupos.map((g) => (
          <section key={g.grupo} aria-label={g.grupo} className={`${tarjeta} grid content-start gap-2 p-4`}>
            <h2 className="text-base font-bold text-slate-900">{g.grupo}</h2>
            <p className="text-[13px] text-slate-500">{g.tareas.some((t) => t.liga === "activos") ? "Se conecta con Activos y uniformes · " : ""}Responsable: {g.responsable ?? "sin asignar"}</p>
            <ul className="grid gap-1">{g.tareas.map((t) => <Tarea key={t.id} t={t} hoy={hoy} personas={catalogo.data?.personas ?? []} alCambiar={cambiarTarea} />)}</ul>
          </section>
        ))}
        {!grupos.length ? <p className="text-sm text-slate-500">Su plantilla no tiene tareas.</p> : null}
      </div>

      {p.estado !== "cancelado" ? <Revision p={p} idEmpresa={idEmpresa} alCambiar={() => detalle.mutate()} /> : null}

      <section aria-labelledby="lo-que-hizo" className={`${tarjeta} grid gap-3 p-4`}>
        <h2 id="lo-que-hizo" className="text-base font-bold text-slate-900">Lo que hizo {p.nombre} desde su celular</h2>
        <ul className="flex flex-wrap gap-2">
          {hizo.map(([ok, texto]) => <li key={texto} className={`rounded-full px-3 py-1 text-[13px] font-semibold ${ok ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>{ok ? "✓ " : ""}{texto}</li>)}
          {p.estado === "alta" ? <li className="rounded-full bg-indigo-50 px-3 py-1 text-[13px] font-semibold text-indigo-800">Ruta de bienvenida {p.ruta.listos} de {p.ruta.total}</li> : null}
        </ul>
        {p.datos && Object.keys(p.datos).length ? (
          <dl className="grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2 lg:grid-cols-3" aria-label="Datos que llenó">
            {CAMPOS_DATOS.filter(([k]) => p.datos[k]).map(([k, t]) => <div key={k} className="flex min-w-0 gap-1"><dt className="text-slate-500">{t}:</dt><dd className="min-w-0 break-words font-medium text-slate-800">{p.datos[k]}</dd></div>)}
          </dl>
        ) : null}
        <p className="flex items-center gap-1.5 text-[13px] text-slate-500"><ShieldCheck className="size-4" aria-hidden="true" />Sus datos y documentos solo los ve Recursos Humanos. Al dar de alta pasan a su ficha y expediente.</p>
      </section>

      <p className="text-[13px] text-slate-500">Cada tarea sale de la plantilla de inducción «{p.plantilla_nombre}». Se reparte sola como tarea a cada responsable, con aviso si se atrasa.</p>

      <AlertDialog open={Boolean(confirmar)} onOpenChange={(a) => { if (!a && !trabajando) setConfirmar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar === "alta" ? `¿Dar de alta a ${nombre}?` : `¿Cancelar el ingreso de ${nombre}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar === "alta"
                ? (p.id_empleado ? "Ya tiene ficha de empleado: se completa con lo que llenó (sin cambiar lo que ya capturaste) y sus documentos y firmas pasan a su expediente." : "Se crea su ficha de empleado con la misma revisión del alta de Empleados y sus documentos y firmas pasan a su expediente.")
                : "Su liga deja de funcionar, se borran los datos que llenó y su rostro, y sus tareas pendientes se archivan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmar === "cancelar" ? (
            <Campo id="motivo-cancelar" etiqueta="Motivo"><input id="motivo-cancelar" className={entrada} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} placeholder="Ej. Ya no se presentó" /></Campo>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={trabajando}>Volver</AlertDialogCancel>
            <AlertDialogAction className={`min-h-11 ${confirmar === "alta" ? "bg-[#2563EB] hover:bg-[#1d4ed8]" : "bg-red-600 hover:bg-red-700"}`} disabled={trabajando} onClick={(e) => { e.preventDefault(); ejecutar(); }}>
              {trabajando ? "Guardando…" : confirmar === "alta" ? "Dar de alta" : "Cancelar ingreso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
