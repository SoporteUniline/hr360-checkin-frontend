"use client";

// Formulario «Nuevo turno extra» / «Editar turno extra».
// Pide los avisos de ley al backend (GET /checador/turnos-extra/candidatos) cada vez que cambia el día o el horario.
// Avisa y no bloquea: los avisos graves (menor de edad, más de 12 h seguidas) piden confirmar antes de guardar.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  departamentos, duracion, filtrarCandidatos, resumenSeleccion, salioAntes,
} from "@/lib/asistencia/turnosExtra.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";

const TONO_AVISO = {
  grave: "text-red-700 font-semibold",
  aviso: "text-amber-700",
  info: "text-gray-500",
};

const vacio = (fecha) => ({
  nombre: "", fecha, hora_inicio: "11:00", hora_fin: "19:00", tolerancia_min: 30, motivo: "",
});

export default function TurnoExtraDialog({ open, onOpenChange, empresas, turno, plantilla, fechaInicial, onGuardado }) {
  const { enqueueSnackbar } = useSnackbar();
  const editando = Boolean(turno);
  const [datos, setDatos] = useState(vacio(fechaInicial));
  const [empresa, setEmpresa] = useState("");
  const [candidatos, setCandidatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [seleccion, setSeleccion] = useState(new Set());
  const [filtro, setFiltro] = useState("salieron");
  const [buscar, setBuscar] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Se reinicia SOLO al abrirse: `plantilla` se recarga cada minuto con el turno en curso y borraría lo editado.
  const abierto = useRef(false);
  const plantillaCargada = useRef(false);
  useEffect(() => {
    if (!open) { abierto.current = false; return; }
    if (abierto.current) return;
    abierto.current = true;
    plantillaCargada.current = false;
    setEmpresa(String(turno?.id_empresa ?? empresas[0]?.id ?? ""));
    setDatos(turno ? {
      nombre: turno.nombre, fecha: turno.fecha, hora_inicio: turno.hora_inicio, hora_fin: turno.hora_fin,
      tolerancia_min: turno.tolerancia_min, motivo: turno.motivo ?? "",
    } : vacio(fechaInicial));
    setFiltro(turno ? "elegidos" : "salieron");
    setBuscar("");
    setConfirmar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `empresas` puede llegar después; lo cubre el efecto siguiente.
  }, [open, turno, fechaInicial]);
  // La empresa y la plantilla pueden llegar después de abrir: se ponen una sola vez.
  useEffect(() => {
    if (open && !empresa) setEmpresa(String(turno?.id_empresa ?? empresas[0]?.id ?? ""));
  }, [open, empresa, turno, empresas]);
  useEffect(() => {
    if (!open || plantillaCargada.current || (turno && !plantilla)) return;
    plantillaCargada.current = true;
    setSeleccion(new Set((plantilla ?? []).map((p) => p.id_empleado)));
  }, [open, turno, plantilla]);

  const horarioValido = /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) && duracion(datos.hora_inicio, datos.hora_fin) > 0;

  useEffect(() => {
    if (!open || !empresa || !horarioValido) return undefined;
    let vigente = true;
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const { data } = await axios.get("/checador/turnos-extra/candidatos", {
          params: { empresa, fecha: datos.fecha, hora_inicio: datos.hora_inicio, hora_fin: datos.hora_fin, turno: turno?.id },
        });
        if (vigente) setCandidatos(data?.data ?? []);
      } catch (e) {
        if (vigente) enqueueSnackbar(e?.response?.data?.error || "No se pudo calcular quién puede venir", { variant: "error" });
      } finally {
        if (vigente) setCargando(false);
      }
    }, 300);
    return () => { vigente = false; clearTimeout(t); };
  }, [open, empresa, datos.fecha, datos.hora_inicio, datos.hora_fin, horarioValido, turno?.id, enqueueSnackbar]);

  const salieron = useMemo(
    () => candidatos.filter((c) => salioAntes(c, datos.fecha, datos.hora_inicio)).length,
    [candidatos, datos.fecha, datos.hora_inicio],
  );
  const deptos = useMemo(() => departamentos(candidatos), [candidatos]);
  const visibles = useMemo(() => {
    if (filtro === "elegidos") return candidatos.filter((c) => seleccion.has(c.id_empleado) && filtrarCandidatos([c], { buscar }).length);
    return filtrarCandidatos(candidatos, { filtro, buscar, fecha: datos.fecha, horaInicio: datos.hora_inicio });
  }, [candidatos, filtro, buscar, seleccion, datos.fecha, datos.hora_inicio]);
  const resumen = useMemo(() => resumenSeleccion(candidatos, seleccion), [candidatos, seleccion]);

  const cambiar = (campo) => (e) => { setDatos((d) => ({ ...d, [campo]: e.target.value })); setConfirmar(false); };
  const alternar = (id) => {
    setSeleccion((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setConfirmar(false);
  };
  const todosVisibles = visibles.length > 0 && visibles.every((c) => seleccion.has(c.id_empleado));
  const alternarVisibles = () => setSeleccion((s) => {
    const n = new Set(s);
    for (const c of visibles) { if (todosVisibles) n.delete(c.id_empleado); else n.add(c.id_empleado); }
    return n;
  });

  const guardar = async () => {
    if (!datos.nombre.trim()) return enqueueSnackbar("Ponle un nombre al turno", { variant: "warning" });
    if (!horarioValido) return enqueueSnackbar("Revisa el día y el horario", { variant: "warning" });
    if (!resumen.personas) return enqueueSnackbar("Elige al menos a una persona", { variant: "warning" });
    if (resumen.graves.length && !confirmar) { setConfirmar(true); return undefined; }
    setGuardando(true);
    try {
      const cuerpo = { ...datos, tolerancia_min: Number(datos.tolerancia_min), empleados: [...seleccion], confirmar: resumen.graves.length > 0 };
      const { data } = editando
        ? await axios.put(`/checador/turnos-extra/${turno.id}`, cuerpo)
        : await axios.post("/checador/turnos-extra", { ...cuerpo, id_empresa: Number(empresa) });
      enqueueSnackbar(editando ? "Turno extra guardado" : `Turno extra programado: ${resumen.personas} personas`, { variant: "success" });
      onGuardado?.(editando ? turno.id : data?.data?.id);
      onOpenChange(false);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo guardar el turno extra", { variant: "error" });
    } finally {
      setGuardando(false);
    }
    return undefined;
  };

  const chip = (valor, texto) => (
    <button
      type="button"
      key={valor}
      onClick={() => setFiltro(valor)}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${filtro === valor ? "border-brand bg-brand text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
    >
      {texto}
    </button>
  );
  const campo = "rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[1040px]">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar turno extra" : "Nuevo turno extra"}</DialogTitle>
          <DialogDescription>
            Elige el día, el horario y quién viene. El sistema avisa lo que la ley marca; la empresa decide.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <label className="col-span-2 flex flex-col gap-1 text-[11.5px] font-semibold text-gray-500">
            Nombre
            <input className={campo} value={datos.nombre} onChange={cambiar("nombre")} placeholder="Doble turno · Producción" maxLength={120} />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-gray-500">
            Día
            <input type="date" className={campo} value={datos.fecha} onChange={cambiar("fecha")} />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-gray-500">
            Entra
            <input type="time" className={campo} value={datos.hora_inicio} onChange={cambiar("hora_inicio")} />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-gray-500">
            Sale
            <input type="time" className={campo} value={datos.hora_fin} onChange={cambiar("hora_fin")} />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-gray-500">
            Tolerancia
            <select className={campo} value={datos.tolerancia_min} onChange={cambiar("tolerancia_min")}>
              {[0, 10, 15, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </label>
          {empresas.length > 1 && !editando ? (
            <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-gray-500">
              Empresa
              <select className={campo} value={empresa} onChange={(e) => { setEmpresa(e.target.value); setSeleccion(new Set()); }}>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </label>
          ) : null}
          <label className={`${empresas.length > 1 && !editando ? "col-span-2 sm:col-span-3" : "col-span-2 sm:col-span-4"} flex flex-col gap-1 text-[11.5px] font-semibold text-gray-500`}>
            Motivo
            <input className={campo} value={datos.motivo} onChange={cambiar("motivo")} placeholder="Opcional" maxLength={255} />
          </label>
        </div>
        {horarioValido ? (
          <p className="text-xs text-gray-500">
            Dura <b className="text-gray-800">{formatearMinutos(duracion(datos.hora_inicio, datos.hora_fin))}</b>
            {horaFinMenor(datos) ? " · termina al día siguiente" : ""}. Quien esté en la plantilla puede checar desde {datos.tolerancia_min} min antes.
          </p>
        ) : <p className="text-xs text-red-600">La entrada y la salida no pueden ser iguales.</p>}

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          <span>Mostrar:</span>
          {chip("salieron", `Salieron hoy de su turno (${salieron})`)}
          {deptos.slice(0, 4).map((d) => chip(`depto:${d.nombre}`, `${d.nombre} (${d.total})`))}
          {chip("todos", `Todos (${candidatos.length})`)}
          {chip("elegidos", `Elegidos (${resumen.personas})`)}
          <input className={`${campo} ml-auto w-full sm:w-48`} placeholder="Buscar empleado…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{cargando ? "Calculando avisos…" : `${visibles.length} personas`}</span>
          {visibles.length ? (
            <button type="button" className="font-semibold text-brand hover:underline" onClick={alternarVisibles}>
              {todosVisibles ? "Quitar a los mostrados" : "Elegir a los mostrados"}
            </button>
          ) : null}
        </div>
        {visibles.length ? (
          <div className="hidden max-h-[42vh] overflow-auto rounded-xl border border-gray-200 md:block" aria-busy={cargando}>
            <table className="w-full border-collapse text-[12.5px] tabular-nums" aria-label="Personas para el turno">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-[10.5px] uppercase tracking-wide text-gray-500 shadow-[0_1px_0_#e5e7eb]">
                <tr>
                  <th scope="col" className="w-9 px-2 py-2">
                    <input type="checkbox" aria-label={todosVisibles ? "Quitar a los mostrados" : "Elegir a los mostrados"}
                      className="h-4 w-4 accent-[var(--color-brand,#2563eb)]" checked={todosVisibles} onChange={alternarVisibles} />
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold">Empleado</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Su turno</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Salió</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Semana</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Extra sem.</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Este turno</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Avisos de ley</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const elegido = seleccion.has(c.id_empleado);
                  const avisos = c.avisos?.filter((a) => a.nivel !== "info") ?? [];
                  const info = c.avisos?.filter((a) => a.nivel === "info") ?? [];
                  return (
                    <tr key={c.id_empleado} aria-label={c.nombre_empleado} aria-selected={elegido} onClick={() => alternar(c.id_empleado)}
                      className={`cursor-pointer border-t border-gray-100 align-top ${elegido ? "bg-brand/5" : "hover:bg-gray-50"} ${c.grave ? "shadow-[inset_3px_0_0_#ef4444]" : ""}`}>
                      <td className="px-2 py-1.5">
                        <input type="checkbox" aria-label={`Elegir a ${c.nombre_empleado}`} className="h-4 w-4 accent-[var(--color-brand,#2563eb)]"
                          checked={elegido} onChange={() => alternar(c.id_empleado)} onClick={(e) => e.stopPropagation()} />
                      </td>
                      <td className="px-2 py-1.5">
                        <b className="block leading-tight text-gray-900">{c.nombre_empleado}</b>
                        <span className="text-[11px] text-gray-500">{c.departamento || c.puesto || ""}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-gray-600">{c.horario_dia ?? <span className="text-gray-400">{info.length ? "Descanso" : "—"}</span>}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-gray-600">{c.salida_anterior ? c.salida_anterior.slice(11, 16) : "—"}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{c.semanaTrabajado != null ? formatearMinutos(c.semanaTrabajado) : "—"}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{c.semanaExtraAutorizadas ? formatearMinutos(c.semanaExtraAutorizadas) : "—"}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        {formatearMinutos(c.duracion)}
                        {c.triples ? <span className="block text-[11px] font-semibold text-red-700">{formatearMinutos(c.triples)} al triple</span> : null}
                      </td>
                      <td className="px-2 py-1.5">
                        {avisos.length ? avisos.map((a) => (
                          <span key={a.codigo} className={`block leading-snug ${TONO_AVISO[a.nivel] ?? ""}`}>⚠ {a.mensaje}</span>
                        )) : <span className="text-gray-400">{info.length ? info.map((a) => a.mensaje).join(" · ") : "Sin avisos"}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="grid max-h-[38vh] grid-cols-1 gap-1.5 overflow-y-auto pr-1 md:hidden" aria-busy={cargando}>
          {visibles.map((c) => {
            const elegido = seleccion.has(c.id_empleado);
            return (
              <label
                key={c.id_empleado}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] ${elegido ? "border-brand/50 bg-brand/5" : "border-gray-200"} ${c.grave ? "ring-1 ring-red-200" : ""}`}
              >
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-brand,#2563eb)]" checked={elegido} onChange={() => alternar(c.id_empleado)} />
                <div className="min-w-0">
                  <b className="block text-[13.5px] text-gray-900">{c.nombre_empleado}</b>
                  <span className="block text-gray-500">
                    {c.horario_dia ? `Turno ${c.horario_dia}` : "Sin horario ese día"}
                    {c.salida_anterior ? ` · salió ${c.salida_anterior.slice(11, 16)}` : ""}
                    {c.semanaTrabajado != null ? ` · semana ${formatearMinutos(c.semanaTrabajado)}` : ""}
                    {c.semanaExtraAutorizadas ? ` · extra ${formatearMinutos(c.semanaExtraAutorizadas)}` : ""}
                  </span>
                  {c.avisos?.map((a) => (
                    <span key={a.codigo} className={`block ${TONO_AVISO[a.nivel] ?? ""}`}>
                      {a.nivel === "info" ? "" : "⚠ "}{a.mensaje}
                    </span>
                  ))}
                </div>
              </label>
            );
          })}
        </div>
        {!cargando && !visibles.length ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
            {filtro === "salieron" ? "Nadie salió de su turno poco antes de este horario. Usa «Todos» o un departamento." : "No hay personas con este filtro."}
          </p>
        ) : null}

        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-gray-700">
          <b>LFT:</b> el turno extra son <b>horas extra</b> y son voluntarias. Máx. <b>4 h extra al día</b> en 4 días por semana y jornada máx. <b>12 h</b>.
          Las primeras horas extra de la semana se pagan al doble (9 h en 2027) y el resto al <b>triple</b>. Si se rebasa, queda registrado con la alerta.
        </div>

        {confirmar && resumen.graves.length ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <b>{resumen.graves.length === 1 ? "1 persona tiene" : `${resumen.graves.length} personas tienen`} avisos graves de ley:</b>
            <ul className="ml-4 list-disc">
              {resumen.graves.map((g) => (
                <li key={g.id_empleado}>{g.nombre_empleado}: {g.avisos.filter((a) => a.nivel === "grave").map((a) => a.mensaje).join(" · ")}</li>
              ))}
            </ul>
            Si de todos modos la empresa decide programarlas, queda registrado quién lo confirmó. Pulsa otra vez para confirmar.
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-gray-500">
            {resumen.personas} personas · {formatearMinutos(resumen.minutos)} extra programadas
            {resumen.triples ? ` · ${formatearMinutos(resumen.triples)} al triple` : ""}
            {resumen.conAvisos ? ` · ${resumen.conAvisos} con avisos` : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando} className={confirmar ? "bg-red-600 hover:bg-red-700" : ""}>
              {guardando ? "Guardando…" : confirmar ? "Confirmar y programar" : editando ? "Guardar cambios" : "Programar turno"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function horaFinMenor(d) {
  return String(d.hora_fin) < String(d.hora_inicio);
}
