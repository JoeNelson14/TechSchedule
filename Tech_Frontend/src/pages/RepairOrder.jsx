import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AppNav from "../components/AppNav";
import { getScheduleByRoNumber, addRecommendedJob, removeRecommendedJob, acceptSchedule, techUpdateSchedule, setPrimaryJobComplete, setRecommendedJobComplete, approveSchedule, getScheduleEvents } from "../api/schedules";
import { getJobs } from "../api/jobApi";
import { useAuth } from "../auth/useAuth";

// Utility to convert minutes to hours, returning null if input is null/undefined
const minutesToHours = (m) => (m == null ? null : Number(m) / 60);

// Utility to format hours with 1 decimal place, or show dash if invalid
const formatHours = (h) => {
  if (h == null || Number.isNaN(Number(h))) return "-";
  return Number(h).toFixed(1);
};

// Utility to display a value or a dash if it's null/undefined/empty
const valueOrDash = (v) => {
  if (v == null) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
};

const getAdvanceConfig = (status, isAdmin) => {
  switch (status) {
    case "active":
      return { label: "Accept & Start", action: "accept" };
    case "in_progress":
      return { label: "Send to Approval / Complete", action: "tech", next: "approval" };
    case "approval":
      if (!isAdmin) return null; // Only admins can approve
      return { label: "Move to Repair", action: "approve" };
    case "repair":
      return { label: "Mark Completed", action: "tech", next: "completed" };
    default:
      return null;
  }
};
const RepairOrder = () => {
  // Get RO number from URL params and auth info
  const { roId } = useParams();
  const { isAdmin, user } = useAuth();

  // State for RO details
  const [ro, setRo] = useState(null);
  const [loading, setLoading] = useState(true);

  // For job search and adding recommended jobs
  const [jobQuery, setJobQuery] = useState("");
  const [jobResults, setJobResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [advancing, setAdvancing] = useState(false);

  // State for schedule events
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Determine if current user can edit this RO (assigned tech or admin, and not completed)
  const canEdit = useMemo(() => {
    if (!ro) return false;
    if (ro.status === "completed") return false;
    if (isAdmin) return true;
    return (
      ro.assigned_technician_id != null &&
      Number(ro.assigned_technician_id) === Number(user?.id)
    );
  }, [ro, isAdmin, user]);

  // Load RO details on mount
  const loadRo = async () => {
  setLoading(true);
  try {
    const data = await getScheduleByRoNumber(roId);
    setRo(data);

    // Load event timeline (keyed by schedule_id)
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

  // Simple debounce for search
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

  // Handler for advancing RO status (accepting, sending to approval, etc.)
  const handleAdvanceStatus = async () => {
    if (!ro) return;

    const cfg = getAdvanceConfig(ro.status, isAdmin);
    if (!cfg) return;

    setAdvancing(true);
    try {
      if (cfg.action === "accept") {
        // Accepting an active schedule moves it to in_progress
        await acceptSchedule(ro.id);
      } else if (cfg.action === "approve") {
        console.log("Finally");
        await approveSchedule(ro.id);
      } else {
        console.log("nope");
        await techUpdateSchedule(ro.id, { status: cfg.next });
      }
      await loadRo();
    } finally {
      setAdvancing(false);
    }
  };

  // Handler for adding a recommended job to the RO
  const handleAddJob = async (jobId) => {
    if (!ro) return;
    await addRecommendedJob(ro.id, { job_id: jobId });
    await loadRo();
    setJobQuery("");
    setJobResults([]);
  };

  // Handler for removing a recommended job from the RO
  const handleRemoveJob = async (recId) => {
    if (!ro) return;
    await removeRecommendedJob(ro.id, recId);
    await loadRo();
  };

 
  // Render loading state, error state, and main RO details
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <AppNav />
        <div className="mt-6">Loading RO...</div>
      </div>
    );
  }

  // RO not found case
  if (!ro) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <AppNav />
        <div className="mt-6">RO not found.</div>
      </div>
    );
  }

  const hasRecs = (ro.recommended_repairs?.trim?.() ? true : false) || ((ro.recommended_jobs?.length ?? 0) > 0);

  const canCompleteNow =
    !!ro.primary_job_completed &&
    (ro.recommended_jobs?.every((j) => !!j.is_completed) ?? true);

  const allJobsCompleted =
    ro.status === "repair" ? canCompleteNow :
    ro.status === "in_progress" ? (!!ro.primary_job_completed && !hasRecs) :
    true;

  
  const cfg = getAdvanceConfig(ro.status, isAdmin);
  const disableAdvance = cfg?.action === "tech" && !allJobsCompleted;


  // Primary service (immutable base job selected when RO was created)
  // Prefer job_description_snapshot if backend provides it; fall back to ro.description.
  const primaryDescription = ro.job_description_snapshot ?? ro.description ?? "";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <AppNav />

      {/* Header */}
      <div className="bg-white shadow rounded p-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">RO #{ro.ro_number}</h1>
          <div className="text-sm text-gray-600 mt-1">
            Status: <span className="font-medium">{ro.status}</span>
            {ro.status === "approval" || ro.is_approved ? (
              <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${ro.is_approved ? "bg-green-500 border-green-600 text-white" : "bg-gray-100 border-gray-300 text-gray-500"}`}
                  title={ro.is_approved ? "Approved" : "Waiting for approval"}>✓</span>
              </div>

            ) : null}
          </div>
        </div>

        {canEdit && ro.status !== "completed" && getAdvanceConfig(ro.status, isAdmin) && (
          <button type="button" disabled={advancing || disableAdvance} onClick={handleAdvanceStatus} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 whitespace-nowrap" title="Advance this repair order to the next stage">
            {advancing ? "Updating..." : getAdvanceConfig(ro.status, isAdmin)?.label}
          </button>
        )}
      </div>

      {/* Customer + Vehicle Info */}
      <div className="bg-white shadow rounded p-5">
        <h2 className="text-lg font-semibold">Customer & Vehicle</h2>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer */}
          <div className="border rounded p-4">
            <div className="font-medium mb-2">Customer Information</div>
            <div className="text-sm text-gray-700">
              <div>
                <span className="text-gray-500">Name:</span>{" "}
                {valueOrDash(ro.customer_name)}
              </div>
              <div className="mt-1">
                <span className="text-gray-500">Phone:</span>{" "}
                {valueOrDash(ro.customer_phone)}
              </div>
              <div className="mt-1">
                <span className="text-gray-500">Email:</span>{" "}
                {valueOrDash(ro.customer_email)}
              </div>
            </div>
          </div>

          {/* Vehicle */}
          <div className="border rounded p-4">
            <div className="font-medium mb-2">Vehicle Information</div>
            <div className="text-sm text-gray-700">
              <div>
                <span className="text-gray-500">Make:</span>{" "}
                {valueOrDash(ro.vehicle_make)}
              </div>
              <div className="mt-1">
                <span className="text-gray-500">Model:</span>{" "}
                {valueOrDash(ro.vehicle_model)}
              </div>
              <div className="mt-1">
                <span className="text-gray-500">Year:</span>{" "}
                {valueOrDash(ro.vehicle_year)}
              </div>
              <div className="mt-1">
                <span className="text-gray-500">VIN:</span>{" "}
                {valueOrDash(ro.vehicle_vin)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Service (immutable) */}
      <div className="bg-white shadow rounded p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Primary Service</h2>
          <div className="text-xs text-gray-500">(Included on RO)</div>
        </div>

        <div className="border rounded p-4">
          <div className="font-medium">{valueOrDash(ro.title)}</div>
          <div className="text-xs text-gray-600 mt-1">Duration: {formatHours(ro.duration_hours)} hrs</div>
          <div className="text-sm text-gray-700 mt-3 whitespace-pre-line">{primaryDescription?.trim() ? primaryDescription : "—"}</div>
          {(ro.status === "repair" || ro.status === "in_progress") && (
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!ro.primary_job_completed} onChange={async (e) => {
                await setPrimaryJobComplete(ro.id, e.target.checked);
                await loadRo();
              }} />
              Mark Complete
            </label>
          )}
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="bg-white shadow rounded p-5 space-y-4">
        <h2 className="text-lg font-semibold">Recommended Jobs</h2>

        {/* Search + results */}
        <div className="space-y-2">
          <input className="w-full border rounded p-2" placeholder={canEdit ? "Search job catalog..." : "Only assigned tech/admin can add jobs"} value={jobQuery} onChange={(e) => setJobQuery(e.target.value)} disabled={!canEdit}/>
          {searching && <div className="text-sm text-gray-500">Searching...</div>}

          {!searching && jobResults.length > 0 && (
            <div className="border rounded divide-y max-h-56 overflow-auto">
              {jobResults.map((job) => (
                <button key={job.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => handleAddJob(job.id)}>
                  <div className="font-medium">{job.title}</div>
                  <div className="text-xs text-gray-600">Duration: {formatHours(job.default_duration_hours)} hrs</div>
                  {job.description?.trim() ? (
                    <div className="text-xs text-gray-700 mt-1 whitespace-pre-line">{job.description}</div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Added jobs list */}
        {ro.recommended_jobs?.length ? (
          <div className="space-y-2">
            {ro.recommended_jobs.map((rec) => (
              <div key={rec.id} className="border rounded p-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium">{rec.job_title_snapshot}</div>
                  <div className="text-xs text-gray-600 mt-1">Duration:{" "}{formatHours(minutesToHours(rec.duration_minutes_snapshot))} hrs</div>
                  <div className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                    {rec.job_description_snapshot?.trim()
                      ? rec.job_description_snapshot
                      : "—"}
                  </div>
                </div>

                {canEdit && ro.status === "repair" && (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!rec.is_completed} onChange={async (e) => {
                      await setRecommendedJobComplete(ro.id, rec.id, e.target.checked);
                      await loadRo();
                    }} />
                    Mark Complete
                  </label>
                )}

                {canEdit && ro.status !== "repair" && (
                  <button className="text-red-600 text-sm whitespace-nowrap" onClick={() => handleRemoveJob(rec.id)} type="button">Remove</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No recommended jobs added yet.</div>
        )}
      </div>

      {/* Event Log */}
      <div className="bg-white shadow rounded p-5 space-y-3">
        <h2 className="text-lg font-semibold">Event Log</h2>

        {loadingEvents ? (
          <div className="text-sm text-gray-500">Loading events...</div>
        ) : events.length ? (
          <div className="border rounded divide-y">
            {events
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id} className="p-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium">{e.event_type}</div>
                    <div className="text-xs text-gray-500">
                      {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                    </div>
                  </div>

                  {(e.from_status || e.to_status) && (
                    <div className="text-xs text-gray-600 mt-1">
                      {valueOrDash(e.from_status)} → {valueOrDash(e.to_status)}
                    </div>
                  )}

                  {e.note?.trim() ? (
                    <div className="text-xs text-gray-700 mt-1 whitespace-pre-line">{e.note}</div>
                  ) : null}

                  {e.actor_id != null ? (
                    <div className="text-xs text-gray-500 mt-1">actor_id: {e.actor_id}</div>
                  ) : null}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No events yet.</div>
        )}
      </div>

    </div>
  );
};

export default RepairOrder;