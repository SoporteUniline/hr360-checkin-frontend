// components/MapaSelectorGoogle.jsx
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Estilos personalizados para el mapa
const mapStyles = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

export default function MapaSelectorGoogle({
  value,
  onChange,
  height = "400px",
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [googleError, setGoogleError] = useState(false);
  const [geocoder, setGeocoder] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState(
    "Cargando Google Maps..."
  );

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50; // 5 segundos máximo

    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log("✅ Google Maps disponible, inicializando mapa...");
        initializeMap();
        setGeocoder(new window.google.maps.Geocoder());
      } else {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error(
            "❌ Google Maps no se pudo cargar después de varios intentos"
          );
          setGoogleError(true);
          setLoadingMessage("Error: Google Maps no pudo cargarse");
          return;
        }

        // Actualizar mensaje cada 5 intentos
        if (retryCount % 5 === 0) {
          setLoadingMessage(`Cargando Google Maps... (${retryCount / 10}s)`);
        }

        setTimeout(checkGoogleMaps, 100);
      }
    };

    checkGoogleMaps();

    return () => {
      // Cleanup
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (mapInstanceRef.current) {
        // Limpiar listeners del mapa
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && value && mapInstanceRef.current) {
      updateMarker(value);
    }
  }, [value, mapLoaded]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) {
      console.error("Google Maps no disponible para inicializar");
      setGoogleError(true);
      return;
    }

    try {
      const defaultCenter = value
        ? { lat: value.lat, lng: value.lng }
        : { lat: 19.4326, lng: -99.1332 }; // CDMX por defecto

      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: value ? 15 : 13,
        // styles: mapStyles,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        clickableIcons: false,
      });

      mapInstanceRef.current = map;

      // Agregar marcador inicial si hay valor
      if (value) {
        updateMarker(value, map);
      }

      // Listener para clicks en el mapa
      map.addListener("click", (event) => {
        handleMapClick(event.latLng);
      });

      console.log("✅ Mapa de Google inicializado correctamente");
      setMapLoaded(true);
    } catch (error) {
      console.error("❌ Error inicializando mapa:", error);
      setGoogleError(true);
    }
  };

  const handleMapClick = (latLng) => {
    const location = {
      lat: latLng.lat(),
      lng: latLng.lng(),
      address: "",
      timestamp: new Date().toISOString(),
    };

    updateMarker(location, mapInstanceRef.current);
    onChange(location);

    // Geocodificación inversa para obtener dirección
    reverseGeocode(location.lat, location.lng);
  };

  const updateMarker = (location, map = mapInstanceRef.current) => {
    if (!map) return;

    // Remover marcador anterior
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Crear nuevo marcador
    markerRef.current = new window.google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      title: "Ubicación seleccionada",
    });

    // Listener para arrastrar marcador
    markerRef.current.addListener("dragend", (event) => {
      const newLocation = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
        address: "",
        timestamp: new Date().toISOString(),
      };

      onChange(newLocation);
      reverseGeocode(newLocation.lat, newLocation.lng);
    });

    // Centrar y hacer zoom en la nueva ubicación
    map.setCenter({ lat: location.lat, lng: location.lng });
    map.setZoom(15);
  };

  const reverseGeocode = async (lat, lng) => {
    if (!window.google || !window.google.maps) return;

    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({
        location: { lat, lng },
      });

      if (response.results[0]) {
        const address = response.results[0].formatted_address;
        onChange({
          lat,
          lng,
          address,
          formattedAddress: address,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.log("Error en geocodificación:", error);
    }
  };

  if (googleError) {
    return (
      <div
        className="border rounded-lg overflow-hidden flex items-center justify-center bg-red-50"
        style={{ height }}
      >
        <div className="text-center p-4">
          <p className="text-red-600 font-semibold">
            ❌ Error cargando Google Maps
          </p>
          <p className="text-sm text-red-500 mt-2">
            Verifica que tu API Key sea válida y esté correctamente configurada
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-2"
            variant="outline"
            size="sm"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div ref={mapRef} style={{ height }} className="w-full" />
      {!mapLoaded && (
        <div
          className="flex items-center justify-center bg-gray-100"
          style={{ height }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">{loadingMessage}</p>
            <p className="text-xs text-gray-400 mt-1">
              Si tarda mucho, verifica tu conexión a internet
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
