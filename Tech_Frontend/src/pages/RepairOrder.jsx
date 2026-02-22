import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AppNav from "../components/AppNav";
import { getScheduleByRoNumber, addRecommendedJob, removeRecommendedJob } from "../api/schedules";
import { getJobs } from "../api/jobApi";
import { useAuth } from "../auth/useAuth";

const minutesToHours = (m) => (m == null ? null : Number(m) / 60);

const formatHours = (h) => {
  if (h == null || Number.isNaN(h)) return "-";
  return Number(h).toFixed(1);
}

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

  // Determine if current user can edit this RO (assigned tech or admin, and not completed)
  const canEdit = useMemo(() => {
    if (!ro) return false;
    if (ro.status === "completed") return false;
    if (isAdmin) return true;
    return ro.assigned_technician_id != null && Number(ro.assigned_technician_id) === Number(user?.id);
  }, [ro, isAdmin, user]);

  // Load RO details on mount
  const loadRo = async () => {
    setLoading(true);
    try {
      const data = await getScheduleByRoNumber(roId);
      setRo(data);
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

  // Handler for adding a recommended job to the RO
  const handleAddJob = async (jobId) => {
    if (!ro) return;
    await addRecommendedJob(ro.id, { job_id: jobId });
    await loadRo();
    setJobQuery("");
    setJobResults([]);
  };

  // Optional: handle removing a recommended job if you want that functionality
  const handleRemoveJob = async (recId) => {
    if (!ro) return;
    await removeRecommendedJob(ro.id, recId);
    await loadRo();
  };

  // Helper to format ISO datetime for input[type=datetime-local]
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <AppNav />
        <div className="mt-6">Loading RO...</div>
      </div>
    );
  }

  // If RO not found or error, show message
  if (!ro) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <AppNav />
        <div className="mt-6">RO not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <AppNav />
      {/* Header */}
      <div className="bg-white shadow rounded p-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">RO #{ro.ro_number}</h1>
          <div className="text-sm text-gray-600 mt-1">
            Status: <span className="font-medium">{ro.status}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Customer: <span className="font-medium">{ro.customer_name}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Vehicle:{" "}
            <span className="font-medium">
              {ro.vehicle_year} {ro.vehicle_make} {ro.vehicle_model}
            </span>
          </div>
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
                  <div className="text-xs text-gray-600">
                    Duration: {formatHours(job.default_duration_hours)} hrs
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Added jobs list */}
        {ro.recommended_jobs?.length ? (
          <div className="space-y-2">
            {ro.recommended_jobs.map((rec) => (
              <div key={rec.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{rec.job_title_snapshot}</div>
                  <div className="text-xs text-gray-600">
                    Duration: {minutesToHours(rec.duration_minutes_snapshot)} hrs
                  </div>
                </div>

                {canEdit && (
                  <button className="text-red-600 text-sm" onClick={() => handleRemoveJob(rec.id)} type="button">Remove</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No recommended jobs added yet.</div>
        )}
      </div>
    </div>
  );
};

export default RepairOrder;