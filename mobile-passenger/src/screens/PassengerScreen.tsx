import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { passengerApi, getPassengerSocket } from "../api/client";
import { StreetTileMap } from "../components/StreetTileMap";

interface PassengerScreenProps {
  onLogout: () => void;
}

export const PassengerScreen: React.FC<PassengerScreenProps> = ({ onLogout }) => {
  const [zones, setZones] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<any>(null);

  // Prominent Ward 7 transit hubs
  const locations = [
    { name: "Mirpur-10", fullName: "Mirpur-10 Roundabout", lat: 23.807, lng: 90.368 },
    { name: "Mirpur-11", fullName: "Mirpur-11 Bus Stand", lat: 23.818, lng: 90.365 },
    { name: "Sec-7 Center", fullName: "Section 7 Community Center", lat: 23.815, lng: 90.360 },
    { name: "Pallabi Mkt", fullName: "Pallabi Extension Market", lat: 23.822, lng: 90.363 },
  ];

  const [pickupIdx, setPickupIdx] = useState(0);
  const [dropoffIdx, setDropoffIdx] = useState(1);
  const [estimatedFare, setEstimatedFare] = useState<number>(40);
  const [distanceKm, setDistanceKm] = useState<number>(2.1);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const socketRef = useRef(getPassengerSocket());

  const loadData = async () => {
    try {
      const zRes = await passengerApi.getZones();
      setZones(zRes.zones || []);
      if (zRes.zones?.[0]) setSelectedZone(zRes.zones[0]);

      const myTrips = await passengerApi.getMyTrips();
      const current = (myTrips.trips || []).find(
        (t: any) =>
          t.status === "REQUESTED" ||
          t.status === "ACCEPTED" ||
          t.status === "ARRIVING" ||
          t.status === "IN_PROGRESS"
      );
      setActiveTrip(current || null);
    } catch (e: any) {
      console.warn("Passenger data error:", e.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fare estimation recalculation
  useEffect(() => {
    const updateEstimate = async () => {
      const p = locations[pickupIdx];
      const d = locations[dropoffIdx];
      if (p && d && pickupIdx !== dropoffIdx) {
        try {
          const res = await passengerApi.estimateFare(p.lat, p.lng, d.lat, d.lng);
          setEstimatedFare(res.estimatedFare);
          setDistanceKm(res.distanceKm);
        } catch (e) {}
      }
    };
    updateEstimate();
  }, [pickupIdx, dropoffIdx]);

  // Real-Time Socket updates
  useEffect(() => {
    const socket = socketRef.current;

    (async () => {
      try {
        const me = await passengerApi.getMe();
        if (me?.user?.id) socket.emit("join:passenger", me.user.id);
      } catch (e) {}
    })();

    if (activeTrip?.id) socket.emit("join:trip", activeTrip.id);

    const handleAccepted = (trip: any) => setActiveTrip(trip);
    const handleStatusChange = (trip: any) => {
      setActiveTrip(trip);
      if (trip.status === "COMPLETED") {
        setActiveTrip(null);
        loadData();
      }
    };

    socket.on("trip:accepted", handleAccepted);
    socket.on("trip:status_change", handleStatusChange);

    return () => {
      socket.off("trip:accepted", handleAccepted);
      socket.off("trip:status_change", handleStatusChange);
    };
  }, [activeTrip?.id]);

  const handleBookRide = async () => {
    if (!selectedZone || requesting) return;
    const p = locations[pickupIdx];
    const d = locations[dropoffIdx];

    try {
      setRequesting(true);
      const res = await passengerApi.requestTrip({
        zoneId: selectedZone.id,
        pickupLat: p.lat,
        pickupLng: p.lng,
        pickupAddress: p.fullName,
        dropoffLat: d.lat,
        dropoffLng: d.lng,
        dropoffAddress: d.fullName,
      });
      setActiveTrip(res.trip);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to book ride");
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip || cancelling) return;
    try {
      setCancelling(true);
      await passengerApi.updateTripStatus(activeTrip.id, "CANCELLED");
      setActiveTrip(null);
      await loadData();
    } catch (e: any) {
      alert("Could not cancel trip");
    } finally {
      setCancelling(false);
    }
  };

  const pickupLoc = locations[pickupIdx];
  const dropoffLoc = locations[dropoffIdx];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Full-Screen Real Street Map */}
      <StreetTileMap
        centerLat={23.815}
        centerLng={23.815}
        pickup={
          activeTrip
            ? { lat: activeTrip.pickupLat, lng: activeTrip.pickupLng }
            : { lat: pickupLoc.lat, lng: pickupLoc.lng }
        }
        dropoff={
          activeTrip
            ? { lat: activeTrip.dropoffLat, lng: activeTrip.dropoffLng }
            : { lat: dropoffLoc.lat, lng: dropoffLoc.lng }
        }
        markers={[
          { lat: 23.812, lng: 90.364, type: "rickshaw" },
          { lat: 23.820, lng: 90.368, type: "rickshaw" },
        ]}
      />

      {/* Floating Minimalist Top Bar */}
      <SafeAreaView style={styles.topSafeArea}>
        <View style={styles.topBar}>
          <View style={styles.brandPill}>
            <Text style={styles.brandDot}>●</Text>
            <Text style={styles.brandName}>E-Riksha</Text>
            <Text style={styles.zoneTag}>Mirpur 7</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={onLogout}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Floating Bottom Card */}
      <View style={styles.bottomCard}>
        {/* State A: Ongoing Ride Assigned or Searching */}
        {activeTrip ? (
          <View>
            <View style={styles.tripHeader}>
              <View>
                <Text style={styles.tripStatusText}>
                  {activeTrip.status === "REQUESTED"
                    ? "Searching nearby drivers..."
                    : activeTrip.status === "ACCEPTED"
                    ? "Driver on the way"
                    : activeTrip.status === "ARRIVING"
                    ? "Driver arrived at pickup"
                    : "Trip in progress"}
                </Text>
                <Text style={styles.tripRouteText}>
                  {activeTrip.pickupAddress.split(" ")[0]} ➔ {activeTrip.dropoffAddress.split(" ")[0]}
                </Text>
              </View>
              <View style={styles.fareTag}>
                <Text style={styles.fareTagText}>৳{activeTrip.estimatedFare}</Text>
              </View>
            </View>

            {/* Assigned Driver details */}
            {activeTrip.driver ? (
              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <Text style={{ fontSize: 20 }}>🛺</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{activeTrip.driver.user?.name}</Text>
                  <Text style={styles.vehicleNumber}>
                    {activeTrip.vehicle?.registrationNumber || "DHAKA-EA-1042"}
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>★ 4.9</Text>
                </View>
              </View>
            ) : (
              <View style={styles.searchingRow}>
                <ActivityIndicator color="#0f172a" size="small" />
                <Text style={styles.searchingText}>Matching with permitted Mirpur Ward 7 rickshaw...</Text>
              </View>
            )}

            {activeTrip.status === "REQUESTED" && (
              <TouchableOpacity
                style={styles.cancelButton}
                disabled={cancelling}
                onPress={handleCancelTrip}
              >
                <Text style={styles.cancelButtonText}>
                  {cancelling ? "Cancelling..." : "Cancel Request"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* State B: Route Selection & Booking */
          <View>
            {/* Quick Destination Chips */}
            <Text style={styles.sectionLabel}>Where to in Mirpur 7?</Text>

            <View style={styles.chipsRow}>
              {locations.map((loc, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setDropoffIdx(idx)}
                  style={[styles.chip, dropoffIdx === idx && styles.activeDropChip]}
                >
                  <Text
                    style={[styles.chipText, dropoffIdx === idx && styles.activeChipText]}
                  >
                    {loc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pickup selector row */}
            <View style={styles.pickupRow}>
              <Text style={styles.pickupLabel}>Pickup:</Text>
              <View style={styles.pickupChips}>
                {locations.map((loc, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setPickupIdx(idx)}
                    style={[styles.smallChip, pickupIdx === idx && styles.activePickChip]}
                  >
                    <Text
                      style={[
                        styles.smallChipText,
                        pickupIdx === idx && styles.activePickText,
                      ]}
                    >
                      {loc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bottom Booking Action */}
            <View style={styles.fareSummaryRow}>
              <View>
                <Text style={styles.fareAmount}>৳{estimatedFare}</Text>
                <Text style={styles.fareDetail}>
                  {distanceKm} km • Standard Ward Fare
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.requestBtn,
                  (requesting || pickupIdx === dropoffIdx) && styles.disabledBtn,
                ]}
                disabled={requesting || pickupIdx === dropoffIdx}
                onPress={handleBookRide}
              >
                {requesting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.requestBtnText}>Request E-Riksha</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  topSafeArea: { position: "absolute", top: 12, left: 16, right: 16, zIndex: 10 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    gap: 6,
  },
  brandDot: { color: "#16a34a", fontSize: 10 },
  brandName: { fontWeight: "900", fontSize: 15, color: "#0f172a", letterSpacing: -0.3 },
  zoneTag: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  profileBtn: {
    backgroundColor: "#ffffff",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  profileIcon: { fontSize: 16 },
  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    zIndex: 10,
  },
  sectionLabel: { fontSize: 14, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeDropChip: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  activeChipText: { color: "#ffffff", fontWeight: "700" },
  pickupRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pickupLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8", marginRight: 8 },
  pickupChips: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  smallChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  activePickChip: { backgroundColor: "#dcfce7" },
  smallChipText: { fontSize: 11, color: "#64748b", fontWeight: "500" },
  activePickText: { color: "#166534", fontWeight: "700" },
  fareSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareAmount: { fontSize: 22, fontWeight: "900", color: "#0f172a", letterSpacing: -0.5 },
  fareDetail: { fontSize: 12, color: "#64748b", marginTop: 1 },
  requestBtn: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 160,
  },
  disabledBtn: { opacity: 0.5 },
  requestBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  tripStatusText: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  tripRouteText: { fontSize: 12, color: "#64748b", marginTop: 2 },
  fareTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fareTagText: { fontSize: 15, fontWeight: "900", color: "#0f172a" },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 14,
  },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  driverName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  vehicleNumber: { fontSize: 11, color: "#16a34a", fontWeight: "700", marginTop: 1 },
  ratingBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: { fontSize: 11, fontWeight: "800", color: "#92400e" },
  searchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  searchingText: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  cancelButton: {
    backgroundColor: "#fee2e2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: { color: "#b91c1c", fontSize: 13, fontWeight: "700" },
});
