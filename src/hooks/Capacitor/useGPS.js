import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export function useGPS() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Native permissions are requested on demand by getCurrentLocation.

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      if (Capacitor.isNativePlatform()) {
        let perm = await Geolocation.checkPermissions();

        if (perm.location !== "granted") {
          perm = await Geolocation.requestPermissions();

          if (perm.location === "denied") {
            setError("Activa permisos de ubicación en Configuración.");
            return null;
          }
        }

        const { coords } = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });

        return {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          timestamp: new Date().toISOString(),
        };
      }

      // 🌐 WEB
      if (navigator.geolocation) {
        return await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: new Date().toISOString(),
              });
            },
            reject,
            { enableHighAccuracy: true, timeout: 15000 }
          );
        });
      }

      throw new Error("Este navegador no soporta geolocalización");
    } catch (err) {
      console.error("GPS Error:", err);
      setError("No se pudo obtener la ubicación");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    getCurrentLocation,
    loading,
    error,
  };
}
