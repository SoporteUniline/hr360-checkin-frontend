// components/MapaSelector.jsx
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix para los iconos de marcador en React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function LocationMarker({ onLocationSelect, initialPosition }) {
  const [position, setPosition] = useState(initialPosition);

  const map = useMapEvents({
    click(e) {
      const newPosition = e.latlng;
      setPosition(newPosition);
      onLocationSelect({
        lat: newPosition.lat,
        lng: newPosition.lng,
        address: "", // Puedes agregar geocodificación inversa después
      });
    },
  });

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
      map.setView(initialPosition, map.getZoom());
    }
  }, [initialPosition, map]);

  return position ? <Marker position={position} /> : null;
}

export default function MapaSelector({ value, onChange, height = "400px" }) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const defaultCenter = value || { lat: 19.4326, lng: -99.1332 }; // CDMX como centro por defecto

  const handleLocationSelect = (location) => {
    onChange(location);
  };

  if (!mapReady) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <p>Cargando mapa...</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={13}
        style={{ height, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          onLocationSelect={handleLocationSelect}
          initialPosition={value ? [value.lat, value.lng] : null}
        />
      </MapContainer>
    </div>
  );
}
