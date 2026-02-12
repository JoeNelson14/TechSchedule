import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import AdminDashboard from "../pages/AdminDashboard";
import TechnicianDashboard from "../pages/TechnicianDashboard";
import RequireAuth from "../auth/RequireAuth";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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