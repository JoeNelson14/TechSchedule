import { useContext } from 'react';
import { AuthContext } from './AuthContext.jsx';

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};