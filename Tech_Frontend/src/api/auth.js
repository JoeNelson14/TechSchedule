import api from './axios';

// Authentication API functions
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// New function to register a user with a specified role
export const register = async (email, password, role) => {
  const response = await api.post('/auth/register', { email, password, role });
  return response.data;
};

// Function to get the current authenticated user's information
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};