import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Default Leaflet marker icon (needed because bundlers don't auto-wire image paths)
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function DraggableMarker({ initialPosition, onChange }) {
  const [position, setPosition] = useState(initialPosition);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onChange(e.latlng);
    },
  });

  return (
    <Marker
      position={position}
      icon={defaultIcon}
      draggable
      eventHandlers={{
        dragend(e) {
          const latlng = e.target.getLatLng();
          setPosition(latlng);
          onChange(latlng);
        },
      }}
    />
  );
}

/**
 * Simple Leaflet map centered on the seller's store location.
 * Allows the seller to click/drag the marker to fine-tune pickup coordinates.
 */
export default function StoreLocationMap({ lat, lng, onChange }) {
  if (!lat || !lng) return null;

  const center = { lat, lng };

  return (
    <div className="mt-3 rounded-xl border border-[var(--line-amber)] overflow-hidden h-64">
      <MapContainer center={center} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker
          initialPosition={center}
          onChange={(latlng) => {
            if (onChange) onChange(latlng);
          }}
        />
      </MapContainer>
    </div>
  );
}
