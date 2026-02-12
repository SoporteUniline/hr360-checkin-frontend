"use client";

/**
 * Leaflet maps (aislado para evitar SSR)
 * - Relación:
 *   - Página: `src/app/panel/mapa-de-rutas/page.jsx` (lo importa con dynamic ssr:false)
 *
 * Motivo:
 * - `leaflet` accede a `window` durante el import. En Next.js, al recargar una ruta puede
 *   evaluarse el módulo en el bundle SSR y falla con "window is not defined".
 * - Solución: este archivo SOLO se carga en cliente con `dynamic(..., { ssr:false })`.
 */

import React, { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";

import { Button } from "@/components/ui/button";

// NOTA (dev):
// Leaflet + Next.js Fast Refresh (y React StrictMode en dev) pueden dejar el contenedor “ensuciado”
// entre re-mounts. Para evitar:
// - "Map container is being reused by another instance"
// - "Cannot read properties of undefined (reading 'appendChild')"
// hacemos el cleanup EN EL PADRE del MapContainer (para que corra después de que TileLayer/Markers limpien).

/**
 * Crea un icono numerado (divIcon) para Leaflet.
 * - Relación: emula el marcador numerado de `Mapas -rutas.html`
 * - Nota: usa `@keyframes markerPulse` definido en `src/app/globals.css`
 */
function createNumberedIcon({ n, tipo, size = 36, pulse = false }) {
  const bg =
    tipo === "entrada"
      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";

  const border = pulse ? 4 : 3;
  const fontSize = pulse ? 16 : 14;
  const boxShadow = pulse ? "0 6px 16px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.3)";

  return L.divIcon({
    className: "mr-numbered-marker",
    html: `
      <div style="
        background: ${bg};
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        border: ${border}px solid white;
        box-shadow: ${boxShadow};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: ${fontSize}px;
        ${pulse ? "animation: markerPulse 1s ease-in-out;" : ""}
      ">
        ${n}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

/**
 * Hace pan automático hacia el punto activo durante la animación, SIN alterar el zoom.
 * - Relación: se usa en `RutaMap` cuando `animacionActiva` está encendida (playback).
 * - Motivo: el usuario solicitó “quitar el zoom” al reproducir; es decir, que el mapa
 *   no haga zoom-in/zoom-out por cada punto, solo siga el marcador.
 */
function MapAutoPan({
  activePoint,
  /**
   * Si `changeZoom=true`, se comporta como el legacy (setView con zoom).
   * Por default se deja en `false` para que la reproducción sea “plana”.
   */
  changeZoom = false,
  /**
   * Zoom objetivo solo cuando `changeZoom=true`.
   * Nota: se mantiene para compatibilidad y futuras necesidades.
   */
  zoom = 16,
  /**
   * Duración de la animación (segundos) usada por Leaflet en pan/setView.
   */
  duration = 0.5,
}) {
  const map = useMap();
  useEffect(() => {
    if (!activePoint?.lat || !activePoint?.lng) return;
    const target = [activePoint.lat, activePoint.lng];

    // Legacy/opt-in: mueve el mapa y también cambia el zoom.
    if (changeZoom) {
      map.setView(target, zoom, { animate: true, duration });
      return;
    }

    // Nuevo default: “reproducción plana”
    // - Solo seguimos el punto con pan (sin tocar zoom).
    map.panTo(target, { animate: true, duration });
  }, [activePoint, changeZoom, duration, map, zoom]);
  return null;
}

/**
 * Ajusta automáticamente el viewport para encuadrar todos los puntos del día.
 * - Relación: `map.fitBounds(...)` del HTML legacy.
 */
function MapFitBounds({ bounds, padding = [80, 80], enabled = true }) {
  const map = useMap();
  useEffect(() => {
    // Importante: durante reproducción queremos que el zoom NO cambie (reproducción “plana”).
    // - Relación: `RutaMap` pasa `enabled={!animacionActiva}`.
    if (!enabled) return;
    if (!bounds || bounds.length === 0) return;
    try {
      map.fitBounds(bounds, { padding });
    } catch {
      // Evitar romper el render si Leaflet recibe bounds inválidos.
    }
  }, [bounds, enabled, map, padding]);
  return null;
}

/**
 * Soluciona el "gris" al colapsar/expandir el sidebar:
 * - Leaflet necesita `invalidateSize()` cuando cambia el tamaño del contenedor.
 * - Usamos ResizeObserver + transitionend + window resize para cubrir todos los casos.
 */
function MapInvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const container = map.getContainer?.();
    if (!container) return;

    const invalidate = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        // No-op: evitar romper el render
      }
    };

    // 1) Invalidate inicial (por si el mapa montó antes de terminar el layout)
    const t1 = setTimeout(invalidate, 0);
    const t2 = setTimeout(invalidate, 150);
    const t3 = setTimeout(invalidate, 350); // cubre transiciones de sidebar

    // 2) ResizeObserver sobre el contenedor Leaflet
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => invalidate());
      ro.observe(container);
      // También observar el parent por si cambia padding/width ahí
      if (container.parentElement) ro.observe(container.parentElement);
    }

    // 3) Window resize
    window.addEventListener("resize", invalidate);

    // 4) CSS transitions (sidebar)
    const onTransitionEnd = (e) => {
      // Si cualquier transición afecta layout, invalidamos.
      // (ej: width/left/transform del sidebar)
      if (!e?.propertyName) return invalidate();
      if (["width", "left", "right", "transform", "padding"].includes(e.propertyName)) {
        invalidate();
      }
    };
    document.addEventListener("transitionend", onTransitionEnd, true);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", invalidate);
      document.removeEventListener("transitionend", onTransitionEnd, true);
      if (ro) ro.disconnect();
    };
  }, [map]);

  return null;
}

/**
 * Controla zoom (+/-) y gestos de zoom mientras se reproduce la ruta.
 * - Solicitud: al dar "Play" quitar el evento de ampliar/reducir el mapa.
 * - Nota: dejamos el pan/drag activo para que el usuario pueda moverse sin hacer zoom.
 */
function MapZoomInteractionLock({ lockZoom = false }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const safe = (fn) => {
      try {
        fn?.();
      } catch {
        // no-op
      }
    };

    if (lockZoom) {
      safe(() => map.scrollWheelZoom?.disable());
      safe(() => map.doubleClickZoom?.disable());
      safe(() => map.touchZoom?.disable());
      safe(() => map.boxZoom?.disable());
      safe(() => map.keyboard?.disable());
      // Importante: NO deshabilitamos dragging (pan) para no “congelar” la UX.
    } else {
      safe(() => map.scrollWheelZoom?.enable());
      safe(() => map.doubleClickZoom?.enable());
      safe(() => map.touchZoom?.enable());
      safe(() => map.boxZoom?.enable());
      safe(() => map.keyboard?.enable());
    }
  }, [lockZoom, map]);

  return null;
}

/**
 * Muestra/oculta el control de zoom (+/-).
 * - Solución: MapContainer se renderiza con `zoomControl={false}` para que no lo agregue automáticamente.
 */
function MapZoomControlToggle({ show = true, position = "topleft" }) {
  const map = useMap();
  const ctrlRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Si ya existe control, lo removemos primero para evitar duplicados.
    if (ctrlRef.current) {
      try {
        map.removeControl(ctrlRef.current);
      } catch {
        // no-op
      }
      ctrlRef.current = null;
    }

    if (show) {
      try {
        ctrlRef.current = L.control.zoom({ position });
        ctrlRef.current.addTo(map);
      } catch {
        ctrlRef.current = null;
      }
    }

    return () => {
      if (!ctrlRef.current) return;
      try {
        map.removeControl(ctrlRef.current);
      } catch {
        // no-op
      }
      ctrlRef.current = null;
    };
  }, [map, position, show]);

  return null;
}

/**
 * Mapa principal del módulo.
 * - Renderiza marcadores estáticos para todos los puntos
 * - Renderiza la animación (marcador pulse + polilíneas) cuando está activa
 */
export function RutaMap({
  puntos,
  empleado,
  puesto,
  animacionActiva,
  indicePunto,
  polylinesAnimadas,
  onOpenPoint,
}) {
  const defaultCenter = [20.6736, -103.3464];

  const bounds = useMemo(() => puntos.map((p) => [p.lat, p.lng]), [puntos]);
  const initialCenter = bounds.length ? bounds[0] : defaultCenter;

  const activePoint = animacionActiva ? puntos[indicePunto] : null;
  const mapRef = useRef(null);
  const mapKey = useMemo(() => {
    const first = puntos?.[0];
    // Cambia al cambiar de día/selección para evitar reuso del contenedor durante refresh.
    return `mr-main-${first?.id_registro || "none"}-${puntos?.length || 0}`;
  }, [puntos]);

  useEffect(() => {
    // Cleanup al desmontar RutaMap.
    // Importante: se ejecuta DESPUÉS del cleanup de hijos (TileLayer/Markers), evitando carreras.
    return () => {
      const map = mapRef.current;
      if (!map) return;
      // Dejamos que los hijos desmonten primero y luego removemos el mapa.
      setTimeout(() => {
        try {
          const container = map?.getContainer?.();
          map?.remove?.();
          if (container && container._leaflet_id) {
            try {
              delete container._leaflet_id;
            } catch {
              // no-op
            }
          }
        } catch {
          // no-op
        }
        mapRef.current = null;
      }, 0);
    };
  }, []);

  return (
    <div
      className="h-[520px] md:h-[calc(100svh-12rem)] min-h-[520px] w-full rounded-xl overflow-hidden border"
      style={{ borderColor: "var(--mr-border)" }}
    >
      <MapContainer
        key={mapKey}
        center={initialCenter}
        zoom={12}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapInvalidateOnResize />
        {/* Al reproducir: ocultar control +/- y bloquear gestos de zoom */}
        <MapZoomControlToggle show={!animacionActiva} />
        <MapZoomInteractionLock lockZoom={animacionActiva} />
        {/* Al reproducir, NO re-encuadrar (fitBounds cambia zoom). */}
        <MapFitBounds bounds={bounds} enabled={!animacionActiva} />

        {puntos.map((p) => (
          <Marker
            key={`static-${p.secuencia}-${p.id_registro}-${p.tipo}`}
            position={[p.lat, p.lng]}
            icon={createNumberedIcon({ n: p.secuencia, tipo: p.tipo, size: 36 })}
          >
            <Popup>
              <div className="min-w-[220px]">
                <div className="font-bold text-sm" style={{ color: p.tipo === "entrada" ? "#10b981" : "#ef4444" }}>
                  {p.tipo === "entrada" ? `📍 Punto ${p.secuencia} - Entrada` : `🚪 Punto ${p.secuencia} - Salida`}
                </div>
                <div className="text-sm mt-2">
                  <div className="font-semibold">{empleado || "Empleado"}</div>
                  <div className="text-xs text-muted-foreground">{puesto || ""}</div>
                  <div className="text-xs mt-1">
                    <strong>Hora:</strong> {p.hora || "N/A"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Registro ID: {p.id_registro}</div>
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => onOpenPoint?.(p)}>
                      📍 Ver ubicación
                    </Button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {polylinesAnimadas.map((line, idx) => (
          <Polyline
            key={`poly-${idx}`}
            positions={line}
            pathOptions={{ color: "#2563EB", weight: 4, opacity: 0.8, dashArray: "10, 5" }}
          />
        ))}

        {activePoint ? (
          <>
            <Marker
              position={[activePoint.lat, activePoint.lng]}
              icon={createNumberedIcon({
                n: activePoint.secuencia,
                tipo: activePoint.tipo,
                size: 44,
                pulse: true,
              })}
            >
              <Popup autoPan={false} closeButton={false}>
                <div className="min-w-[220px]">
                  <div className="font-bold text-sm" style={{ color: activePoint.tipo === "entrada" ? "#10b981" : "#ef4444" }}>
                    {activePoint.tipo === "entrada"
                      ? `📍 Punto ${activePoint.secuencia} - Entrada`
                      : `🚪 Punto ${activePoint.secuencia} - Salida`}
                  </div>
                  <div className="text-xs mt-2">
                    <strong>Hora:</strong> {activePoint.hora || "N/A"}
                  </div>
                </div>
              </Popup>
            </Marker>
            {/* Playback “plano”: seguir el punto sin alterar el zoom del usuario */}
            <MapAutoPan activePoint={activePoint} changeZoom={false} />
          </>
        ) : null}
      </MapContainer>
    </div>
  );
}

/**
 * Mapa simple para el modal de un punto.
 * - Relación: modal "Ver ubicación" en `page.jsx`
 */
export function ModalPointMap({ point }) {
  if (!point) return null;

  const modalKey = `mr-modal-${point?.id_registro || point?.secuencia || "none"}`;
  const mapRef = useRef(null);

  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (!map) return;
      setTimeout(() => {
        try {
          const container = map?.getContainer?.();
          map?.remove?.();
          if (container && container._leaflet_id) {
            try {
              delete container._leaflet_id;
            } catch {
              // no-op
            }
          }
        } catch {
          // no-op
        }
        mapRef.current = null;
      }, 0);
    };
  }, []);

  return (
    <div className="h-[70vh] min-h-[420px] rounded-xl overflow-hidden border" style={{ borderColor: "var(--mr-border)" }}>
      <MapContainer
        key={modalKey}
        center={[point.lat, point.lng]}
        zoom={17}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapInvalidateOnResize />
        {/* En modal siempre mostramos control +/- */}
        <MapZoomControlToggle show />
        <Marker
          position={[point.lat, point.lng]}
          icon={createNumberedIcon({
            n: point.secuencia,
            tipo: point.tipo,
            size: 48,
            pulse: true,
          })}
        />
      </MapContainer>
    </div>
  );
}


