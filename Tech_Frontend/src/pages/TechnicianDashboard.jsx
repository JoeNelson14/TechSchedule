import { useEffect, useMemo, useState } from "react";
import { getTodaySchedules } from "../api/schedules";
import LogoutButton from "../components/LogoutButton";
import { useAuth } from "../auth/useAuth";
import { updateScheduleStatus } from "../api/schedules";

const TechnicianDashboard = () => {
  const { user } = useAuth();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch today's schedules assigned to this technician
  const fetchToday = async () => {
    setLoading(true);
    try {
      const data = await getTodaySchedules();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch today's schedules:", err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  // Only show schedules assigned to me (backend might already filter, but this is safe UX)
  const mySchedules = useMemo(() => {
    if (!user?.id) return schedules;
    return schedules.filter((s) => s.assigned_technician_id === user.id);
  }, [schedules, user]);

  // Handle status updates (start/complete)
  const handleStatus = async (id, status) => {
    try {
      await updateScheduleStatus(id, status);
      fetchToday();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Could not update status.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Technician Dashboard</h1>
          <div className="text-sm text-gray-600">
            Today’s assigned work
          </div>
        </div>
        <LogoutButton />
      </div>

      {/* Today List */}
      <div className="bg-white shadow rounded">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">My Jobs Today</h2>
          <button className="border px-3 py-1 rounded" onClick={fetchToday}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6">Loading...</div>
        ) : mySchedules.length === 0 ? (
          <div className="p-6">No assigned appointments for today.</div>
        ) : (
          <div className="divide-y">
            {mySchedules.map((s) => (
              <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {s.title}{" "}
                    <span className="text-sm text-gray-500">
                      ({s.duration_minutes ?? 60} min)
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {s.scheduled_date
                      ? new Date(s.scheduled_date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}{" "}
                    • {s.customer_name} • {s.vehicle_year} {s.vehicle_make}{" "}
                    {s.vehicle_model}
                  </div>
                  <div className="text-sm mt-1">
                    Status: <span className="font-medium">{s.status}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {s.status === "scheduled" && (
                    <button className="bg-yellow-500 text-white px-3 py-2 rounded" onClick={() => handleStatus(s.id, "in_progress")}>
                      Start
                    </button>
                  )}
                  {s.status === "in_progress" && (
                    <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={() => handleStatus(s.id, "completed")}>
                      Complete
                    </button>
                  )}
                  {(s.status === "completed" || s.status === "cancelled") && (
                    <span className="text-gray-500 px-3 py-2">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianDashboard;