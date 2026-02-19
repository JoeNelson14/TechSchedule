import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTodaySchedules } from "../api/schedules";
import LogoutButton from "../components/LogoutButton";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch today's schedules for summary and table
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

  // Compute counts for summary cards
  const counts = useMemo(() => {
    const c = { scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 };
    for (const s of schedules) {
      if (c[s.status] !== undefined) c[s.status] += 1;
    }
    return c;
  }, [schedules]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <LogoutButton />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => navigate("/admin/create-schedule")}>
          Create Schedule
        </button>
        <button className="bg-gray-800 text-white px-4 py-2 rounded" onClick={() => navigate("/jobs")}>
          Service Catalog
        </button>
        <button className="bg-purple-600 text-white px-4 py-2 rounded" onClick={() => navigate("/schedules")}>
          Manage Schedules
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Scheduled" value={counts.scheduled} />
        <SummaryCard label="In Progress" value={counts.in_progress} />
        <SummaryCard label="Completed" value={counts.completed} />
        <SummaryCard label="Cancelled" value={counts.cancelled} />
      </div>

      {/* Today Table */}
      <div className="bg-white shadow rounded">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Today’s Schedule</h2>
          <button className="border px-3 py-1 rounded" onClick={fetchToday}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6">Loading...</div>
        ) : schedules.length === 0 ? (
          <div className="p-6">No appointments scheduled for today.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="px-4 py-3">
                      {s.scheduled_date
                        ? new Date(s.scheduled_date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{s.title}</td>
                    <td className="px-4 py-3">{s.customer_name}</td>
                    <td className="px-4 py-3">
                      {s.vehicle_year} {s.vehicle_make} {s.vehicle_model}
                    </td>
                    <td className="px-4 py-3">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="bg-white shadow rounded p-4">
    <div className="text-sm text-gray-600">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default AdminDashboard;