"use client";
// Ajustes → Integraciones: crear una llave de API (nombre, permisos y vigencia) y mostrarla UNA vez con «Copiar».
// La llave no se guarda en el navegador ni se vuelve a pedir al servidor (allá solo queda su HMAC).
import { useState } from "react";
import { AlertTriangle, Check, Copy, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PERMISOS, VIGENCIAS, validarNuevaLlave } from "@/lib/integraciones/integraciones.mjs";

const boton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-60";

export function DialogoNuevaLlave({ abierto, alCerrar, alCrear, nombreEmpresa }) {
  const [nombre, setNombre] = useState("");
  const [permisos, setPermisos] = useState(["empleados:leer", "asistencias:leer"]);
  const [vigencia, setVigencia] = useState(90);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const cerrar = () => { setNombre(""); setPermisos(["empleados:leer", "asistencias:leer"]); setVigencia(90); setErrores({}); alCerrar(); };
  // Al corregir un campo se quita su mensaje de error.
  const limpiar = (campo) => setErrores((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  const alternar = (clave) => { limpiar("permisos"); setPermisos((p) => (p.includes(clave) ? p.filter((x) => x !== clave) : [...p, clave])); };

  const enviar = async (e) => {
    e.preventDefault();
    const v = validarNuevaLlave({ nombre, permisos, vigencia });
    setErrores(v.errores);
    if (!v.ok) return;
    setEnviando(true);
    try {
      const errorServidor = await alCrear(v.datos);
      if (errorServidor) setErrores(errorServidor);
      else cerrar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(a) => { if (!a && !enviando) cerrar(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={enviar} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nueva llave de API</DialogTitle>
            <DialogDescription>Para {nombreEmpresa || "tu empresa"}. Solo podrá ver y cambiar lo que le permitas aquí.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-slate-800">Nombre</span>
            <input
              value={nombre} onChange={(e) => { setNombre(e.target.value); limpiar("nombre"); }} maxLength={80} autoComplete="off" placeholder="Ej. Nómina externa"
              aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? "err-nombre" : undefined}
              className="min-h-11 rounded-lg border border-slate-300 px-3 text-base sm:text-sm"
            />
            {errores.nombre ? <span id="err-nombre" className="text-[13px] text-red-700">{errores.nombre}</span> : null}
          </label>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-slate-800">Permisos</legend>
            {PERMISOS.map((p) => (
              <label key={p.clave} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50/60">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#2563EB]" checked={permisos.includes(p.clave)} onChange={() => alternar(p.clave)} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{p.nombre}</span>
                  <span className="block text-[13px] text-slate-600">{p.descripcion}</span>
                  <code className="mt-0.5 block text-[13px] text-slate-500">{p.clave}</code>
                </span>
              </label>
            ))}
            {errores.permisos ? <span className="text-[13px] text-red-700">{errores.permisos}</span> : null}
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-slate-800">Vence en</legend>
            <div className="grid grid-cols-2 gap-2">
              {VIGENCIAS.map((v) => (
                <label key={String(v.dias)} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50/60">
                  <input type="radio" name="vigencia" className="size-4 accent-[#2563EB]" checked={vigencia === v.dias} onChange={() => setVigencia(v.dias)} />
                  {v.nombre}
                </label>
              ))}
            </div>
            {errores.vigencia ? <span className="text-[13px] text-red-700">{errores.vigencia}</span> : null}
          </fieldset>
          {errores.general ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">{errores.general}</p> : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" onClick={cerrar} disabled={enviando} className={`${boton} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Cancelar</button>
            <button type="submit" disabled={enviando} className={`${boton} bg-[#2563EB] text-white hover:bg-[#1d4ed8]`}>
              <KeyRound className="size-4" aria-hidden="true" />{enviando ? "Creando…" : "Crear llave"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogoLlaveCreada({ llave, alCerrar }) {
  const [copiada, setCopiada] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(llave.llave);
      setCopiada(true);
    } catch {
      setCopiada(false);
    }
  };
  return (
    <Dialog open={Boolean(llave)} onOpenChange={(a) => { if (!a) { setCopiada(false); alCerrar(); } }}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Copia tu llave ahora</DialogTitle>
          <DialogDescription>«{llave?.data?.nombre}» se muestra solo esta vez. Si la pierdes, revócala y crea otra.</DialogDescription>
        </DialogHeader>
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Guárdala en un lugar seguro (gestor de contraseñas o variables del servidor). Nunca la pongas en una URL ni en el código del navegador.
        </p>
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
          <code data-llave-creada="" className="block select-all break-all font-mono text-[13px] leading-5 text-slate-900">{llave?.llave}</code>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" onClick={copiar} className={`${boton} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>
            {copiada ? <Check className="size-4 text-emerald-600" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copiada ? "Copiada" : "Copiar llave"}
          </button>
          <button type="button" onClick={() => { setCopiada(false); alCerrar(); }} className={`${boton} bg-[#2563EB] text-white hover:bg-[#1d4ed8]`}>Ya la guardé</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
