import axiosApi from "./axios";

// Get all jobs
export const getJobs = async () => {
  const reponse = await axiosApi.get("/jobs");
  return reponse.data;
}

// Create a new job
export const createJob = async (jobData) => {
  const response = await axiosApi.post("/jobs", jobData);
  return response.data;
}

// Update an existing job by ID
export const updateJob = async (id, jobData) => {
  const response = await axiosApi.put(`/jobs/${id}`, jobData);
  return response.data;
}

// Delete a job by ID
export const deleteJob = async (id) => {
  const response = await axiosApi.delete(`/jobs/${id}`);
  return response.data;
}