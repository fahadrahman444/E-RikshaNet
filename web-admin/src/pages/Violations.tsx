import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { ViolationCase } from "../types/index.js";
import { AlertTriangle, Scale, ShieldAlert } from "lucide-react";

export const Violations: React.FC = () => {
  const [violations, setViolations] = useState<ViolationCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Enforcement decision modal
  const [selectedCase, setSelectedCase] = useState<ViolationCase | null>(null);
  const [officerNotes, setOfficerNotes] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState(500);
  const [decisionAction, setDecisionAction] = useState<"NOTICE_ISSUED" | "DISMISSED">("NOTICE_ISSUED");

  // Appeal decision modal
  const [selectedAppeal, setSelectedAppeal] = useState<{ case: ViolationCase; appealId: string } | null>(
    null
  );
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [appealAction, setAppealAction] = useState<"APPROVED_DISMISSED" | "REJECTED">("APPROVED_DISMISSED");

  const [submitting, setSubmitting] = useState(false);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const res = await api.getViolations();
      setViolations(res.violations);
    } catch (err) {
      console.error("Failed to load violations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const handleOfficerDecision = async () => {
    if (!selectedCase || !officerNotes.trim()) {
      alert("Officer notes are required for enforcement compliance.");
      return;
    }

    try {
      setSubmitting(true);
      await api.issueNotice(
        selectedCase.id,
        decisionAction,
        officerNotes,
        decisionAction === "NOTICE_ISSUED" ? penaltyAmount : 0
      );
      setSelectedCase(null);
      setOfficerNotes("");
      await fetchViolations();
    } catch (err: any) {
      alert(err.message || "Failed to process enforcement notice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppealDecision = async () => {
    if (!selectedAppeal || !reviewerNotes.trim()) {
      alert("Appeals reviewer notes are mandatory.");
      return;
    }

    try {
      setSubmitting(true);
      await api.decideAppeal(selectedAppeal.appealId, appealAction, reviewerNotes);
      setSelectedAppeal(null);
      setReviewerNotes("");
      await fetchViolations();
    } catch (err: any) {
      alert(err.message || "Failed to resolve appeal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="text-amber-600" />
            Violations & Appeals Management
          </h1>
          <p className="text-sm text-slate-500">
            Candidate geofence breaches, human review, authorized penalty notices, and appeals (PRD FR-16 - FR-23)
          </p>
        </div>
      </div>

      {/* Violations List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading violation cases...</div>
        ) : violations.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No violation cases recorded. Clean compliance!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Evidence Details</th>
                  <th className="py-3 px-4">Fine (BDT)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {violations.map((v) => {
                  let evidence: any = {};
                  try {
                    evidence = JSON.parse(v.evidenceJson);
                  } catch (e) {}

                  const activeAppeal = v.appeals.find((a) => a.status === "PENDING");

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{v.caseNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{v.driver.user.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{v.driver.user.phone}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-xs text-slate-800">
                        {v.category.replace("_", " ")}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {evidence.lat && evidence.lng ? (
                          <div className="font-mono text-slate-600">
                            Lat: {evidence.lat.toFixed(4)}, Lng: {evidence.lng.toFixed(4)}
                            {evidence.zoneName && (
                              <div className="text-[11px] text-slate-400">Zone: {evidence.zoneName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Manual officer report</span>
                        )}
                        {v.officerNotes && (
                          <div className="text-[11px] text-amber-800 italic mt-0.5">
                            "{v.officerNotes}"
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {v.penaltyAmount ? `${v.penaltyAmount} BDT` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            v.status === "CANDIDATE_REVIEW"
                              ? "bg-amber-100 text-amber-800"
                              : v.status === "NOTICE_ISSUED"
                              ? "bg-orange-100 text-orange-800"
                              : v.status === "APPEALED"
                              ? "bg-purple-100 text-purple-800"
                              : v.status === "DISMISSED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {v.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {/* Enforcement action for candidate review */}
                        {v.status === "CANDIDATE_REVIEW" && (
                          <button
                            onClick={() => setSelectedCase(v)}
                            className="px-2.5 py-1 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition"
                          >
                            Review & Decide
                          </button>
                        )}

                        {/* Appeals action */}
                        {v.status === "APPEALED" && activeAppeal && (
                          <button
                            onClick={() =>
                              setSelectedAppeal({ case: v, appealId: activeAppeal.id })
                            }
                            className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition"
                          >
                            Resolve Appeal
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enforcement Decision Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="text-amber-600" size={18} />
              Enforcement Officer Review: {selectedCase.caseNumber}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Official Finding</label>
              <select
                value={decisionAction}
                onChange={(e) => setDecisionAction(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="NOTICE_ISSUED">Confirm Breach & Issue Notice</option>
                <option value="DISMISSED">Dismiss (Inaccurate GPS / Permitted Exception)</option>
              </select>
            </div>

            {decisionAction === "NOTICE_ISSUED" && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Penalty Amount (BDT)
                </label>
                <input
                  type="number"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Officer Notes & Findings (Mandatory Audit Trail)
              </label>
              <textarea
                rows={3}
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="State verified boundary coordinates and rationale..."
                className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={submitting}
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleOfficerDecision}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold"
              >
                {submitting ? "Recording..." : "Record Decision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appeals Reviewer Modal */}
      {selectedAppeal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Scale className="text-purple-600" size={18} />
              Appeals Review: {selectedAppeal.case.caseNumber}
            </h3>

            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
              <span className="font-semibold text-slate-700">Driver Defense Statement:</span>
              <p className="text-slate-600 italic">
                "{selectedAppeal.case.appeals[0]?.reason || "No statement provided"}"
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Appeals Ruling</label>
              <select
                value={appealAction}
                onChange={(e) => setAppealAction(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="APPROVED_DISMISSED">
                  Uphold Appeal & Dismiss Fine (Defense Accepted)
                </option>
                <option value="REJECTED">Reject Appeal & Uphold Penalty</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Legal / Reviewer Ruling Notes (Mandatory)
              </label>
              <textarea
                rows={3}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="State grounds for upholding or rejecting the appeal..."
                className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={submitting}
                onClick={() => setSelectedAppeal(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleAppealDecision}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
              >
                {submitting ? "Recording..." : "Issue Final Ruling"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
