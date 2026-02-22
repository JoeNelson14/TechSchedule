import api from "./axios";

//  Get all schedules with optional filters
export const getSchedules = async (params = {}) => {
  //  params can include: technician_id, date, status
  const response = await api.get("/schedules/", { params });
  return response.data;
};

// Get a single schedule by ID
export const getScheduleById = async (id) => {
  const response = await api.get(`/schedules/${id}`);
  return response.data;
};

// Create a new schedule (ADMIN ONLY)
export const createSchedule = async (scheduleData) => {
  const response = await api.post("/schedules/", scheduleData);
  return response.data;
};

// Update an existing schedule (ADMIN ONLY)
export const updateSchedule = async (id, scheduleData) => {
  const response = await api.put(`/schedules/${id}`, scheduleData);
  return response.data;
};

// Delete a schedule (ADMIN ONLY)
export const deleteSchedule = async (id) => {
  const response = await api.delete(`/schedules/${id}`);
  return response.data;
};

// Get schedules for a specific date range (ADMIN & TECHNICIAN)
export const getSchedulesByDateRange = async (start_date, end_date) => {
  // start_date and end_date should be in YYYY-MM-DD format
  const response = await api.get("/schedules/date-range/", {
    params: { start_date, end_date },
  });
  return response.data;
};

// Get schedule details by RO number (ADMIN & TECHNICIAN)
export const getScheduleByRoNumber = async (roNumber) => {
  const response = await api.get(`/schedules/repair-order/${roNumber}`);
  return response.data;
};

// Admin approves a schedule that's waiting for approval, moving it to repair
export const addRecommendedJob = async (scheduleId, payload) => {
  const response = await api.post(`/schedules/${scheduleId}/recommended-jobs/`, payload);
  return response.data;
}
// Admin removes a recommended job from a schedule
export const removeRecommendedJob = async (scheduleId, recId) => {
  const response = await api.delete(`/schedules/${scheduleId}/recommended-jobs/${recId}`);
  return response.data;
}

/**
 * Technician workflow (new lifecycle)
 * Status lifecycle:
 * active -> in_progress -> (approval -> repair) -> completed
 * Special rule: in_progress -> approval auto-completes if no recommended repairs.
 */
// Technician accepts an active schedule, moving it to in_progress
export const acceptSchedule = async (id) => {
  const response = await api.post(`/schedules/${id}/accept`, null, { skipGlobalError: true });
  return response.data;
};
// Technician marks an in_progress schedule as completed (with optional recommended repairs)
export const techUpdateSchedule = async (id, payload) => {
  const response = await api.patch(`/schedules/${id}/tech`, payload);
  return response.data;
};

/**
 * Dashboard (single endpoint)
 * Returns:
 * {
 *   active_all: [...],
 *   in_progress_mine: [...],
 *   approval_mine: [...],
 *   repair_mine: [...],
 *   completed_mine: [...]
 * }
 */
// Get categorized schedules for dashboard view
export const getDashboardSchedules = async (params) => {
  const response = await api.get("/schedules/dashboard", { params });
  return response.data;
}