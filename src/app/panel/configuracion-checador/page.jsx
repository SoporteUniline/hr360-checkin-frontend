"use client";

/**
 * page.jsx — Configuración del Reloj Checador
 *
 * Permite a cada empresa configurar las reglas básicas de sus registros de
 * entradas y salidas:
 *   • Tolerancia de entrada  → minutos de gracia antes de marcar llegada tarde
 *   • Tolerancia de salida   → minutos de gracia antes de considerar salida anticipada
 *   • Jornada mínima         → horas mínimas para considerar jornada completa
 *
 * Consume:
 *   GET  /checador/config-checador?empresa=:id
 *   PUT  /checador/config-checador?empresa=:id
 *   POST /checador/config-checador/aplicar-historico?empresa=:id
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Timer,
  AlarmClock,
  CalendarClock,
  Loader2,
  History,
  TriangleAlert,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Schema de validación con Zod
───────────────────────────────────────────── */
const schema = z.object({
  tolerancia_entrada_min: z.coerce
    .number({ invalid_type_error: "Debe ser un número" })
    .int("Debe ser un número entero")
    .min(0, "El valor mínimo es 0")
    .max(120, "El valor máximo es 120 minutos"),
  tolerancia_salida_min: z.coerce
    .number({ invalid_type_error: "Debe ser un número" })
    .int("Debe ser un número entero")
    .min(0, "El valor mínimo es 0")
    .max(120, "El valor máximo es 120 minutos"),
  jornada_minima_horas: z.coerce
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0, "El valor mínimo es 0")
    .max(24, "El valor máximo es 24 horas"),
});

/* ─────────────────────────────────────────────
   Componente auxiliar: tarjeta de cada regla
───────────────────────────────────────────── */
function ReglaCard({ icon: Icon, titulo, descripcion, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{titulo}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            {descripcion}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Página principal
───────────────────────────────────────────── */
export default function ConfiguracionChecadorPage() {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState(null);

  // Estado de la acción "Aplicar a datos históricos"
  const [aplicando, setAplicando] = useState(false);
  const [resultadoAplicacion, setResultadoAplicacion] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tolerancia_entrada_min: 0,
      tolerancia_salida_min: 0,
      jornada_minima_horas: 0,
    },
  });

  /* Carga inicial de configuración */
  useEffect(() => {
    if (!idEmpresa) return;

    const cargar = async () => {
      try {
        const { data } = await axios.get(
          `/checador/config-checador?empresa=${idEmpresa}`,
        );
        reset({
          tolerancia_entrada_min: data.tolerancia_entrada_min ?? 0,
          tolerancia_salida_min: data.tolerancia_salida_min ?? 0,
          jornada_minima_horas: data.jornada_minima_horas ?? 0,
        });
      } catch {
        setAlerta({
          tipo: "error",
          mensaje: "No se pudo cargar la configuración.",
        });
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [idEmpresa, reset]);

  /* Guardar configuración directamente (sin modificar datos históricos) */
  const onSubmit = async (valores) => {
    if (!idEmpresa) return;
    setGuardando(true);
    setAlerta(null);

    try {
      await axios.put(
        `/checador/config-checador?empresa=${idEmpresa}`,
        valores,
      );
      reset(valores);
      setAlerta({
        tipo: "exito",
        mensaje: "Configuración guardada correctamente.",
      });
    } catch {
      setAlerta({
        tipo: "error",
        mensaje: "Error al guardar la configuración.",
      });
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Llama al endpoint POST /aplicar-historico para re-clasificar
   * registros históricos de asistencias con la tolerancia guardada.
   * Se invoca desde el AlertDialog de confirmación.
   */
  const ejecutarAplicarHistorico = async () => {
    if (!idEmpresa) return;
    setAplicando(true);
    setResultadoAplicacion(null);
    setAlerta(null);

    try {
      const { data } = await axios.post(
        `/checador/config-checador/aplicar-historico?empresa=${idEmpresa}`,
      );
      setResultadoAplicacion(data);
    } catch {
      setAlerta({
        tipo: "error",
        mensaje: "Error al aplicar la configuración a los datos históricos.",
      });
    } finally {
      setAplicando(false);
    }
  };

  /* ── UI de carga ── */
  if (cargando) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Encabezado compacto homologado Adamia */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
            <Clock size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              Configuración del Checador
            </h1>
            <p className="text-[12.5px] text-gray-500">
              Reglas de tolerancia y jornada para los registros de entrada y
              salida
            </p>
          </div>
        </div>
        <div className="mt-3 h-[2.5px] rounded bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
      </div>

      {/* Alerta de resultado */}
      {alerta && (
        <Alert
          className={
            alerta.tipo === "exito"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          {alerta.tipo === "exito" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription
            className={
              alerta.tipo === "exito" ? "text-green-700" : "text-red-700"
            }
          >
            {alerta.mensaje}
          </AlertDescription>
        </Alert>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Regla 1: Tolerancia de entrada */}
        <ReglaCard
          icon={AlarmClock}
          titulo="Tolerancia de entrada"
          descripcion="Minutos de gracia después del horario programado antes de que una llegada se considere tarde. Ejemplo: 10 minutos = si el horario es 09:00 y llega a las 09:08, no se marca como tardanza."
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label
                htmlFor="tolerancia_entrada_min"
                className="text-xs font-medium text-gray-600"
              >
                Minutos de gracia (0 = sin tolerancia)
              </Label>
              <Input
                id="tolerancia_entrada_min"
                type="number"
                min={0}
                max={120}
                step={1}
                className="mt-1"
                {...register("tolerancia_entrada_min")}
              />
              {errors.tolerancia_entrada_min && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.tolerancia_entrada_min.message}
                </p>
              )}
            </div>
            <span className="text-sm text-gray-500 pt-6">min</span>
          </div>
        </ReglaCard>

        {/* Regla 2: Tolerancia de salida */}
        <ReglaCard
          icon={Timer}
          titulo="Tolerancia de salida"
          descripcion="Minutos de gracia antes del horario de salida programado. Ejemplo: 5 minutos = si el horario de salida es 18:00, salir a las 17:57 no se marca como salida anticipada."
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label
                htmlFor="tolerancia_salida_min"
                className="text-xs font-medium text-gray-600"
              >
                Minutos de gracia (0 = sin tolerancia)
              </Label>
              <Input
                id="tolerancia_salida_min"
                type="number"
                min={0}
                max={120}
                step={1}
                className="mt-1"
                {...register("tolerancia_salida_min")}
              />
              {errors.tolerancia_salida_min && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.tolerancia_salida_min.message}
                </p>
              )}
            </div>
            <span className="text-sm text-gray-500 pt-6">min</span>
          </div>
        </ReglaCard>

        {/* Regla 3: Jornada mínima */}
        <ReglaCard
          icon={CalendarClock}
          titulo="Jornada mínima para jornada completa"
          descripcion="Horas que debe tener un registro de entrada/salida para contarse como jornada completa en el panel de estadísticas. Ejemplo: 7.5 horas. Usa 0 para desactivar este criterio."
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label
                htmlFor="jornada_minima_horas"
                className="text-xs font-medium text-gray-600"
              >
                Horas mínimas (0 = desactivado)
              </Label>
              <Input
                id="jornada_minima_horas"
                type="number"
                min={0}
                max={24}
                step={0.5}
                className="mt-1"
                {...register("jornada_minima_horas")}
              />
              {errors.jornada_minima_horas && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.jornada_minima_horas.message}
                </p>
              )}
            </div>
            <span className="text-sm text-gray-500 pt-6">hrs</span>
          </div>
        </ReglaCard>

        <div className="flex items-center justify-end pt-2">
          <Button
            type="submit"
            disabled={guardando || !isDirty}
            className="min-w-36 gap-2 bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-semibold text-white"
          >
            {guardando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar configuración"
            )}
          </Button>
        </div>
      </form>

      {/* ── Sección: Aplicar reglas a datos históricos ── */}
      <Separator />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
        {/* Encabezado de sección */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <History size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Aplicar reglas a datos históricos
            </p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Reclasifica los registros de asistencia pasados de esta empresa
              usando la tolerancia de entrada guardada actualmente. Solo
              modifica registros del tipo "Asistencia" o "Retardo" que tengan
              horario programado. Esta acción es irreversible.
            </p>
          </div>
        </div>

        {/* Resultado de la última aplicación */}
        {resultadoAplicacion !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            <p className="text-sm text-green-700">
              Se actualizaron{" "}
              <span className="font-semibold">
                {resultadoAplicacion.registros_actualizados.toLocaleString()}
              </span>{" "}
              registro
              {resultadoAplicacion.registros_actualizados !== 1 ? "s" : ""} de
              asistencia.
            </p>
          </div>
        )}

        {/* Botón con AlertDialog de confirmación */}
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                disabled={aplicando}
              >
                {aplicando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <History size={16} />
                    Aplicar a datos históricos
                  </>
                )}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 text-amber-500" />
                  ¿Aplicar a datos históricos?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-left">
                  <span className="block">
                    Esta acción recorrerá todos los registros de{" "}
                    <strong>asistencias pasadas</strong> de la empresa y los
                    reclasificará como "Asistencia" o "Retardo" según la
                    tolerancia de entrada configurada actualmente.
                  </span>
                  <span className="block text-red-600 font-medium">
                    Esta operación modifica registros existentes y no se puede
                    deshacer.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={ejecutarAplicarHistorico}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Sí, aplicar ahora
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
