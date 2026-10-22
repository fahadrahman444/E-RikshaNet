import React, { useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";

interface StreetTileMapProps {
  driverLat: number;
  driverLng: number;
  zoom?: number;
  pickup?: { lat: number; lng: number; title?: string } | null;
  dropoff?: { lat: number; lng: number; title?: string } | null;
  isInsideZone?: boolean;
}

export const StreetTileMap: React.FC<StreetTileMapProps> = ({
  driverLat,
  driverLng,
  zoom = 16,
  pickup,
  dropoff,
  isInsideZone = true,
}) => {
  const htmlContent = useMemo(() => {
    // Ward 7 boundary
    const wardPolygon = [
      [23.805, 90.355],
      [23.825, 90.355],
      [23.825, 90.375],
      [23.805, 90.375],
    ];

    const hasTrip = !!pickup;
    const routeJson = pickup
      ? JSON.stringify([
          [driverLat, driverLng],
          [pickup.lat, pickup.lng],
        ])
      : "null";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #0f172a; }
    .leaflet-control-attribution { display: none !important; }
    .driver-pulse {
      background: #16a34a; width: 34px; height: 34px; border-radius: 50%;
      border: 3px solid #ffffff; box-shadow: 0 0 15px rgba(22,163,74,0.6);
      display: flex; align-items: center; justify-content: center; font-size: 16px;
    }
    .pickup-marker {
      background: #0284c7; width: 30px; height: 30px; border-radius: 50%;
      border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center; font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${driverLat}, ${driverLng}], ${zoom});

    // High-contrast clean navigation map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    // Ward boundary
    L.polygon(${JSON.stringify(wardPolygon)}, {
      color: '${isInsideZone ? "#16a34a" : "#ef4444"}',
      weight: 2,
      dashArray: '5, 5',
      fillColor: '${isInsideZone ? "#22c55e" : "#ef4444"}',
      fillOpacity: 0.05
    }).addTo(map);

    // Driver Marker
    const driverIcon = L.divIcon({
      className: 'driver-pulse',
      html: '🛺',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    L.marker([${driverLat}, ${driverLng}], { icon: driverIcon }).addTo(map);

    // Active Pickup Target
    ${
      pickup
        ? `
      const pickupIcon = L.divIcon({
        className: 'pickup-marker',
        html: '📍',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      L.marker([${pickup.lat}, ${pickup.lng}], { icon: pickupIcon }).addTo(map);

      const route = ${routeJson};
      if (route) {
        L.polyline(route, { color: '#0284c7', weight: 4, opacity: 0.8 }).addTo(map);
        map.fitBounds(L.latLngBounds(route), { padding: [80, 80] });
      }
    `
        : ""
    }
  </script>
</body>
</html>`;
  }, [driverLat, driverLng, zoom, pickup, dropoff, isInsideZone]);

  return (
    <View style={styles.container}>
      <iframe
        srcDoc={htmlContent}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Driver Navigation Map"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f172a",
  },
});
