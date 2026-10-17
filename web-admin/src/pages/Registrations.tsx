import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { DriverRecord, VehicleRecord } from "../types/index.js";
import { UserCheck, Car } from "lucide-react";

export const Registrations: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"drivers" | "vehicles">("drivers");
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: "driver" | "vehicle" } | null>(
    null
  );
  const [reviewStatus, setReviewStatus] = useState<string>("APPROVED");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dRes, vRes] = await Promise.all([api.getDrivers(), api.getVehicles()]);
      setDrivers(dRes.drivers);
      setVehicles(vRes.vehicles);
    } catch (err) {
      console.error("Failed to load registration records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReviewSubmit = async () => {
    if (!selectedItem || !reviewNotes.trim()) {
      alert("A review note/reason is required for audit compliance.");
      return;
    }

    try {
      setSubmitting(true);
      if (selectedItem.type === "driver") {
        await api.reviewDriver(selectedItem.id, reviewStatus, reviewNotes);
      } else {
        await api.reviewVehicle(selectedItem.id, reviewStatus, reviewNotes);
      }
      setSelectedItem(null);
      setReviewNotes("");
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="text-brand-600" />
            Identity & Vehicle Registry Review
          </h1>
          <p className="text-sm text-slate-500">
            Verify National IDs, vehicle ownership deeds, and driver-vehicle pairings (PRD FR-01 - FR-06)
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab("drivers")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeSubTab === "drivers"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck size={14} /> Drivers ({drivers.length})
          </button>
          <button
            onClick={() => setActiveSubTab("vehicles")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeSubTab === "vehicles"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Car size={14} /> Vehicles ({vehicles.length})
          </button>
        </div>
      </div>

      {/* Tables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading registrations...</div>
        ) : activeSubTab === "drivers" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Driver Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">National ID (NID)</th>
                  <th className="py-3 px-4">Linked Vehicle</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-medium text-slate-900">{d.user.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{d.user.phone}</td>
                    <td className="py-3 px-4 font-mono text-xs">{d.nidNumber}</td>
                    <td className="py-3 px-4 text-xs">
                      {d.driverVehicleLinks[0] ? (
                        <span className="font-mono font-semibold text-slate-800">
                          {d.driverVehicleLinks[0].vehicle.registrationNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None linked</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          d.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : d.status === "SUBMITTED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedItem({ id: d.id, type: "driver" });
                          setReviewStatus(d.status === "SUBMITTED" ? "APPROVED" : d.status);
                        }}
                        className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Plate / Reg No</th>
                  <th className="py-3 px-4">Chassis Number</th>
                  <th className="py-3 px-4">Model & Battery</th>
                  <th className="py-3 px-4">Registered Owner</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {v.registrationNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{v.chassisNumber}</td>
                    <td className="py-3 px-4 text-xs">
                      <div>{v.model}</div>
                      {v.batteryCapacityKwh && (
                        <div className="text-slate-400 font-mono">{v.batteryCapacityKwh} kWh</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-medium text-slate-800">{v.owner.name}</div>
                      <div className="text-slate-400 font-mono">{v.owner.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          v.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : v.status === "SUBMITTED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedItem({ id: v.id, type: "vehicle" });
                          setReviewStatus(v.status === "SUBMITTED" ? "APPROVED" : v.status);
                        }}
                        className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Review {selectedItem.type === "driver" ? "Driver Registration" : "Vehicle Registration"}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Decision</label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="APPROVED">Approve (Verification Passed)</option>
                <option value="CHANGES_REQUESTED">Request Changes (Missing/Blurry Docs)</option>
                <option value="REJECTED">Reject (Ineligible / Fraudulent)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Verification Notes (Mandatory Audit Trail)
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="State verified document details or specific missing items..."
                className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={submitting}
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleReviewSubmit}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold"
              >
                {submitting ? "Saving..." : "Record Verification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
