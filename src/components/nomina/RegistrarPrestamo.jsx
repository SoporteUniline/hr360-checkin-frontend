"use client";

// Registrar un préstamo desde RH (Nómina R2). Queda aprobado y se envía el acuerdo para que la persona lo firme en
// Mi espacio; mientras no firme, no se descuenta. Antes de guardar se piden al backend los avisos (simular).
import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeError } from "./comun";
import SelectorEmpleado from "./SelectorEmpleado";

const campo = "min-h-11 rounded-xl border border-slate-300 px-3 text-base";

export default function RegistrarPrestamo({ abierto, idEmpresa, onCerrar, onListo }) {
  const [f, setF] = useState({ id_empleado: "", monto: "", abono: "", motivo: "" });
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) { setF({ id_empleado: "", monto: "", abono: "", motivo: "" }); setInfo(null); setError(""); }
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
          {abierto ? <SelectorEmpleado idEmpresa={idEmpresa} value={f.id_empleado} onChange={(v) => setF({ ...f, id_empleado: v })} requerido /> : null}
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
            <Button type="submit" disabled={guardando || !f.id_empleado}>{guardando ? "Guardando…" : "Registrar y enviar a firma"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
