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

// Update schedule status (TECHNICIAN ONLY)
export const updateScheduleStatus = async (id, status) => {
  const response = await api.patch(`/schedules/${id}/status`, { status });
  return response.data;
};

// Get today's schedules (ADMIN & TECHNICIAN)
export const getTodaySchedules = async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const response = await api.get("/schedules/date-range/", {
    params: { start_date: start.toISOString(), end_date: end.toISOString() },
  });
  return response.data;
};