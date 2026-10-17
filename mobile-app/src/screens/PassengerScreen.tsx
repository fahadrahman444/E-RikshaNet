import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { mobileApi } from "../api/client";

export const PassengerScreen: React.FC = () => {
  const [zones, setZones] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<any>(null);

  // Sample ward locations in Mirpur Ward 7
  const locations = [
    { name: "Mirpur-10 Roundabout", lat: 23.807, lng: 90.368 },
    { name: "Mirpur-11 Bus Stand", lat: 23.818, lng: 90.365 },
    { name: "Section 7 Community Center", lat: 23.815, lng: 90.360 },
    { name: "Pallabi Extension Market", lat: 23.822, lng: 90.363 },
  ];

  const [pickupIdx, setPickupIdx] = useState(0);
  const [dropoffIdx, setDropoffIdx] = useState(1);
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [requesting, setRequesting] = useState(false);

  const loadData = async () => {
    try {
      const zRes = await mobileApi.getZones();
      setZones(zRes.zones);
      if (zRes.zones[0]) setSelectedZone(zRes.zones[0]);

      const myTrips = await mobileApi.getMyTrips();
      const current = myTrips.trips.find(
        (t: any) =>
          t.status === "REQUESTED" ||
          t.status === "ACCEPTED" ||
          t.status === "ARRIVING" ||
          t.status === "IN_PROGRESS"
      );
      setActiveTrip(current || null);
    } catch (e: any) {
      console.log("Passenger data error:", e.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate fare when pickup or dropoff changes
  useEffect(() => {
    const updateEstimate = async () => {
      const p = locations[pickupIdx];
      const d = locations[dropoffIdx];
      if (p && d && pickupIdx !== dropoffIdx) {
        try {
          const res = await mobileApi.estimateFare(p.lat, p.lng, d.lat, d.lng);
          setEstimatedFare(res.estimatedFare);
          setDistanceKm(res.distanceKm);
        } catch (e) {}
      }
    };
    updateEstimate();
  }, [pickupIdx, dropoffIdx]);

  const handleBookRide = async () => {
    if (!selectedZone) {
      Alert.alert("Error", "Please select an operating ward.");
      return;
    }
    const p = locations[pickupIdx];
    const d = locations[dropoffIdx];

    try {
      setRequesting(true);
      const res = await mobileApi.requestTrip({
        zoneId: selectedZone.id,
        pickupLat: p.lat,
        pickupLng: p.lng,
        pickupAddress: p.name,
        dropoffLat: d.lat,
        dropoffLng: d.lng,
        dropoffAddress: d.name,
      });

      setActiveTrip(res.trip);
      Alert.alert("Ride Requested", "Matching with an authorized and permitted rickshaw in this ward...");
      await loadData();
    } catch (err: any) {
      Alert.alert("Booking Error", err.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    try {
      await mobileApi.updateTripStatus(activeTrip.id, "CANCELLED");
      Alert.alert("Trip Cancelled", "Your booking request has been cancelled.");
      setActiveTrip(null);
      await loadData();
    } catch (err: any) {
      Alert.alert("Cancel Error", err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Operating Ward Header */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>Book an Authorized Local Ride</Text>
        <Text style={styles.subtitle}>
          Ward: <Text style={styles.boldText}>{selectedZone?.name || "Loading..."}</Text>
        </Text>
        <Text style={styles.policyNote}>
          🛡️ Only drivers with verified legal permits for this ward are eligible to accept your trip.
        </Text>
      </View>

      {/* Ongoing Ride Status */}
      {activeTrip && (
        <View style={styles.activeCard}>
          <Text style={styles.activeTitle}>Trip #{activeTrip.tripNumber}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{activeTrip.status}</Text>
          </View>

          <Text style={styles.detailText}>From: {activeTrip.pickupAddress}</Text>
          <Text style={styles.detailText}>To: {activeTrip.dropoffAddress}</Text>
          <Text style={styles.fareHighlight}>Fare: {activeTrip.estimatedFare} BDT</Text>

          {activeTrip.driver ? (
            <View style={styles.driverInfoBox}>
              <Text style={styles.driverName}>Assigned Driver: {activeTrip.driver.user.name}</Text>
              <Text style={styles.driverPhone}>Phone: {activeTrip.driver.user.phone}</Text>
              {activeTrip.vehicle && (
                <Text style={styles.vehiclePlate}>
                  Vehicle: {activeTrip.vehicle.registrationNumber} ({activeTrip.vehicle.model})
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.waitingText}>⏳ Searching for nearby permitted drivers in Ward 7...</Text>
          )}

          {activeTrip.status === "REQUESTED" && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTrip}>
              <Text style={styles.cancelButtonText}>Cancel Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Route Selector (when no active trip) */}
      {!activeTrip && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Select Pickup Point</Text>
          <View style={styles.locationList}>
            {locations.map((loc, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setPickupIdx(idx)}
                style={[styles.locItem, pickupIdx === idx && styles.selectedLoc]}
              >
                <Text style={[styles.locText, pickupIdx === idx && styles.selectedLocText]}>
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>2. Select Destination Point</Text>
          <View style={styles.locationList}>
            {locations.map((loc, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setDropoffIdx(idx)}
                style={[styles.locItem, dropoffIdx === idx && styles.selectedLoc]}
              >
                <Text style={[styles.locText, dropoffIdx === idx && styles.selectedLocText]}>
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fare Estimation Preview */}
          {estimatedFare && distanceKm && (
            <View style={styles.fareCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.fareLabel}>Estimated Distance:</Text>
                <Text style={styles.fareValue}>{distanceKm} km</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.fareLabel}>Standard Ward Fare (BR-12):</Text>
                <Text style={styles.fareValueBDT}>{estimatedFare} BDT</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            disabled={requesting || pickupIdx === dropoffIdx}
            onPress={handleBookRide}
            style={[
              styles.bookButton,
              (requesting || pickupIdx === dropoffIdx) && styles.disabledButton,
            ]}
          >
            <Text style={styles.bookButtonText}>
              {requesting ? "Requesting..." : "Confirm & Request Rickshaw"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#475569", marginTop: 2 },
  boldText: { fontWeight: "700", color: "#0f172a" },
  policyNote: { fontSize: 11, color: "#15803d", backgroundColor: "#f0fdf4", padding: 8, borderRadius: 6, marginTop: 8 },
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#1e293b", marginBottom: 8 },
  locationList: { gap: 6 },
  locItem: { padding: 10, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, backgroundColor: "#f8fafc" },
  selectedLoc: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  locText: { fontSize: 12, color: "#334155" },
  selectedLocText: { color: "#15803d", fontWeight: "700" },
  fareCard: { backgroundColor: "#f1f5f9", padding: 12, borderRadius: 8, marginTop: 14, gap: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fareLabel: { fontSize: 12, color: "#475569" },
  fareValue: { fontSize: 12, fontWeight: "600", color: "#0f172a" },
  fareValueBDT: { fontSize: 15, fontWeight: "700", color: "#16a34a" },
  bookButton: { backgroundColor: "#16a34a", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 14 },
  disabledButton: { opacity: 0.5 },
  bookButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  activeCard: { backgroundColor: "#ffffff", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#86efac", marginBottom: 16 },
  activeTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  statusBadge: { backgroundColor: "#dcfce7", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4, marginBottom: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", color: "#15803d" },
  detailText: { fontSize: 12, color: "#475569", marginBottom: 2 },
  fareHighlight: { fontSize: 13, fontWeight: "700", color: "#16a34a", marginTop: 4 },
  driverInfoBox: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", padding: 10, borderRadius: 8, marginTop: 10 },
  driverName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  driverPhone: { fontSize: 12, color: "#64748b", marginTop: 1 },
  vehiclePlate: { fontSize: 12, color: "#166534", fontWeight: "600", marginTop: 2 },
  waitingText: { fontSize: 12, color: "#d97706", fontStyle: "italic", marginTop: 8 },
  cancelButton: { borderWidth: 1, borderColor: "#fca5a5", padding: 8, borderRadius: 6, alignItems: "center", marginTop: 10, backgroundColor: "#fef2f2" },
  cancelButtonText: { color: "#dc2626", fontWeight: "600", fontSize: 12 },
});
