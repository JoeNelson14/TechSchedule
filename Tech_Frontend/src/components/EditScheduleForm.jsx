import { useEffect, useState } from "react";
import { updateSchedule } from "../api/schedules";
import { getTechnicians } from "../api/users";

const toDatetimeLocal = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const pad = (num) => num.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoString = (datetimeLocal) => {
  if (!datetimeLocal) return null;
  const date = new Date(datetimeLocal);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const EditScheduleForm = ({ schedule, onSaved, onCancel }) => {
  const [technicians, setTechnicians] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(true);

  const [title, setTitle] = useState(schedule.title || "");
  const [description, setDescription] = useState(schedule.description || "");
  const [scheduledDate, setScheduledDate] = useState(
    toDatetimeLocal(schedule.scheduled_date)
  );
  const [durationHours, setDurationHours] = useState(
    schedule.durationHours ?? 1
  );
  const [status, setStatus] = useState(schedule.status || "scheduled");
  const [assignedTechnicianId, setAssignedTechnicianId] = useState(
    schedule.assigned_technician_id ? String(schedule.assigned_technician_id) : ""
  );
  const [notes, setNotes] = useState(schedule.notes || "");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTechs = async () => {
      try {
        const data = await getTechnicians();
        setTechnicians(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load technicians:", e);
        setTechnicians([]);
      } finally {
        setLoadingTechs(false);
      }
    };
    loadTechs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // backend supports partial updates, so we send only editable fields
      const payload = {
        title,
        description: description || null,
        scheduled_date: toIsoString(scheduledDate),
        duration_hours: Number(durationHours),
        status,
        assigned_technician_id: assignedTechnicianId
          ? Number(assignedTechnicianId)
          : null,
        notes: notes || null,
      };

      await updateSchedule(schedule.id, payload);
      onSaved(); // refresh list + close modal
    } catch (err) {
      console.error("Update schedule failed:", err);
      alert("Update failed. Check console/network.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        className="border rounded p-2 w-full"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <textarea
        className="border rounded p-2 w-full"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Description (optional)"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Date/Time</label>
          <input
            className="border rounded p-2 w-full"
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Duration</label>
          <input className="border rounded p-2 w-full" type="number" min="0" step="0.1" value={durationHours} onChange={(e) => setDurationHours(e.target.value)}/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select className="border rounded p-2 w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="approval">Waiting for Approval</option>
            <option value="repair">In Repair</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Technician</label>
          <select className="border rounded p-2 w-full" value={assignedTechnicianId} onChange={(e) => setAssignedTechnicianId(e.target.value)} disabled={loadingTechs}>
            <option value="">{loadingTechs ? "Loading..." : "Unassigned"}</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <textarea className="border rounded p-2 w-full" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal notes (optional)"/>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="border px-4 py-2 rounded">Cancel</button>
      </div>
    </form>
  );
};

export default EditScheduleForm;