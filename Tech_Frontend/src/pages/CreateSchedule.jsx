import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSchedule } from "../api/schedules";
import { getTechnicians } from "../api/users";
import { getJobs } from "../api/jobApi";
import { notify } from "../utils/notify";

// Format a phone number as xxx-xxx-xxxx while user types.
const formatPhoneInput = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

// Remove non-digits so validation/submission can reliably check phone length.
const toPhoneDigits = (value) => value.replace(/\D/g, "");

const CreateSchedule = () => {
  const navigate = useNavigate();

  // State for technicians and loading status.
  const [technicians, setTechnicians] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(true);

  // State for job template selection and loading status.
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Form state for job/service details.
  const [jobId, setJobId] = useState("");
  const [description, setDescription] = useState("");

  // Form state for customer information.
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Form state for vehicle information.
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleVin, setVehicleVin] = useState("");

  // Form state for schedule information.
  const [scheduledDate, setScheduledDate] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [status, setStatus] = useState("active");

  // Form state for assignment and optional notes.
  const [assignedTechId, setAssignedTechId] = useState("");
  const [notes, setNotes] = useState("");

  // Track submit-in-progress so button can be disabled.
  const [submitting, setSubmitting] = useState(false);

  // Resolve selected job object from id so defaults can be auto-filled.
  const selectedJob = useMemo(() => {
    const idNum = jobId ? Number(jobId) : null;
    if (!idNum) return null;
    return jobs.find((j) => j.id === idNum) || null;
  }, [jobId, jobs]);

  // Load technicians and job templates on first render.
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

  // When a job is selected, prefill duration and (if empty) description.
  useEffect(() => {
    if (!selectedJob) return;

    if (selectedJob.default_duration_hours) {
      setDurationHours(selectedJob.default_duration_hours);
    }

    if (!description && selectedJob.description) {
      setDescription(selectedJob.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob]);

  // Convert datetime-local browser value to backend ISO string.
  const toIsoString = (datetimeLocal) => {
    if (!datetimeLocal) return null;
    return new Date(datetimeLocal).toISOString();
  };

  // Submit schedule creation payload after client-side validation.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const vin = vehicleVin.trim().toUpperCase();
    const phoneDigits = toPhoneDigits(customerPhone.trim());
    const formattedPhone = phoneDigits ? formatPhoneInput(phoneDigits) : "";
    const email = customerEmail.trim().toLowerCase();

    if (vin.length !== 17) {
      notify.error("VIN must be exactly 17 characters.");
      setSubmitting(false);
      return;
    }

    if (phoneDigits && phoneDigits.length !== 10) {
      notify.error("Phone number must be 10 digits.");
      setSubmitting(false);
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notify.error("Invalid email address.");
      setSubmitting(false);
      return;
    }

    try {
      if (!jobId) {
        notify.error("Please select a job template.");
        setSubmitting(false);
        return;
      }

      const payload = {
        job_id: Number(jobId),
        description: description || null,
        customer_name: customerName,
        customer_phone: formattedPhone || null,
        customer_email: email || null,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: Number(vehicleYear),
        vehicle_vin: vin,
        scheduled_date: toIsoString(scheduledDate),
        duration_hours: Number(durationHours),
        status,
        assigned_technician_id: assignedTechId ? Number(assignedTechId) : null,
        notes: notes || null,
      };

      await createSchedule(payload);
      navigate("/schedules");
    } catch (error) {
      console.error("Error creating schedule:", error);
      notify.error("Failed to create schedule. Please check the console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Schedule</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="font-semibold">Service</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Job Template</label>
            <select className="border rounded p-2 w-full" value={jobId} onChange={(e) => setJobId(e.target.value)} disabled={loadingJobs} required>
              <option value="">{loadingJobs ? "Loading..." : "Select a service"}</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          <textarea className="border rounded p-2 w-full" placeholder="Description (optional override)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </section>

        <section className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="font-semibold">Customer</h2>
          <input className="border rounded p-2 w-full" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded p-2 w-full"
              placeholder="Customer Phone (optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(formatPhoneInput(e.target.value))}
              inputMode="numeric"
              maxLength={12}
            />
            <input className="border rounded p-2 w-full" placeholder="Customer Email (optional)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </div>
        </section>

        <section className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="font-semibold">Vehicle</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="border rounded p-2 w-full" placeholder="Make (e.g., Toyota)" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} required />
            <input className="border rounded p-2 w-full" placeholder="Model (e.g., Camry)" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} required />
            <input className="border rounded p-2 w-full" placeholder="Year (e.g., 2020)" type="number" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} min="1900" max="2100" required />
            <input className="border rounded p-2 w-full" placeholder="VIN" value={vehicleVin} onChange={(e) => setVehicleVin(e.target.value.toUpperCase())} required minLength={17} maxLength={17} />
          </div>
        </section>

        <section className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="font-semibold">Schedule</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Date & Time</label>
              <input className="border rounded p-2 w-full" type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration (hours)</label>
              <input className="border rounded p-2 w-full" type="number" min="0" step="0.1" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="border rounded p-2 w-full" value={status} onChange={(e) => setStatus(e.target.value)} required>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="approval">Approval</option>
                <option value="repair">Repair</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Assign Technician (optional)</label>
              <select className="border rounded p-2 w-full" value={assignedTechId} onChange={(e) => setAssignedTechId(e.target.value)} disabled={loadingTechs}>
                <option value="">{loadingTechs ? "Loading..." : "Unassigned"}</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>{tech.email}</option>
                ))}
              </select>
            </div>
          </div>
          <textarea className="border rounded p-2 w-full" placeholder="Internal Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </section>

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
