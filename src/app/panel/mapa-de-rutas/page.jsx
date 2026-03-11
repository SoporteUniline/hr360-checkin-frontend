"use client";

/**
 * Módulo: Mapa de rutas
 * - Diseño/funcionalidad basada en: `Mapas -rutas.html` (archivo legacy)
 * - Datos backend: `hr360-checkin-backend/modules/attendance/controllers/mapaRutasController.js`
 * - Rutas backend: `hr360-checkin-backend/modules/attendance/routes/mapaRutasRoutes.js`
 * - Cliente API: `src/lib/mapaRutasApi.js`
 * - Navegación: `src/components/Sidebar/nav-main.jsx` (se agrega el botón debajo de Aguinaldos)
 *
 * Nota importante:
 * - Este módulo filtra TODO por empresa usando `dataUser.id_empresa` (patrón del proyecto).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import dynamic from "next/dynamic";
import useSWR from "swr";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { mapaRutasApi } from "@/lib/mapaRutasApi";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import {
  fetchImageAsDataUrl,
  tryAddCompanyMarkToPdf,
} from "@/lib/pdfCompanyLogo";
import AccesosRapidos from "@/components/AccesosRapidos";
import {
  Route,
  Filter,
  Search,
  RotateCcw,
  Play,
  Pause,
  SkipBack,
  MapPin,
  Download,
  BarChart3,
  List,
  Map as MapIcon,
  CalendarDays,
} from "lucide-react";

import styles from "./mapa-rutas-theme.module.css";
import { Combobox } from "@/components/Combobox";

// Leaflet se carga SOLO en cliente para evitar "window is not defined" en SSR al recargar.
// - Relación: `leaflet-maps.jsx` contiene los imports de leaflet/react-leaflet.
const RutaMap = dynamic(() => import("./leaflet-maps").then((m) => m.RutaMap), {
  ssr: false,
  loading: () => (
    <LeafletSkeleton heightClass="h-[520px] md:h-[calc(100svh-12rem)] min-h-[520px]" />
  ),
});

const ModalPointMap = dynamic(
  () => import("./leaflet-maps").then((m) => m.ModalPointMap),
  {
    ssr: false,
    loading: () => <LeafletSkeleton heightClass="h-[70vh] min-h-[420px]" />,
  },
);

// ───────────────────────────────────────────────────────────────────────────────
// Helpers (reutilizan la lógica de `Mapas -rutas.html`, pero adaptados a React)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Formatea fecha ISO (YYYY-MM-DD) al estilo del módulo legacy.
 */
function formatearFechaLarga(fechaISO) {
  const opciones = { year: "numeric", month: "long", day: "numeric" };
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString("es-MX", opciones);
}

/**
 * Calcula distancia en KM (Haversine).
 * - Relación: misma lógica que `calcularDistancia` en `Mapas -rutas.html`
 */
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcula duración entre HH:mm y HH:mm (cruza medianoche si aplica).
 * - Relación: `calcularDuracion` en `Mapas -rutas.html`
 */
function calcularDuracionHM(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return "0m";
  const [hI, mI] = horaInicio.split(":").map(Number);
  const [hF, mF] = horaFin.split(":").map(Number);
  let minutos = hF * 60 + mF - (hI * 60 + mI);
  if (minutos < 0) minutos += 24 * 60;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas > 0) return `${horas}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Calcula duración pero formateada como "H.MM hrs" o "X min" (reporte detallado).
 * - Relación: `calcularDuracionHM` (versión legacy que imprime hrs con decimal)
 */
function calcularDuracionHMDecimal(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return "-";
  const [hI, mI] = horaInicio.split(":").map(Number);
  const [hF, mF] = horaFin.split(":").map(Number);
  let minutos = hF * 60 + mF - (hI * 60 + mI);
  if (minutos < 0) minutos += 24 * 60;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas > 0) return `${horas}.${mins < 10 ? `0${mins}` : mins} hrs`;
  return `${mins} min`;
}

/**
 * Duración en horas decimales.
 * - Relación: `calcularDuracionDecimal` en `Mapas -rutas.html`
 */
function calcularDuracionDecimal(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0;
  const [hI, mI] = horaInicio.split(":").map(Number);
  const [hF, mF] = horaFin.split(":").map(Number);
  let minutos = hF * 60 + mF - (hI * 60 + mI);
  if (minutos < 0) minutos += 24 * 60;
  return minutos / 60;
}

/**
 * NOTA:
 * - La implementación Leaflet (marcadores/polilíneas/modales) vive en `leaflet-maps.jsx`
 *   y se carga con `dynamic({ ssr:false })` para evitar errores SSR.
 */

/**
 * Construye la secuencia de puntos a partir de movimientos del día.
 * - Relación: `mostrarDiaEnMapa` del HTML legacy
 */
function buildPuntosAnimacion(movimientos) {
  const puntos = [];
  let secuencia = 1;

  (movimientos || []).forEach((mov) => {
    if (mov.lat_entrada && mov.lng_entrada) {
      puntos.push({
        secuencia: secuencia++,
        tipo: "entrada",
        lat: mov.lat_entrada,
        lng: mov.lng_entrada,
        hora: mov.hora_entrada,
        id_registro: mov.id,
      });
    }
    if (mov.lat_salida && mov.lng_salida) {
      puntos.push({
        secuencia: secuencia++,
        tipo: "salida",
        lat: mov.lat_salida,
        lng: mov.lng_salida,
        hora: mov.hora_salida,
        id_registro: mov.id,
      });
    }
  });

  return puntos;
}

/**
 * Agrupa movimientos por fecha (YYYY-MM-DD) para la lista de días del sidebar.
 */
function agruparMovimientosPorDia(movimientos) {
  const map = {};
  (movimientos || []).forEach((m) => {
    if (!map[m.fecha]) map[m.fecha] = [];
    map[m.fecha].push(m);
  });

  return Object.keys(map).map((fecha) => ({
    fecha,
    movimientos: map[fecha],
    empleado: map[fecha][0]?.empleado,
    puesto: map[fecha][0]?.puesto,
    departamento: map[fecha][0]?.departamento,
  }));
}

/**
 * Cuenta puntos GPS (entrada y salida) del día.
 */
function calcularPuntosTotales(movimientos) {
  let total = 0;
  (movimientos || []).forEach((mov) => {
    if (mov.lat_entrada && mov.lng_entrada) total += 1;
    if (mov.lat_salida && mov.lng_salida) total += 1;
  });
  return total;
}

// ───────────────────────────────────────────────────────────────────────────────
// Página principal
// ───────────────────────────────────────────────────────────────────────────────

export default function PageMapaDeRutas() {
  const [empresaFiltro, setEmpresaFiltro] = useState("all");

  const { dataUser } = useAuth();
  const idEmpresa = empresaFiltro === "all" ? "all" : Number(empresaFiltro);

  /**
   * Datos de empresa para logo en PDF (nombre + url_imagen).
   * - Relación: el logo se administra en `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
   */
  const empresaIdNumerica =
    empresaFiltro !== "all" ? Number(empresaFiltro) : null;

  const { data: empresaData } = useSWR(
    empresaIdNumerica ? `/empresas/${empresaIdNumerica}` : null,
    fetcherWithToken,
    swr_config,
  );

  /**
   * Logo precargado como DataURL para usar en `jsPDF.addImage`.
   * - Si no existe imagen o falla, `tryAddCompanyMarkToPdf` hará fallback tipográfico.
   */
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      // 1) Intentar logo de la empresa (si existe)
      const companyUrl = empresaData?.url_imagen;
      const companyDataUrl = companyUrl
        ? await fetchImageAsDataUrl(companyUrl)
        : null;

      // 2) Fallback garantizado al logo del sistema (mismo origen, existe en `public/assets/logo.png`)
      const fallbackDataUrl = companyDataUrl
        ? null
        : await fetchImageAsDataUrl("/assets/logo.png");

      if (alive) setLogoDataUrl(companyDataUrl || fallbackDataUrl || null);
    };
    run();
    return () => {
      alive = false;
    };
  }, [empresaData?.url_imagen]);

  // Filtros
  const [empleados, setEmpleados] = useState([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  /**
   * Buscador de Empleados (mismo patrón que "Nuevo Contrato" en `ContratoDialog.jsx`)
   * - Relación: `src/app/panel/contratos/ContratoDialog.jsx` -> Input + sugerencias con dropdown.
   * - Objetivo: facilitar selección cuando hay muchos empleados (mejor UX que un Select largo).
   * - Nota: Solo afecta a este módulo. No cambia la carga de datos, solo cómo se selecciona el empleado.
   */
  const [empSearch, setEmpSearch] = useState("");
  const [openEmpSug, setOpenEmpSug] = useState(false);

  // Datos y UI
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [vista, setVista] = useState("mapa"); // mapa | reporte | detallado

  const [movimientos, setMovimientos] = useState([]);
  const [diasAgrupados, setDiasAgrupados] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // Modal mapa
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPoint, setModalPoint] = useState(null);

  // Animación
  const [animacionActiva, setAnimacionActiva] = useState(false);
  const [indicePunto, setIndicePunto] = useState(0);
  const [velocidad, setVelocidad] = useState(1500);
  const timerRef = useRef(null);

  // Inicializar fechas (hoy y -7 días) como el HTML legacy
  useEffect(() => {
    const hoy = dayjs().format("YYYY-MM-DD");
    const hace7 = dayjs().subtract(7, "day").format("YYYY-MM-DD");
    setFechaFin(hoy);
    setFechaInicio(hace7);
  }, []);

  // Cargar empleados activos (cuando ya hay empresa)
  useEffect(() => {
    const run = async () => {
      if (!empresaFiltro) return;
      try {
        const resp = await mapaRutasApi.empleadosActivos({
          empresa: empresaFiltro,
          q: "",
          limit: 1000,
        });

        setEmpleados(resp?.data || []);
      } catch (e) {
        console.error(e);
        setErrorMsg("❌ No se pudieron cargar empleados.");
      }
    };
    run();
  }, [idEmpresa]);

  const limpiarTodo = () => {
    setMovimientos([]);
    setDiasAgrupados([]);
    setDiaSeleccionado(null);
    setAnimacionActiva(false);
    setIndicePunto(0);
    setErrorMsg("");
  };

  const buscarMovimientos = async () => {
    if (!idEmpresa) {
      setErrorMsg("⚠️ No se detectó empresa en sesión.");
      return;
    }
    if (!empleadoId) {
      setErrorMsg("⚠️ Selecciona un empleado.");
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setErrorMsg("⚠️ Selecciona un rango de fechas.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setAnimacionActiva(false);
    setIndicePunto(0);

    try {
      const resp = await mapaRutasApi.movimientosPorRango({
        empresa:
          empresaFiltro === "all"
            ? dataUser?.empresas_detalle.map((e) => e.id_empresa)
            : idEmpresa,
        idEmpleado: empleadoId,
        fechaInicio,
        fechaFin,
      });

      const data = resp?.data || [];
      if (data.length === 0) {
        setErrorMsg("ℹ️ No se encontraron movimientos para este período.");
        limpiarTodo();
        setLoading(false);
        return;
      }

      setMovimientos(data);
      const dias = agruparMovimientosPorDia(data);
      setDiasAgrupados(dias);
      setDiaSeleccionado(0);
    } catch (e) {
      console.error(e);
      setErrorMsg(
        `❌ Error al buscar movimientos: ${e?.message || "Error desconocido"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Día seleccionado actual
  const dia = diaSeleccionado !== null ? diasAgrupados[diaSeleccionado] : null;

  // Puntos del día (para mapa/animación)
  const puntos = useMemo(
    () => (dia ? buildPuntosAnimacion(dia.movimientos) : []),
    [dia],
  );

  // Polilíneas acumuladas según índice actual
  // - Solicitud: al pausar, la ruta debe quedarse marcada hasta el punto actual.
  const polylinesAnimadas = useMemo(() => {
    const lines = [];
    const maxIndex = Math.min(indicePunto, puntos.length - 1);
    for (let i = 1; i <= maxIndex; i++) {
      const prev = puntos[i - 1];
      const cur = puntos[i];
      lines.push([
        [prev.lat, prev.lng],
        [cur.lat, cur.lng],
      ]);
    }
    return lines;
  }, [indicePunto, puntos]);

  const detenerTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetearAnimacion = () => {
    detenerTimer();
    setAnimacionActiva(false);
    setIndicePunto(0);
  };

  const pausarRuta = () => {
    detenerTimer();
    setAnimacionActiva(false);
  };

  const stepAnimacion = () => {
    timerRef.current = setTimeout(() => {
      setIndicePunto((prev) => prev + 1);
    }, velocidad);
  };

  // Continuar animación cada vez que incrementa índice
  useEffect(() => {
    if (!animacionActiva) return;
    if (puntos.length === 0) return;
    // Terminar en el último punto SIN borrar la ruta (se queda marcada)
    if (indicePunto >= puntos.length - 1) {
      detenerTimer();
      setAnimacionActiva(false);
      return;
    }
    stepAnimacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animacionActiva, indicePunto, puntos.length, velocidad]);

  const reproducirRuta = () => {
    if (puntos.length === 0) return;
    if (animacionActiva) {
      pausarRuta();
      return;
    }
    // Si estaba en el final, reiniciar desde el inicio para reproducir de nuevo
    if (indicePunto >= puntos.length - 1) {
      setIndicePunto(0);
    }
    setAnimacionActiva(true);
  };

  const resetearRuta = () => {
    resetearAnimacion();
  };

  const abrirMapaModal = (punto) => {
    setModalPoint(punto);
    setModalOpen(true);
  };

  const empleadoLabel = useMemo(() => {
    const e = empleados.find(
      (x) => String(x.id_empleado) === String(empleadoId),
    );
    return e ? `${e.nombre_completo} - ${e.puesto || ""}` : "";
  }, [empleados, empleadoId]);

  /**
   * Mantiene sincronizado el texto del buscador con el empleado seleccionado.
   * - Relación: mismo enfoque que `ContratoDialog.jsx` (setEmpSearch al seleccionar).
   */
  useEffect(() => {
    const e = empleados.find(
      (x) => String(x.id_empleado) === String(empleadoId),
    );
    if (!empleadoId) {
      setEmpSearch("");
      return;
    }
    if (e?.nombre_completo) setEmpSearch(e.nombre_completo);
  }, [empleados, empleadoId]);

  // ───────────────────────────────────────────────────────────────────────────────
  // Render helpers: Reporte resumido y detallado
  // ───────────────────────────────────────────────────────────────────────────────

  const renderReporteResumido = () => {
    if (!dia)
      return (
        <div className="text-sm text-muted-foreground">
          Selecciona un día para ver los detalles.
        </div>
      );

    // Estadísticas del día
    const totalPuntosGPS = calcularPuntosTotales(dia.movimientos);
    const totalEntradas = dia.movimientos.filter((m) => !!m.entrada).length;
    const totalSalidas = dia.movimientos.filter((m) => !!m.salida).length;

    // Timeline (similar al HTML legacy)
    let secuenciaLocal = 1;
    let ultimaSalidaConGPS = null;

    return (
      <div className="space-y-4">
        <Card
          className={cn(styles.cardShadow, "border")}
          style={{ borderColor: "var(--mr-border)" }}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#2563EB]" />
              Resumen del día
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {dia.empleado} - {formatearFechaLarga(dia.fecha)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div
                className="rounded-lg border bg-[#f9fafb] p-4 text-center"
                style={{ borderColor: "var(--mr-border)" }}
              >
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--mr-primary)" }}
                >
                  {dia.movimientos.length}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Registros
                </div>
              </div>
              <div
                className="rounded-lg border bg-[#f9fafb] p-4 text-center"
                style={{ borderColor: "var(--mr-border)" }}
              >
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--mr-primary)" }}
                >
                  {totalPuntosGPS}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Puntos GPS
                </div>
              </div>
              <div
                className="rounded-lg border bg-[#f9fafb] p-4 text-center"
                style={{ borderColor: "var(--mr-border)" }}
              >
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--mr-primary)" }}
                >
                  {totalEntradas}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Entradas
                </div>
              </div>
              <div
                className="rounded-lg border bg-[#f9fafb] p-4 text-center"
                style={{ borderColor: "var(--mr-border)" }}
              >
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--mr-primary)" }}
                >
                  {totalSalidas}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Salidas
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(styles.cardShadow, "border")}
          style={{ borderColor: "var(--mr-border)" }}
        >
          <CardHeader>
            <CardTitle className="text-lg">🕐 Movimientos Detallados</CardTitle>
          </CardHeader>
          <CardContent>
            {/*
              UX (solicitud):
              - Pestaña "Reporte": mostrar ~4 detalles visibles y luego scroll.
              - No se ocultan registros: solo se limita el alto del contenedor.
              - Importante: el scroll vive en este wrapper para que la línea vertical (timeline) scrollee junto con el contenido.
            */}
            <div className="relative pl-10 max-h-[28rem] overflow-y-auto pr-2">
              <div
                className="absolute left-[14px] top-0 bottom-0 w-[3px]"
                style={{
                  background:
                    "linear-gradient(180deg, var(--mr-success) 0%, var(--mr-error) 100%)",
                }}
              />
              <div className="space-y-4">
                {dia.movimientos.map((mov) => {
                  const tieneEntrada = !!mov.entrada && !!mov.hora_entrada;
                  const tieneSalida = !!mov.salida && !!mov.hora_salida;
                  const gpsEntrada = !!mov.lat_entrada && !!mov.lng_entrada;
                  const gpsSalida = !!mov.lat_salida && !!mov.lng_salida;

                  const bloques = [];

                  if (tieneEntrada) {
                    let traslado = null;
                    if (ultimaSalidaConGPS && gpsEntrada) {
                      const distancia = calcularDistanciaKm(
                        ultimaSalidaConGPS.lat,
                        ultimaSalidaConGPS.lng,
                        mov.lat_entrada,
                        mov.lng_entrada,
                      );
                      const tiempo = calcularDuracionHM(
                        ultimaSalidaConGPS.hora,
                        mov.hora_entrada,
                      );
                      traslado = `${tiempo} (${distancia.toFixed(
                        2,
                      )} km desde punto anterior)`;
                    }

                    const seq = secuenciaLocal++;
                    bloques.push(
                      <div key={`entrada-${mov.id}`} className="relative">
                        <div
                          className="absolute -left-[42px] top-3 h-4 w-4 rounded-full border-4 bg-white"
                          style={{ borderColor: "var(--mr-success)" }}
                        />
                        <div
                          className="rounded-lg border-l-4 bg-[#f9fafb] p-4"
                          style={{ borderLeftColor: "var(--mr-success)" }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div
                              className="font-semibold text-sm"
                              style={{ color: "var(--mr-text)" }}
                            >
                              {gpsEntrada ? "📍" : "❌"} Punto {seq} - Entrada
                              (Registro #{mov.id})
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-3 py-1 rounded-full",
                                styles.badgeEntrada,
                              )}
                            >
                              ENTRADA
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <strong className="text-foreground">
                                Hora entrada:
                              </strong>{" "}
                              {mov.hora_entrada || "N/A"}
                            </div>
                            <div>
                              <strong className="text-foreground">GPS:</strong>{" "}
                              {gpsEntrada ? "Disponible" : "Sin ubicación"}
                            </div>
                            {gpsEntrada ? (
                              <div className="md:col-span-2">
                                <strong className="text-foreground">
                                  Ubicación:
                                </strong>{" "}
                                {Number(mov.lat_entrada).toFixed(6)},{" "}
                                {Number(mov.lng_entrada).toFixed(6)}
                              </div>
                            ) : null}
                          </div>

                          {traslado ? (
                            <div
                              className="mt-3 inline-block rounded-md px-3 py-1 text-[11px] font-semibold"
                              style={{
                                background: "var(--mr-warning-bg)",
                                color: "var(--mr-warning-text)",
                              }}
                            >
                              🚗 Traslado: {traslado}
                            </div>
                          ) : null}

                          <div className="mt-3">
                            {gpsEntrada ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  abrirMapaModal({
                                    lat: mov.lat_entrada,
                                    lng: mov.lng_entrada,
                                    tipo: "entrada",
                                    secuencia: seq,
                                    hora: mov.hora_entrada,
                                    id_registro: mov.id,
                                  })
                                }
                                className="text-xs"
                                style={{ background: "var(--mr-primary)" }}
                              >
                                📍 Ver Ubicación
                              </Button>
                            ) : (
                              <div
                                className="rounded-md px-3 py-2 text-xs font-semibold"
                                style={{
                                  background: "var(--mr-error-light)",
                                  color: "var(--mr-error-dark)",
                                }}
                              >
                                {/* Sin GPS: colores del manual (Error light/dark) - ver `mapa-rutas-theme.module.css` */}
                                ⚠️ Sin coordenadas GPS registradas
                              </div>
                            )}
                          </div>
                        </div>
                      </div>,
                    );
                  }

                  if (tieneSalida) {
                    const seq = secuenciaLocal++;
                    const permanencia =
                      mov.hora_entrada && mov.hora_salida
                        ? `${calcularDuracionHM(
                            mov.hora_entrada,
                            mov.hora_salida,
                          )} en este sitio`
                        : null;

                    bloques.push(
                      <div key={`salida-${mov.id}`} className="relative">
                        <div
                          className="absolute -left-[42px] top-3 h-4 w-4 rounded-full border-4 bg-white"
                          style={{ borderColor: "var(--mr-error)" }}
                        />
                        <div
                          className="rounded-lg border-l-4 bg-[#f9fafb] p-4"
                          style={{ borderLeftColor: "var(--mr-error)" }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div
                              className="font-semibold text-sm"
                              style={{ color: "var(--mr-text)" }}
                            >
                              {gpsSalida ? "📍" : "❌"} Punto {seq} - Salida
                              (Registro #{mov.id})
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-3 py-1 rounded-full",
                                styles.badgeSalida,
                              )}
                            >
                              SALIDA
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <strong className="text-foreground">
                                Hora salida:
                              </strong>{" "}
                              {mov.hora_salida || "N/A"}
                            </div>
                            <div>
                              <strong className="text-foreground">GPS:</strong>{" "}
                              {gpsSalida ? "Disponible" : "Sin ubicación"}
                            </div>
                            {gpsSalida ? (
                              <div className="md:col-span-2">
                                <strong className="text-foreground">
                                  Ubicación:
                                </strong>{" "}
                                {Number(mov.lat_salida).toFixed(6)},{" "}
                                {Number(mov.lng_salida).toFixed(6)}
                              </div>
                            ) : null}
                          </div>

                          {permanencia ? (
                            <div
                              className="mt-3 inline-block rounded-md px-3 py-1 text-[11px] font-semibold"
                              style={{
                                background: "var(--mr-warning-bg)",
                                color: "var(--mr-warning-text)",
                              }}
                            >
                              ⏱️ Permanencia: {permanencia}
                            </div>
                          ) : null}

                          <div className="mt-3">
                            {gpsSalida ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  abrirMapaModal({
                                    lat: mov.lat_salida,
                                    lng: mov.lng_salida,
                                    tipo: "salida",
                                    secuencia: seq,
                                    hora: mov.hora_salida,
                                    id_registro: mov.id,
                                  })
                                }
                                className="text-xs"
                                style={{ background: "var(--mr-primary)" }}
                              >
                                📍 Ver Ubicación
                              </Button>
                            ) : (
                              <div
                                className="rounded-md px-3 py-2 text-xs font-semibold"
                                style={{
                                  background: "var(--mr-error-light)",
                                  color: "var(--mr-error-dark)",
                                }}
                              >
                                {/* Sin GPS: colores del manual (Error light/dark) - ver `mapa-rutas-theme.module.css` */}
                                ⚠️ Sin coordenadas GPS registradas
                              </div>
                            )}
                          </div>
                        </div>
                      </div>,
                    );

                    if (gpsSalida) {
                      ultimaSalidaConGPS = {
                        lat: mov.lat_salida,
                        lng: mov.lng_salida,
                        hora: mov.hora_salida,
                      };
                    }
                  }

                  return bloques;
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => exportarAPDF(dia)}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md text-sm font-semibold"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar reporte a PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderReporteDetallado = () => {
    if (!dia)
      return (
        <div className="text-sm text-muted-foreground">
          Selecciona un día para ver los detalles.
        </div>
      );

    let primeraEntrada = null;
    let ultimaSalida = null;
    let totalChecadasValidas = 0;
    let totalChecadas = 0;

    dia.movimientos.forEach((mov) => {
      if (mov.hora_entrada && !primeraEntrada)
        primeraEntrada = mov.hora_entrada;
      if (mov.hora_salida) ultimaSalida = mov.hora_salida;
      if (mov.lat_entrada && mov.lng_entrada) totalChecadasValidas += 1;
      if (mov.lat_salida && mov.lng_salida) totalChecadasValidas += 1;
      totalChecadas += 2;
    });

    const jornada =
      primeraEntrada && ultimaSalida
        ? calcularDuracionDecimal(primeraEntrada, ultimaSalida)
        : 0;

    return (
      <div className="space-y-4">
        <div
          className={cn(
            styles.cardShadow,
            "rounded-xl overflow-hidden border bg-white",
          )}
          style={{ borderColor: "var(--mr-border)" }}
        >
          <div
            className={cn(
              styles.headerGradient,
              "px-6 py-5 text-white flex items-center justify-between gap-4",
            )}
          >
            <div>
              <div className="font-bold text-lg">Reporte de asistencia</div>
              <div className="text-sm opacity-90">
                {dia.empleado} - {formatearFechaLarga(dia.fecha)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold tracking-wide opacity-80">
                JORNADA TOTAL
              </div>
              <div className="text-3xl font-extrabold">
                {jornada.toFixed(1)} hrs
              </div>
            </div>
          </div>

          <div
            className="grid grid-cols-2 md:grid-cols-4 border-b"
            style={{ borderColor: "var(--mr-border)" }}
          >
            <StatItem label="Primera Entrada" value={primeraEntrada || "-"} />
            <StatItem label="Última Salida" value={ultimaSalida || "-"} />
            <StatItem
              label="Ubicaciones"
              value={String(dia.movimientos.length)}
            />
            <StatItem
              label="Checadas Válidas"
              value={`${totalChecadasValidas}/${totalChecadas}`}
            />
          </div>

          {/* Encabezado de tabla */}
          {/* Responsivo: solo se muestra en lg+ para evitar que se encime en tablets */}
          <div
            className="hidden lg:grid grid-cols-[15%_20%_20%_20%_15%] bg-[var(--mr-bg-hover)] px-5 py-3 text-[11px] font-bold tracking-wide text-muted-foreground border-b-2"
            style={{ borderColor: "var(--mr-border)" }}
          >
            <div>TIPO</div>
            <div>ENTRADA</div>
            <div>SALIDA</div>
            <div>PERMANENCIA</div>
            <div className="text-center">ESTADO</div>
          </div>

          {/*
            UX (solicitud):
            - Pestaña "Detallado": mostrar ~5 detalles visibles y luego scroll.
            - No se ocultan registros: solo se limita el alto del contenedor.
          */}
          <div
            className="divide-y max-h-[34rem] overflow-y-auto"
            style={{ borderColor: "var(--mr-border)" }}
          >
            {dia.movimientos.map((mov, idx) => {
              const gpsEntrada = !!mov.lat_entrada && !!mov.lng_entrada;
              const gpsSalida = !!mov.lat_salida && !!mov.lng_salida;
              const permanencia =
                mov.hora_entrada && mov.hora_salida
                  ? calcularDuracionHMDecimal(mov.hora_entrada, mov.hora_salida)
                  : "-";

              return (
                <React.Fragment key={`det-${mov.id}-${idx}`}>
                  <div className="px-5 py-4 bg-white">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--mr-primary) 0%, var(--mr-primary-dark) 100%)",
                        }}
                      >
                        📍
                      </div>
                      <div
                        className="font-semibold text-sm"
                        style={{ color: "var(--mr-text)" }}
                      >
                        Ubicación {mov.id}
                      </div>
                    </div>
                  </div>

                  {/*
                    Responsivo:
                    - <lg: apilado con etiquetas (evita que la hora de entrada se encime con salida)
                    - lg+: tabla de 5 columnas como el legacy
                  */}
                  <div className="grid grid-cols-1 lg:grid-cols-[15%_20%_20%_20%_15%] px-4 lg:px-5 py-3 lg:py-4 bg-white text-[13px] gap-3 lg:gap-0">
                    {/* Columna tipo (chips) */}
                    <div className="flex items-center flex-wrap gap-2">
                      {/* Chips alineados a manual (INFO) - ver `Colores.txt` */}
                      <span
                        className="text-[9px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
                        style={{
                          background: "var(--mr-info-light)",
                          color: "var(--mr-info-dark)",
                        }}
                      >
                        <span className="hidden sm:inline">ENTRADA</span>
                        <span className="sm:hidden">E</span>
                      </span>
                      {/* SALIDA: alineado a manual (ERROR) para consistencia semántica */}
                      <span
                        className="text-[9px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
                        style={{
                          background: "var(--mr-error-light)",
                          color: "var(--mr-error-dark)",
                        }}
                      >
                        <span className="hidden sm:inline">SALIDA</span>
                        <span className="sm:hidden">S</span>
                      </span>
                    </div>

                    {/* <lg: layout apilado con labels */}
                    <div className="grid grid-cols-2 gap-3 lg:hidden">
                      <div className="text-[11px] text-muted-foreground font-semibold">
                        ENTRADA
                      </div>
                      <div className="text-[13px] font-semibold whitespace-nowrap">
                        {mov.hora_entrada || "-"}
                      </div>

                      <div className="text-[11px] text-muted-foreground font-semibold">
                        SALIDA
                      </div>
                      <div className="text-[13px] font-semibold whitespace-nowrap">
                        {mov.hora_salida || "-"}
                      </div>

                      <div className="text-[11px] text-muted-foreground font-semibold">
                        PERMANENCIA
                      </div>
                      <div className="text-[13px] font-semibold text-blue-600 whitespace-nowrap">
                        {permanencia}
                      </div>

                      <div className="text-[11px] text-muted-foreground font-semibold">
                        ESTADO
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            background: gpsEntrada
                              ? "var(--mr-success-light)"
                              : "var(--mr-error-light)",
                            color: gpsEntrada
                              ? "var(--mr-success-dark)"
                              : "var(--mr-error-dark)",
                          }}
                          title="GPS entrada"
                        >
                          {gpsEntrada ? "✓" : "✗"}
                        </span>
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            background: gpsSalida
                              ? "var(--mr-success-light)"
                              : "var(--mr-error-light)",
                            color: gpsSalida
                              ? "var(--mr-success-dark)"
                              : "var(--mr-error-dark)",
                          }}
                          title="GPS salida"
                        >
                          {gpsSalida ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    {/* lg+: columnas separadas (no se enciman) */}
                    <div className="hidden lg:flex items-center whitespace-nowrap font-semibold">
                      {mov.hora_entrada || "-"}
                    </div>
                    <div className="hidden lg:flex items-center whitespace-nowrap font-semibold">
                      {mov.hora_salida || "-"}
                    </div>
                    <div className="hidden lg:flex items-center whitespace-nowrap font-semibold text-blue-600">
                      {permanencia}
                    </div>
                    <div className="hidden lg:flex items-center justify-center gap-2">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: gpsEntrada
                            ? "var(--mr-success-light)"
                            : "var(--mr-error-light)",
                          color: gpsEntrada
                            ? "var(--mr-success-dark)"
                            : "var(--mr-error-dark)",
                        }}
                        title="GPS entrada"
                      >
                        {gpsEntrada ? "✓" : "✗"}
                      </span>
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: gpsSalida
                            ? "var(--mr-success-light)"
                            : "var(--mr-error-light)",
                          color: gpsSalida
                            ? "var(--mr-success-dark)"
                            : "var(--mr-error-dark)",
                        }}
                        title="GPS salida"
                      >
                        {gpsSalida ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>

                  {/* Traslado entre ubicaciones */}
                  {idx < dia.movimientos.length - 1
                    ? (() => {
                        const sig = dia.movimientos[idx + 1];
                        if (mov.hora_salida && sig.hora_entrada) {
                          const traslado = calcularDuracionHMDecimal(
                            mov.hora_salida,
                            sig.hora_entrada,
                          );
                          return (
                            <div
                              className="px-5 py-3 text-sm flex items-center gap-2"
                              style={{
                                background: "var(--mr-warning-surface)",
                                borderTop: "1px solid var(--mr-warning-border)",
                                borderBottom:
                                  "1px solid var(--mr-warning-border)",
                                color: "var(--mr-warning-text)",
                              }}
                            >
                              <span className="text-base">🚗</span>
                              <span className="font-semibold">Traslado:</span>
                              <span className="font-extrabold">{traslado}</span>
                              <span className="text-muted-foreground">
                                → Siguiente ubicación
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()
                    : null}
                </React.Fragment>
              );
            })}
          </div>

          <div
            className="px-5 py-4 text-center text-[11px] text-muted-foreground bg-[var(--mr-bg-hover)] border-t"
            style={{ borderColor: "var(--mr-border)" }}
          >
            Generado el {new Date().toLocaleDateString("es-MX")}{" "}
            {new Date().toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            - Sistema Adamia
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => exportarAPDF(dia)}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md text-sm font-semibold"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar reporte a PDF
          </Button>
        </div>
      </div>
    );
  };

  /**
   * Exporta a PDF el reporte del día seleccionado.
   * - Relación: copia y adapta la función `exportarAPDF()` del legacy `Mapas -rutas.html`
   */
  const exportarAPDF = (diaPdf) => {
    if (!diaPdf) {
      setErrorMsg("⚠️ Selecciona un día primero");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");

    const margin = 25;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - margin * 2;
    let yPos = margin;

    // Calcular estadísticas
    let primeraEntrada = null;
    let ultimaSalida = null;
    let totalChecadasValidas = 0;

    diaPdf.movimientos.forEach((mov) => {
      if (mov.hora_entrada && !primeraEntrada)
        primeraEntrada = mov.hora_entrada;
      if (mov.hora_salida) ultimaSalida = mov.hora_salida;
      if (mov.lat_entrada && mov.lng_entrada) totalChecadasValidas += 1;
      if (mov.lat_salida && mov.lng_salida) totalChecadasValidas += 1;
    });

    const horasTrabajadas =
      primeraEntrada && ultimaSalida
        ? calcularDuracionDecimal(primeraEntrada, ultimaSalida)
        : 0;

    // HEADER
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(margin, yPos, contentWidth, 35, "S");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    // Logo/marca de empresa (imagen o iniciales) en el encabezado.
    const companyName =
      empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa || "";
    const logoBox = { x: margin + 5, y: yPos + 6, boxW: 26, boxH: 14 };
    const hasMark = tryAddCompanyMarkToPdf(
      doc,
      { logoDataUrl, companyName },
      logoBox,
    );
    const textX = hasMark ? logoBox.x + logoBox.boxW + 4 : margin + 5;

    doc.text("REPORTE DE ASISTENCIA", textX, yPos + 10);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Empleado: ${diaPdf.empleado}`, textX, yPos + 18);
    doc.text(`Fecha: ${formatearFechaLarga(diaPdf.fecha)}`, textX, yPos + 25);

    // Jornada total - derecha
    doc.setFont("helvetica", "bold");
    doc.text("JORNADA TOTAL", pageWidth - margin - 5, yPos + 10, {
      align: "right",
    });
    doc.setFontSize(24);
    doc.text(
      `${horasTrabajadas.toFixed(1)} hrs`,
      pageWidth - margin - 5,
      yPos + 22,
      { align: "right" },
    );

    yPos += 45;

    // ESTADÍSTICAS
    doc.setLineWidth(0.5);
    const statWidth = contentWidth / 4;
    const stats = [
      { label: "Primera Entrada", value: primeraEntrada || "-" },
      { label: "Ultima Salida", value: ultimaSalida || "-" },
      { label: "Ubicaciones", value: diaPdf.movimientos.length },
      {
        label: "Checadas Validas",
        value: `${totalChecadasValidas}/${diaPdf.movimientos.length * 2}`,
      },
    ];

    doc.rect(margin, yPos, contentWidth, 20, "S");
    stats.forEach((stat, i) => {
      const x = margin + i * statWidth;
      if (i > 0) doc.line(x, yPos, x, yPos + 20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(stat.label.toUpperCase(), x + statWidth / 2, yPos + 8, {
        align: "center",
      });
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(String(stat.value), x + statWidth / 2, yPos + 16, {
        align: "center",
      });
    });

    yPos += 30;

    // HEADER DE TABLA
    /**
     * Layout de columnas (A4 vertical):
     * - Problema corregido: la columna "ESTADO" se imprimía fuera del rectángulo porque se usaban
     *   coordenadas X absolutas que excedían `margin + contentWidth`.
     * - Solución: definimos anchos relativos que SUMAN EXACTAMENTE `contentWidth` y calculamos
     *   el centro de cada columna para alinear texto sin desbordes.
     *
     * Relación:
     * - Esta tabla corresponde al "Reporte de asistencia" que también se ve en pantalla dentro de este mismo archivo.
     */
    const colWidths = {
      // Columna con "E / S" (tipo de registro en el reporte)
      tipo: 30,
      // Horas
      entrada: 30,
      salida: 30,
      // Permanencia suele ser más larga (ej. "4.30 hrs")
      permanencia: 40,
      // "ESTADO" contiene 2 valores (GPS Entrada / GPS Salida), por eso se reserva un bloque y se divide en 2.
      estado: 30,
    };

    // Coordenadas X de inicio para cada columna.
    // Nota: `margin + contentWidth` es el borde derecho del cuadro; nada debe imprimirse más allá.
    const colX = {
      tipo: margin,
      entrada: margin + colWidths.tipo,
      salida: margin + colWidths.tipo + colWidths.entrada,
      permanencia:
        margin + colWidths.tipo + colWidths.entrada + colWidths.salida,
      estado:
        margin +
        colWidths.tipo +
        colWidths.entrada +
        colWidths.salida +
        colWidths.permanencia,
    };

    // Centro de cada columna para usar align:center.
    const colCenter = {
      tipo: colX.tipo + colWidths.tipo / 2,
      entrada: colX.entrada + colWidths.entrada / 2,
      salida: colX.salida + colWidths.salida / 2,
      permanencia: colX.permanencia + colWidths.permanencia / 2,
      estado: colX.estado + colWidths.estado / 2,
    };

    // Sub-columnas internas para "ESTADO" (Entrada / Salida), así caben los dos valores.
    const estadoSubWidth = colWidths.estado / 2;
    const estadoCenterEntrada = colX.estado + estadoSubWidth / 2;
    const estadoCenterSalida =
      colX.estado + estadoSubWidth + estadoSubWidth / 2;

    doc.setLineWidth(0.8);
    doc.rect(margin, yPos, contentWidth, 8, "S");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    doc.text("TIPO", colCenter.tipo, yPos + 5.5, { align: "center" });
    doc.text("ENTRADA", colCenter.entrada, yPos + 5.5, { align: "center" });
    doc.text("SALIDA", colCenter.salida, yPos + 5.5, { align: "center" });
    doc.text("PERMANENCIA", colCenter.permanencia, yPos + 5.5, {
      align: "center",
    });
    doc.text("ESTADO", colCenter.estado, yPos + 5.5, { align: "center" });

    yPos += 8;

    // DATOS DE UBICACIONES
    doc.setFont("helvetica", "normal");
    doc.setLineWidth(0.3);

    diaPdf.movimientos.forEach((mov, idx) => {
      if (yPos > pageHeight - margin - 60) {
        doc.addPage();
        yPos = margin;
      }

      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, contentWidth, 8, "S");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Ubicacion ${mov.id}`, margin + 5, yPos + 5.5);
      yPos += 8;

      doc.setLineWidth(0.3);
      doc.rect(margin, yPos, contentWidth, 10, "S");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      doc.text("E / S", colCenter.tipo, yPos + 6.5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(mov.hora_entrada || "-", colCenter.entrada, yPos + 6.5, {
        align: "center",
      });
      doc.text(mov.hora_salida || "-", colCenter.salida, yPos + 6.5, {
        align: "center",
      });

      const perm =
        mov.hora_entrada && mov.hora_salida
          ? calcularDuracionHMDecimal(mov.hora_entrada, mov.hora_salida)
          : "-";
      doc.text(perm, colCenter.permanencia, yPos + 6.5, { align: "center" });

      const gpsEntrada = !!mov.lat_entrada && !!mov.lng_entrada;
      const gpsSalida = !!mov.lat_salida && !!mov.lng_salida;

      // "ESTADO" se divide en 2: GPS Entrada / GPS Salida
      // (esto evita que el segundo valor se desborde fuera del cuadro)
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(gpsEntrada ? "Si" : "No", estadoCenterEntrada, yPos + 6.5, {
        align: "center",
      });
      doc.text(gpsSalida ? "Si" : "No", estadoCenterSalida, yPos + 6.5, {
        align: "center",
      });
      doc.setFontSize(9);

      yPos += 10;

      // Traslado
      if (idx < diaPdf.movimientos.length - 1) {
        const siguiente = diaPdf.movimientos[idx + 1];
        if (mov.hora_salida && siguiente.hora_entrada) {
          const traslado = calcularDuracionHMDecimal(
            mov.hora_salida,
            siguiente.hora_entrada,
          );
          doc.rect(margin, yPos, contentWidth, 7, "S");
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text("Traslado:", margin + 5, yPos + 4.5);
          doc.setFont("helvetica", "bold");
          doc.text(`${traslado}`, margin + 23, yPos + 4.5);
          doc.setFont("helvetica", "normal");
          doc.text("a siguiente ubicacion", margin + 43, yPos + 4.5);
          yPos += 7;
        }
      }
    });

    // FIRMAS (se ubican al final de la hoja)
    yPos = pageHeight - 55;
    doc.setLineWidth(0.5);

    doc.line(margin + 10, yPos, margin + 65, yPos);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("FIRMA DEL TRABAJADOR", margin + 37.5, yPos + 6, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(diaPdf.empleado, margin + 37.5, yPos + 11, { align: "center" });

    doc.line(pageWidth - margin - 65, yPos, pageWidth - margin - 10, yPos);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(
      "REPRESENTANTE DE LA EMPRESA",
      pageWidth - margin - 37.5,
      yPos + 6,
      { align: "center" },
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "Uniline Innovacion en la Nube",
      pageWidth - margin - 37.5,
      yPos + 11,
      { align: "center" },
    );

    // FOOTER
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const fechaGenerado = new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const horaGenerado = new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });
      doc.text(
        `Generado el ${fechaGenerado} a las ${horaGenerado} | Sistema Adamia by Uniline | Pagina ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" },
      );
    }

    const nombreArchivo = `Reporte_Asistencia_${String(
      diaPdf.empleado || "Empleado",
    ).replace(/ /g, "_")}_${diaPdf.fecha}.pdf`;
    doc.save(nombreArchivo);
  };

  return (
    <div className={cn(styles.mrTheme, "space-y-4")}>
      {/* Header del módulo */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <Route className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">Mapa de rutas</div>
            <div className="text-sm text-gray-600">
              Auditoría de ubicaciones y recorridos
            </div>
          </div>
        </div>
      </div>

      {/* Layout principal (Días a la izquierda / Mapa a la derecha como el legacy) */}
      {/* Nota: se baja el breakpoint a `lg` para que en desktop común no se apile (el usuario lo pidió). */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card
            className={cn(styles.cardShadow, "border")}
            style={{ borderColor: "var(--mr-border)" }}
          >
           
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  🏢 Empresa
                </label>
                <Combobox
                  options={[
                    { value: "all", label: "Todas las empresas" },
                    ...(dataUser?.empresas_detalle || []).map((e) => ({
                      value: String(e.id_empresa),
                      label: e.nombre,
                    })),
                  ]}
                  value={empresaFiltro}
                  onChange={(value) => {
                    setEmpresaFiltro(value);
                    setEmpleadoId("");
                    setEmpSearch("");
                    limpiarTodo();
                  }}
                  placeholder="Empresa"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Empleado
                </label>
                {/* Buscador tipo "Nuevo Contrato" (Contratos) */}
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar empleado..."
                    value={empSearch}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmpSearch(v);
                      setOpenEmpSug(true);
                      // Si el usuario borra el texto, se limpia el filtro (misma UX que escribir desde cero)
                      if (!v.trim()) setEmpleadoId("");
                    }}
                    onFocus={() => setOpenEmpSug(true)}
                    onBlur={() => setTimeout(() => setOpenEmpSug(false), 120)}
                  />

                  {openEmpSug ? (
                    <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow max-h-64 overflow-auto">
                      {/* Opción para limpiar selección (útil para volver a "sin empleado") */}
                      <div
                        className="px-3 py-2 cursor-pointer text-sm hover:bg-blue-50 font-semibold text-slate-700"
                        onMouseDown={() => {
                          setEmpleadoId("");
                          setEmpSearch("");
                          setOpenEmpSug(false);
                        }}
                      >
                        Selecciona un empleado
                      </div>

                      {(empleados || [])
                        .filter((x) => {
                          const q = empSearch.trim().toLowerCase();
                          if (!q) return true;
                          const nombre = String(
                            x.nombre_completo || "",
                          ).toLowerCase();
                          const puesto = String(x.puesto || "").toLowerCase();
                          return nombre.includes(q) || puesto.includes(q);
                        })
                        .slice(0, 50)
                        .map((emp) => (
                          <div
                            key={`emp-sel-mr-${emp.id_empleado}`}
                            className="px-3 py-2 cursor-pointer text-sm hover:bg-blue-50"
                            onMouseDown={() => {
                              setEmpleadoId(String(emp.id_empleado));
                              setEmpSearch(emp.nombre_completo || "");
                              setOpenEmpSug(false);
                            }}
                          >
                            <div className="font-medium">
                              {emp.nombre_completo}
                            </div>
                            {emp.puesto ? (
                              <div className="text-xs text-muted-foreground">
                                {emp.puesto}
                              </div>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>

                {/*
                  Fallback anterior (NO se elimina, solo se deja comentado):
                  <Select value={empleadoId || "__none__"} onValueChange={(v) => setEmpleadoId(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecciona un empleado</SelectItem>
                      {empleados.map((e) => (
                        <SelectItem key={e.id_empleado} value={String(e.id_empleado)}>
                          {e.nombre_completo} {e.puesto ? `- ${e.puesto}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                */}
                {empleadoLabel ? (
                  <div className="text-[11px] text-muted-foreground">
                    {empleadoLabel}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Fecha inicio
                  </label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Fecha fin
                  </label>
                  <Input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={buscarMovimientos}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md font-semibold"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
                <Button
                  variant="secondary"
                  onClick={limpiarTodo}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm font-semibold"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              </div>

              {!!errorMsg ? (
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm font-semibold",
                    errorMsg.includes("✅")
                      ? "bg-green-50 text-green-800"
                      : errorMsg.includes("⚠️")
                      ? "bg-yellow-50 text-yellow-900"
                      : errorMsg.includes("ℹ️")
                      ? "bg-blue-50 text-blue-900"
                      : "bg-red-50 text-red-800",
                  )}
                >
                  {errorMsg}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card
            className={cn(styles.cardShadow, "border")}
            style={{ borderColor: "var(--mr-border)" }}
          >
            <CardHeader>
              <CardTitle className="text-base">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f9fafb] p-4 text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: "var(--mr-primary)" }}
                  >
                    {diasAgrupados.length}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Días
                  </div>
                </div>
                <div className="rounded-lg bg-[#f9fafb] p-4 text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: "var(--mr-primary)" }}
                  >
                    {movimientos.length}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Registros
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(styles.cardShadow, "border")}
            style={{ borderColor: "var(--mr-border)" }}
          >
            <CardHeader>
              <CardTitle className="text-base">Días</CardTitle>
            </CardHeader>
            <CardContent>
              {diasAgrupados.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="text-3xl mb-2">
                    <Route className="h-8 w-8 mx-auto text-[#2563EB]" />
                  </div>
                  <div className="font-semibold">Sin resultados</div>
                  <div className="text-sm">Selecciona un empleado y busca</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                  {diasAgrupados.map((d, idx) => {
                    const selected = idx === diaSeleccionado;
                    return (
                      <button
                        key={d.fecha}
                        onClick={() => {
                          setDiaSeleccionado(idx);
                          resetearAnimacion();
                        }}
                        className={cn(
                          "w-full text-left rounded-lg border-2 p-4 transition-all",
                          selected
                            ? "bg-[#f0f4f7] border-[var(--mr-primary)]"
                            : "bg-white border-[var(--mr-border)] hover:border-[var(--mr-primary)] hover:shadow-sm",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-12 w-12 rounded-lg flex items-center justify-center text-white text-lg"
                            style={{
                              background:
                                "linear-gradient(135deg, var(--mr-primary) 0%, var(--mr-primary-dark) 100%)",
                            }}
                          >
                            <CalendarDays className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {formatearFechaLarga(d.fecha)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {d.empleado}
                            </div>
                          </div>
                        </div>
                        <div
                          className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t"
                          style={{ borderColor: "var(--mr-border)" }}
                        >
                          <div className="text-center">
                            <div
                              className="text-lg font-bold"
                              style={{ color: "var(--mr-primary)" }}
                            >
                              {d.movimientos.length}
                            </div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Registros
                            </div>
                          </div>
                          <div className="text-center">
                            <div
                              className="text-lg font-bold"
                              style={{ color: "var(--mr-primary)" }}
                            >
                              {calcularPuntosTotales(d.movimientos)}
                            </div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Puntos GPS
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="space-y-4">
          <Tabs value={vista} onValueChange={(v) => setVista(v)}>
            <div className="border-b border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 overflow-x-auto rounded-xl">
              <TabsList className="bg-transparent h-auto p-0 min-w-max w-full justify-start">
                <TabsTrigger
                  value="mapa"
                  className="data-[state=active]:bg-white/80 data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] text-sm px-4 py-2.5 font-medium"
                >
                  <MapIcon className="h-4 w-4 mr-2 flex-shrink-0" /> Mapa
                </TabsTrigger>
                <TabsTrigger
                  value="reporte"
                  className="data-[state=active]:bg-white/80 data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] text-sm px-4 py-2.5 font-medium"
                >
                  <BarChart3 className="h-4 w-4 mr-2 flex-shrink-0" /> Reporte
                </TabsTrigger>
                <TabsTrigger
                  value="detallado"
                  className="data-[state=active]:bg-white/80 data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] text-sm px-4 py-2.5 font-medium"
                >
                  <List className="h-4 w-4 mr-2 flex-shrink-0" /> Detallado
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="mapa" className="space-y-3">
              {/* Controles de animación (solo si hay puntos) */}
              <div
                className={cn(
                  styles.cardShadow,
                  "rounded-xl border bg-white p-4 flex flex-wrap items-center gap-3",
                )}
                style={{ borderColor: "var(--mr-border)" }}
              >
                <Button
                  onClick={reproducirRuta}
                  disabled={puntos.length === 0}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm font-semibold"
                  title={animacionActiva ? "Pausar" : "Reproducir"}
                >
                  {animacionActiva ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={pausarRuta}
                  disabled={puntos.length === 0}
                  variant="outline"
                >
                  <Pause className="h-4 w-4" />
                </Button>
                <Button
                  onClick={resetearRuta}
                  disabled={puntos.length === 0}
                  variant="outline"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <div
                  className="hidden md:flex items-center gap-2 ml-2 pl-3 border-l"
                  style={{ borderColor: "var(--mr-border)" }}
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    Velocidad:
                  </span>
                  <Button
                    size="sm"
                    variant={velocidad === 1500 ? "default" : "outline"}
                    onClick={() => setVelocidad(1500)}
                    className={cn(velocidad === 1500 ? "" : "bg-white")}
                  >
                    1x
                  </Button>
                  <Button
                    size="sm"
                    variant={velocidad === 800 ? "default" : "outline"}
                    onClick={() => setVelocidad(800)}
                    className={cn(velocidad === 800 ? "" : "bg-white")}
                  >
                    2x
                  </Button>
                  <Button
                    size="sm"
                    variant={velocidad === 400 ? "default" : "outline"}
                    onClick={() => setVelocidad(400)}
                    className={cn(velocidad === 400 ? "" : "bg-white")}
                  >
                    4x
                  </Button>
                </div>

                <div
                  className="ml-auto text-sm font-semibold"
                  style={{ color: "var(--mr-text)" }}
                >
                  {Math.min(indicePunto, puntos.length)} / {puntos.length}
                </div>
              </div>

              {loading ? (
                <div
                  className="rounded-xl border bg-white p-6 text-center"
                  style={{ borderColor: "var(--mr-border)" }}
                >
                  <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-slate-200 border-t-[var(--mr-primary)] animate-spin" />
                  <div className="font-semibold">Cargando movimientos...</div>
                </div>
              ) : (
                <RutaMap
                  puntos={puntos}
                  empleado={dia?.empleado}
                  puesto={dia?.puesto}
                  animacionActiva={animacionActiva}
                  indicePunto={Math.min(indicePunto, puntos.length - 1)}
                  polylinesAnimadas={polylinesAnimadas}
                  onOpenPoint={abrirMapaModal}
                />
              )}
            </TabsContent>

            <TabsContent value="reporte" className="space-y-3">
              {renderReporteResumido()}
            </TabsContent>

            <TabsContent value="detallado" className="space-y-3">
              {renderReporteDetallado()}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal para ver punto en mapa */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-6 w-6" />
              <DialogTitle className="text-white text-lg font-semibold">
                {modalPoint
                  ? `Punto ${modalPoint.secuencia} - ${
                      modalPoint.tipo === "entrada" ? "Entrada" : "Salida"
                    }${modalPoint.hora ? ` - ${modalPoint.hora}` : ""}`
                  : "Ubicación"}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-6">
            {modalPoint ? (
              <ModalPointMap point={modalPoint} />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sin punto seleccionado.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Accesos Rápidos - Componente reutilizable (mismo patrón que el resto de páginas) */}
      <AccesosRapidos />
    </div>
  );
}

/**
 * Stat item del reporte detallado (replica el bloque de 4 estadísticas del HTML legacy).
 */
function StatItem({ label, value }) {
  return (
    <div
      className="p-4 text-center border-r last:border-r-0"
      style={{ borderColor: "var(--mr-border)" }}
    >
      <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div
        className="mt-2 text-lg font-extrabold"
        style={{ color: "var(--mr-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Skeleton reusable para mapas Leaflet (mientras carga dynamic import en cliente).
 * - Relación: `RutaMap` y `ModalPointMap` se cargan con `dynamic({ ssr:false })`
 */
function LeafletSkeleton({ heightClass = "h-[520px] min-h-[520px]" }) {
  return (
    <div
      className={cn("rounded-xl border bg-white p-6 text-center", heightClass)}
      style={{ borderColor: "var(--mr-border)" }}
    >
      <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-slate-200 border-t-[var(--mr-primary)] animate-spin" />
      <div className="font-semibold">Cargando mapa...</div>
    </div>
  );
}
