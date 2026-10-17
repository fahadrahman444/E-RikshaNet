import React from "react";
import { ShieldCheck, MapPin, FileText, AlertTriangle, History, LogOut } from "lucide-react";

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: any;
  onQuickLogin: (phone: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onQuickLogin,
  onLogout,
}) => {
  const tabs = [
    { id: "map", label: "Live Fleet Map", icon: MapPin },
    { id: "permits", label: "Permits", icon: ShieldCheck },
    { id: "registrations", label: "Registrations", icon: FileText },
    { id: "violations", label: "Violations & Appeals", icon: AlertTriangle },
    { id: "audit", label: "Audit Logs", icon: History },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-brand-500/20">
              E
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                E-Riksha<span className="text-brand-600">Net</span>
                <span className="text-[10px] font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Pilot v1.0
                </span>
              </span>
              <p className="text-xs text-slate-500">Dhaka Ward Regulatory & Dispatch Platform</p>
            </div>
          </div>

          {/* Quick Role Switcher for Pilot Evaluation */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 p-1 rounded-lg text-xs">
            <span className="text-slate-500 px-2 font-medium">Switch Role:</span>
            <button
              onClick={() => onQuickLogin("01700000001")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                currentUser?.phone === "01700000001"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => onQuickLogin("01700000002")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                currentUser?.phone === "01700000002"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Reviewer
            </button>
            <button
              onClick={() => onQuickLogin("01700000003")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                currentUser?.phone === "01700000003"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Permit Officer
            </button>
            <button
              onClick={() => onQuickLogin("01700000004")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                currentUser?.phone === "01700000004"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Enforcement
            </button>
            <button
              onClick={() => onQuickLogin("01700000005")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                currentUser?.phone === "01700000005"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Appeals
            </button>
          </div>

          {/* Current User Badge */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2 text-right">
                <div>
                  <div className="text-xs font-semibold text-slate-800">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono tracking-tight">
                    {currentUser.role}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  aria-label="Logout"
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 border-t border-slate-100 overflow-x-auto py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} className={isActive ? "text-brand-600" : "text-slate-400"} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
