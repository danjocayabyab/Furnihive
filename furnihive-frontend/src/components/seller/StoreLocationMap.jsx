import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Default Leaflet marker icon (blue) for primary location
const primaryIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Secondary marker icon (red) for the second location (e.g. dropoff)
const secondaryIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
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
      icon={primaryIcon}
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
 * Simple Leaflet map centered on a primary location.
 * If onChange is provided, the primary marker is draggable (seller store editor).
 * Otherwise, it renders static marker(s), optionally with a secondary marker
 * when secondaryLat/secondaryLng are provided (e.g. store + dropoff).
 */
export default function StoreLocationMap({ lat, lng, onChange, secondaryLat, secondaryLng }) {
  if (!lat || !lng) return null;

  const center = { lat, lng };

  return (
    <div className="mt-3 rounded-xl border border-[var(--line-amber)] overflow-hidden h-64">
      <MapContainer center={center} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onChange ? (
          <DraggableMarker
            initialPosition={center}
            onChange={(latlng) => {
              if (onChange) onChange(latlng);
            }}
          />
        ) : (
          <Marker position={center} icon={primaryIcon} />
        )}
        {secondaryLat && secondaryLng && (
          <Marker position={{ lat: secondaryLat, lng: secondaryLng }} icon={secondaryIcon} />
        )}
      </MapContainer>
    </div>
  );
}
