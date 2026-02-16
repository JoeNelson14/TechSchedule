import { useEffect, useState } from "react";
import { getSchedules, deleteSchedule } from "../api/schedules";
import { useAuth } from "../auth/useAuth";

const PAGE_SIZE = 10;

const Schedules = () => {
  const { isAdmin } = useAuth();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params = {skip: page * PAGE_SIZE, limit: PAGE_SIZE};
      
      if(statusFilter) params.status = statusFilter;

      const data = await getSchedules(params);
      setSchedules(data);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [page, statusFilter]);

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    const ok = window.confirm("Are you sure you want to delete this schedule?");
    if (!ok) return;

    try {
      await deleteSchedule(id);
      fetchSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Failed to delete schedule. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Schedules</h1>

        {/* Admin-only button to Create Schedule */}
        {isAdmin && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => alert("Next step: Create Schedule form")}>
            Create Schedule
          </button>
        )}   
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <lable className="text-sm font-medium">Status</lable>
        <select className="border rounded p-2" value={statusFilter} onChange={(e) => {
          setPage(0);
          setStatusFilter(e.target.value);
        }}>
          <option value="">All</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {/* Schedule Table */}
      <div className="overflow-x-auto bg-white shadow rounded">
        {loading ? (
          <div className="p-6">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="p-6">No schedules found.</div>
        ) : (
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="border-b">
                  <td className="px-4 py-3">{
                    schedule.scheduled_date
                      ? new Date(schedule.scheduled_date).toLocaleString()
                      : "-"
                  }</td>
                  <td className="px-4 py-3">{schedule.title}</td>
                  <td className="px-4 py-3">{schedule.customer_name}</td>
                  <td className="px-4 py-3">{schedule.vehicle_year} {schedule.vehicle_make} {schedule.vehicle_model}</td>
                  <td className="px-4 py-3">{schedule.status}</td>

                  {isAdmin && (
                    <td className="px-4 py-3 space-x-2">
                      <button className="bg-gray-700 text-white px-3 py-1 rounded" onClick={() => alert(`Next step: Edit Schedule ${schedule.id}`)}>
                        Edit
                      </button>
                      <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => handleDelete(schedule.id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <button className="bg-gray-300 text-gray-700 px-3 py-1 rounded" onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={page === 0 || loading}>
          Prev
        </button>

        <div className="text-sm">Page {page + 1}</div>

        <button className="border px-3 py-2 rounded disabled:opacity-50" disabled={loading || schedules.length < PAGE_SIZE} onClick={() => setPage((prev) => prev + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default Schedules;