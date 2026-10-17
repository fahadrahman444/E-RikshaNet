import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { Permit } from "../types/index.js";
import { Shield, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Permits: React.FC = () => {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [validityDays, setValidityDays] = useState(180);
  const [actionType, setActionType] = useState<"ACTIVE" | "REVOKED" | "SUSPENDED" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPermits = async () => {
    try {
      setLoading(true);
      const res = await api.getPermits(filter);
      setPermits(res.permits);
    } catch (err) {
      console.error("Failed to load permits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermits();
  }, [filter]);

  const handleDecision = async (status: "ACTIVE" | "REVOKED" | "SUSPENDED") => {
    if (!selectedPermit || !decisionNotes.trim()) {
      alert("A recorded decision note/reason is mandatory for audit compliance.");
      return;
    }

    try {
      setSubmitting(true);
      await api.decidePermit(selectedPermit.id, status, decisionNotes, validityDays);
      setSelectedPermit(null);
      setDecisionNotes("");
      setActionType(null);
      await fetchPermits();
    } catch (err: any) {
      alert(err.message || "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="text-brand-600" />
            Operating Permit Authorizations
          </h1>
          <p className="text-sm text-slate-500">
            Authorized officer review, issuance, and zone eligibility control (PRD FR-07 - FR-11)
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {["", "PENDING", "ACTIVE", "REVOKED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === st
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {st === "" ? "All Permits" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Permits Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading permit records...</div>
        ) : permits.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No permits found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Permit No</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Designated Zone</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permits.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {p.permitNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{p.driver.user.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.driver.user.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-semibold text-slate-800">
                        {p.vehicle.registrationNumber}
                      </div>
                      <div className="text-xs text-slate-400">{p.vehicle.model}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{p.zone.name}</span>
                      <span className="text-xs text-slate-400 block font-mono">
                        Ward {p.zone.wardNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {p.effectiveDate ? (
                        <div>
                          <div>
                            {new Date(p.effectiveDate).toLocaleDateString()} —{" "}
                            {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "Indefinite"}
                          </div>
                          {p.issuedBy && (
                            <div className="text-[11px] text-slate-400">By: {p.issuedBy.name}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Not active</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {p.status === "ACTIVE" && <CheckCircle2 size={12} />}
                        {p.status === "PENDING" && <Clock size={12} />}
                        {p.status === "REVOKED" && <XCircle size={12} />}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === "PENDING" && (
                        <button
                          onClick={() => {
                            setSelectedPermit(p);
                            setActionType("ACTIVE");
                          }}
                          className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition"
                        >
                          Review & Issue
                        </button>
                      )}
                      {p.status === "ACTIVE" && (
                        <button
                          onClick={() => {
                            setSelectedPermit(p);
                            setActionType("REVOKED");
                          }}
                          className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {selectedPermit && actionType && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {actionType === "ACTIVE" ? "Authorize & Issue Permit" : "Revoke Operating Permit"}
            </h3>
            <p className="text-xs text-slate-500">
              Target Permit: <span className="font-mono font-semibold">{selectedPermit.permitNumber}</span> ({selectedPermit.driver.user.name})
            </p>

            {actionType === "ACTIVE" && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Validity Duration (Days)
                </label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Official Decision Notes (Mandatory Audit Trail)
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="State the official basis or verification result..."
                className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={submitting}
                onClick={() => setSelectedPermit(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={() => handleDecision(actionType)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white ${
                  actionType === "ACTIVE" ? "bg-brand-600 hover:bg-brand-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting ? "Recording..." : `Confirm ${actionType}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
