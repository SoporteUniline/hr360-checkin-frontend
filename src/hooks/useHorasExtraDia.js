"use client";

// Estado de «Horas extra» del panel del día: filas de la semana, quién autoriza, cómo se pagan, propuestas del reloj y
// el guardado (PUT /checador/horas-extra/empleado/:id). Lo guarda el botón Guardar del panel. Reglas en
// lib/asistencia/horasExtraDia.mjs; backend en docs/horas-extra-horario.md.
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { refrescarAsistencias } from "@/lib/asistencia/refrescoAsistencias";
import { FORMA_PAGO_DEFAULT } from "@/lib/asistencia/horasExtra.mjs";
import {
  cuerpoGuardar, diasDeLaSemana, filaDesdePropuesta, filaNueva, filasDesdeServidor, hayCambiosFilas, repetirEnDias, resumenSemana,
  validarFilas,
} from "@/lib/asistencia/horasExtraDia.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);
const DB_TZ = "America/Mexico_City";

export default function useHorasExtraDia({ registro, activo, zona, aBaseDeDatos }) {
  const { enqueueSnackbar } = useSnackbar();
  const fecha = String(registro?.fecha ?? "").slice(0, 10);
  const dias = useMemo(() => diasDeLaSemana(fecha), [fecha]);
  const url = activo && registro?.id_empleado && dias.length
    ? `/checador/horas-extra/empleado/${registro.id_empleado}?desde=${dias[0]}&hasta=${dias[6]}`
    : null;
  const { data, error, isLoading } = useSWR(url, fetcherWithToken, { revalidateOnFocus: false, shouldRetryOnError: false });
  const aLocal = (v) => (v ? dayjs.tz(v, DB_TZ).tz(zona || DB_TZ).format("HH:mm") : "");

  const originales = useMemo(() => filasDesdeServidor(Array.isArray(data?.registros) ? data.registros : [], aLocal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, zona]);
  const autorizaOriginal = data?.registros?.[0]?.id_autoriza ? String(data.registros[0].id_autoriza) : "";
  const formaOriginal = data?.registros?.[0]?.forma_pago ?? "";
  const [filas, setFilas] = useState([]);
  const [autoriza, setAutoriza] = useState("");
  const [forma, setForma] = useState(FORMA_PAGO_DEFAULT);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cada vez que llegan los datos del servidor, el borrador vuelve a lo guardado.
  useEffect(() => {
    setFilas(originales);
    setAutoriza(autorizaOriginal || (registro?.extras_autorizadas_por ? String(registro.extras_autorizadas_por) : ""));
    setForma(formaOriginal || registro?.forma_pago_extras || FORMA_PAGO_DEFAULT);
    setMostrarErrores(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originales]);

  const jornadas = data?.jornadas ?? {};
  const jornadaDe = (f) => jornadas[f] ?? (f === fecha && registro?.hora_salida_programada
    ? { entrada: String(registro.hora_entrada_programada ?? "").slice(0, 5), salida: String(registro.hora_salida_programada).slice(0, 5) }
    : null);
  const errores = validarFilas(filas, { jornadaDe });
  // Días de la semana ya guardados que no están en las filas (no deberían faltar, pero cuentan para el tope).
  const enFilas = new Set(filas.filter((f) => f.id).map((f) => Number(f.id)));
  const otras = (data?.semana ?? []).filter((s) => s.id && !enFilas.has(Number(s.id)) && !originales.some((o) => Number(o.id) === Number(s.id)));
  const resumen = resumenSemana(filas, otras);
  const propuestas = (data?.propuestas ?? []).filter((p) => !filas.some((f) => f.origen === "reloj" && f.fecha === p.fecha));
  const sucio = hayCambiosFilas(filas, originales, { autoriza, forma, autorizaOriginal, formaOriginal });
  const sinMigracion = error?.response?.status === 503;

  const cambiar = (clave, campo, valor) => setFilas((lista) => lista.map((f) => (f.clave === clave ? { ...f, [campo]: valor } : f)));
  const agregarDia = () => setFilas((lista) => {
    const libre = [fecha, ...dias].find((d) => !lista.some((f) => f.fecha === d)) ?? fecha;
    return [...lista, filaNueva(libre, jornadaDe(libre)?.salida)];
  });
  const quitar = (clave) => setFilas((lista) => lista.filter((f) => f.clave !== clave));
  const autorizarPropuesta = (p) => setFilas((lista) => [...lista, filaDesdePropuesta(p, aLocal)]);
  const repetir = (clave, fechas) => setFilas((lista) => {
    const base = lista.find((f) => f.clave === clave);
    return base ? [...lista, ...repetirEnDias(base, fechas, lista)] : lista;
  });

  // true si se guardó (o no había nada que guardar).
  const guardar = async () => {
    if (!sucio) return true;
    if (Object.keys(errores).length) {
      setMostrarErrores(true);
      enqueueSnackbar(`Horas extra: ${Object.values(errores)[0]}`, { variant: "warning" });
      return false;
    }
    if (filas.length && !autoriza) {
      setMostrarErrores(true);
      enqueueSnackbar("Horas extra: elige quién autoriza.", { variant: "warning" });
      return false;
    }
    setGuardando(true);
    try {
      const { data: respuesta } = await axios.put(`/checador/horas-extra/empleado/${registro.id_empleado}`,
        cuerpoGuardar(filas, originales, { autoriza, forma, aBase: aBaseDeDatos }));
      enqueueSnackbar("Horas extra guardadas con su horario.", { variant: "success" });
      for (const aviso of respuesta?.avisos ?? []) enqueueSnackbar(`Tope de ley: ${aviso.mensaje}`, { variant: "warning" });
      // Recarga esta semana y todo lo que depende de las asistencias (se une a la recarga del guardado).
      await refrescarAsistencias();
      return true;
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudieron guardar las horas extra.", { variant: "error" });
      return false;
    } finally {
      setGuardando(false);
    }
  };

  return {
    dias, fecha, filas, errores: mostrarErrores ? errores : {}, erroresVivos: errores, resumen, propuestas, jornadaDe, autoriza, forma,
    setAutoriza, setForma, cambiar, agregarDia, quitar, autorizarPropuesta, repetir, guardar, guardando, sucio,
    cargando: isLoading, error: sinMigracion ? "Falta correr la migración de horas extra con horario." : error ? "No se pudieron leer las horas extra." : null,
  };
}
