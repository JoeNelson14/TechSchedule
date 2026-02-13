import { useEffect, useState } from "react";
import { getSchedules } from "../api/schedules";
import ScheduleTable from "../components/ScheduleTable";

const TechnicianDashboard = () => {
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
      <h1 className="text-2xl font-bold mb-4">Technician Dashboard</h1>
      <ScheduleTable schedules={schedules} />
    </div>
  );
};

export default TechnicianDashboard;