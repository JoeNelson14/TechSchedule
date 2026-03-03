import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// Shared style helper for navigation links so active route is visually highlighted.
const linkClass = ({ isActive }) => `px-3 py-2 rounded-xl transition-all duration-200 hover:bg-slate-100 hover:-translate-y-0.5 ${isActive ? "bg-slate-200 font-semibold shadow-sm" : "text-slate-600"}`;

export default function AppNav() {
  // Read authenticated user and logout action from auth context.
  const { user, logoutUser } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTech = user?.role === "technician";

  return (
    <header className="bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-2xl">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left side nav links in the exact order requested. */}
        <nav className="flex items-center gap-2 text-sm">
          <NavLink to="/" className={({ isActive }) => `${linkClass({ isActive })} text-base font-extrabold tracking-tight`}>
            TechSchedule
          </NavLink>
          {isAdmin && <NavLink to="/admin" className={linkClass}>Dashbaord</NavLink>}
          {isTech && <NavLink to="/technician" className={linkClass}>Dashbaord</NavLink>}
          <NavLink to="/schedules" className={linkClass}>Schedules</NavLink>
          {isAdmin && <NavLink to="/jobs" className={linkClass}>Service Catalog</NavLink>}
        </nav>

        {/* Right side account details + logout action. */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{user?.email} ({user?.role})</span>
          <button onClick={logoutUser} className="px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm transition-colors duration-200">Logout</button>
        </div>
      </div>
    </header>
  );
}
