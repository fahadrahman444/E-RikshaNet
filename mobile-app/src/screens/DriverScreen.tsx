import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { mobileApi } from "../api/client.js";

export const DriverScreen: React.FC = () => {
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<any[]>([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [appealReason, setAppealReason] = useState("");
  const [selectedViolationId, setSelectedViolationId] = useState<string | null>(null);

  // Simulated GPS position (Mirpur Ward 7 center: 23.815, 90.365)
  const [currentLat, setCurrentLat] = useState(23.815);
  const [currentLng, setCurrentLng] = useState(90.365);
  const [pingStatus, setPingStatus] = useState<string>("Standby");

  const loadData = async () => {
    try {
      const meRes = await mobileApi.getMe();
      setDriverProfile(meRes.user.driverProfile);
      setIsOnDuty(meRes.user.driverProfile?.isOnDuty || false);

      if (meRes.user.driverProfile?.isOnDuty) {
        const tripsRes = await mobileApi.getAvailableTrips();
        setAvailableTrips(tripsRes.trips);
      }

      const myTripsRes = await mobileApi.getMyTrips();
      const ongoing = myTripsRes.trips.find(
        (t: any) => t.status === "ACCEPTED" || t.status === "ARRIVING" || t.status === "IN_PROGRESS"
      );
      setActiveTrip(ongoing || null);

      const violsRes = await mobileApi.getMyViolations();
      setViolations(violsRes.violations);
    } catch (err: any) {
      console.log("Error loading driver data:", err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Periodic GPS Ping loop while on duty (FR-13, FR-17)
  useEffect(() => {
    let interval: any = null;
    if (isOnDuty) {
      interval = setInterval(async () => {
        try {
          // Add slight jitter to simulate movement
          const newLat = currentLat + (Math.random() - 0.5) * 0.0005;
          const newLng = currentLng + (Math.random() - 0.5) * 0.0005;
          setCurrentLat(newLat);
          setCurrentLng(newLng);

          const res = await mobileApi.sendPing(newLat, newLng, 18.0);
          setPingStatus(res.isInsideZone ? "Inside Zone (Compliant)" : "Outside Ward Boundary!");
        } catch (e: any) {
          setPingStatus(`Ping Error: ${e.message}`);
        }
      }, 8000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnDuty, currentLat, currentLng]);

  const handleToggleDuty = async (value: boolean) => {
    try {
      const res = await mobileApi.toggleDuty(value);
      setIsOnDuty(value);
      setPingStatus(value ? "Broadcasting GPS" : "Offline");
      Alert.alert("Duty Status", res.message);
      await loadData();
    } catch (err: any) {
      Alert.alert("Duty Gating Error", err.message);
      setIsOnDuty(false);
    }
  };

  const handleSimulateBreach = async () => {
    try {
      // Simulate GPS point way outside Mirpur Ward 7
      const breachLat = 23.750;
      const breachLng = 90.390;
      setCurrentLat(breachLat);
      setCurrentLng(breachLng);
      const res = await mobileApi.sendPing(breachLat, breachLng, 22.0);
      Alert.alert(
        "Simulated Geofence Ping",
        `Ping Sent at [${breachLat}, ${breachLng}]. Inside Zone: ${res.isInsideZone ? "Yes" : "NO (Candidate breach recorded for reviewer)"}`
      );
      await loadData();
    } catch (err: any) {
      Alert.alert("Ping Error", err.message);
    }
  };

  const handleAcceptTrip = async (tripId: string) => {
    try {
      const res = await mobileApi.acceptTrip(tripId);
      setActiveTrip(res.trip);
      Alert.alert("Trip Accepted", `Proceed to pickup at: ${res.trip.pickupAddress}`);
      await loadData();
    } catch (err: any) {
      Alert.alert("Trip Error", err.message);
    }
  };

  const handleUpdateTrip = async (newStatus: string) => {
    if (!activeTrip) return;
    try {
      await mobileApi.updateTripStatus(activeTrip.id, newStatus);
      if (newStatus === "COMPLETED") {
        Alert.alert("Trip Completed", `Collected fare: ${activeTrip.estimatedFare} BDT`);
        setActiveTrip(null);
      }
      await loadData();
    } catch (err: any) {
      Alert.alert("Status Update Error", err.message);
    }
  };

  const handleSubmitAppeal = async (violationId: string) => {
    if (!appealReason.trim()) {
      Alert.alert("Appeal Error", "Please provide a statement of defense.");
      return;
    }
    try {
      await mobileApi.submitAppeal(violationId, appealReason);
      Alert.alert("Appeal Submitted", "Your defense has been forwarded to the Appeals Reviewer.");
      setSelectedViolationId(null);
      setAppealReason("");
      await loadData();
    } catch (err: any) {
      Alert.alert("Appeal Error", err.message);
    }
  };

  const activePermit = driverProfile?.permits?.find((p: any) => p.status === "ACTIVE");

  return (
    <ScrollView style={styles.container}>
      {/* Driver Header */}
      <View style={styles.headerCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.headerTitle}>Driver Duty & Navigation</Text>
            <Text style={styles.headerSubtitle}>
              NID: {driverProfile?.nidNumber || "—"} · Lic: {driverProfile?.licenseNumber || "—"}
            </Text>
          </View>
          <View style={styles.dutySwitchContainer}>
            <Text style={[styles.dutyText, { color: isOnDuty ? "#16a34a" : "#64748b" }]}>
              {isOnDuty ? "ONLINE" : "OFFLINE"}
            </Text>
            <Switch
              value={isOnDuty}
              onValueChange={handleToggleDuty}
              trackColor={{ false: "#cbd5e1", true: "#86efac" }}
              thumbColor={isOnDuty ? "#16a34a" : "#94a3b8"}
            />
          </View>
        </View>

        {/* Operating Permit Badge */}
        <View style={styles.permitBadge}>
          <Text style={styles.permitText}>
            🛡️ Permit: {activePermit ? `${activePermit.permitNumber} (${activePermit.zone?.name})` : "NO ACTIVE PERMIT"}
          </Text>
        </View>
      </View>

      {/* GPS Telemetry Simulator Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛰️ GPS Telemetry Simulator (FR-13)</Text>
        <Text style={styles.statusText}>
          Telemetry Status: <Text style={styles.boldText}>{pingStatus}</Text>
        </Text>
        <Text style={styles.coordText}>
          Coordinates: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
        </Text>

        <TouchableOpacity
          style={[styles.breachButton, !isOnDuty && styles.disabledButton]}
          disabled={!isOnDuty}
          onPress={handleSimulateBreach}
        >
          <Text style={styles.breachButtonText}>⚡ Simulate Driving Outside Allowed Ward Boundary</Text>
        </TouchableOpacity>
      </View>

      {/* Active Trip Navigation */}
      {activeTrip && (
        <View style={[styles.card, styles.activeTripCard]}>
          <Text style={styles.activeTripTitle}>🚖 Active Ride: {activeTrip.tripNumber}</Text>
          <Text style={styles.tripDetail}>Passenger: {activeTrip.passenger?.name} ({activeTrip.passenger?.phone})</Text>
          <Text style={styles.tripDetail}>Pickup: {activeTrip.pickupAddress}</Text>
          <Text style={styles.tripDetail}>Drop-off: {activeTrip.dropoffAddress}</Text>
          <Text style={styles.fareText}>Estimated Fare: {activeTrip.estimatedFare} BDT</Text>

          <View style={styles.statusRow}>
            {activeTrip.status === "ACCEPTED" && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleUpdateTrip("ARRIVING")}
              >
                <Text style={styles.buttonText}>Arrived at Pickup</Text>
              </TouchableOpacity>
            )}

            {activeTrip.status === "ARRIVING" && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleUpdateTrip("IN_PROGRESS")}
              >
                <Text style={styles.buttonText}>Start Ride (In Progress)</Text>
              </TouchableOpacity>
            )}

            {activeTrip.status === "IN_PROGRESS" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleUpdateTrip("COMPLETED")}
              >
                <Text style={styles.buttonText}>Complete Trip & Collect Fare</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Available Ride Dispatch Queue */}
      {!activeTrip && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📲 Nearby Ride Requests ({availableTrips.length})</Text>
          {availableTrips.length === 0 ? (
            <Text style={styles.emptyText}>No rides requested in your permitted ward right now.</Text>
          ) : (
            availableTrips.map((trip) => (
              <View key={trip.id} style={styles.tripCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.boldText}>{trip.pickupAddress} ➔ {trip.dropoffAddress}</Text>
                  <Text style={styles.fareBadge}>{trip.estimatedFare} BDT</Text>
                </View>
                <Text style={styles.smallText}>Passenger: {trip.passenger?.name}</Text>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptTrip(trip.id)}
                >
                  <Text style={styles.acceptButtonText}>Accept Ride</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* Violations & Appeal Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚠️ Notices & Candidate Breaches ({violations.length})</Text>
        {violations.length === 0 ? (
          <Text style={styles.emptyText}>No violations or candidate flags on record.</Text>
        ) : (
          violations.map((v) => (
            <View key={v.id} style={styles.violationItem}>
              <View style={styles.rowBetween}>
                <Text style={styles.boldText}>{v.caseNumber}: {v.category}</Text>
                <Text style={styles.statusPill}>{v.status}</Text>
              </View>
              {v.officerNotes && <Text style={styles.notesText}>Officer: "{v.officerNotes}"</Text>}
              {v.penaltyAmount > 0 && <Text style={styles.penaltyText}>Fine: {v.penaltyAmount} BDT</Text>}

              {v.status === "NOTICE_ISSUED" && (
                <View style={styles.appealContainer}>
                  {selectedViolationId === v.id ? (
                    <View>
                      <TextInput
                        style={styles.input}
                        placeholder="State your reason/evidence for appeal..."
                        value={appealReason}
                        onChangeText={setAppealReason}
                      />
                      <TouchableOpacity
                        style={styles.submitAppealButton}
                        onPress={() => handleSubmitAppeal(v.id)}
                      >
                        <Text style={styles.buttonText}>Submit Legal Appeal</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.appealButton}
                      onPress={() => setSelectedViolationId(v.id)}
                    >
                      <Text style={styles.appealButtonText}>File an Appeal (FR-21)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  headerCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  headerSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  dutySwitchContainer: { alignItems: "center" },
  dutyText: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  permitBadge: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  permitText: { fontSize: 12, color: "#166534", fontWeight: "600" },
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 8 },
  statusText: { fontSize: 12, color: "#475569", marginBottom: 4 },
  boldText: { fontWeight: "700", color: "#0f172a" },
  coordText: { fontSize: 11, color: "#64748b", fontFamily: "monospace", marginBottom: 12 },
  breachButton: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde047",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: { opacity: 0.5 },
  breachButtonText: { fontSize: 11, fontWeight: "700", color: "#854d0e" },
  activeTripCard: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  activeTripTitle: { fontSize: 15, fontWeight: "700", color: "#166534", marginBottom: 6 },
  tripDetail: { fontSize: 12, color: "#334155", marginBottom: 2 },
  fareText: { fontSize: 13, fontWeight: "700", color: "#166534", marginTop: 4, marginBottom: 12 },
  statusRow: { flexDirection: "row", gap: 8 },
  actionButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  completeButton: { backgroundColor: "#0284c7" },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  emptyText: { fontSize: 12, color: "#94a3b8", fontStyle: "italic", textAlign: "center", paddingVertical: 12 },
  tripCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  fareBadge: { backgroundColor: "#dcfce7", color: "#15803d", fontWeight: "700", fontSize: 12, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  smallText: { fontSize: 11, color: "#64748b", marginTop: 2, marginBottom: 8 },
  acceptButton: { backgroundColor: "#16a34a", paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  acceptButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  violationItem: { borderWidth: 1, borderColor: "#fed7aa", backgroundColor: "#fff7ed", padding: 10, borderRadius: 8, marginBottom: 8 },
  statusPill: { fontSize: 10, fontWeight: "700", color: "#c2410c", textTransform: "uppercase" },
  notesText: { fontSize: 11, color: "#9a3412", marginTop: 4, fontStyle: "italic" },
  penaltyText: { fontSize: 12, fontWeight: "700", color: "#b91c1c", marginTop: 2 },
  appealContainer: { marginTop: 8 },
  appealButton: { paddingVertical: 6, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, alignItems: "center", backgroundColor: "#ffffff" },
  appealButtonText: { fontSize: 11, fontWeight: "600", color: "#334155" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, padding: 8, fontSize: 12, backgroundColor: "#ffffff", marginBottom: 6 },
  submitAppealButton: { backgroundColor: "#7c3aed", paddingVertical: 8, borderRadius: 6, alignItems: "center" },
});
