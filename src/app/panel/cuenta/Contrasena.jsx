"use client";

// Pestaña «Seguridad»: nueva contraseña y confirmación con mostrar/ocultar, recomendaciones que
// se marcan en vivo y aviso de si coinciden. Mismo guardado y misma validación de siempre (ambos campos y que coincidan):
// PUT /users/update-password/:id con { password, confirmPassword }. Las recomendaciones son guía, no bloquean.
import { useState } from "react";
import { Check, Circle, KeyRound, ShieldCheck, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import axiosInstance from "@/lib/axios";
import { errorCambioContrasena, estadoConfirmacion, recomendacionesContrasena } from "@/lib/miCuenta.mjs";
import { BarraGuardar, Tarjeta, claseCampo, claseEtiqueta } from "./Piezas";
import { useCambiosCuenta } from "./GuardiaCuenta";

export default function PasswordChange({ user }) {
  const token = Cookies.get("token");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState({
    password: "",
    confirmPassword: "",
  });
  const { enqueueSnackbar } = useSnackbar();

  const handleChange = (e) => {
    const { value, name } = e.target;
    setInput({ ...input, [name]: value });
    if (error) setError("");
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    const problema = errorCambioContrasena(input);
    if (problema) {
      setError(problema);
      return false;
    }
    setLoading(true);
    try {
      await axiosInstance.put(
        `/users/update-password/${user.id_usuario}`,
        input,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      enqueueSnackbar("Se actualizaron tu contraseña exitosamente!", {
        variant: "success",
      });
      setLoading(false);
      setError("");
      setInput({
        password: "",
        confirmPassword: "",
      });
      return true;
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al actualizar tu contraseña";
      enqueueSnackbar(errorMessage, { variant: "error" });
      return false;
    }
  };

  const hayCambios = Boolean(input.password || input.confirmPassword);
  useCambiosCuenta("contrasena", { hayCambios, guardar: () => onSubmit() });

  const recomendaciones = recomendacionesContrasena(input.password);
  const confirmacion = estadoConfirmacion(input.password, input.confirmPassword);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={onSubmit} noValidate className="min-w-0">
        <Tarjeta
          titulo="Cambiar contraseña"
          descripcion="Es la que usas para entrar al panel con tu correo."
          icono={KeyRound}
          pie={<BarraGuardar hayCambios={hayCambios} guardando={loading} texto="Cambiar contraseña" conEstado={false} />}
        >
          {/* Campo oculto para que el administrador de contraseñas sepa de qué cuenta es. */}
          <input type="text" name="username" autoComplete="username" value={user?.correo ?? ""} readOnly hidden />
          <div className="grid max-w-xl grid-cols-1 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password" className={claseEtiqueta}>Nueva contraseña</Label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                visibilityLabel="nueva contraseña"
                onChange={handleChange}
                value={input.password}
                disabled={loading}
                className={claseCampo}
                aria-describedby="recomendaciones-contrasena"
                placeholder="Ingresa tu nueva contraseña"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className={claseEtiqueta}>Confirmar contraseña</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                visibilityLabel="confirmación"
                onChange={handleChange}
                value={input.confirmPassword}
                disabled={loading}
                className={claseCampo}
                aria-invalid={confirmacion === "no-coincide" || undefined}
                aria-describedby="estado-confirmacion"
                placeholder="Repite tu nueva contraseña"
              />
              <p id="estado-confirmacion" aria-live="polite" className="min-h-5 text-[12.5px]">
                {confirmacion === "coincide" ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-green-700" data-confirmacion="coincide"><Check className="size-4" aria-hidden="true" />Las contraseñas coinciden</span>
                ) : confirmacion === "no-coincide" ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-red-700" data-confirmacion="no-coincide"><X className="size-4" aria-hidden="true" />Aún no coinciden</span>
                ) : null}
              </p>
            </div>

            {error ? (
              <p role="alert" data-error-contrasena className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        </Tarjeta>
      </form>

      <Tarjeta titulo="Recomendaciones" descripcion="Se marcan mientras escribes." icono={ShieldCheck}>
        <ul id="recomendaciones-contrasena" className="space-y-2.5 text-[13px]" data-recomendaciones>
          {recomendaciones.map((r) => (
            <li key={r.id} data-cumple={r.cumple ? "si" : "no"} className={`flex items-center gap-2.5 ${r.cumple ? "text-green-700" : "text-slate-600"}`}>
              {r.cumple ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <Circle className="size-4 shrink-0 text-slate-300" aria-hidden="true" />}
              <span>{r.texto}</span>
              <span className="sr-only">{r.cumple ? "(cumple)" : "(pendiente)"}</span>
            </li>
          ))}
          <li className="flex items-center gap-2.5 text-slate-600">
            <Circle className="size-4 shrink-0 text-slate-300" aria-hidden="true" />
            <span>No uses información personal</span>
          </li>
        </ul>
      </Tarjeta>
    </div>
  );
}
