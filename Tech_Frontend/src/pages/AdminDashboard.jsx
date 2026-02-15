import { useEffect, useState } from "react";
import { getSchedules } from "../api/schedules";
import ScheduleTable from "../components/ScheduleTable";
import LogoutButton from "../components/LogoutButton";

const AdminDashboard = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const data = await getSchedules();
        setSchedules(data);
      } catch (error) {
        console.error("Failed to fetch schedules", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  if (loading) return <div className="p-6">Loading schedules...</div>;

  return (
    <div className="p-6">
      <h1 className="inline text-2xl font-bold mb-4 pr-6">Admin Dashboard</h1>
      <button className="bg-green-500 text-white py-2 px-4 rounded mb-4" onClick={() => window.location.href = "/create-job"}>
        Create New Job
      </button>
      <button className="bg-blue-500 text-white py-2 px-4 rounded mb-4 ml-4" onClick={() => window.location.href = "/jobs"}>
        View Jobs
      </button>
      <button className="bg-yellow-500 text-white py-2 px-4 rounded mb-4 ml-4" onClick={() => window.location.href = "/technicians"}>
        Manage Technicians
      </button>
      <button className="bg-purple-500 text-white py-2 px-4 rounded mb-4 ml-4" onClick={() => window.location.href = "/schedules"}>
        Manage Schedules
      </button>
      <LogoutButton />
      <ScheduleTable schedules={schedules} />
    </div>
  );
};

export default AdminDashboard;