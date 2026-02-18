import api from "./axios";

// Get all jobs
export const getJobs = async () => {
  const response = await api.get("/jobs/");
  return response.data;
}

// Create a new job
export const createJob = async (jobData) => {
  const response = await api.post("/jobs/", jobData);
  return response.data;
}

// Update an existing job by ID
export const updateJob = async (id, jobData) => {
  const response = await api.put(`/jobs/${id}`, jobData);
  return response.data;
}

// Delete a job by ID
export const deleteJob = async (id) => {
  const response = await api.delete(`/jobs/${id}`);
  return response.data;
}