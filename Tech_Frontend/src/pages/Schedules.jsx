import { useEffect, useState } from "react";
import { getSchedules } from "../api/schedules";

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getSchedules();
        setSchedules(data);
      } catch (error) {
        console.error("Error fetching schedules:", error);
      }
    };
    run();
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Schedules</h1>
      <pre className="bg-white p-4 rounded shadow overflow-auto">
        {JSON.stringify(schedules, null, 2)}
      </pre>
    </div>
  );
};

export default Schedules;