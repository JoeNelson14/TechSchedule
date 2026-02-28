import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FaThumbsDown, FaThumbsUp } from "react-icons/fa";
import AppNav from "../components/AppNav";
import {
  getScheduleByRoNumber,
  addRecommendedJob,
  removeRecommendedJob,
  acceptSchedule,
  techUpdateSchedule,
  setPrimaryJobComplete,
  setRecommendedJobComplete,
  setRecommendedJobApproval,
  approveSchedule,
  getScheduleEvents,
} from "../api/schedules";
import { getJobs } from "../api/jobApi";
import { useAuth } from "../auth/useAuth";

// Convert minute values returned by the backend into hour values for display.
const minutesToHours = (m) => (m == null ? null : Number(m) / 60);

// Keep displayed hour values consistent with a single decimal place.
const formatHours = (h) => {
  if (h == null || Number.isNaN(Number(h))) return "-";
  return Number(h).toFixed(1);
};

// Show a dash for empty values to keep UI rows aligned and readable.
const valueOrDash = (v) => {
  if (v == null) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
};

// Reuse the same phone format shown in create flow for read-only display.
const formatPhoneDisplay = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 10);
  if (digits.length !== 10) return valueOrDash(value);
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

// Define next-step button behavior by current status and role.
const getAdvanceConfig = (status, isAdmin) => {
  switch (status) {
    case "active":
      return { label: "Accept & Start", action: "accept" };
    case "in_progress":
      return { label: "Send to Approval / Complete", action: "tech", next: "approval" };
    case "approval":
      if (!isAdmin) return null;
      return { label: "Move to Repair", action: "approve" };
    case "repair":
      return { label: "Mark Completed", action: "tech", next: "completed" };
    default:
      return null;
  }
};

// Compact checkmark toggle used for primary/recommended completion tracking.
const CompletionToggle = ({ checked, onChange }) => (
  <button type="button" onClick={onChange} className="mt-2 inline-flex items-center" aria-pressed={checked}>
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
        checked ? "border-green-600 bg-green-500 text-white" : "border-gray-300 bg-white text-gray-400"
      }`}
      aria-hidden="true"
    >
      ✓
    </span>
  </button>
);

const RepairOrder = () => {
  const { roId } = useParams();
  const { isAdmin, user } = useAuth();

  // Page-level state for RO data and background loading flags.
  const [ro, setRo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobQuery, setJobQuery] = useState("");
  const [jobResults, setJobResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Allow edits only for admins or assigned technician while not completed.
  const canEdit = useMemo(() => {
    if (!ro || ro.status === "completed") return false;
    if (isAdmin) return true;
    return ro.assigned_technician_id != null && Number(ro.assigned_technician_id) === Number(user?.id);
  }, [ro, isAdmin, user]);

  // Reduce event history into latest approval decision per recommended job.
  const recommendationDecisions = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (e.recommended_job_id && (e.recommendation_decision === "approved" || e.recommendation_decision === "rejected")) {
        map[e.recommended_job_id] = e.recommendation_decision;
      }
    });
    return map;
  }, [events]);

  // Shared refresh helper to reload RO details and its event timeline.
  const loadRo = async () => {
    setLoading(true);
    try {
      const data = await getScheduleByRoNumber(roId);
      setRo(data);
      setLoadingEvents(true);
      try {
        const evt = await getScheduleEvents(data.id);
        setEvents(Array.isArray(evt) ? evt : []);
      } finally {
        setLoadingEvents(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roId]);

  // Debounced catalog lookup for recommended job search.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!jobQuery.trim()) {
        setJobResults([]);
        return;
      }
      setSearching(true);
      try {
        const jobs = await getJobs({ q: jobQuery.trim(), limit: 10 });
        setJobResults(Array.isArray(jobs) ? jobs : []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [jobQuery]);

  // Advance RO through lifecycle states based on status transition config.
  const handleAdvanceStatus = async () => {
    if (!ro) return;
    const cfg = getAdvanceConfig(ro.status, isAdmin);
    if (!cfg) return;

    setAdvancing(true);
    try {
      if (cfg.action === "accept") {
        await acceptSchedule(ro.id);
      } else if (cfg.action === "approve") {
        await approveSchedule(ro.id);
      } else {
        await techUpdateSchedule(ro.id, { status: cfg.next });
      }
      await loadRo();
    } finally {
      setAdvancing(false);
    }
  };

  // Add selected catalog job as a recommended job on the current RO.
  const handleAddJob = async (jobId) => {
    if (!ro) return;
    await addRecommendedJob(ro.id, { job_id: jobId });
    await loadRo();
    setJobQuery("");
    setJobResults([]);
  };

  // Remove an existing recommended job from the RO.
  const handleRemoveJob = async (recId) => {
    if (!ro) return;
    await removeRecommendedJob(ro.id, recId);
    await loadRo();
  };

  // Admin-only approve/reject interaction for recommended jobs.
  const handleRecommendationDecision = async (recId, decision) => {
    if (!ro || !isAdmin) return;
    await setRecommendedJobApproval(ro.id, recId, decision);
    await loadRo();
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-6"><AppNav /><div className="mt-6">Loading RO...</div></div>;
  }
  if (!ro) {
    return <div className="max-w-5xl mx-auto px-4 py-6"><AppNav /><div className="mt-6">RO not found.</div></div>;
  }

  // Completion gate checks for status transition button.
  const canCompleteNow = !!ro.primary_job_completed && (ro.recommended_jobs?.every((j) => !!j.is_completed) ?? true);
  const allJobsCompleted = ro.status === "repair" ? canCompleteNow : ro.status === "in_progress" ? !!ro.primary_job_completed : true;
  const cfg = getAdvanceConfig(ro.status, isAdmin);
  const disableAdvance = cfg?.action === "tech" && !allJobsCompleted;
  const primaryDescription = ro.job_description_snapshot ?? ro.description ?? "";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <AppNav />
      <div className="bg-white shadow rounded p-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">RO #{ro.ro_number}</h1>
          <div className="text-sm text-gray-600 mt-1">Status: <span className="font-medium">{ro.status}</span></div>
        </div>
        {canEdit && ro.status !== "completed" && cfg && (
          <button type="button" disabled={advancing || disableAdvance} onClick={handleAdvanceStatus} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 whitespace-nowrap">
            {advancing ? "Updating..." : cfg.label}
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded p-5">
        <h2 className="text-lg font-semibold">Customer & Vehicle</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded p-4 text-sm text-gray-700">
            <div><span className="text-gray-500">Name:</span> {valueOrDash(ro.customer_name)}</div>
            <div className="mt-1"><span className="text-gray-500">Phone:</span> {formatPhoneDisplay(ro.customer_phone)}</div>
            <div className="mt-1"><span className="text-gray-500">Email:</span> {valueOrDash(ro.customer_email)}</div>
          </div>
          <div className="border rounded p-4 text-sm text-gray-700">
            <div><span className="text-gray-500">Make:</span> {valueOrDash(ro.vehicle_make)}</div>
            <div className="mt-1"><span className="text-gray-500">Model:</span> {valueOrDash(ro.vehicle_model)}</div>
            <div className="mt-1"><span className="text-gray-500">Year:</span> {valueOrDash(ro.vehicle_year)}</div>
            <div className="mt-1"><span className="text-gray-500">VIN:</span> {valueOrDash(ro.vehicle_vin)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded p-5 space-y-3">
        <div className="flex items-start justify-between gap-4"><h2 className="text-lg font-semibold">Primary Service</h2><div className="text-xs text-gray-500">(Included on RO)</div></div>
        <div className="border rounded p-4">
          <div className="font-medium">{valueOrDash(ro.title)}</div>
          <div className="text-xs text-gray-600 mt-1">Duration: {formatHours(ro.duration_hours)} hrs</div>
          <div className="text-sm text-gray-700 mt-3 whitespace-pre-line">{primaryDescription?.trim() ? primaryDescription : "—"}</div>
          {(ro.status === "repair" || ro.status === "in_progress") && (
            <CompletionToggle checked={!!ro.primary_job_completed} onChange={async () => { await setPrimaryJobComplete(ro.id, !ro.primary_job_completed); await loadRo(); }} />
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded p-5 space-y-4">
        <h2 className="text-lg font-semibold">Recommended Jobs</h2>
        <div className="space-y-2">
          <input className="w-full border rounded p-2" placeholder={canEdit ? "Search job catalog..." : "Only assigned tech/admin can add jobs"} value={jobQuery} onChange={(e) => setJobQuery(e.target.value)} disabled={!canEdit} />
          {searching && <div className="text-sm text-gray-500">Searching...</div>}
          {!searching && jobResults.length > 0 && (
            <div className="border rounded divide-y max-h-56 overflow-auto">
              {jobResults.map((job) => (
                <button key={job.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => handleAddJob(job.id)}>
                  <div className="font-medium">{job.title}</div>
                  <div className="text-xs text-gray-600">Duration: {formatHours(job.default_duration_hours)} hrs</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {ro.recommended_jobs?.length ? (
          <div className="space-y-2">
            {ro.recommended_jobs.map((rec) => {
              const decision = recommendationDecisions[rec.id];
              const borderClass = decision === "approved" ? "border-green-500" : decision === "rejected" ? "border-red-500" : "border-gray-200";
              return (
                <div key={rec.id} className={`border rounded p-3 flex items-start justify-between gap-4 ${borderClass}`}>
                  <div className="min-w-0">
                    <div className="font-medium">{rec.job_title_snapshot}</div>
                    <div className="text-xs text-gray-600 mt-1">Duration: {formatHours(minutesToHours(rec.duration_minutes_snapshot))} hrs</div>
                    <div className="text-sm text-gray-700 mt-2 whitespace-pre-line">{rec.job_description_snapshot?.trim() ? rec.job_description_snapshot : "—"}</div>
                    {decision && <div className={`mt-2 text-xs font-medium ${decision === "approved" ? "text-green-600" : "text-red-600"}`}>{decision === "approved" ? "Approved" : "Rejected"}</div>}
                  </div>

                  <div className="flex items-start gap-3">
                    {isAdmin && (
                      <div className="flex items-center gap-2 mt-1">
                        <button type="button" aria-label="Approve recommended job" className={`${decision === "approved" ? "text-green-600" : "text-gray-400"}`} onClick={() => handleRecommendationDecision(rec.id, "approved")}>
                          <FaThumbsUp className="h-5 w-5" />
                        </button>
                        <button type="button" aria-label="Reject recommended job" className={`${decision === "rejected" ? "text-red-600" : "text-gray-400"}`} onClick={() => handleRecommendationDecision(rec.id, "rejected")}>
                          <FaThumbsDown className="h-5 w-5" />
                        </button>
                      </div>
                    )}

                    {canEdit && ro.status === "repair" && (
                      <CompletionToggle checked={!!rec.is_completed} onChange={async () => { await setRecommendedJobComplete(ro.id, rec.id, !rec.is_completed); await loadRo(); }} />
                    )}

                    {canEdit && ro.status !== "repair" && (
                      <button className="text-red-600 text-sm whitespace-nowrap" onClick={() => handleRemoveJob(rec.id)} type="button">Remove</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="text-sm text-gray-500">No recommended jobs added yet.</div>}
      </div>

      <div className="bg-white shadow rounded p-5 space-y-3">
        <h2 className="text-lg font-semibold">Event Log</h2>
        {loadingEvents ? <div className="text-sm text-gray-500">Loading events...</div> : events.length ? (
          <div className="border rounded divide-y">
            {events.slice().reverse().map((e) => (
              <div key={e.id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-medium">{e.event_type}</div>
                  <div className="text-xs text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleString() : "—"}</div>
                </div>
                {(e.from_status || e.to_status) && <div className="text-xs text-gray-600 mt-1">{valueOrDash(e.from_status)} → {valueOrDash(e.to_status)}</div>}
                {e.job_title && <div className="text-xs text-gray-700 mt-1">Job: {e.job_title}</div>}
                {e.actor_name && <div className="text-xs text-gray-500 mt-1">User: {e.actor_name}</div>}
                {e.note?.trim() ? <div className="text-xs text-gray-700 mt-1 whitespace-pre-line">{e.note}</div> : null}
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-gray-500">No events yet.</div>}
      </div>
    </div>
  );
};

export default RepairOrder;
