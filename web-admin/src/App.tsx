import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.js";
import { LiveMap } from "./pages/LiveMap.js";
import { Permits } from "./pages/Permits.js";
import { Registrations } from "./pages/Registrations.js";
import { Violations } from "./pages/Violations.js";
import { AuditLogs } from "./pages/AuditLogs.js";
import { api, setAuthToken, removeAuthToken } from "./services/api.js";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState("map");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quick login handler for pilot roles
  const handleQuickLogin = async (phone: string) => {
    try {
      setLoading(true);
      const res = await api.login(phone, "password123");
      setAuthToken(res.token);
      setCurrentUser(res.user);
    } catch (err: any) {
      alert(err.message || "Failed to switch role");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try getting existing profile, or default to admin for pilot review
        const profile = await api.getMe();
        setCurrentUser(profile.user);
      } catch (e) {
        // Default login as Admin
        await handleQuickLogin("01700000001");
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onQuickLogin={handleQuickLogin}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-sm text-slate-400">
            Connecting to E-RikshaNet Regulatory Network...
          </div>
        ) : (
          <>
            {currentTab === "map" && <LiveMap />}
            {currentTab === "permits" && <Permits />}
            {currentTab === "registrations" && <Registrations />}
            {currentTab === "violations" && <Violations />}
            {currentTab === "audit" && <AuditLogs />}
          </>
        )}
      </main>
    </div>
  );
};
