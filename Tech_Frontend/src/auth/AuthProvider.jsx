import { useEffect, useState } from "react";
import { getCurrentUser } from "../api/auth";
import AuthContext from "./AuthContext";

export const AuthProvider = ({ children }) => {
  // State to hold user data and loading status
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to load user data from the API
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

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    // If token exists, try to load user data
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Save token and load user data on login
  const loginUser = (token) => {
    localStorage.setItem("access_token", token);
    loadUser();
  };

  // Clear token and user data on logout
  const logoutUser = () => {
    localStorage.removeItem("access_token");
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
        isAdmin: user?.role === "admin",
        isTechnician: user?.role === "technician",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};