import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const linkClass = ({ isActive }) => `px-3 py-2 rounded hover:bg-gray-100 ${isActive ? "bg-gray-200 font-medium" : ""}`;

export default function AppNav() {
  const { user, logoutUser } = useAuth();

  const isAdmin = user?.role === "admin";
  const isTech = user?.role === "technician";

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-900">TechSchedule</span>

          <nav className="flex items-center gap-2 text-sm">
            <NavLink to="/" className={linkClass}>Home</NavLink>

            {/* Common */}
            <NavLink to="/schedules" className={linkClass}>Schedules</NavLink>

            {/* Admin-only */}
            {isAdmin && (
              <>
                <NavLink to="/admin" className={linkClass}>Dashboard</NavLink>
                <NavLink to="/jobs" className={linkClass}>Service Catalog</NavLink>
              </>
            )}

            {/* Technician-only */}
            {isTech && (
              <NavLink to="/technician" className={linkClass}>Dashboard</NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.email} ({user?.role}) </span>
          <button onClick={logoutUser} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm">Logout</button>
        </div>
      </div>
    </header>
  );
}