import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const LogoutButton = () => {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login", { replace: true });
  };

  return (
    <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 ml-4 rounded">
      Logout
    </button>
  );
};

export default LogoutButton;