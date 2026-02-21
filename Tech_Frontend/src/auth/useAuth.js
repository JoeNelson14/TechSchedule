import { useContext } from "react";
import AuthContext from "./AuthContext";

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);