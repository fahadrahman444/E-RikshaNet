import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface LocationPoint {
  name: string;
  lat: number;
  lng: number;
}

interface WardRouteMapProps {
  zoneName: string;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  distanceKm: number | null;
}

export const WardRouteMap: React.FC<WardRouteMapProps> = ({
  zoneName,
  pickup,
  dropoff,
  distanceKm,
}) => {
  // Map boundary dimensions (Mirpur Ward 7 pilot box: Lat ~23.805 - 23.825, Lng ~90.355 - 90.375)
  const minLat = 23.805;
  const maxLat = 23.825;
  const minLng = 90.355;
  const maxLng = 90.375;

  // Normalize lat/lng to percentage coordinates (0% to 100%)
  const toX = (lng: number) => Math.max(10, Math.min(90, ((lng - minLng) / (maxLng - minLng)) * 100));
  const toY = (lat: number) => Math.max(10, Math.min(90, 100 - ((lat - minLat) / (maxLat - minLat)) * 100));

  const pX = toX(pickup.lng);
  const pY = toY(pickup.lat);
  const dX = toX(dropoff.lng);
  const dY = toY(dropoff.lat);

  return (
    <View style={styles.mapContainer}>
      {/* Map Header Overlay */}
      <View style={styles.headerBadge}>
        <Text style={styles.zoneText}>📍 Operating Zone: <Text style={styles.bold}>{zoneName}</Text></Text>
        <Text style={styles.complianceTag}>🛡️ Regulated Ward Boundary</Text>
      </View>

      {/* Grid Canvas */}
      <View style={styles.canvas}>
        {/* Ward Boundary Polygon Representation */}
        <View style={styles.wardBoundary}>
          <Text style={styles.boundaryLabel}>MIRPUR WARD 7 GEOFENCE</Text>
        </View>

        {/* Route Line Indicator */}
        <View
          style={[
            styles.routeConnector,
            {
              left: `${Math.min(pX, dX)}%`,
              top: `${Math.min(pY, dY)}%`,
              width: `${Math.max(8, Math.abs(dX - pX))}%`,
              height: `${Math.max(8, Math.abs(dY - pY))}%`,
            },
          ]}
        />

        {/* Pickup Pin */}
        <View style={[styles.pinWrapper, { left: `${pX}%`, top: `${pY}%` }]}>
          <View style={styles.pickupPin}>
            <Text style={styles.pinIcon}>🟢</Text>
          </View>
          <Text style={styles.pinLabel} numberOfLines={1}>{pickup.name.split(" ")[0]}</Text>
        </View>

        {/* Dropoff Pin */}
        <View style={[styles.pinWrapper, { left: `${dX}%`, top: `${dY}%` }]}>
          <View style={styles.dropoffPin}>
            <Text style={styles.pinIcon}>🏁</Text>
          </View>
          <Text style={styles.pinLabel} numberOfLines={1}>{dropoff.name.split(" ")[0]}</Text>
        </View>

        {/* Rickshaw Patrol Markers */}
        <View style={[styles.rickshawMarker, { left: "30%", top: "45%" }]}>
          <Text style={styles.rickshawEmoji}>🛺</Text>
        </View>
        <View style={[styles.rickshawMarker, { left: "68%", top: "35%" }]}>
          <Text style={styles.rickshawEmoji}>🛺</Text>
        </View>
      </View>

      {/* Route Distance Footer */}
      <View style={styles.mapFooter}>
        <Text style={styles.footerText}>
          Estimated Route: <Text style={styles.bold}>{distanceKm ? `${distanceKm} km` : "Calculating..."}</Text>
        </Text>
        <Text style={styles.liveFleetText}>2 active rickshaws in ward</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginVertical: 12,
  },
  headerBadge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  zoneText: { fontSize: 12, color: "#334155" },
  bold: { fontWeight: "700", color: "#0f172a" },
  complianceTag: { fontSize: 11, color: "#16a34a", fontWeight: "600" },
  canvas: {
    height: 190,
    backgroundColor: "#f1f5f9",
    position: "relative",
    overflow: "hidden",
  },
  wardBoundary: {
    position: "absolute",
    left: "6%",
    top: "6%",
    right: "6%",
    bottom: "6%",
    borderWidth: 2,
    borderColor: "#86efac",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "rgba(240, 253, 244, 0.4)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  boundaryLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#16a34a",
    letterSpacing: 1,
  },
  routeConnector: {
    position: "absolute",
    borderColor: "#0284c7",
    borderWidth: 2,
    borderStyle: "dotted",
    borderRadius: 4,
    backgroundColor: "rgba(186, 230, 253, 0.2)",
  },
  pinWrapper: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -18 }, { translateY: -18 }],
  },
  pickupPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: "#16a34a",
  },
  dropoffPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: "#dc2626",
  },
  pinIcon: { fontSize: 13 },
  pinLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  rickshawMarker: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rickshawEmoji: { fontSize: 13 },
  mapFooter: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerText: { fontSize: 11, color: "#475569" },
  liveFleetText: { fontSize: 11, color: "#64748b", fontStyle: "italic" },
});
