"use client";
// Ajustes → Plantillas de inducción (27/12/2026). Cada empresa define todo: plantilla general y otras por puesto, área o
// sucursal (gana la más específica). ADAMIA solo trae una sugerida que se copia y se edita. Aquí también los roles de
// la empresa (RH, Sistemas, Almacén…) con la persona que atiende cada uno: son los responsables de las tareas.
// Backend: /checador/induccion/plantillas y /roles.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { ClipboardPen, Plus, Sparkles, Trash2 } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API, RUTA_PLANTILLAS, textoAlcance } from "@/lib/induccion/induccion.mjs";
import { AvisoError, Campo, botonPrimario, botonSecundario, entrada, errorDe, get, opcionesSwr, tarjeta } from "./comun";

function Roles({ idEmpresa, catalogo, alGuardar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [lista, setLista] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const roles = lista ?? catalogo?.roles ?? [];
  const cambiar = (i, k, v) => { setLista(roles.map((r, j) => (j === i ? { ...r, [k]: v } : r))); setErrores({}); };
  const guardar = async () => {
    setGuardando(true);
    try {
      await axios.put(`${API}/roles`, { empresa: idEmpresa, roles: roles.filter((r) => r.nombre?.trim() || r.id_rol).map((r) => ({ id_rol: r.id_rol ?? null, nombre: r.nombre, id_empleado: r.id_empleado ? Number(r.id_empleado) : null })) });
      setLista(null);
      await alGuardar();
      enqueueSnackbar("Roles guardados.", { variant: "success" });
    } catch (e) {
      setErrores(e?.response?.data?.campos ?? {});
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally { setGuardando(false); }
  };
  return (
    <section aria-labelledby="ind-roles" className={`${tarjeta} grid gap-3 p-4`}>
      <div>
        <h2 id="ind-roles" className="text-base font-bold text-slate-900">Roles y quién los atiende</h2>
        <p className="text-[13px] text-slate-600">Una tarea puede ser de una persona, de un rol (RH, Sistemas, Almacén…) o de «su jefe directo». Al iniciar cada ingreso, el rol se resuelve con la persona que tenga asignada.</p>
      </div>
      <ul className="grid gap-2">
        {roles.map((r, i) => (
          <li key={r.id_rol ?? `nuevo-${i}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end" data-rol={r.nombre}>
            <Campo id={`rol-${i}-nombre`} etiqueta="Rol" error={errores[`roles.${i}.nombre`]}><input id={`rol-${i}-nombre`} className={entrada} value={r.nombre ?? ""} maxLength={60} onChange={(e) => cambiar(i, "nombre", e.target.value)} /></Campo>
            <Campo id={`rol-${i}-persona`} etiqueta="Lo atiende" error={errores[`roles.${i}.id_empleado`]}>
              <select id={`rol-${i}-persona`} className={entrada} value={r.id_empleado ?? ""} onChange={(e) => cambiar(i, "id_empleado", e.target.value || null)}>
                <option value="">Sin asignar</option>
                {(catalogo?.personas ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Campo>
            <button type="button" aria-label={`Quitar el rol ${r.nombre || ""}`} onClick={() => setLista(roles.filter((_, j) => j !== i))} className={`${botonSecundario} w-11 px-0`}><Trash2 className="size-4" aria-hidden="true" /></button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setLista([...roles, { nombre: "", id_empleado: null }])} className={botonSecundario}><Plus className="size-4" aria-hidden="true" />Agregar rol</button>
        <button type="button" onClick={guardar} disabled={guardando || lista === null} className={botonPrimario}>{guardando ? "Guardando…" : "Guardar roles"}</button>
      </div>
    </section>
  );
}

export default function PlantillasInduccion() {
  const router = useRouter();
  const empresa = useEmpresaNomina();
  const q = empresa.idEmpresa ? `?empresa=${empresa.idEmpresa}` : null;
  const plantillas = useSWR(q ? `${API}/plantillas${q}` : null, get, opcionesSwr);
  const catalogo = useSWR(q ? `${API}/catalogo${q}` : null, get, opcionesSwr);
  const [sugerida, setSugerida] = useState(null); // { alcance, alcance_valor }
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);
  const lista = plantillas.data?.plantillas ?? [];
  const hayGeneral = lista.some((p) => p.alcance === "general");

  const copiarSugerida = async (alcance = { alcance: "general" }) => {
    setCreando(true);
    setError("");
    try {
      const r = await axios.post(`${API}/plantillas`, { empresa: empresa.idEmpresa, desde_sugerida: true, ...alcance, nombre: alcance.alcance === "general" ? undefined : `Plantilla ${alcance.alcance_valor}` });
      router.push(`${RUTA_PLANTILLAS}/${r.data.plantilla.id}`);
    } catch (e) {
      setError(errorDe(e, "No se pudo copiar la plantilla sugerida."));
    } finally { setCreando(false); }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-1" data-pantalla="plantillas-induccion">
      <EncabezadoPagina icono={ClipboardPen} titulo="Plantillas de inducción" />
      <p className="-mt-3 text-[13px] text-slate-600">Tú decides qué se pide, qué se firma y quién hace cada cosa. ADAMIA trae una sugerida para empezar.</p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <SelectorEmpresa {...empresa} />
        <button type="button" disabled={!empresa.idEmpresa || creando} onClick={() => (hayGeneral ? setSugerida({ alcance: "puesto", alcance_valor: "" }) : copiarSugerida())} className={botonSecundario}><Sparkles className="size-4" aria-hidden="true" />Usar la sugerida de ADAMIA</button>
        <Link href={`${RUTA_PLANTILLAS}/nueva`} className={botonPrimario}><Plus className="size-4" aria-hidden="true" />Plantilla en blanco</Link>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <AvisoError error={plantillas.error} porDefecto="No se pudieron cargar las plantillas." />

      <section aria-labelledby="ind-lista" className="grid gap-3">
        <h2 id="ind-lista" className="text-base font-bold text-slate-900">Tus plantillas</h2>
        {plantillas.data && !lista.length ? <p className={`${tarjeta} p-5 text-sm text-slate-600`}>Aún no tienes plantillas. Empieza con la sugerida de ADAMIA y ajústala a tu empresa.</p> : null}
        <ul className="grid gap-3 md:grid-cols-2">
          {lista.map((p) => (
            <li key={p.id} className={`${tarjeta} grid gap-2 p-4`} data-plantilla={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><b className="block text-sm text-slate-900">{p.nombre}</b><span className="text-[13px] text-slate-600">{textoAlcance(p)}</span></div>
                {p.origen === "sugerida" ? <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[13px] font-semibold text-indigo-800">De la sugerida</span> : null}
              </div>
              <p className="text-[13px] text-slate-600">{p.resumen.documentos} documentos · {p.resumen.firmas} a firmar · {p.resumen.ruta} pasos de bienvenida · {p.resumen.tareas} tareas</p>
              <Link href={`${RUTA_PLANTILLAS}/${p.id}`} className={`${botonSecundario} w-fit`}>Editar</Link>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-slate-500">Puedes tener una plantilla general y otras por puesto, área o sucursal. Cambiar la plantilla no afecta a quien ya está en proceso.</p>
      </section>

      <Roles idEmpresa={empresa.idEmpresa} catalogo={catalogo.data} alGuardar={() => catalogo.mutate()} />

      <Dialog open={Boolean(sugerida)} onOpenChange={(a) => { if (!a) setSugerida(null); }}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); copiarSugerida(sugerida).then(() => setSugerida(null)); }} className="grid gap-4">
            <DialogHeader><DialogTitle>¿Para quién es esta copia?</DialogTitle><DialogDescription>Ya tienes una plantilla general. La sugerida se copia para un puesto, área o sucursal.</DialogDescription></DialogHeader>
            <Campo id="sug-alcance" etiqueta="Aplica a">
              <select id="sug-alcance" className={entrada} value={sugerida?.alcance ?? "puesto"} onChange={(e) => setSugerida((s) => ({ ...s, alcance: e.target.value, alcance_valor: "" }))}>
                <option value="puesto">Un puesto</option><option value="area">Un área</option><option value="sucursal">Una sucursal</option>
              </select>
            </Campo>
            <Campo id="sug-valor" etiqueta="¿Cuál?">
              <select id="sug-valor" className={entrada} value={sugerida?.alcance_valor ?? ""} onChange={(e) => setSugerida((s) => ({ ...s, alcance_valor: e.target.value }))}>
                <option value="">Elegir…</option>
                {(catalogo.data?.[{ puesto: "puestos", area: "areas", sucursal: "sucursales" }[sugerida?.alcance ?? "puesto"]] ?? []).map((x) => <option key={x}>{x}</option>)}
              </select>
            </Campo>
            <DialogFooter className="gap-2"><button type="button" className={botonSecundario} onClick={() => setSugerida(null)}>Cancelar</button><button type="submit" disabled={!sugerida?.alcance_valor || creando} className={botonPrimario}>Copiar</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
