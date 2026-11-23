"use client";

// WhatsApp de reclutamiento por empresa (solo administradores de ADAMIA, R1).
// 27/11/2026: paquetes de entrevistas: entrevistas del mes / incluidas, extras e importe estimado del mes.
import { useMemo, useState } from "react";
import useSWR from "swr";
import { enqueueSnackbar } from "notistack";
import { MessageCircle, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LoadingTable from "@/components/LoadingTable";
import { useAuth } from "@/context/AuthContext";
import { RUTA_WA, obtener } from "@/components/whatsapp/api";
import { formatearPrecio, mensajeErrorApi, textoModo } from "@/lib/whatsapp/reglas.mjs";
import { formatearTelefono } from "@/lib/whatsapp/telefono.mjs";
import { textoEntrevistasAdmin } from "@/lib/whatsapp/paquete.mjs";
import DialogoEmpresaWhatsapp from "./DialogoEmpresaWhatsapp";

const ESTILO_MODO = {
  apagado: "bg-slate-100 text-slate-700",
  compartido: "bg-blue-50 text-blue-700",
  propio: "bg-emerald-50 text-emerald-800",
};
const normalizar = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Encabezados largos en dos líneas para que la tabla quepa en escritorio sin desplazarse.
const ENCABEZADO_LARGO = "max-w-28 whitespace-normal text-right leading-tight";

const MODO_CORTO = { apagado: "Apagado", compartido: "Compartido", propio: "Número propio" };

function ChipModo({ modo }) {
  return (
    <span title={textoModo(modo)} className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${ESTILO_MODO[modo] ?? ESTILO_MODO.apagado}`}>
      {MODO_CORTO[modo] ?? MODO_CORTO.apagado}
    </span>
  );
}

export default function WhatsappAdminPage() {
  const { dataUser } = useAuth();
  const esAdmin = dataUser?.tipo_usuario === "Admin";
  const { data, error, isLoading, mutate } = useSWR(esAdmin ? `${RUTA_WA}/admin/empresas` : null, obtener);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const empresas = useMemo(() => (Array.isArray(data) ? data : data?.empresas ?? []), [data]);
  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return q ? empresas.filter((e) => normalizar(e.nombre_empresa).includes(q) || String(e.id_empresa) === q) : empresas;
  }, [empresas, busqueda]);
  const activas = empresas.filter((e) => e.modo && e.modo !== "apagado").length;
  const conversaciones = empresas.reduce((t, e) => t + (Number(e.conversaciones_mes) || 0), 0);
  const entrevistas = empresas.reduce((t, e) => t + (Number(e.entrevistas_mes) || 0), 0);
  const importe = empresas.reduce((t, e) => t + (Number(e.importe_estimado) || 0), 0);

  const guardado = async (empresa) => {
    enqueueSnackbar(`WhatsApp de ${empresa.nombre_empresa} actualizado.`, { variant: "success" });
    setEditando(null);
    await mutate();
  };

  if (dataUser && !esAdmin) {
    return <p role="alert" className="rounded-xl border p-6 text-sm">Esta sección es solo para administradores de ADAMIA.</p>;
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><MessageCircle className="size-6" /> WhatsApp (reclutamiento)</h1>
          <p className="text-sm text-muted-foreground">Activa WhatsApp por empresa, con el número compartido de ADAMIA o con el suyo, y define su paquete de entrevistas.</p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen">
        {[["Empresas con WhatsApp", activas], ["Conversaciones este mes", conversaciones.toLocaleString("es-MX")], ["Entrevistas este mes", entrevistas.toLocaleString("es-MX")], ["Importe estimado del mes", formatearPrecio(importe)]].map(([t, v]) => (
          <div key={t} className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">{t}</p>
            <p className="text-2xl font-bold">{v}</p>
          </div>
        ))}
      </section>

      <label className="relative block max-w-md">
        <span className="sr-only">Buscar empresa</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar empresa"
          className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:h-10 md:text-sm"
        />
      </label>

      {isLoading ? <LoadingTable /> : error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{mensajeErrorApi(error, "No se pudieron cargar las empresas.")}</p>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">{busqueda ? `Ninguna empresa coincide con «${busqueda}».` : "Aún no hay empresas."}</p>
        </div>
      ) : (
        <>
          <div className="hidden min-w-0 overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Número y cuenta de Zernio</TableHead>
                  <TableHead className={ENCABEZADO_LARGO}>Paquete mensual</TableHead>
                  <TableHead className={ENCABEZADO_LARGO}>Por entrevista extra</TableHead>
                  <TableHead className={ENCABEZADO_LARGO}>Entrevistas este mes / incluidas</TableHead>
                  <TableHead className="text-right">Extra</TableHead>
                  <TableHead className={ENCABEZADO_LARGO}>Importe estimado del mes</TableHead>
                  <TableHead className={ENCABEZADO_LARGO}>Conversaciones del mes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((e) => (
                  <TableRow key={e.id_empresa}>
                    <TableCell className="font-medium">{e.nombre_empresa}</TableCell>
                    <TableCell><ChipModo modo={e.modo} /></TableCell>
                    <TableCell>
                      <span className="block">{e.numero_whatsapp ? formatearTelefono(e.numero_whatsapp) : "—"}</span>
                      {e.zernio_account_id ? <span className="block font-mono text-xs text-gray-500">{e.zernio_account_id}</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatearPrecio(e.precio_mensual)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatearPrecio(e.precio_conversacion)}</TableCell>
                    <TableCell className="text-right tabular-nums">{textoEntrevistasAdmin(e)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${Number(e.entrevistas_extra) > 0 ? "font-semibold text-amber-800" : ""}`}>{(Number(e.entrevistas_extra) || 0).toLocaleString("es-MX")}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatearPrecio(e.importe_estimado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{(Number(e.conversaciones_mes) || 0).toLocaleString("es-MX")}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setEditando(e)} aria-label={`Editar WhatsApp de ${e.nombre_empresa}`}><Pencil className="size-4" /> Editar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 md:hidden" aria-label="Empresas">
            {filtradas.map((e) => (
              <li key={e.id_empresa} className="rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold [overflow-wrap:anywhere]">{e.nombre_empresa}</p>
                  <ChipModo modo={e.modo} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-gray-500">Número</dt><dd className="text-right">{e.numero_whatsapp ? formatearTelefono(e.numero_whatsapp) : "—"}</dd>
                  <dt className="text-gray-500">Paquete mensual</dt><dd className="text-right">{formatearPrecio(e.precio_mensual)}</dd>
                  <dt className="text-gray-500">Por entrevista extra</dt><dd className="text-right">{formatearPrecio(e.precio_conversacion)}</dd>
                  <dt className="text-gray-500">Entrevistas este mes / incluidas</dt><dd className="text-right">{textoEntrevistasAdmin(e)}</dd>
                  <dt className="text-gray-500">Extra</dt><dd className={`text-right ${Number(e.entrevistas_extra) > 0 ? "font-semibold text-amber-800" : ""}`}>{Number(e.entrevistas_extra) || 0}</dd>
                  <dt className="text-gray-500">Importe estimado del mes</dt><dd className="text-right font-medium">{formatearPrecio(e.importe_estimado)}</dd>
                  <dt className="text-gray-500">Conversaciones del mes</dt><dd className="text-right">{Number(e.conversaciones_mes) || 0}</dd>
                </dl>
                <Button variant="outline" onClick={() => setEditando(e)} className="mt-3 h-11 w-full" aria-label={`Editar WhatsApp de ${e.nombre_empresa}`}><Pencil className="size-4" /> Editar</Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <DialogoEmpresaWhatsapp empresa={editando} onCerrar={() => setEditando(null)} onGuardado={guardado} />
    </div>
  );
}
