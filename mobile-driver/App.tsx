import React, { useState, useEffect } from "react";
import { StyleSheet, View, SafeAreaView, StatusBar, ActivityIndicator, Text } from "react-native";
import { DriverScreen } from "./src/screens/DriverScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { driverApi, getAuthToken, getCurrentUser } from "./src/api/client";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = getAuthToken();
        if (token) {
          const res = await driverApi.getMe();
          if (res.user?.role === "DRIVER") {
            setUser(res.user);
          } else {
            driverApi.logout();
          }
        }
      } catch (e) {
        driverApi.logout();
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    driverApi.logout();
    setUser(null);
  };

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.splashText}>Starting E-RikshaNet Driver Partner...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {user ? (
        <DriverScreen onLogout={handleLogout} />
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
