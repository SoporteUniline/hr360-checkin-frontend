"use client";

// «Quién firmó». Muestra la foto que se tomó al firmar, la fecha, el
// método (dibujada o PIN) y el dispositivo. Cada vez que se abre queda registrado en la bitácora de la firma y se ve
// quién más la consultó. Un empleado nunca ve este botón.
import { useState } from "react";
import { Camera, Fingerprint, Loader2, ShieldCheck, Smartphone, UserRoundCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { firmaDigitalAdminApi } from "@/lib/firmaDigitalApi";
import { useAuth } from "@/context/AuthContext";

const fechaHora = (v) => {
  if (!v) return "";
  const d = new Date(String(v).includes("T") || String(v).endsWith("Z") ? v : `${String(v).replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
};

export default function EvidenciaFirma({ idSolicitud, idEmpresa, className = "" }) {
  const { dataUser } = useAuth() ?? {};
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  if (!idSolicitud || !idEmpresa || dataUser?.tipo_usuario === "Empleado") return null;

  const abrir = async () => {
    setAbierto(true);
    setCargando(true);
    setError("");
    try {
      const r = await firmaDigitalAdminApi.obtenerEvidencia({ idSolicitud, idEmpresa });
      setDatos(r.evidencia);
    } catch (e) {
      setError(e?.response?.data?.error || "No se pudo cargar quién firmó.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <button type="button" onClick={abrir}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 ${className}`}>
        <UserRoundCheck className="size-4 text-brand" /> Quién firmó
      </button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        {/* Columna con minmax(0,1fr): un texto largo no ensancha la ventana. */}
        <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-md">
          <DialogTitle className="text-lg font-extrabold text-[#080d36]">Quién firmó</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Evidencia privada: solo la ven RH y el dueño, y cada consulta queda registrada.
          </DialogDescription>
          {cargando ? (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Cargando…</p>
          ) : error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : datos ? (
            <div className="min-w-0 space-y-4">
              <div className="flex min-w-0 items-start gap-4">
                {datos.foto ? (
                  <img src={datos.foto} alt={`Foto de ${datos.nombre_firmante || "quien firmó"} al firmar`} className="size-28 shrink-0 rounded-xl border border-slate-200 object-cover" />
                ) : (
                  <span className="grid size-28 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-[11.5px] text-slate-500">
                    <span><Fingerprint className="mx-auto mb-1 size-6 text-slate-400" />Firmó con PIN<br />(sin foto)</span>
                  </span>
                )}
                <dl className="min-w-0 space-y-1.5 text-sm">
                  <div><dt className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">Firmó</dt><dd className="break-words font-semibold text-[#080d36]">{datos.nombre_firmante}</dd></div>
                  <div><dt className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">Cuándo</dt><dd>{fechaHora(datos.firmado_en)}</dd></div>
                  <div><dt className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">Cómo</dt>
                    <dd className="flex items-center gap-1.5">{datos.metodo === "pin" ? <><Fingerprint className="size-4 text-slate-500" /> Firma guardada + PIN</> : <><Camera className="size-4 text-slate-500" /> Dibujada, con foto</>}</dd></div>
                  {datos.dispositivo ? <div><dt className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">Dispositivo</dt><dd className="flex items-start gap-1.5"><Smartphone className="mt-0.5 size-4 shrink-0 text-slate-500" /> <span className="min-w-0 break-all">{datos.dispositivo}{datos.ip ? ` · IP ${datos.ip}` : ""}</span></dd></div> : null}
                </dl>
              </div>
              <p className="break-words text-[12.5px] text-slate-500">Documento: {datos.nombre_documento}</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700"><ShieldCheck className="size-4 text-brand" /> Quién ha consultado esta evidencia</p>
                <ul className="space-y-0.5 text-[12.5px] text-slate-600">
                  {datos.consultas.map((c, i) => <li key={i} className="break-words">{c.nombre} · {c.actual ? "ahora" : fechaHora(c.fecha)}</li>)}
                </ul>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
