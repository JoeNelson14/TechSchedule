import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import AdminDashboard from "../pages/AdminDashboard";
import TechnicianDashboard from "../pages/TechnicianDashboard";
import RequireAuth from "../auth/RequireAuth";
import { useAuth } from "../auth/useAuth";
import Jobs from "../pages/Jobs";
import CreateJob from "../pages/CreateJob";
import Schedules from "../pages/Schedules";
import CreateSchedule from "../pages/CreateSchedule";
import Landing from "../pages/Landing";
import RepairOrder from "../pages/RepairOrder";
import NotFound from "../pages/NotFound";

// Home route wrapper that optionally redirects authenticated users to their dashboard.
const HomeRoute = () => {
  const { isAuthenticated, loading, isAdmin, isTechnician } = useAuth();

  // Preserve a lightweight loading state while auth context resolves.
  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  // Optional behavior: authenticated users land on their primary dashboard.
  if (isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isTechnician) return <Navigate to="/technician" replace />;
  }

  // Unauthenticated users still see public landing page.
  return <Landing />;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Job routes */}
        <Route
          path="/create-job"
          element={(
            <RequireAuth role="admin">
              <CreateJob />
            </RequireAuth>
          )}
        />
        <Route
          path="/jobs"
          element={(
            <RequireAuth role={["admin", "technician"]}>
              <Jobs />
            </RequireAuth>
          )}
        />

        {/* Schedule routes */}
        <Route
          path="/schedules"
          element={(
            <RequireAuth role={["admin", "technician"]}>
              <Schedules />
            </RequireAuth>
          )}
        />
        <Route
          path="/admin/create-schedule"
          element={(
            <RequireAuth role="admin">
              <CreateSchedule />
            </RequireAuth>
          )}
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={(
            <RequireAuth role="admin">
              <AdminDashboard />
            </RequireAuth>
          )}
        />

        {/* Technician routes */}
        <Route
          path="/technician"
          element={(
            <RequireAuth role="technician">
              <TechnicianDashboard />
            </RequireAuth>
          )}
        />

        {/* Repair order details */}
        <Route
          path="/repair-order/:roId"
          element={(
            <RequireAuth role={["admin", "technician"]}>
              <RepairOrder />
            </RequireAuth>
          )}
        />

        {/* Catch-all fallback for unknown routes. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
