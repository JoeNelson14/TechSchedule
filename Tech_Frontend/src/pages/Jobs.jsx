import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import Modal from "../components/Modal";
import { getJobs, createJob, updateJob, deleteJob } from "../api/jobApi";
import AppNav from "../components/AppNav";
import { notify } from "../utils/notify";

// Form state for create/edit
const emptyForm = {
  title: "",
  description: "",
  default_duration_hours: 1,
};

// Jobs page component
const Jobs = () => {
  const { isAdmin } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await getJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching jobs:", e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Modal handlers
  const openCreate = () => {
    setForm(emptyForm);
    setIsCreateOpen(true);
  };

  // Open edit modal
  const openEdit = (job) => {
    setEditingJob(job);
    setForm({
      title: job.title ?? "",
      description: job.description ?? "",
      default_duration_hours: job.default_duration_hours ?? 1,
    });
  };

  // Close all modals
  const closeModals = () => {
    setIsCreateOpen(false);
    setEditingJob(null);
    setForm(emptyForm);
    setSaving(false);
  };

  // Form change handler
  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Create job handler
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    try {
      await createJob({
        title: form.title.trim(),
        description: form.description.trim() || null,
        default_duration_hours: Number(form.default_duration_hours),
      });
      closeModals();
      fetchJobs();
    } catch (err) {
      console.error("Create job failed:", err);
      notify.error("Failed to create job template. Check console/network.");
      setSaving(false);
    }
  };

  // Update job handler
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!isAdmin || !editingJob) return; 

    setSaving(true);
    try {
      await updateJob(editingJob.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        default_duration_hours: Number(form.default_duration_hours),
      });
      closeModals();
      fetchJobs();
    } catch (err) {
      console.error("Update job failed:", err);
      notify.error("Failed to update job template. Check console/network.");
      setSaving(false);
    }
  };

  // Delete job handler
  const handleDelete = async (jobId) => {
    if (!isAdmin) return;

    const ok = window.confirm("Delete this job template?");
    if (!ok) return;

    try {
      await deleteJob(jobId);
      fetchJobs();
    } catch (err) {
      console.error("Delete job failed:", err);
      notify.error("Failed to delete job template.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <AppNav />
      {/* Header */}
      <div className="flex items-center justify-between mb-4 mt-4">
        <h1 className="text-2xl font-bold">Service Catalog</h1>

        {isAdmin && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={openCreate}>
            New Service
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded">
        {loading ? (
          <div className="p-6">Loading services...</div>
        ) : jobs.length === 0 ? (
          <div className="p-6">No services found.</div>
        ) : (
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Duration (hours)</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{job.title}</td>
                  <td className="px-4 py-3">
                    {job.default_duration_hours ?? 1} hr
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {job.description || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button className="border px-3 py-1 rounded" onClick={() => openEdit(job)}>View</button>

                    {isAdmin && (
                      <>
                        <button className="bg-gray-700 text-white px-3 py-1 rounded" onClick={() => openEdit(job)}>Edit</button>
                        <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => handleDelete(job.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {isAdmin && isCreateOpen && (
        <Modal title="New Service Template" onClose={closeModals}>
          <JobForm form={form} onChange={onChange} onSubmit={handleCreate} onCancel={closeModals} saving={saving} submitLabel="Create"/>
        </Modal>
      )}

      {/* Edit/View Modal */}
      {editingJob && (
        <Modal title={isAdmin ? `Edit Service #${editingJob.id}` : `Service #${editingJob.id}`} onClose={closeModals}>
          <JobForm form={form} onChange={onChange} onSubmit={isAdmin ? handleUpdate : (e) => e.preventDefault()} onCancel={closeModals} saving={saving} submitLabel={isAdmin ? "Save" : "Close"} readOnly={!isAdmin} />
        </Modal>
      )}
    </div>
  );
};

const JobForm = ({form, onChange, onSubmit, onCancel, saving, submitLabel, readOnly = false,}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input className="border rounded p-2 w-full" value={form.title} onChange={(e) => onChange("title", e.target.value)} required disabled={readOnly}/>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Duration (hours)
        </label>
        <input className="border rounded p-2 w-full" type="number" min="0" step="0.1" value={form.default_duration_hours} onChange={(e) => onChange("default_duration_hours", e.target.value)} required disabled={readOnly}/>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea className="border rounded p-2 w-full" rows={4} value={form.description} onChange={(e) => onChange("description", e.target.value)} disabled={readOnly}/>
      </div>

      {/* Buttons */}
      {readOnly ? (
        // Technician view: only one Close button
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="border px-4 py-2 rounded">Close</button>
        </div>
      ) : (
        // Admin view: Save + Cancel
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {saving ? "Saving..." : submitLabel}
          </button>

          <button type="button" onClick={onCancel} disabled={saving} className="border px-4 py-2 rounded">Cancel</button>
        </div>
      )}
    </form>
  );
};

export default Jobs;
