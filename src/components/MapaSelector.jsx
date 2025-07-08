// components/MapaSelector.js
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

export default function MapaSelector({ value, onChange }) {
  const icon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });

    useEffect(() => {
      if (value?.lat && value?.lng) {
        map.setView([value.lat, value.lng], 13);
      }
    }, [value]);

    return value ? (
      <Marker position={[value.lat, value.lng]} icon={icon} />
    ) : null;
  }

  return (
    <MapContainer
      center={
        value?.lat && value?.lng ? [value.lat, value.lng] : [20.4, -103.7]
      }
      zoom={13}
      style={{ height: "300px", width: "100%" }}
      key={value?.lat && value?.lng ? `${value.lat}-${value.lng}` : "default"}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker />
    </MapContainer>
  );
}
