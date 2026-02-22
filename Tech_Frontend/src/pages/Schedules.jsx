import { useEffect, useState } from "react";
import { getSchedules, deleteSchedule, acceptSchedule, techUpdateSchedule } from "../api/schedules";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import EditScheduleForm from "../components/EditScheduleForm";
import AppNav from "../components/AppNav";
import { notify } from "../utils/notify";

// Define how many schedules to show per page
const PAGE_SIZE = 10;

const Schedules = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  // State for schedules, loading status, currently editing schedule, filters, and pagination
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  // Fetch schedules from the API with current filters and pagination
  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      };

      // Only apply status filter if one is selected
      if (statusFilter) params.status = statusFilter;

      const data = await getSchedules(params);
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  // Handle admin deleting a schedule
  const handleDelete = async (id) => {
    if (!isAdmin) return;

    // Confirm deletion with the user
    const ok = window.confirm("Are you sure you want to delete this schedule?");
    if (!ok) return;

    try {
      await deleteSchedule(id);
      fetchSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      notify.error("Failed to delete schedule. Please try again.");
    }
  };

  // Handle technician accepting an active schedule, moving it to in_progress
  const handleAccept = async (scheduleId) => {
    try {
      await acceptSchedule(scheduleId);
      fetchSchedules();
    } catch (err) {
      console.error("Accept failed:", err);
      notify.error("Failed to accept this RO.");
    }
  };

  // Handle status updates for technicians (send to approval, move to repair, complete)
  const handleMove = async (scheduleId, status) => {
    try {
      await techUpdateSchedule(scheduleId, { status });
      fetchSchedules();
    } catch (err) {
      console.error("Failed to update RO:", err);
      notify.error("Failed to update RO.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <AppNav />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Schedules</h1>

        {isAdmin && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => navigate("/admin/create-schedule")}>Create Schedule</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium">Status</label>
        <select className="border rounded p-2" value={statusFilter} onChange={(e) => {
            setPage(0);
            setStatusFilter(e.target.value);
          }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="in_progress">In Progress</option>
          <option value="approval">Approval</option>
          <option value="repair">Repair</option>
          <option value="completed">Completed</option>
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
                <th className="px-4 py-3">RO</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {schedules.map((schedule) => {
                const assignedToMe =
                  schedule.assigned_technician_id != null &&
                  user?.id != null &&
                  Number(schedule.assigned_technician_id) === Number(user.id);

                const assignedToAnotherTech =
                  schedule.assigned_technician_id != null && !assignedToMe;

                return (
                  <tr key={schedule.id} className="border-b">
                    <td className="px-4 py-3">{schedule.ro_number}</td>
                    <td className="px-4 py-3">
                      {schedule.scheduled_date
                        ? new Date(schedule.scheduled_date).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{schedule.title}</td>
                    <td className="px-4 py-3">{schedule.customer_name}</td>
                    <td className="px-4 py-3">
                      {schedule.vehicle_year} {schedule.vehicle_make}{" "}
                      {schedule.vehicle_model}
                    </td>
                    <td className="px-4 py-3">{schedule.status}</td>

                    {/* Actions */}
                    <td className="px-4 py-3 space-x-2">
                      {isAdmin ? (
                        <>
                          <button className="bg-gray-700 text-white px-3 py-1 rounded" onClick={() => setEditingSchedule(schedule)}>Edit</button>
                          <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => handleDelete(schedule.id)}>Delete</button>
                        </>
                      ) : (
                        <>
                          {/* TECH ACTIONS */}
                          {schedule.status === "active" ? (
                            assignedToAnotherTech ? (
                              <span className="text-gray-500">Assigned to another tech</span>
                            ) : (
                              <button className="bg-emerald-600 text-white px-3 py-1 rounded" onClick={() => handleAccept(schedule.id)}>Accept</button>
                            )
                          ) : assignedToMe ? (
                            <>
                              {schedule.status === "in_progress" && (
                                <>
                                  <button className="bg-gray-900 text-white px-3 py-1 rounded" onClick={() => handleMove(schedule.id, "approval")} title="Sends RO to approval (auto-completes if no recommended repairs)">Send to Approval</button>
                                  <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => handleMove(schedule.id, "completed")}>Complete</button>
                                </>
                              )}

                              {schedule.status === "approval" && (
                                <button className="bg-purple-600 text-white px-3 py-1 rounded" onClick={() => handleMove(schedule.id, "repair")}>Move to Repair</button>
                              )}

                              {schedule.status === "repair" && (
                                <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => handleMove(schedule.id, "completed")}>Complete</button>
                              )}

                              {schedule.status === "completed" && (
                                <span className="text-gray-500">—</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-500">
                              Assigned to another tech
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <button className="bg-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50" onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={page === 0 || loading}>Prev</button>

        <div className="text-sm">Page {page + 1}</div>

        <button className="border px-3 py-2 rounded disabled:opacity-50" disabled={loading || schedules.length < PAGE_SIZE} onClick={() => setPage((prev) => prev + 1)}>Next</button>
      </div>

      {/* Edit Modal (Admin only) */}
      {isAdmin && editingSchedule && (
        <Modal title={`Edit Schedule #${editingSchedule.id}`} onClose={() => setEditingSchedule(null)}>
          <EditScheduleForm schedule={editingSchedule} onCancel={() => setEditingSchedule(null)} onSaved={() => {
              setEditingSchedule(null);
              fetchSchedules();
            }}/>
        </Modal>
      )}
    </div>
  );
};

export default Schedules;