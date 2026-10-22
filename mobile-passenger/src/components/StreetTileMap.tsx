import React, { useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";

interface MarkerItem {
  lat: number;
  lng: number;
  type: "pickup" | "dropoff" | "rickshaw";
  title?: string;
}

interface StreetTileMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  markers?: MarkerItem[];
  pickup?: { lat: number; lng: number; title?: string } | null;
  dropoff?: { lat: number; lng: number; title?: string } | null;
  interactive?: boolean;
}

export const StreetTileMap: React.FC<StreetTileMapProps> = ({
  centerLat = 23.815,
  centerLng = 90.365,
  zoom = 15,
  markers = [],
  pickup,
  dropoff,
  interactive = true,
}) => {
  // Construct self-contained Leaflet HTML with CartoDB Voyager modern street tiles
  const htmlContent = useMemo(() => {
    const allMarkers: MarkerItem[] = [...markers];
    if (pickup) allMarkers.push({ ...pickup, type: "pickup" });
    if (dropoff) allMarkers.push({ ...dropoff, type: "dropoff" });

    // Mirpur Ward 7 Pilot Polygon Boundary
    const wardPolygon = [
      [23.805, 90.355],
      [23.825, 90.355],
      [23.825, 90.375],
      [23.805, 90.375],
    ];

    const markersJson = JSON.stringify(allMarkers);
    const polygonJson = JSON.stringify(wardPolygon);
    const hasRoute = pickup && dropoff;
    const routeJson = hasRoute
      ? JSON.stringify([
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
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
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #e5e7eb; }
    .leaflet-control-attribution { display: none !important; }
    .pickup-icon {
      background: #16a34a; width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: bold;
    }
    .dropoff-icon {
      background: #0f172a; width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: bold;
    }
    .rickshaw-icon {
      background: #0284c7; width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(2,132,199,0.4);
      display: flex; align-items: center; justify-content: center; font-size: 16px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      dragging: ${interactive},
      touchZoom: ${interactive},
      scrollWheelZoom: ${interactive}
    }).setView([${centerLat}, ${centerLng}], ${zoom});

    // Sleek, minimal CartoDB Voyager tiles (clean roads, no visual clutter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    // Draw Permitted Ward 7 boundary
    const polygon = L.polygon(${polygonJson}, {
      color: '#16a34a',
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#22c55e',
      fillOpacity: 0.06
    }).addTo(map);

    // Draw Route line if available
    const route = ${routeJson};
    if (route) {
      L.polyline(route, {
        color: '#0f172a',
        weight: 4,
        dashArray: '2, 8',
        opacity: 0.8
      }).addTo(map);
      map.fitBounds(L.latLngBounds(route), { padding: [60, 60] });
    }

    // Place Markers
    const markers = ${markersJson};
    markers.forEach(m => {
      let iconClass = 'pickup-icon';
      let html = '●';
      if (m.type === 'dropoff') {
        iconClass = 'dropoff-icon';
        html = '🏁';
      } else if (m.type === 'rickshaw') {
        iconClass = 'rickshaw-icon';
        html = '🛺';
      }

      const icon = L.divIcon({
        className: iconClass,
        html: html,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
    });
  </script>
</body>
</html>`;
  }, [centerLat, centerLng, zoom, markers, pickup, dropoff, interactive]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <iframe
          srcDoc={htmlContent}
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Map"
        />
      </View>
    );
  }

  // Fallback for native wrapper or web
  return (
    <View style={styles.container}>
      <iframe
        srcDoc={htmlContent}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Map"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#e2e8f0",
  },
});
