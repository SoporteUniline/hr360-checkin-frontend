import { useState } from "react";
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import { valoresPrevios } from "@/lib/asistencia/horasExtra.mjs";

const url = (id) => `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/asistencias/${id}`;

// Guarda decisiones de horas extra (una o varias filas) con el mismo endpoint
// de edición de asistencias, y ofrece «Deshacer» en el aviso.
// onGuardado(items): para vistas con copia local del registro (detalle del celular).
export default function useHorasExtra(mutate, { onGuardado } = {}) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { dataUser } = useAuth() ?? {};
  const [guardando, setGuardando] = useState(false);

  const usuario = {
    idEmpleado: dataUser?.id_empleado ?? null,
    nombre: [dataUser?.nombre, dataUser?.apellido_paterno].filter(Boolean).join(" ") || null,
  };

  // items: [{ registro, cambios }] — cambios ya calculados con horasExtra.mjs
  const guardar = async (items, mensaje, { deshacer = true } = {}) => {
    const validos = items.filter((i) => i.cambios && Object.keys(i.cambios).length);
    if (!validos.length || guardando) return;
    setGuardando(true);
    const previos = validos.map(({ registro, cambios }) => ({ registro, cambios: valoresPrevios(registro, cambios) }));
    const errores = [];
    // De 4 en 4 para no saturar el servidor en autorizaciones masivas.
    for (let i = 0; i < validos.length; i += 4) {
      const lote = validos.slice(i, i + 4);
      const res = await Promise.allSettled(lote.map(({ registro, cambios }) => axios.put(url(registro.id), cambios)));
      res.forEach((r, j) => r.status === "rejected" && errores.push(lote[j].registro));
    }
    setGuardando(false);
    const guardados = validos.filter((i) => !errores.includes(i.registro));
    if (guardados.length) onGuardado?.(guardados);
    await mutate?.();
    if (errores.length) {
      enqueueSnackbar(`No se pudieron guardar ${errores.length} de ${validos.length} registros. Intenta de nuevo.`, { variant: "error" });
      return;
    }
    enqueueSnackbar(mensaje, {
      variant: "success",
      autoHideDuration: 6000,
      action: deshacer
        ? (key) => (
            <button
              type="button"
              className="ml-2 rounded px-2 py-1 text-xs font-bold underline"
              onClick={() => {
                closeSnackbar(key);
                guardar(previos, "Se deshizo el cambio.", { deshacer: false });
              }}
            >
              Deshacer
            </button>
          )
        : undefined,
    });
  };

  return { guardar, guardando, usuario };
}
