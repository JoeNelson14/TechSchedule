import api from "./axios";

//  Get all schedules with optional filters
export const getSchedules = async (params = {}) => {
  //  params can include: technician_id, date, status
  const response = await api.get("/schedules", { params });
  return response.data;
};

// New function to get schedules by date range
export const getScheduleByDateRange = async (start_date, end_date) => {
  // start_date and end_date should be in YYYY-MM-DD format
  const response = await api.get("/schedules/date-range", {
    params: { start_date, end_date },
  });
  return response.data;
};