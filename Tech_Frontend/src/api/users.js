import api from "./axios";

export const getTechnicians = async () => {
  const response = await api.get("/users/technicians");
  return response.data;
};