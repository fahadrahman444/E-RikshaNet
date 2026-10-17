import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, StatusBar } from "react-native";
import { DriverScreen } from "./src/screens/DriverScreen";
import { PassengerScreen } from "./src/screens/PassengerScreen";
import { mobileApi, setToken } from "./src/api/client";

export default function App() {
  const [currentMode, setCurrentMode] = useState<"driver" | "passenger">("driver");
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<any>(null);

  // Switch between seeded Driver and Passenger
  const switchAccount = async (mode: "driver" | "passenger") => {
    try {
      setLoading(true);
      const phone = mode === "driver" ? "01700000007" : "01700000008";
      const res = await mobileApi.login(phone, "password123");
      setToken(res.token);
      setActiveUser(res.user);
      setCurrentMode(mode);
    } catch (e: any) {
      console.log("Login error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switchAccount("driver");
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Mode Switcher Navigation Header */}
      <View style={styles.navBar}>
        <View style={styles.brandRow}>
          <Text style={styles.logoText}>
            E-Riksha<Text style={{ color: "#16a34a" }}>Net</Text>
          </Text>
          <Text style={styles.userBadge}>
            {activeUser ? `${activeUser.name} (${activeUser.role})` : "Connecting..."}
          </Text>
        </View>

        <View style={styles.switchTabs}>
          <TouchableOpacity
            style={[styles.tabButton, currentMode === "driver" && styles.activeTab]}
            onPress={() => switchAccount("driver")}
          >
            <Text style={[styles.tabText, currentMode === "driver" && styles.activeTabText]}>
              🛺 Driver Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, currentMode === "passenger" && styles.activeTab]}
            onPress={() => switchAccount("passenger")}
          >
            <Text style={[styles.tabText, currentMode === "passenger" && styles.activeTabText]}>
              👤 Passenger Mode
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Body */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading E-RikshaNet Mobile...</Text>
          </View>
        ) : currentMode === "driver" ? (
          <DriverScreen />
        ) : (
          <PassengerScreen />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  navBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logoText: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  userBadge: { fontSize: 11, color: "#64748b", fontWeight: "500" },
  switchTabs: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 3,
  },
  tabButton: { flex: 1, paddingVertical: 6, alignItems: "center", borderRadius: 6 },
  activeTab: { backgroundColor: "#ffffff", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2 },
  tabText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  activeTabText: { color: "#0f172a", fontWeight: "700" },
  content: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 13, color: "#94a3b8" },
});
