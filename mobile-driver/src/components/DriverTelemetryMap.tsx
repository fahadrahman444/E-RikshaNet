import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface DriverTelemetryMapProps {
  currentLat: number;
  currentLng: number;
  isInsideZone: boolean;
  isOnDuty: boolean;
  activeTripPickup?: { lat: number; lng: number; address: string } | null;
}

export const DriverTelemetryMap: React.FC<DriverTelemetryMapProps> = ({
  currentLat,
  currentLng,
  isInsideZone,
  isOnDuty,
  activeTripPickup,
}) => {
  // Normalize to Ward 7 bounding box (23.805 - 23.825 lat, 90.355 - 90.375 lng)
  const minLat = 23.805;
  const maxLat = 23.825;
  const minLng = 90.355;
  const maxLng = 90.375;

  const toX = (lng: number) => Math.max(5, Math.min(95, ((lng - minLng) / (maxLng - minLng)) * 100));
  const toY = (lat: number) => Math.max(5, Math.min(95, 100 - ((lat - minLat) / (maxLat - minLat)) * 100));

  const driverX = toX(currentLng);
  const driverY = toY(currentLat);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛰️ Telemetry & Ward Geofence</Text>
        <Text style={[styles.statusBadge, { color: isInsideZone ? "#16a34a" : "#dc2626" }]}>
          {isInsideZone ? "● Inside Permitted Ward" : "⚠️ OUTSIDE BOUNDARY"}
        </Text>
      </View>

      <View style={styles.canvas}>
        {/* Geofence Perimeter */}
        <View
          style={[
            styles.geofenceBox,
            { borderColor: isInsideZone ? "#86efac" : "#fca5a5" },
          ]}
        >
          <Text style={[styles.zoneLabel, { color: isInsideZone ? "#16a34a" : "#dc2626" }]}>
            AUTHORIZED ZONE: MIRPUR WARD 7
          </Text>
        </View>

        {/* Pickup Marker if Active Trip */}
        {activeTripPickup && (
          <View
            style={[
              styles.pickupMarker,
              { left: `${toX(activeTripPickup.lng)}%`, top: `${toY(activeTripPickup.lat)}%` },
            ]}
          >
            <View style={styles.pinCircle}>
              <Text style={{ fontSize: 12 }}>🟢</Text>
            </View>
            <Text style={styles.pickupLabel} numberOfLines={1}>
              Pickup: {activeTripPickup.address.split(" ")[0]}
            </Text>
          </View>
        )}

        {/* Driver Rickshaw Marker */}
        <View style={[styles.driverMarker, { left: `${driverX}%`, top: `${driverY}%` }]}>
          <View style={[styles.rickshawBubble, !isOnDuty && styles.offlineBubble]}>
            <Text style={styles.bubbleEmoji}>🛺</Text>
          </View>
          <Text style={styles.driverLabel}>You ({isOnDuty ? "Active" : "Offline"})</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.coords}>
          GPS: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
        </Text>
        <Text style={styles.speedText}>Nominal Speed: ~18 km/h</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#f8fafc",
  },
  title: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  statusBadge: { fontSize: 11, fontWeight: "700" },
  canvas: {
    height: 180,
    backgroundColor: "#f8fafc",
    position: "relative",
    overflow: "hidden",
  },
  geofenceBox: {
    position: "absolute",
    left: "10%",
    top: "10%",
    right: "10%",
    bottom: "10%",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "rgba(240, 253, 244, 0.4)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  zoneLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  driverMarker: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -18 }, { translateY: -18 }],
  },
  rickshawBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  offlineBubble: {
    backgroundColor: "#64748b",
  },
  bubbleEmoji: { fontSize: 16 },
  driverLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  pickupMarker: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  pinCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#16a34a",
  },
  pickupLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#166534",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 4,
    borderRadius: 3,
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  coords: { fontSize: 11, fontFamily: "monospace", color: "#64748b" },
  speedText: { fontSize: 11, color: "#475569", fontWeight: "500" },
});
