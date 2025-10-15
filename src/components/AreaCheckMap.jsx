"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useSnackbar } from "notistack";

// Carga dinámica de Google Maps
const MapComponent = dynamic(() => import("./MapaSelectorGoogle"), {
  ssr: false,
});

export default function AreaCheckMap({ area, onChange }) {
  const { enqueueSnackbar } = useSnackbar();
  const [cargando, setCargando] = useState(false);
  const searchInputRef = useRef(null);

  // Al iniciar, intentar obtener ubicación del usuario si no hay coordenadas
  useEffect(() => {
    if (!area?.latitud || !area?.longitud) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            onChange({ ...area, latitud: latitude, longitud: longitude });
          },
          () => {
            // Si falla, usar coordenadas por defecto (CDMX)
            onChange({ ...area, latitud: 19.4326, longitud: -99.1332 });
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      } else {
        onChange({ ...area, latitud: 19.4326, longitud: -99.1332 });
      }
    }
  }, []);

  // Cuando se hace clic en el mapa
  const handleMapClick = (coords) => {
    onChange({ ...area, latitud: coords.lat, longitud: coords.lng });
  };

  // Botón para obtener ubicación actual
  const obtenerUbicacionActual = () => {
    if (!navigator.geolocation) {
      enqueueSnackbar("Tu navegador no soporta geolocalización", {
        variant: "error",
      });
      return;
    }

    setCargando(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onChange({ ...area, latitud: latitude, longitud: longitude });
        setCargando(false);
      },
      () => {
        setCargando(false);
        enqueueSnackbar("No se pudo obtener tu ubicación", {
          variant: "error",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Buscar una dirección manualmente
  const buscarDireccion = async () => {
    const direccion = searchInputRef.current.value.trim();
    if (!direccion) return;

    setCargando(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: direccion }, (results, status) => {
        setCargando(false);
        searchInputRef.current.value = ""; // Limpiar input
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;
          const coords = {
            latitud: location.lat(),
            longitud: location.lng(),
          };
          onChange({ ...area, ...coords });
        } else {
          enqueueSnackbar("No se encontró la dirección", {
            variant: "warning",
          });
        }
      });
    } catch (error) {
      setCargando(false);
      enqueueSnackbar("Error al buscar la dirección", { variant: "error" });
    }
  };

  // Enter para ejecutar búsqueda
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarDireccion();
    }
  };

  return (
    <div className="space-y-4">
      {/* Búsqueda y ubicación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="buscar-direccion">Buscar dirección</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="buscar-direccion"
              ref={searchInputRef}
              placeholder="Ej: Av. Reforma 123, CDMX"
              onKeyDown={handleKeyDown}
            />
            <Button
              variant="outline"
              onClick={buscarDireccion}
              disabled={cargando}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-end">
          <Button
            onClick={obtenerUbicacionActual}
            disabled={cargando}
            variant="outline"
            className="w-full"
          >
            <Navigation className="h-4 w-4 mr-2" />
            {cargando ? "Buscando..." : "Mi ubicación"}
          </Button>
        </div>
      </div>

      {/* Mapa */}
      <div className="border rounded-lg overflow-hidden relative">
        <MapComponent
          center={
            area?.latitud && area?.longitud
              ? { lat: Number(area.latitud), lng: Number(area.longitud) }
              : { lat: 19.4326, lng: -99.1332 }
          }
          zoom={area?.latitud && area?.longitud ? 17 : 12}
          height="400px"
          onClick={handleMapClick}
        />
      </div>

      {/* Información del punto */}
      {area?.latitud && area?.longitud && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Área seleccionada
          </h4>
          <p>Latitud: {area.latitud ? Number(area.latitud).toFixed(6) : "—"}</p>
          <p>
            Longitud: {area.longitud ? Number(area.longitud).toFixed(6) : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
