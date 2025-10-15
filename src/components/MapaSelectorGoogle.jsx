import { useEffect, useRef, useState } from "react";

export default function MapaSelectorGoogle({
  onMapLoad,
  onClick,
  center = { lat: 19.4326, lng: -99.1332 },
  zoom = 13,
  height = "400px",
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null); // Solo un marcador
  const [mapLoaded, setMapLoaded] = useState(false);
  const [googleError, setGoogleError] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Cargando Google Maps..."
  );

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50;

    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
      } else {
        retryCount++;
        if (retryCount >= maxRetries) {
          setGoogleError(true);
          setLoadingMessage("Error: Google Maps no pudo cargarse");
          return;
        }
        setTimeout(checkGoogleMaps, 100);
      }
    };

    checkGoogleMaps();

    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
      if (mapInstanceRef.current) {
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Si cambia el center desde padre, mover el marcador
    if (mapInstanceRef.current && center && markerRef.current) {
      markerRef.current.setPosition(center);
      mapInstanceRef.current.panTo(center);
    }
  }, [center]);

  const initializeMap = () => {
    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      clickableIcons: false,
    });

    mapInstanceRef.current = map;

    // Crear marcador inicial
    if (center?.lat && center?.lng) {
      markerRef.current = new window.google.maps.Marker({
        position: center,
        map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });

      markerRef.current.addListener("dragend", (e) => {
        if (onClick) onClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    }

    // Click en mapa
    map.addListener("click", (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });

        markerRef.current.addListener("dragend", (e) => {
          if (onClick) onClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      } else {
        markerRef.current.setPosition({ lat, lng });
        map.panTo({ lat, lng });
      }

      if (onClick) onClick({ lat, lng });
    });

    setMapLoaded(true);
    if (onMapLoad) onMapLoad(map);
  };

  if (googleError) {
    return (
      <div
        className="border rounded-lg flex items-center justify-center bg-red-50"
        style={{ height }}
      >
        <div className="text-center p-4">
          <p className="text-red-600 font-semibold">
            ❌ Error cargando Google Maps
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 border px-2 py-1 rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden relative">
      <div
        ref={mapRef}
        style={{ height, width: "100%", cursor: "crosshair" }}
      />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">{loadingMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
