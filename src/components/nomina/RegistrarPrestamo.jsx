"use client";

// Registrar un préstamo desde RH (Nómina R2). Queda aprobado y se envía el acuerdo para que la persona lo firme en
// Mi espacio; mientras no firme, no se descuenta. Antes de guardar se piden al backend los avisos (simular).
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeError } from "./comun";

const get = (url) => axios.get(url).then((r) => r.data);
const campo = "h-10 rounded-lg border border-gray-300 px-2.5 text-sm";
const nombreDe = (e) => [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" ");

export default function RegistrarPrestamo({ abierto, idEmpresa, onCerrar, onListo }) {
  const { data } = useSWR(abierto && idEmpresa ? `/checador/empleados?empresa=${idEmpresa}&estado=Activo&limit=500&page=1` : null, get);
  const [f, setF] = useState({ id_empleado: "", monto: "", abono: "", motivo: "" });
  const [buscar, setBuscar] = useState("");
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const empleados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (data?.data ?? []).filter((e) => !q || nombreDe(e).toLowerCase().includes(q));
  }, [data, buscar]);

  useEffect(() => {
    if (!abierto) { setF({ id_empleado: "", monto: "", abono: "", motivo: "" }); setBuscar(""); setInfo(null); setError(""); }
  }, [abierto]);

  // Avisos y número de pagos mientras se escribe.
  useEffect(() => {
    setInfo(null);
    if (!f.id_empleado || !(Number(f.monto) > 0) || !(Number(f.abono) > 0)) return undefined;
    const t = setTimeout(() => {
      axios.post("/checador/nomina/prestamos", { id_empleado: Number(f.id_empleado), monto: Number(f.monto), abono: Number(f.abono), simular: true })
        .then((r) => setInfo(r.data))
        .catch((e) => setInfo({ error: mensajeError(e) }));
    }, 350);
    return () => clearTimeout(t);
  }, [f.id_empleado, f.monto, f.abono]);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const r = await axios.post("/checador/nomina/prestamos", { id_empleado: Number(f.id_empleado), monto: Number(f.monto), abono: Number(f.abono), motivo: f.motivo });
      onListo(r.data);
    } catch (err) {
      setError(mensajeError(err, "No se pudo registrar el préstamo."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar préstamo</DialogTitle>
          <DialogDescription>Sin intereses. La persona firma el acuerdo en Mi espacio y desde la siguiente nómina se descuenta el abono.</DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="grid gap-4">
          <div className="grid gap-1.5 text-sm font-medium">
            <label htmlFor="pr-buscar">Persona</label>
            <input id="pr-buscar" className={campo} placeholder="Buscar por nombre" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            <select aria-label="Elige a la persona" required className={campo} value={f.id_empleado} onChange={(e) => setF({ ...f, id_empleado: e.target.value })}>
              <option value="">{data ? `Elige (${empleados.length})` : "Cargando…"}</option>
              {empleados.map((e) => <option key={e.id_empleado} value={e.id_empleado}>{nombreDe(e)}{e.puesto ? ` · ${e.puesto}` : ""}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm font-medium">Monto prestado<input className={campo} inputMode="decimal" type="number" min="1" step="0.01" required value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></label>
            <label className="grid gap-1.5 text-sm font-medium">Abono por nómina<input className={campo} inputMode="decimal" type="number" min="1" step="0.01" required value={f.abono} onChange={(e) => setF({ ...f, abono: e.target.value })} /></label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">Motivo (opcional)<input className={campo} maxLength={300} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} /></label>
          {info?.plazo ? (
            <div className="grid gap-1 rounded-lg bg-blue-50 p-3 text-[12.5px] text-blue-950" aria-live="polite">
              <p>Se paga en <b>{info.plazo} {info.plazo === 1 ? "nómina" : "nóminas"}</b> si se descuenta el abono completo.</p>
              <p>Cada descuento se limita por ley al 30 % de lo que gana arriba del salario mínimo; RH puede ajustarlo en cada nómina.</p>
              {info.avisos?.map((a) => <p key={a} className="font-semibold text-amber-800">{a}</p>)}
            </div>
          ) : info?.error ? <p className="rounded-lg bg-amber-50 p-3 text-[12.5px] text-amber-900">{info.error}</p> : null}
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button>
            <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Registrar y enviar a firma"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
