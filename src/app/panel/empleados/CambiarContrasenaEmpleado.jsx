"use client";

// Cambiar la contraseña de acceso de un empleado (23/11/2026, pedido del dueño: «falta un botón de actualizar
// contraseña»). Solo cambia la contraseña (PUT /checador/empleados/:id/contrasena); el servidor valida permisos y reglas.
// «Generar una» crea una segura y se puede copiar para dársela a la persona.
import { useState } from "react";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";

// Misma regla que el servidor: al menos 8 caracteres, con letras y números.
export function problemaContrasena(c) {
  const s = String(c ?? "");
  if (s.length < 8) return "Al menos 8 caracteres.";
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(s) || !/\d/.test(s)) return "Usa letras y números.";
  return null;
}

// 10 caracteres sin letras que se confunden (0/O, 1/l/I), con al menos una letra y un número.
function generar() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const numeros = "23456789";
  const todos = letras + numeros;
  const r = new Uint32Array(10);
  crypto.getRandomValues(r);
  const c = [...r].map((n, i) => (i === 0 ? letras : i === 1 ? numeros : todos)[n % (i === 0 ? letras.length : i === 1 ? numeros.length : todos.length)]);
  return c.sort(() => (crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? 1 : -1)).join("");
}

// conTexto: botón con texto (en la ficha); sin él, solo el ícono (en la tabla).
export default function CambiarContrasenaEmpleado({ empleado, conTexto = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [abierto, setAbierto] = useState(false);
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(null);
  const nombre = [empleado?.nombre, empleado?.apellido_paterno].filter(Boolean).join(" ");
  const problema = nueva ? problemaContrasena(nueva) : null;
  const noCoinciden = repetir && repetir !== nueva;
  const puede = nueva && !problema && nueva === repetir && !guardando;
  const cerrar = () => { setAbierto(false); setNueva(""); setRepetir(""); setListo(null); };

  const guardar = async (e) => {
    e.preventDefault();
    if (!puede) return;
    setGuardando(true);
    try {
      const r = await axios.put(`/checador/empleados/${empleado.id_empleado}/contrasena`, { contrasena: nueva });
      setListo({ correo: r.data?.correo, contrasena: nueva });
      enqueueSnackbar("Contraseña actualizada.", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || "No se pudo cambiar la contraseña.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  const copiar = async (texto) => {
    try { await navigator.clipboard.writeText(texto); enqueueSnackbar("Copiada.", { variant: "success" }); } catch { /* sin portapapeles */ }
  };

  // Todo dentro de un contenedor que corta los clics: la ventana flotante no debe abrir la ficha del renglón.
  return (
    <span onClick={(e) => e.stopPropagation()} className="contents">
      {conTexto ? (
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <KeyRound className="size-4 text-amber-700" /> Cambiar contraseña
        </button>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} title="Cambiar contraseña" aria-label={`Cambiar contraseña de ${nombre}`}
          className="rounded-lg bg-amber-50 p-2 transition-colors hover:bg-amber-100">
          <KeyRound className="h-4 w-4 text-amber-700" />
        </button>
      )}
      <Dialog open={abierto} onOpenChange={(v) => (v ? setAbierto(true) : cerrar())}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogTitle className="text-lg font-extrabold text-[#080d36]">Cambiar contraseña</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">De {nombre}. Es la que usa para entrar a su app con su correo.</DialogDescription>
          {listo ? (
            <div className="space-y-3">
              <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <p className="font-semibold">Listo. Ya puede entrar con:</p>
                <p className="mt-1">Correo: <b>{listo.correo || "el de su ficha"}</b></p>
                <p className="mt-1 flex items-center gap-2">Contraseña: <b className="font-mono tracking-wide">{listo.contrasena}</b>
                  <button type="button" onClick={() => copiar(listo.contrasena)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-green-800 underline"><Copy className="size-3.5" /> Copiar</button>
                </p>
              </div>
              <p className="text-[12.5px] text-slate-500">Dásela en persona. Puede cambiarla después en su app.</p>
              <div className="flex justify-end"><button type="button" onClick={cerrar} className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white">Cerrar</button></div>
            </div>
          ) : (
            <form onSubmit={guardar} className="space-y-3">
              <label className="block text-[12.5px] font-semibold text-slate-700">Nueva contraseña
                <PasswordInput className="mt-1" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Al menos 8, con letras y números" />
              </label>
              {problema ? <p className="text-[12.5px] text-red-700">{problema}</p> : null}
              <label className="block text-[12.5px] font-semibold text-slate-700">Escríbela otra vez
                <PasswordInput className="mt-1" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
              </label>
              {noCoinciden ? <p className="text-[12.5px] text-red-700">No coinciden.</p> : null}
              <button type="button" onClick={() => { const g = generar(); setNueva(g); setRepetir(g); }} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand"><RefreshCw className="size-4" /> Generar una segura</button>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={cerrar} className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700">Cancelar</button>
                <button type="submit" disabled={!puede} className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Cambiar contraseña"}</button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </span>
  );
}
