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
import * as Location from "expo-location";
import { driverApi, getDriverSocket } from "../api/client";
import { StreetTileMap } from "../components/StreetTileMap";

interface DriverScreenProps {
  onLogout: () => void;
}

export const DriverScreen: React.FC<DriverScreenProps> = ({ onLogout }) => {
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [incomingOffer, setIncomingOffer] = useState<any | null>(null);

  // Live GPS Coordinates
  const [currentLat, setCurrentLat] = useState(23.815);
  const [currentLng, setCurrentLng] = useState(90.365);
  const [isInsideZone, setIsInsideZone] = useState(true);

  // Mutation states
  const [mutatingDuty, setMutatingDuty] = useState(false);
  const [acceptingTrip, setAcceptingTrip] = useState(false);
  const [updatingTrip, setUpdatingTrip] = useState(false);

  const socketRef = useRef(getDriverSocket());

  const loadData = async () => {
    try {
      const meRes = await driverApi.getMe();
      const profile = meRes.user.driverProfile;
      setDriverProfile(profile);
      setIsOnDuty(profile?.isOnDuty || false);

      const myTripsRes = await driverApi.getMyTrips();
      const ongoing = (myTripsRes.trips || []).find(
        (t: any) =>
          t.status === "ACCEPTED" || t.status === "ARRIVING" || t.status === "IN_PROGRESS"
      );
      setActiveTrip(ongoing || null);
    } catch (err: any) {
      console.warn("Driver load error:", err.message);
    }
  };

  useEffect(() => {
    loadData();

    // Check GPS Permissions
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (loc?.coords) {
            setCurrentLat(loc.coords.latitude);
            setCurrentLng(loc.coords.longitude);
          }
        }
      } catch (e) {}
    })();
  }, []);

  // WebSocket Zone Dispatch Subscription
  useEffect(() => {
    const socket = socketRef.current;
    const activePermit = driverProfile?.permits?.find((p: any) => p.status === "ACTIVE");
    const zoneId = activePermit?.zoneId;

    if (isOnDuty && zoneId) {
      socket.emit("join:zone", zoneId);

      const handleNewRequest = (trip: any) => setIncomingOffer(trip);
      socket.on("trip:new_request", handleNewRequest);

      return () => {
        socket.off("trip:new_request", handleNewRequest);
      };
    }
  }, [isOnDuty, driverProfile]);

  // Periodic Telemetry Loop
  useEffect(() => {
    let timer: any = null;
    if (isOnDuty) {
      timer = setInterval(async () => {
        try {
          const newLat = currentLat + (Math.random() - 0.5) * 0.0002;
          const newLng = currentLng + (Math.random() - 0.5) * 0.0002;
          setCurrentLat(newLat);
          setCurrentLng(newLng);

          const res = await driverApi.sendPing(newLat, newLng, 18.0);
          setIsInsideZone(res.isInsideZone);
        } catch (e) {}
      }, 8000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOnDuty, currentLat, currentLng]);

  // Toggle Duty
  const handleToggleDuty = async () => {
    if (mutatingDuty) return;
    try {
      setMutatingDuty(true);
      const newStatus = !isOnDuty;
      await driverApi.toggleDuty(newStatus);
      setIsOnDuty(newStatus);
      if (!newStatus) setIncomingOffer(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Could not toggle duty");
    } finally {
      setMutatingDuty(false);
    }
  };

  // Accept Incoming Ride
  const handleAccept = async () => {
    if (!incomingOffer || acceptingTrip) return;
    try {
      setAcceptingTrip(true);
      const res = await driverApi.acceptTrip(incomingOffer.id);
      setActiveTrip(res.trip);
      setIncomingOffer(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to accept trip");
    } finally {
      setAcceptingTrip(false);
    }
  };

  // Status transitions: ACCEPTED -> ARRIVING -> IN_PROGRESS -> COMPLETED
  const handleAdvanceTrip = async () => {
    if (!activeTrip || updatingTrip) return;
    try {
      setUpdatingTrip(true);
      let nextStatus = "ARRIVING";
      if (activeTrip.status === "ARRIVING") nextStatus = "IN_PROGRESS";
      else if (activeTrip.status === "IN_PROGRESS") nextStatus = "COMPLETED";

      const res = await driverApi.updateTripStatus(activeTrip.id, nextStatus);
      if (nextStatus === "COMPLETED") {
        setActiveTrip(null);
      } else {
        setActiveTrip(res.trip);
      }
      await loadData();
    } catch (err: any) {
      alert("Failed to update status");
    } finally {
      setUpdatingTrip(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Full-Screen Street Navigation Map */}
      <StreetTileMap
        driverLat={currentLat}
        driverLng={currentLng}
        isInsideZone={isInsideZone}
        pickup={
          activeTrip
            ? {
                lat: activeTrip.pickupLat,
                lng: activeTrip.pickupLng,
                title: activeTrip.pickupAddress,
              }
            : null
        }
      />

      {/* Floating Top HUD */}
      <SafeAreaView style={styles.topSafeArea}>
        {/* If in active trip, show clean navigation banner */}
        {activeTrip ? (
          <View style={styles.navBanner}>
            <Text style={styles.navIcon}>
              {activeTrip.status === "ACCEPTED" ? "📍" : "🏁"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.navHeading}>
                {activeTrip.status === "ACCEPTED"
                  ? "Head to Pickup Point"
                  : activeTrip.status === "ARRIVING"
                  ? "At Pickup • Wait for Rider"
                  : "En Route to Destination"}
              </Text>
              <Text style={styles.navSubtext}>
                {activeTrip.status === "ACCEPTED"
                  ? activeTrip.pickupAddress
                  : activeTrip.dropoffAddress}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.topHud}>
            <View style={styles.statsPill}>
              <Text style={styles.earningsText}>৳850</Text>
              <Text style={styles.statsDivider}>•</Text>
              <Text style={styles.statsDetail}>6 rides</Text>
              <Text style={styles.statsDivider}>•</Text>
              <Text style={styles.ratingText}>★ 4.95</Text>
            </View>

            <TouchableOpacity style={styles.profileBtn} onPress={onLogout}>
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Incoming Ride Offer Drawer */}
      {incomingOffer && !activeTrip && (
        <View style={styles.dispatchDrawer}>
          <View style={styles.dispatchHeader}>
            <Text style={styles.dispatchFare}>৳{incomingOffer.estimatedFare}</Text>
            <View style={styles.dispatchTag}>
              <Text style={styles.dispatchTagText}>NEW DISPATCH</Text>
            </View>
          </View>

          <Text style={styles.dispatchRoute}>
            Pickup: <Text style={styles.bold}>{incomingOffer.pickupAddress}</Text>
          </Text>
          <Text style={styles.dispatchRoute}>
            Destination: <Text style={styles.bold}>{incomingOffer.dropoffAddress}</Text>
          </Text>
          <Text style={styles.dispatchPassenger}>
            Rider: {incomingOffer.passenger?.name}
          </Text>

          <View style={styles.dispatchActions}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => setIncomingOffer(null)}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, acceptingTrip && styles.disabled]}
              disabled={acceptingTrip}
              onPress={handleAccept}
            >
              {acceptingTrip ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>Accept Ride</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Floating Cockpit Card */}
      {!incomingOffer && (
        <View style={styles.bottomCard}>
          {activeTrip ? (
            /* Active Trip Controls */
            <View>
              <View style={styles.tripRow}>
                <View>
                  <Text style={styles.riderName}>{activeTrip.passenger?.name}</Text>
                  <Text style={styles.riderPhone}>{activeTrip.passenger?.phone}</Text>
                </View>
                <View style={styles.fareTag}>
                  <Text style={styles.fareAmount}>৳{activeTrip.estimatedFare}</Text>
                  <Text style={styles.fareSub}>Cash on Drop</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.advanceBtn, updatingTrip && styles.disabled]}
                disabled={updatingTrip}
                onPress={handleAdvanceTrip}
              >
                {updatingTrip ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.advanceBtnText}>
                    {activeTrip.status === "ACCEPTED"
                      ? "Arrived at Pickup Point"
                      : activeTrip.status === "ARRIVING"
                      ? "Start Ride (Passenger Onboard)"
                      : `Complete Trip & Collect ৳${activeTrip.estimatedFare}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Idle Cockpit: Duty Toggle */
            <View style={styles.idleRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.dutyStateText,
                    { color: isOnDuty ? "#16a34a" : "#64748b" },
                  ]}
                >
                  {isOnDuty ? "● ONLINE" : "○ OFFLINE"}
                </Text>
                <Text style={styles.dutyDesc}>
                  {isOnDuty
                    ? "Scanning for rides in Mirpur Ward 7..."
                    : "Tap to begin receiving ride dispatches"}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.dutyToggleBtn,
                  isOnDuty ? styles.goOfflineBtn : styles.goOnlineBtn,
                  mutatingDuty && styles.disabled,
                ]}
                disabled={mutatingDuty}
                onPress={handleToggleDuty}
              >
                {mutatingDuty ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.dutyBtnText}>
                    {isOnDuty ? "GO OFFLINE" : "GO ONLINE"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  topSafeArea: { position: "absolute", top: 12, left: 16, right: 16, zIndex: 10 },
  topHud: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    gap: 8,
  },
  earningsText: { color: "#ffffff", fontWeight: "900", fontSize: 16 },
  statsDivider: { color: "#475569", fontSize: 12 },
  statsDetail: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  ratingText: { color: "#facc15", fontSize: 12, fontWeight: "800" },
  profileBtn: {
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  profileIcon: { fontSize: 16 },
  navBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#166534",
    padding: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    gap: 12,
  },
  navIcon: { fontSize: 20 },
  navHeading: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  navSubtext: { color: "#bbf7d0", fontSize: 12, marginTop: 1 },
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
    shadowOpacity: 0.2,
    shadowRadius: 16,
    zIndex: 10,
  },
  idleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dutyStateText: { fontSize: 15, fontWeight: "900", letterSpacing: -0.3 },
  dutyDesc: { fontSize: 12, color: "#64748b", marginTop: 2, maxWidth: 200 },
  dutyToggleBtn: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  goOnlineBtn: { backgroundColor: "#16a34a" },
  goOfflineBtn: { backgroundColor: "#0f172a" },
  dutyBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
  tripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  riderName: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  riderPhone: { fontSize: 12, color: "#64748b", marginTop: 1 },
  fareTag: { alignItems: "flex-end" },
  fareAmount: { fontSize: 20, fontWeight: "900", color: "#16a34a" },
  fareSub: { fontSize: 10, color: "#64748b", fontWeight: "600" },
  advanceBtn: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  advanceBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  dispatchDrawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    zIndex: 20,
  },
  dispatchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dispatchFare: { fontSize: 28, fontWeight: "900", color: "#22c55e" },
  dispatchTag: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dispatchTagText: { color: "#22c55e", fontSize: 11, fontWeight: "800" },
  dispatchRoute: { color: "#e2e8f0", fontSize: 13, marginBottom: 4 },
  dispatchPassenger: { color: "#94a3b8", fontSize: 12, marginTop: 4, marginBottom: 16 },
  dispatchActions: { flexDirection: "row", gap: 12 },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#1e293b",
    justifyContent: "center",
  },
  declineText: { color: "#94a3b8", fontSize: 14, fontWeight: "700" },
  acceptBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#16a34a",
    justifyContent: "center",
  },
  acceptBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  bold: { fontWeight: "700", color: "#ffffff" },
  disabled: { opacity: 0.6 },
});
