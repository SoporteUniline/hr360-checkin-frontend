"use client";

// Nómina → Bonos y descuentos: catálogo y a quién se le aplica cada uno. Clic en el renglón → su detalle.
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus } from "lucide-react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Chip, Kpi, SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import { ModuloNomina, Tabla, FilaEnlace, CeldaEnlace, celda, Cargando, ErrorCarga, Vacio } from "@/components/nomina/ModuloNomina";
import FormConcepto, { CONDICION, FORMA, VACIO } from "@/components/nomina/FormConcepto";
import { dinero } from "@/lib/nomina/nomina.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const SUGERIDOS = [
  { nombre: "Bono de puntualidad", tipo: "percepcion", forma: "condicionado", condicion: "sin_retardos" },
  { nombre: "Bono de asistencia", tipo: "percepcion", forma: "condicionado", condicion: "sin_faltas" },
  { nombre: "Bono de productividad", tipo: "percepcion", forma: "manual" },
  { nombre: "Despensa", tipo: "percepcion", forma: "fijo" },
];

export default function BonosNomina() {
  const router = useRouter();
  const empresa = useEmpresaNomina();
  const { data, error, isLoading, mutate } = useSWR(empresa.idEmpresa ? `/checador/nomina/conceptos?empresa=${empresa.idEmpresa}` : null, get);
  const [form, setForm] = useState(null);
  const conceptos = data?.conceptos ?? [];
  const faltantes = SUGERIDOS.filter((s) => !conceptos.some((c) => c.nombre.toLowerCase() === s.nombre.toLowerCase()));
  const quien = (c) => (Number(c.para_todos) ? "Todos" : Number(c.asignados) ? `${c.asignados} ${Number(c.asignados) === 1 ? "persona" : "personas"}` : "Nadie aún");

  return (
    <ModuloNomina acciones={<><SelectorEmpresa {...empresa} /><Button onClick={() => setForm({ ...VACIO })} disabled={!empresa.idEmpresa}><Plus className="size-4" /> Nuevo bono o descuento</Button></>}>
      {error ? <ErrorCarga error={error} texto="No se pudo cargar el catálogo." /> : isLoading || !empresa.idEmpresa ? <Cargando /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi titulo="Bonos activos" valor={conceptos.filter((c) => c.activo && c.tipo !== "descuento").length} />
            <Kpi titulo="Descuentos activos" valor={conceptos.filter((c) => c.activo && c.tipo === "descuento").length} />
            <Kpi titulo="Para todos" valor={conceptos.filter((c) => c.activo && Number(c.para_todos)).length} />
            <Kpi titulo="Condicionados a asistencia" valor={conceptos.filter((c) => c.activo && c.forma === "condicionado").length} />
          </div>
          {faltantes.length ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm">
              <span className="font-semibold text-[#080d36]">Sugeridos:</span>
              {faltantes.map((s) => <Button key={s.nombre} size="sm" variant="outline" onClick={() => setForm({ ...VACIO, ...s })}>+ {s.nombre}</Button>)}
            </div>
          ) : null}
          {conceptos.length === 0 ? (
            <Vacio titulo="Aún no hay bonos ni descuentos." texto="Crea los de tu empresa (puntualidad, asistencia, despensa…) y asígnalos a quien corresponda o a todos." />
          ) : (
            <Tabla minimo={720} columnas={[{ titulo: "Concepto" }, { titulo: "Tipo" }, { titulo: "Cómo se aplica" }, { titulo: "Valor" }, { titulo: "Quién lo tiene" }, { titulo: "Estado" }]}>
              {conceptos.map((c) => {
                const href = `/panel/nomina/bonos/${c.id}`;
                return (
                  <FilaEnlace key={c.id} href={href} etiqueta={c.nombre}>
                    <CeldaEnlace href={href}>{c.nombre}</CeldaEnlace>
                    <td className={celda}>{c.tipo === "descuento" ? <Chip tono="rojo">Descuento</Chip> : <Chip tono="verde">Bono</Chip>}</td>
                    <td className={celda}>{FORMA[c.forma]}{c.forma === "condicionado" ? ` (${CONDICION[c.condicion]})` : ""}</td>
                    <td className={celda}>{dinero(c.valor)}</td>
                    <td className={celda}>{Number(c.para_todos) ? <Chip tono="azul">Todos</Chip> : quien(c)}</td>
                    <td className={celda}>{c.activo ? <Chip tono="verde">Activo</Chip> : <Chip>Inactivo</Chip>}</td>
                  </FilaEnlace>
                );
              })}
            </Tabla>
          )}
        </>
      )}
      {form ? (
        <FormConcepto inicial={form} idEmpresa={empresa.idEmpresa} paraTodosDisponible={data?.para_todos_disponible !== false}
          onCerrar={() => setForm(null)} onGuardado={async (id) => { setForm(null); await mutate(); router.push(`/panel/nomina/bonos/${id}`); }} />
      ) : null}
    </ModuloNomina>
  );
}
