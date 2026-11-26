"use client";
// Ajustes → Integraciones (26/12/2026): llaves de API de la empresa para conectar sistemas externos (nómina, ERP…).
// Solo el dueño de la cuenta (la ruta es «dueno» en src/lib/permisos/permisos.mjs y el servidor responde 403 SOLO_DUENO
// a cualquier otro). Crear (la llave se muestra una vez), listar, revocar con confirmación, bitácora reciente y enlace a
// la documentación. Backend: /api/checador/integraciones (docs/api-integracion.md).
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { BookOpen, KeyRound, Plug, Plus } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LIMITE_POR_MINUTO, RUTA_DOCS, urlBaseApi } from "@/lib/integraciones/integraciones.mjs";
import { DialogoLlaveCreada, DialogoNuevaLlave } from "./DialogoNuevaLlave";
import { Bitacora, ListaLlaves } from "./ListaLlaves";

const get = (url) => axios.get(url).then((r) => r.data);
const errorDe = (e, porDefecto) => e?.response?.data?.error || porDefecto;
const opciones = { revalidateOnFocus: false, shouldRetryOnError: false };

export default function IntegracionesEmpresa() {
  const { enqueueSnackbar } = useSnackbar();
  const empresa = useEmpresaNomina();
  const nombreEmpresa = empresa.empresas.find((e) => e.id === empresa.idEmpresa)?.nombre;
  const q = empresa.idEmpresa ? `?empresa=${empresa.idEmpresa}` : null;
  const catalogo = useSWR("/checador/integraciones/catalogo", get, opciones);
  const llaves = useSWR(q ? `/checador/integraciones/llaves${q}` : null, get, opciones);
  const bitacora = useSWR(q ? `/checador/integraciones/bitacora${q}&limite=30` : null, get, opciones);
  const [nueva, setNueva] = useState(false);
  const [creada, setCreada] = useState(null);
  const [revocar, setRevocar] = useState(null);

  const crear = async (datos) => {
    try {
      const r = await axios.post("/checador/integraciones/llaves", { empresa: empresa.idEmpresa, ...datos });
      setCreada(r.data);
      await llaves.mutate();
      return null;
    } catch (e) {
      const campos = e?.response?.data?.campos;
      if (campos) return { nombre: campos.nombre, permisos: campos.permisos, vigencia: campos.expira_en_dias };
      return { general: errorDe(e, "No se pudo crear la llave. Intenta de nuevo.") };
    }
  };

  const confirmarRevocar = async () => {
    const l = revocar;
    setRevocar(null);
    try {
      await axios.post(`/checador/integraciones/llaves/${l.id}/revocar`, { empresa: empresa.idEmpresa });
      await llaves.mutate();
      enqueueSnackbar(`«${l.nombre}» quedó revocada. Los sistemas que la usaban ya no podrán entrar.`, { variant: "success" });
    } catch (e) {
      enqueueSnackbar(errorDe(e, "No se pudo revocar la llave."), { variant: "error" });
    }
  };

  const noConfigurada = catalogo.data && !catalogo.data.configurada;
  const errorCarga = llaves.error || catalogo.error;
  const lista = llaves.data?.data ?? [];
  const activas = lista.filter((l) => l.estado === "activa").length;
  const base = urlBaseApi(process.env.NEXT_PUBLIC_RUTA_BACKEND);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-1">
      <EncabezadoPagina icono={Plug} titulo="Integraciones" subtitulo="Llaves de API para conectar otros sistemas a tu empresa." />
      {/* El selector va en su propia fila: junto al título aplastaba el subtítulo en el teléfono. */}
      {empresa.empresas.length > 1 ? <div className="flex justify-end"><SelectorEmpresa {...empresa} /></div> : null}

      <section aria-labelledby="int-como" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0 space-y-1">
          <h2 id="int-como" className="text-sm font-bold text-slate-900">API de ADAMIA v1</h2>
          <p className="text-[13px] text-slate-600">
            Consulta, crea y actualiza empleados y consulta asistencias de <b>{nombreEmpresa || "tu empresa"}</b>. Cada llave solo ve esta empresa y solo lo que le permitas. Límite: {catalogo.data?.limite_por_minuto ?? LIMITE_POR_MINUTO} peticiones por minuto.
          </p>
          <code className="block break-all font-mono text-[13px] text-slate-500">{base}</code>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button type="button" onClick={() => setNueva(true)} disabled={!empresa.idEmpresa || noConfigurada} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60">
            <Plus className="size-4" aria-hidden="true" />Crear llave
          </button>
          <Link href={RUTA_DOCS} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <BookOpen className="size-4" aria-hidden="true" />Ver documentación
          </Link>
        </div>
      </section>

      {noConfigurada ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">Las llaves de API aún no están activadas en este servidor. Avísale a soporte de ADAMIA.</p> : null}
      {errorCarga ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorDe(errorCarga, "No se pudieron cargar las llaves.")}</p> : null}

      <section aria-labelledby="int-llaves" className="space-y-2">
        <h2 id="int-llaves" className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <KeyRound className="size-4 text-slate-500" aria-hidden="true" />Llaves {lista.length ? <span className="font-medium text-slate-500">({activas} {activas === 1 ? "activa" : "activas"})</span> : null}
        </h2>
        {llaves.isLoading || (!llaves.data && !llaves.error) ? <p role="status" className="text-[13px] text-slate-500">Cargando llaves…</p> : <ListaLlaves llaves={lista} alRevocar={setRevocar} />}
      </section>

      <section aria-labelledby="int-bitacora" className="space-y-2">
        <h2 id="int-bitacora" className="text-sm font-bold text-slate-800">Uso reciente</h2>
        <p className="text-[13px] text-slate-500">Últimas 30 peticiones. Se guarda método, ruta, resultado y tiempo; nunca los datos enviados. Se conserva {catalogo.data?.retencion_bitacora_dias ?? 90} días.</p>
        <Bitacora filas={bitacora.data?.data ?? []} cargando={bitacora.isLoading} />
      </section>

      <DialogoNuevaLlave abierto={nueva} alCerrar={() => setNueva(false)} alCrear={crear} nombreEmpresa={nombreEmpresa} />
      <DialogoLlaveCreada llave={creada} alCerrar={() => setCreada(null)} />
      <AlertDialog open={Boolean(revocar)} onOpenChange={(a) => { if (!a) setRevocar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar «{revocar?.nombre}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Los sistemas que usan esta llave dejarán de funcionar de inmediato. No se puede deshacer: si la necesitas otra vez, crea una nueva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 bg-red-600 hover:bg-red-700" onClick={confirmarRevocar}>Revocar llave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
