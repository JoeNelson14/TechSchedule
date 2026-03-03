import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FaThumbsDown, FaThumbsUp, FaTrash } from "react-icons/fa";
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

// Infer a role label from event data so human-readable messages can mention who changed something.
const getActorRoleLabel = (event) => {
  const note = String(event?.note ?? "").toLowerCase();
  if (note.includes("admin")) return "admin";
  if (note.includes("technician") || note.includes("tech")) return "technician";
  return "user";
};

// Turn raw events into readable audit messages while keeping status transitions visible in the UI.
const getEventSummaryText = (event) => {
  const jobName = valueOrDash(event?.job_title);
  const actorName = valueOrDash(event?.actor_name);
  const actorRole = getActorRoleLabel(event);

  switch (event?.event_type) {
    case "recommended_job_completed":
      return `Recommended job ${jobName} complete set to True by ${actorName} (${actorRole})`;
    case "recommended_incompleted":
      return `Recommended job ${jobName} complete set to False by ${actorName} (${actorRole})`;
    case "recommended_job_approved":
      return `Recommended job ${jobName} approval set to Approved by ${actorName} (${actorRole})`;
    case "recommended_job_rejected":
      return `Recommended job ${jobName} approval set to Rejected by ${actorName} (${actorRole})`;
    case "recommended_job_added":
      return `Recommended job ${jobName} status set to Added by ${actorName} (${actorRole})`;
    case "recommended_job_deleted":
      return `Recommended job ${jobName} status set to Removed by ${actorName} (${actorRole})`;
    case "primary_job_completed":
      return `Primary job complete set to True by ${actorName} (${actorRole})`;
    case "primary_job_incompleted":
      return `Primary job complete set to False by ${actorName} (${actorRole})`;
    case "approved":
      return `Repair order approval status set to Approved by ${actorName} (${actorRole})`;
    case "accepted":
      return `Repair order status set to In Progress by ${actorName} (${actorRole})`;
    case "status_changed":
      return `Repair order status updated by ${actorName} (${actorRole})`;
    default:
      return `Repair order event ${valueOrDash(event?.event_type)} recorded by ${actorName} (${actorRole})`;
  }
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
  <button
    type="button"
    onClick={onChange}
    className="mt-2 inline-flex items-center hover:scale-105"
    aria-pressed={checked}
  >
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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 rise-in">
      <AppNav />

      <div className="modern-card p-5 flex items-start justify-between gap-4 rise-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">RO #{ro.ro_number}</h1>
          <div className="text-sm text-slate-600 mt-1">Status: <span className="font-medium capitalize">{ro.status}</span></div>
        </div>
        {canEdit && ro.status !== "completed" && cfg && (
          <button
            type="button"
            disabled={advancing || disableAdvance}
            onClick={handleAdvanceStatus}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl disabled:opacity-50 whitespace-nowrap hover:bg-blue-700 hover:-translate-y-0.5"
          >
            {advancing ? "Updating..." : cfg.label}
          </button>
        )}
      </div>

      <div className="modern-card p-5 rise-in">
        <h2 className="text-lg font-semibold">Customer & Vehicle</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-xl p-4 text-sm text-slate-700 flex justify-center">
            <div className="w-full max-w-xs text-left">
              <div><span className="text-slate-500">Name:</span> {valueOrDash(ro.customer_name)}</div>
              <div className="mt-1"><span className="text-slate-500">Phone:</span> {formatPhoneDisplay(ro.customer_phone)}</div>
              <div className="mt-1"><span className="text-slate-500">Email:</span> {valueOrDash(ro.customer_email)}</div>
            </div>
          </div>
          <div className="border border-slate-200 rounded-xl p-4 text-sm text-slate-700 flex justify-center">
            <div className="w-full max-w-xs text-left">
              <div><span className="text-slate-500">Make:</span> {valueOrDash(ro.vehicle_make)}</div>
              <div className="mt-1"><span className="text-slate-500">Model:</span> {valueOrDash(ro.vehicle_model)}</div>
              <div className="mt-1"><span className="text-slate-500">Year:</span> {valueOrDash(ro.vehicle_year)}</div>
              <div className="mt-1"><span className="text-slate-500">VIN:</span> {valueOrDash(ro.vehicle_vin)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="modern-card p-5 space-y-3 rise-in">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Primary Service</h2>
          <div className="text-xs text-slate-500">(Included on RO)</div>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <div className="font-medium">{valueOrDash(ro.title)}</div>
          <div className="text-xs text-slate-600 mt-1">Duration: {formatHours(ro.duration_hours)} hrs</div>
          <div className="text-sm text-slate-700 mt-3 whitespace-pre-line">{primaryDescription?.trim() ? primaryDescription : "—"}</div>
          {(ro.status === "repair" || ro.status === "in_progress") && (
            <CompletionToggle
              checked={!!ro.primary_job_completed}
              onChange={async () => {
                await setPrimaryJobComplete(ro.id, !ro.primary_job_completed);
                await loadRo();
              }}
            />
          )}
        </div>
      </div>

      <div className="modern-card p-5 space-y-4 rise-in">
        <h2 className="text-lg font-semibold">Recommended Jobs</h2>
        <div className="space-y-2">
          <input
            className="w-full border rounded-xl p-2"
            placeholder={canEdit ? "Search job catalog..." : "Only assigned tech/admin can add jobs"}
            value={jobQuery}
            onChange={(e) => setJobQuery(e.target.value)}
            disabled={!canEdit}
          />
          {searching && <div className="text-sm text-slate-500">Searching...</div>}

          {!searching && jobResults.length > 0 && (
            <div className="border border-slate-200 rounded-xl divide-y max-h-56 overflow-auto">
              {jobResults.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50"
                  onClick={() => handleAddJob(job.id)}
                >
                  <div className="font-medium">{job.title}</div>
                  <div className="text-xs text-slate-600">Duration: {formatHours(job.default_duration_hours)} hrs</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {ro.recommended_jobs?.length ? (
          <div className="space-y-2">
            {ro.recommended_jobs.map((rec) => {
              const decision = recommendationDecisions[rec.id];
              const borderClass = decision === "approved" ? "border-green-500" : decision === "rejected" ? "border-red-500" : "border-slate-200";

              return (
                <div key={rec.id} className={`border ${borderClass} rounded-xl p-3 flex items-center justify-between gap-4 hover:shadow-md transition-shadow duration-200`}>
                  <div className="min-w-0">
                    <div className="font-medium">{rec.job_title_snapshot}</div>
                    <div className="text-xs text-slate-600 mt-1">Duration: {formatHours(minutesToHours(rec.duration_minutes_snapshot))} hrs</div>
                    <div className="text-sm text-slate-700 mt-2 whitespace-pre-line">
                      {rec.job_description_snapshot?.trim() ? rec.job_description_snapshot : "—"}
                    </div>
                    {decision && (
                      <div className={`mt-2 text-xs font-medium ${decision === "approved" ? "text-green-600" : "text-red-600"}`}>
                        {decision === "approved" ? "Approved" : "Rejected"}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 min-w-[120px]">
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          aria-label="Approve recommended job"
                          className={`p-2 rounded-full border ${decision === "approved" ? "text-green-600 border-green-300 bg-green-50" : "text-slate-400 border-slate-200"}`}
                          onClick={() => handleRecommendationDecision(rec.id, "approved")}
                        >
                          <FaThumbsUp className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Reject recommended job"
                          className={`p-2 rounded-full border ${decision === "rejected" ? "text-red-600 border-red-300 bg-red-50" : "text-slate-400 border-slate-200"}`}
                          onClick={() => handleRecommendationDecision(rec.id, "rejected")}
                        >
                          <FaThumbsDown className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {canEdit && ro.status === "repair" && (
                      <CompletionToggle
                        checked={!!rec.is_completed}
                        onChange={async () => {
                          await setRecommendedJobComplete(ro.id, rec.id, !rec.is_completed);
                          await loadRo();
                        }}
                      />
                    )}

                    {canEdit && ro.status !== "repair" && (
                      <button
                        className="p-2 rounded-full border border-slate-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveJob(rec.id)}
                        type="button"
                        aria-label="Remove recommended job"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-slate-500">No recommended jobs added yet.</div>
        )}
      </div>

      <div className="modern-card p-5 space-y-3 rise-in">
        <h2 className="text-lg font-semibold">Event Log</h2>
        {loadingEvents ? (
          <div className="text-sm text-slate-500">Loading events...</div>
        ) : events.length ? (
          <div className="border border-slate-200 rounded-xl divide-y">
            {events.slice().reverse().map((e) => (
              <div key={e.id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-medium capitalize">{valueOrDash(e.event_type).replaceAll("_", " ")}</div>
                  <div className="text-xs text-slate-500">{e.created_at ? new Date(e.created_at).toLocaleString() : "—"}</div>
                </div>
                {(e.from_status || e.to_status) && (
                  <div className="text-xs text-slate-600 mt-1">
                    {valueOrDash(e.from_status)} → {valueOrDash(e.to_status)}
                  </div>
                )}
                <div className="text-xs text-slate-700 mt-1">{getEventSummaryText(e)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">No events yet.</div>
        )}
      </div>
    </div>
  );
};

export default RepairOrder;
