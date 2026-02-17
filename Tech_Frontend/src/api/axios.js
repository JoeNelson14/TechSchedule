import axios from 'axios';

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
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosApi;