// tabs/TabGPS.jsx
import dynamic from "next/dynamic";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Carga dinámica del mapa de Google
const MapaSelectorGoogle = dynamic(
  () => import("@/components/MapaSelectorGoogle"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        Cargando Google Maps...
      </div>
    ),
  }
);

export default function TabGPS({ form, soloLectura }) {
  const usarGPS = form.watch("solicitar_gps") === "Sí";
  const [cargandoGPS, setCargandoGPS] = useState(false);
  const [errorGPS, setErrorGPS] = useState(null);

  const obtenerUbicacionActual = async (tipo = "checkin") => {
    if (!navigator.geolocation) {
      setErrorGPS("Tu navegador no soporta geolocalización");
      return;
    }

    setCargandoGPS(true);
    setErrorGPS(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, // ✅ GPS en lugar de WiFi
          timeout: 15000, // 15 segundos
          maximumAge: 0, // No usar cache
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      const nuevaUbicacion = {
        lat: latitude,
        lng: longitude,
        accuracy: accuracy,
        timestamp: new Date().toISOString(),
        address: `Ubicación ${tipo} - ${new Date().toLocaleString()}`,
      };

      if (tipo === "checkin") {
        form.setValue("lugar_checkin", nuevaUbicacion);
      } else {
        form.setValue("lugar_checkout", nuevaUbicacion);
      }

      // 🔍 Geocodificación inversa con Google
      await obtenerDireccionGoogle(latitude, longitude, tipo);
    } catch (error) {
      console.error("Error GPS:", error);
      let mensaje = "No se pudo obtener la ubicación";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          mensaje =
            "❌ Permiso de ubicación denegado. Por favor habilita la ubicación en tu navegador.";
          break;
        case error.POSITION_UNAVAILABLE:
          mensaje =
            "📡 No se puede acceder al GPS. Verifica tu conexión o sal a un área abierta.";
          break;
        case error.TIMEOUT:
          mensaje = "⏰ Tiempo de espera agotado. Intenta nuevamente.";
          break;
      }
      setErrorGPS(mensaje);
    } finally {
      setCargandoGPS(false);
    }
  };

  // 🔍 Función para obtener dirección con Google Geocoding
  const obtenerDireccionGoogle = async (lat, lng, tipo) => {
    try {
      // Usamos la API de geocodificación de Google directamente desde el cliente
      const geocoder = new window.google.maps.Geocoder();

      const response = await geocoder.geocode({
        location: { lat, lng },
      });

      if (response.results[0]) {
        const address = response.results[0].formatted_address;
        const campo = tipo === "checkin" ? "lugar_checkin" : "lugar_checkout";
        const valorActual = form.getValues(campo);

        form.setValue(campo, {
          ...valorActual,
          address: address,
          formattedAddress: address,
          city:
            response.results[0].address_components.find((comp) =>
              comp.types.includes("locality")
            )?.long_name || "",
        });
      }
    } catch (error) {
      console.log("No se pudo obtener la dirección con Google:", error);
    }
  };

  const solucionarProblemasGPS = () => {
    const soluciones = [
      "✅ Habilita la ubicación en tu dispositivo",
      "✅ Conéctate a internet (WiFi ayuda)",
      "✅ Sal a un área abierta con cielo visible",
      "✅ Espera 30 segundos para que el GPS se estabilice",
      "✅ Recarga la página y vuelve a intentar",
      "✅ Usa Chrome o Firefox (mejor compatibilidad)",
    ];

    setErrorGPS(
      <div className="text-left">
        <p className="font-semibold mb-2">Soluciones para mejorar el GPS:</p>
        <ul className="list-disc list-inside space-y-1">
          {soluciones.map((sol, idx) => (
            <li key={idx} className="text-sm">
              {sol}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Función para buscar dirección manualmente
  // Función para buscar dirección manualmente
  const buscarDireccion = async (query, tipo) => {
    // Validación fuerte antes de continuar
    if (!query || typeof query !== "string" || !query.trim()) {
      setErrorGPS("Por favor escribe una dirección válida antes de buscar.");
      return;
    }

    // Limpieza del texto
    const textoLimpio = query.trim();
    setErrorGPS(null);
    setCargandoGPS(true);

    try {
      if (!window.google || !window.google.maps) {
        throw new Error("Google Maps no está disponible todavía");
      }

      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ address: textoLimpio });

      if (!response.results || response.results.length === 0) {
        setErrorGPS("No se encontraron resultados para esa dirección.");
        return;
      }

      const location = response.results[0].geometry.location;
      const address = response.results[0].formatted_address;

      const nuevaUbicacion = {
        lat: location.lat(),
        lng: location.lng(),
        address,
        formattedAddress: address,
        timestamp: new Date().toISOString(),
      };

      const campo = tipo === "checkin" ? "lugar_checkin" : "lugar_checkout";
      form.setValue(campo, nuevaUbicacion);
    } catch (error) {
      console.error("Error en búsqueda de dirección:", error);
      setErrorGPS("❌ No se pudo encontrar la dirección. Intenta con otra.");
    } finally {
      setCargandoGPS(false);
    }
  };

  return (
    <section className="space-y-6 px-4 py-2">
      <FormField
        name="solicitar_gps"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>¿Solicitar GPS para reloj checador?</FormLabel>
            <FormControl>
              <select
                {...field}
                disabled={soloLectura}
                className="border rounded p-2 w-full"
              >
                <option value="">Selecciona</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {usarGPS && (
        <div className="space-y-6">
          {/* Indicador de carga y errores */}
          {cargandoGPS && (
            <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-blue-700">Buscando tu ubicación...</span>
            </div>
          )}

          {errorGPS && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-red-800">{errorGPS}</p>
                </div>
                <Button
                  type="button"
                  onClick={solucionarProblemasGPS}
                  variant="outline"
                  size="sm"
                  className="ml-2"
                >
                  💡 Soluciones
                </Button>
              </div>
            </div>
          )}

          {/* Búsqueda de direcciones */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormLabel>Buscar dirección Check-In</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Ej: Av. Reforma 123, CDMX"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      buscarDireccion(e.target.value, "checkin");
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector(
                      'input[placeholder*="Check-In"]'
                    );
                    buscarDireccion(input?.value, "checkin");
                  }}
                  variant="outline"
                >
                  🔍 Buscar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <FormLabel>Buscar dirección Check-Out</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Ej: Av. Insurgentes 456, CDMX"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      buscarDireccion(e.target.value, "checkout");
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector(
                      'input[placeholder*="Check-Out"]'
                    );
                    buscarDireccion(input?.value, "checkout");
                  }}
                  variant="outline"
                >
                  🔍 Buscar
                </Button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Check-In */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel>Lugar Check-In</FormLabel>
                <Button
                  type="button"
                  onClick={() => obtenerUbicacionActual("checkin")}
                  variant="outline"
                  size="sm"
                  disabled={cargandoGPS}
                >
                  {cargandoGPS ? "Buscando..." : "📍 Usar mi ubicación"}
                </Button>
              </div>

              <FormField
                name="lugar_checkin"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <MapaSelectorGoogle
                      value={field.value}
                      onChange={field.onChange}
                      height="300px"
                    />
                    {field.value && (
                      <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                        <p>
                          <strong>Coordenadas:</strong>
                        </p>
                        <p>Lat: {field.value.lat?.toFixed(6)}</p>
                        <p>Lng: {field.value.lng?.toFixed(6)}</p>
                        {field.value.accuracy && (
                          <p>
                            Precisión: ±{Math.round(field.value.accuracy)}{" "}
                            metros
                          </p>
                        )}
                        {field.value.address && (
                          <p className="mt-1">
                            <strong>Dirección:</strong> {field.value.address}
                          </p>
                        )}
                        {field.value.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            Obtenido:{" "}
                            {new Date(field.value.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Check-Out */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel>Lugar Check-Out</FormLabel>
                <Button
                  type="button"
                  onClick={() => obtenerUbicacionActual("checkout")}
                  variant="outline"
                  size="sm"
                  disabled={cargandoGPS}
                >
                  {cargandoGPS ? "Buscando..." : "📍 Usar mi ubicación"}
                </Button>
              </div>

              <FormField
                name="lugar_checkout"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <MapaSelectorGoogle
                      value={field.value}
                      onChange={field.onChange}
                      height="300px"
                    />
                    {field.value && (
                      <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                        <p>
                          <strong>Coordenadas:</strong>
                        </p>
                        <p>Lat: {field.value.lat?.toFixed(6)}</p>
                        <p>Lng: {field.value.lng?.toFixed(6)}</p>
                        {field.value.accuracy && (
                          <p>
                            Precisión: ±{Math.round(field.value.accuracy)}{" "}
                            metros
                          </p>
                        )}
                        {field.value.address && (
                          <p className="mt-1">
                            <strong>Dirección:</strong> {field.value.address}
                          </p>
                        )}
                        {field.value.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            Obtenido:{" "}
                            {new Date(field.value.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">
              💡 Instrucciones para usar Google Maps
            </h4>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>
                <strong>Haz clic directamente en el mapa</strong> para
                seleccionar una ubicación precisa
              </li>
              <li>
                <strong>Arrastra el marcador</strong> para ajustar la posición
                manualmente
              </li>
              <li>
                Usa la <strong>búsqueda de direcciones</strong> para encontrar
                lugares específicos
              </li>
              <li>
                El botón <strong>"Usar mi ubicación"</strong> activa el GPS de
                tu dispositivo
              </li>
              <li>
                Para mayor precisión, <strong>conéctate a WiFi</strong> y sal a
                un área abierta
              </li>
            </ul>
          </div>

          {/* Información de Google Maps */}
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <span>✅</span>
              <span>
                <strong>Google Maps activado</strong> - Usando la API de Google
                Maps Platform
              </span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
