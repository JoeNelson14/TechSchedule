import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSchedule } from "../api/schedules";
import { getTechnicians } from "../api/users";
import { getJobs } from "../api/jobApi"; // make sure you have this

const CreateSchedule = () => {
  const navigate = useNavigate();

  const [technicians, setTechnicians] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(true);

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Job template selection
  const [jobId, setJobId] = useState("");

  // Optional override description (pre-filled from job template)
  const [description, setDescription] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");

  const [scheduledDate, setScheduledDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [status, setStatus] = useState("scheduled");

  const [assignedTechId, setAssignedTechId] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Find selected job object
  const selectedJob = useMemo(() => {
    const idNum = jobId ? Number(jobId) : null;
    if (!idNum) return null;
    return jobs.find((j) => j.id === idNum) || null;
  }, [jobId, jobs]);

  // Load technicians + jobs on mount
  useEffect(() => {
    const loadTechs = async () => {
      try {
        const data = await getTechnicians();
        setTechnicians(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching technicians:", error);
        setTechnicians([]);
      } finally {
        setLoadingTechs(false);
      }
    };

    const loadJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching job templates:", error);
        setJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    };

    loadTechs();
    loadJobs();
  }, []);

  // When job selection changes, auto-fill duration + description (only if empty / first time)
  useEffect(() => {
    if (!selectedJob) return;

    // Always set duration to default if user hasn't changed it yet
    // (If you want "manual override", remove this line)
    if (selectedJob.default_duration_minutes) {
      setDurationMinutes(selectedJob.default_duration_minutes);
    }

    // Only auto-fill description if it's empty
    if (!description && selectedJob.description) {
      setDescription(selectedJob.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob]);

  const toIsoString = (datetimeLocal) => {
    if (!datetimeLocal) return null;
    return new Date(datetimeLocal).toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!jobId) {
        alert("Please select a job.");
        return;
      }

      const payload = {
        job_id: Number(jobId),

        description: description || null,

        customer_name: customerName,
        customer_phone: customerPhone || null,
        customer_email: customerEmail || null,

        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: vehicleYear ? Number(vehicleYear) : null,

        scheduled_date: toIsoString(scheduledDate),
        duration_minutes: Number(durationMinutes),
        status,

        assigned_technician_id: assignedTechId ? Number(assignedTechId) : null,
        notes: notes || null,
      };

      await createSchedule(payload);
      navigate("/schedules");
    } catch (error) {
      console.error("Error creating schedule:", error);
      alert("Failed to create schedule. Please check the console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Schedule</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Template */}
        <section className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="font-semibold">Service</h2>

          <div>
            <label className="block text-sm font-medium mb-1">
              Job Template
            </label>
            <select className="border rounded p-2 w-full" value={jobId} onChange={(e) => setJobId(e.target.value)} disabled={loadingJobs} required>
              <option value="">
                {loadingJobs ? "Loading..." : "Select a service"}
              </option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.default_duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          <textarea className="border rounded p-2 w-full" placeholder="Description (optional override)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}/>
        </section>

        {/* Customer Info */}
        <section className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="font-semibold">Customer</h2>
          <input className="border rounded p-2 w-full" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border rounded p-2 w-full" placeholder="Customer Phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}/>
            <input className="border rounded p-2 w-full" placeholder="Customer Email (optional)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}/>
          </div>
        </section>

        {/* Vehicle Info */}
        <section className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="font-semibold">Vehicle</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="border rounded p-2 w-full" placeholder="Make (e.g., Toyota)" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} required/>
            <input className="border rounded p-2 w-full" placeholder="Model (e.g., Camry)" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} required/>
            <input className="border rounded p-2 w-full" placeholder="Year (e.g., 2020)" type="number" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} min="1900" max="2100" required/>
          </div>
        </section>

        {/* Schedule Info */}
        <section className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="font-semibold">Schedule</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Scheduled Date & Time
              </label>
              <input className="border rounded p-2 w-full" type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required/>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Duration (minutes)
              </label>
              <input className="border rounded p-2 w-full" type="number" min="15" step="15" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} required/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="border rounded p-2 w-full" value={status} onChange={(e) => setStatus(e.target.value)} required>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Assign Technician (optional)
              </label>
              <select className="border rounded p-2 w-full" value={assignedTechId} onChange={(e) => setAssignedTechId(e.target.value)} disabled={loadingTechs}>
                <option value="">
                  {loadingTechs ? "Loading..." : "Unassigned"}
                </option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea className="border rounded p-2 w-full" placeholder="Internal Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}/>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {submitting ? "Creating..." : "Create Schedule"}
          </button>
          <button type="button" className="border px-4 py-2 rounded" onClick={() => navigate("/schedules")} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSchedule;