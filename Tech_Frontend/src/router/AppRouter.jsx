import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import AdminDashboard from "../pages/AdminDashboard";
import TechnicianDashboard from "../pages/TechnicianDashboard";
import RequireAuth from "../auth/RequireAuth";
import Jobs from "../pages/Jobs";
import CreateJob from "../pages/CreateJob";
import Schedules from "../pages/Schedules";
import CreateSchedule from "../pages/CreateSchedule";
import Landing from "../pages/Landing";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Job Routes */}
        <Route path="/create-job" element={
          <RequireAuth role="admin">
            <CreateJob />
          </RequireAuth>
        } />
        <Route path="/jobs" element={
          <RequireAuth role= {["admin", "technician"]}>
            <Jobs />
          </RequireAuth>
        } />

        {/* Schedule Routes */}
        <Route path="/schedules" element={
          <RequireAuth role= {["admin", "technician"]}>
            <Schedules />
          </RequireAuth>
        } />
        <Route path="/admin/create-schedule" element={
          <RequireAuth role="admin">
            <CreateSchedule />
          </RequireAuth>
        } />

       {/* Admin Routes */}
        <Route path="/admin" element={
          <RequireAuth role="admin">
            <AdminDashboard />
          </RequireAuth>
        } />

        {/* Technician Routes */}
        <Route path="/technician" element={ 
          <RequireAuth role="technician">
            <TechnicianDashboard />
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}; 
export default AppRouter;