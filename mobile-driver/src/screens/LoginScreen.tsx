import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { driverApi } from "../api/client";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState("01700000007");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError("Please enter your registered phone and password");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await driverApi.login(phone.trim(), password);
      if (res.user.role !== "DRIVER") {
        setError("Account is not registered as an authorized driver");
        driverApi.logout();
        return;
      }
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.sheet}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>
            E-Riksha<Text style={{ color: "#16a34a" }}>Net</Text>
          </Text>
          <Text style={styles.badge}>Driver Partner</Text>
        </View>

        <Text style={styles.title}>Driver Cockpit</Text>
        <Text style={styles.subtitle}>Enter your registered number to go online</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={styles.inputPrefix}>+880</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="1700000007"
            placeholderTextColor="#94a3b8"
            value={phone.startsWith("0") ? phone.slice(1) : phone}
            onChangeText={(txt) => setPhone(txt.startsWith("0") ? txt : "0" + txt)}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>

        <TextInput
          style={styles.passwordInput}
          placeholder="Password / PIN"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabled]}
          disabled={loading}
          onPress={handleLogin}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Open Cockpit</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#022c22",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  brandText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 20,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    height: 50,
  },
  inputPrefix: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    height: "100%",
  },
  passwordInput: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0f172a",
    height: 50,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#16a34a",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
