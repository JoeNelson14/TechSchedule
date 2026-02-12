import { createContext, useEffect, useState } from "react";
import { getCurrentUser } from "../api/auth";

// Create the AuthContext with default value of null
 export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);  // State to hold the current user data
  const [loading, setLoading] = useState(true); // State to indicate if user data is being loaded

  // Function to load the current user data
  const loadUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  //  Load user data on initial mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Login function to save the token and load user data
  const loginUser = (token) => {
    localStorage.setItem('access_token', token);
    loadUser();
  };

  // Logout function to clear the token and user data
  const logoutUser = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginUser,
        logoutUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isTechnician: user?.role === 'technician',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};