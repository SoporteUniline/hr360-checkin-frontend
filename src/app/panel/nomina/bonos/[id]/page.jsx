"use client";

// Detalle de un bono o descuento (22/11/2026): sus datos y quién lo tiene. Se asigna o se quita a cada persona (o a todas
// las que se ven con el buscador) y se pone su valor propio; «Se lo ganan todos» lo aplica a toda la empresa.
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Pencil, Search, Settings2 } from "lucide-react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Kpi, mensajeError } from "@/components/nomina/comun";
import { EncabezadoDetalle, Cargando, ErrorCarga, Tabla, celda } from "@/components/nomina/ModuloNomina";
import FormConcepto, { CONDICION, FORMA } from "@/components/nomina/FormConcepto";
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { dinero } from "@/lib/nomina/nomina.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const sinAcentos = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const FILTROS = [["todos", "Todas"], ["si", "Lo tienen"], ["no", "No lo tienen"]];

export default function DetalleBono() {
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const { data, error, mutate } = useSWR(`/checador/nomina/conceptos/${id}`, get);
  const [cambios, setCambios] = useState({}); // id_empleado → { lo_tiene, valor }
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [editar, setEditar] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const c = data?.concepto;
  const personas = useMemo(() => (data?.personas ?? []).map((p) => ({ ...p, ...(cambios[p.id_empleado] ?? {}) })), [data, cambios]);
  const visibles = useMemo(() => {
    const q = sinAcentos(buscar.trim());
    return personas.filter((p) => (!q || sinAcentos(`${p.nombre} ${p.puesto ?? ""}`).includes(q)) && (filtro === "todos" || (filtro === "si") === p.lo_tiene));
  }, [personas, buscar, filtro]);

  if (error) return <div className="space-y-5 p-1"><ErrorCarga error={error} texto="No se pudo cargar el bono o descuento." /></div>;
  if (!data) return <div className="space-y-5 p-1"><Cargando /></div>;

  const original = new Map(data.personas.map((p) => [p.id_empleado, p]));
  const cambiar = (idEmp, campo, valor) => setCambios((prev) => {
    const base = { lo_tiene: original.get(idEmp).lo_tiene, valor: original.get(idEmp).valor, ...(prev[idEmp] ?? {}), [campo]: valor };
    const o = original.get(idEmp);
    const igual = base.lo_tiene === o.lo_tiene && String(base.valor ?? "") === String(o.valor ?? "");
    const { [idEmp]: _x, ...resto } = prev;
    return igual ? resto : { ...prev, [idEmp]: base };
  });
  const pendientes = Object.entries(cambios).map(([idEmp, x]) => ({ id_empleado: Number(idEmp), lo_tiene: x.lo_tiene, valor: x.valor === "" ? null : x.valor }));
  const guardar = async () => {
    setGuardando(true);
    try {
      await axios.put(`/checador/nomina/conceptos/${id}/personas`, { cambios: pendientes });
      enqueueSnackbar(`Guardado para ${pendientes.length} ${pendientes.length === 1 ? "persona" : "personas"}. Se aplica al calcular o recalcular una nómina.`, { variant: "success" });
      setCambios({});
      await mutate();
    } catch (err) {
      enqueueSnackbar(mensajeError(err, "No se pudo guardar."), { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  const conTodos = personas.filter((p) => p.lo_tiene).length;
  const todos = Number(c.para_todos) === 1;

  return (
    <div className="space-y-5 p-1">
      <EncabezadoDetalle regreso="/panel/nomina/bonos" textoRegreso="Bonos y descuentos" icono={Settings2} titulo={c.nombre}
        subtitulo={`${c.tipo === "descuento" ? "Descuento" : "Bono"} · ${FORMA[c.forma]}${c.forma === "condicionado" ? ` (${CONDICION[c.condicion]})` : ""}`}
        acciones={<Button variant="outline" onClick={() => setEditar({ ...c, valor: Number(c.valor), activo: Boolean(c.activo), para_todos: todos, condicion: c.condicion ?? "sin_faltas" })}><Pencil className="size-4" /> Editar</Button>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi titulo="Valor sugerido" valor={dinero(c.valor)} nota="cada persona puede tener el suyo" />
        <Kpi titulo="Lo tienen" valor={`${conTodos} de ${personas.length}`} clase="text-brand" />
        <Kpi titulo="Quién" valor={todos ? "Todos" : "Asignado"} nota={todos ? "también quien entre después" : "solo a quien se le asigna"} />
        <Kpi titulo="Estado" valor={c.activo ? "Activo" : "Inactivo"} clase={c.activo ? "text-emerald-700" : "text-slate-500"} />
      </div>

      {todos ? <p className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-[#080d36]">Se lo ganan todos. Para que alguien no lo tenga, quítale la marca.</p> : null}

      <section className="space-y-3" aria-label="Personas">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input aria-label="Buscar persona" placeholder="Buscar persona o puesto" className="min-h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand focus:outline-none" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          <div className="flex gap-1" role="group" aria-label="Filtrar">
            {FILTROS.map(([v, t]) => <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${filtro === v ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{t}</button>)}
          </div>
          <Button size="sm" variant="outline" disabled={!visibles.length} onClick={() => visibles.forEach((p) => cambiar(p.id_empleado, "lo_tiene", true))}>Marcar las {visibles.length}</Button>
          <Button size="sm" variant="outline" disabled={!visibles.length} onClick={() => visibles.forEach((p) => cambiar(p.id_empleado, "lo_tiene", false))}>Quitar a las {visibles.length}</Button>
        </div>

        <Tabla minimo={560} columnas={[{ titulo: "Lo tiene", clase: "w-24" }, { titulo: "Persona" }, { titulo: "Valor propio", clase: "w-44" }]}>
          {visibles.map((p) => {
            const cambiado = Boolean(cambios[p.id_empleado]);
            return (
              <tr key={p.id_empleado} className={`border-t border-slate-100 ${cambiado ? "bg-amber-50/50" : ""}`}>
                <td className={celda}>
                  <input type="checkbox" className="size-5 accent-[#2563eb]" aria-label={`${p.nombre} lo tiene`} checked={p.lo_tiene} onChange={(e) => cambiar(p.id_empleado, "lo_tiene", e.target.checked)} />
                </td>
                <td className={celda}>
                  <span className="font-semibold text-[#080d36]"><NombreEmpleado id={p.id_empleado}>{p.nombre}</NombreEmpleado></span>
                  <span className="block text-[11.5px] text-slate-500">{[p.puesto, p.quitado && !cambiado ? "se le quitó" : null].filter(Boolean).join(" · ")}</span>
                </td>
                <td className={celda}>
                  <input type="number" min="0" step="0.01" inputMode="decimal" aria-label={`Valor propio de ${p.nombre}`} placeholder={`Sugerido ${dinero(c.valor)}`}
                    disabled={!p.lo_tiene} className="min-h-9 w-full rounded-lg border border-slate-300 px-2 text-right disabled:bg-slate-50 disabled:text-slate-400"
                    value={p.valor ?? ""} onChange={(e) => cambiar(p.id_empleado, "valor", e.target.value)} />
                </td>
              </tr>
            );
          })}
          {visibles.length === 0 ? <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Nadie coincide con la búsqueda.</td></tr> : null}
        </Tabla>
      </section>

      {pendientes.length ? (
        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#080d36] px-4 py-3 text-sm text-white shadow-lg">
          <span>{pendientes.length} {pendientes.length === 1 ? "cambio" : "cambios"} sin guardar</span>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" onClick={() => setCambios({})}>Descartar</Button>
            <Button size="sm" disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar cambios"}</Button>
          </span>
        </div>
      ) : null}

      {editar ? <FormConcepto inicial={editar} idEmpresa={c.id_empresa} paraTodosDisponible={data.para_todos_disponible !== false} onCerrar={() => setEditar(null)} onGuardado={async () => { setEditar(null); await mutate(); }} /> : null}
    </div>
  );
}
