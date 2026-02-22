import axios from 'axios';
import { notify } from '../utils/notify';

// Create an Axios instance with the base URL from environment variables
const axiosApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor to add the access token to headers
axiosApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    // If the token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Return the modified config
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors globally
axiosApi.interceptors.response.use(
  // If the response is successful, just return it
  (response) => response,
  // If there's an error, check if it's a 401 Unauthorized
  (error) => {
    const status = error?.response?.status;

    const data = error?.response?.data || {};
    const code = data?.code;
    const message = data?.detail || error?.message || "Unexpected error";

    if (status === 401) {
      localStorage.removeItem('access_token'); // Remove the token from local storage
      window.location.href = '/login'; // Redirect to the login page
      return Promise.reject(error);
    }

    if (!error.config?.skipGlobalError) {
      if (status === 403) {
        notify.error("You don't have permission to perform this action.");
      } else if (status === 404) {
        notify.error("The requested resource was not found.");
      } else if (status === 409) {
        if (code === "RO_ALREADY_ACCEPTED") {
          notify.info("Another Technician has already accepted this repair order.");
        } else if (code === "RO_NOT_ACTIVE") {
          notify.info("This repair order is currently not active.");
        } else {
          notify.info(message);
        }
      } else if (status === 422) {
        notify.error(message);
      } else {
        notify.error(message);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosApi;