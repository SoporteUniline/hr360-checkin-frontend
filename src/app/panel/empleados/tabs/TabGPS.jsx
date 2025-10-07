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

// Carga dinámica del mapa (importante para Next.js)
const MapaSelector = dynamic(() => import("@/components/MapaSelector"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      Cargando mapa...
    </div>
  ),
});

// tabs/TabGPS.jsx - Versión mejorada
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

      // 🔍 Opcional: Geocodificación inversa para obtener dirección
      // await obtenerDireccion(latitude, longitude, tipo);
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

  // 🔍 Función opcional para obtener dirección (geocodificación inversa)
  const obtenerDireccion = async (lat, lng, tipo) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();

      if (data.display_name) {
        const campo = tipo === "checkin" ? "lugar_checkin" : "lugar_checkout";
        const valorActual = form.getValues(campo);
        form.setValue(campo, {
          ...valorActual,
          address: data.display_name,
          city: data.address?.city || data.address?.town,
        });
      }
    } catch (error) {
      console.log("No se pudo obtener la dirección:", error);
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
                    <MapaSelector
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
                    <MapaSelector
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
              💡 ¿El GPS no es preciso?
            </h4>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>
                <strong>Haz clic directamente en el mapa</strong> para una
                selección manual precisa
              </li>
              <li>
                Asegúrate de tener <strong>ubicación habilitada</strong> en tu
                navegador
              </li>
              <li>
                Para mayor precisión, <strong>conéctate a WiFi</strong> y sal a
                un área abierta
              </li>
              <li>
                Puedes ajustar manualmente arrastrando el marcador en el mapa
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
