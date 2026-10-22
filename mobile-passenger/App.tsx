import React, { useState, useEffect } from "react";
import { StyleSheet, View, SafeAreaView, StatusBar, ActivityIndicator, Text } from "react-native";
import { PassengerScreen } from "./src/screens/PassengerScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { passengerApi, getAuthToken } from "./src/api/client";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = getAuthToken();
        if (token) {
          const res = await passengerApi.getMe();
          if (res.user?.role === "PASSENGER") {
            setUser(res.user);
          } else {
            passengerApi.logout();
          }
        }
      } catch (e) {
        passengerApi.logout();
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    passengerApi.logout();
    setUser(null);
  };

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.splashText}>Starting E-RikshaNet Rider...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {user ? (
        <PassengerScreen onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={(u) => setUser(u)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  splashText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
});
