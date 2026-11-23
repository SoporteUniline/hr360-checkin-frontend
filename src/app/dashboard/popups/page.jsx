"use client";

// Pop-ups de venta de la página pública (solo administradores de ADAMIA). Backend: /api/checador/popups.
import { useState } from "react";
import useSWR from "swr";
import Cookies from "js-cookie";
import { enqueueSnackbar } from "notistack";
import { Megaphone, Pencil, Plus } from "lucide-react";
import { fetcherWithToken } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LoadingTable from "@/components/LoadingTable";
import FormularioPopup from "./FormularioPopup";
import { PAGINAS, DISPARADORES, textoDe } from "./opciones";

const API = `${process.env.NEXT_PUBLIC_RUTA_BACKEND ?? ""}/checador/popups`;
const ESTILO_ESTADO = {
  activo: "bg-green-100 text-green-800",
  pausado: "bg-amber-100 text-amber-800",
  archivado: "bg-slate-200 text-slate-700",
};
const porcentaje = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10} %` : "—");
const fechaCorta = (v) => (v ? String(v).slice(0, 16).replace("T", " ") : null);

async function pedir(ruta, opciones = {}) {
  const r = await fetch(`${API}${ruta}`, { ...opciones, headers: { Authorization: `Bearer ${Cookies.get("token")}`, ...(opciones.headers ?? {}) } });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error || "No se pudo completar la acción.");
  return cuerpo;
}

function cuandoAparece(p) {
  if (p.disparador === "tiempo") return `A los ${p.segundos} s`;
  if (p.disparador === "scroll") return `Al bajar ${p.scroll_pct} %`;
  return textoDe(DISPARADORES, p.disparador);
}

export default function PopupsPage() {
  const [verArchivados, setVerArchivados] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(`/checador/popups${verArchivados ? "?archivados=1" : ""}`, fetcherWithToken);
  const [formulario, setFormulario] = useState({ abierto: false, popup: null });
  const [cambiando, setCambiando] = useState(null);
  const popups = data?.popups ?? [];
  const activos = popups.filter((p) => p.estado === "activo");
  const vistas = popups.reduce((t, p) => t + Number(p.vistas || 0), 0);
  const clics = popups.reduce((t, p) => t + Number(p.clics || 0), 0);

  const guardar = async (datos) => {
    try {
      const editando = formulario.popup;
      await pedir(editando ? `/${editando.id}` : "", { method: editando ? "PUT" : "POST", body: datos });
      enqueueSnackbar(editando ? "Pop-up actualizado." : "Pop-up creado.", { variant: "success" });
      setFormulario({ abierto: false, popup: null });
      await mutate();
      return null;
    } catch (e) {
      return e.message;
    }
  };

  const cambiarEstado = async (p, estado) => {
    if (estado === "archivado" && !window.confirm(`¿Archivar «${p.nombre}»? Deja de mostrarse; puedes verlo en «Ver archivados».`)) return;
    setCambiando(p.id);
    try {
      await pedir(`/${p.id}/estado`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ estado }) });
      enqueueSnackbar(estado === "activo" ? "Pop-up activado." : estado === "pausado" ? "Pop-up pausado." : "Pop-up archivado.", { variant: "success" });
      await mutate();
    } catch (e) {
      enqueueSnackbar(e.message, { variant: "error" });
    } finally {
      setCambiando(null);
    }
  };

  const mensajeError = error?.response?.data?.error || error?.message;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Megaphone className="size-6" /> Pop-ups de la página</h1>
          <p className="text-sm text-muted-foreground">Promociones que aparecen en el inicio y el blog de adamia.com.mx. Se muestra uno a la vez, el de mayor prioridad.</p>
        </div>
        <Button onClick={() => setFormulario({ abierto: true, popup: null })}><Plus className="size-4" /> Nuevo pop-up</Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumen">
        {[["Activos", activos.length], ["Vistas", vistas.toLocaleString("es-MX")], ["Datos enviados (de las vistas)", `${clics.toLocaleString("es-MX")} · ${porcentaje(clics, vistas)}`]].map(([t, v]) => (
          <div key={t} className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">{t}</p>
            <p className="text-2xl font-bold">{v}</p>
          </div>
        ))}
      </section>

      {isLoading ? <LoadingTable /> : error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{mensajeError || "No se pudieron cargar los pop-ups."}</p>
      ) : popups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Aún no hay pop-ups.</p>
          <p className="text-sm text-muted-foreground">Crea uno para promocionar una oferta, un artículo de la ley o la cotización.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pop-up</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Dónde y cuándo</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="text-right">Vistas</TableHead>
                <TableHead className="text-right">Envíos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {popups.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">{p.titulo} → {p.boton_url}</p>
                  </TableCell>
                  <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTILO_ESTADO[p.estado]}`}>{p.estado}</span></TableCell>
                  <TableCell className="text-sm">
                    {(p.paginas ?? []).map((x) => textoDe(PAGINAS, x)).join(", ")}
                    <br /><span className="text-xs text-muted-foreground">{cuandoAparece(p)} · {Number(p.frecuencia_dias) ? `cada ${p.frecuencia_dias} días` : "cada visita"}</span>
                  </TableCell>
                  <TableCell className="text-sm">{fechaCorta(p.fecha_inicio) || fechaCorta(p.fecha_fin) ? `${fechaCorta(p.fecha_inicio) ?? "ya"} → ${fechaCorta(p.fecha_fin) ?? "sin fin"}` : "Siempre"}</TableCell>
                  <TableCell className="text-right">{Number(p.vistas).toLocaleString("es-MX")}</TableCell>
                  <TableCell className="text-right">{Number(p.clics).toLocaleString("es-MX")} <span className="text-xs text-muted-foreground">({porcentaje(Number(p.clics), Number(p.vistas))})</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {p.estado !== "archivado" ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setFormulario({ abierto: true, popup: p })} aria-label={`Editar ${p.nombre}`}><Pencil className="size-4" /></Button>
                          <Button size="sm" variant="outline" disabled={cambiando === p.id} onClick={() => cambiarEstado(p, p.estado === "activo" ? "pausado" : "activo")}>{p.estado === "activo" ? "Pausar" : "Activar"}</Button>
                          <Button size="sm" variant="ghost" disabled={cambiando === p.id} onClick={() => cambiarEstado(p, "archivado")}>Archivar</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" disabled={cambiando === p.id} onClick={() => cambiarEstado(p, "pausado")}>Recuperar</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={verArchivados} onChange={(e) => setVerArchivados(e.target.checked)} /> Ver archivados
      </label>

      <FormularioPopup abierto={formulario.abierto} popup={formulario.popup} alCerrar={() => setFormulario({ abierto: false, popup: null })} guardar={guardar} />
    </div>
  );
}
