import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// Shared style helper for nav links so active route is visually highlighted.
const linkClass = ({ isActive }) => `px-3 py-2 rounded hover:bg-gray-100 ${isActive ? "bg-gray-200 font-medium" : ""}`;

export default function AppNav() {
  // Read authenticated user + logout action from auth context.
  const { user, logoutUser } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTech = user?.role === "technician";

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left side nav links in the exact order requested. */}
        <nav className="flex items-center gap-2 text-sm">
          <NavLink to="/" className={linkClass}>TechSchedule</NavLink>
          {isAdmin && <NavLink to="/admin" className={linkClass}>Dashbaord</NavLink>}
          {isTech && <NavLink to="/technician" className={linkClass}>Dashbaord</NavLink>}
          <NavLink to="/schedules" className={linkClass}>Schedules</NavLink>
          {isAdmin && <NavLink to="/jobs" className={linkClass}>Service Catalog</NavLink>}
        </nav>

        {/* Right side account details + logout action. */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.email} ({user?.role})</span>
          <button onClick={logoutUser} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm">Logout</button>
        </div>
      </div>
    </header>
  );
}
