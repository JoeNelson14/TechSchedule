
const ScheduleTable = ({ schedules }) => {
  return (
    <div className="overflow-x-auto bg-white shadow rounded">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Vehicle</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Technician</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule) => (
            <tr key={schedule.id} className="border-b">
              <td className="px-4 py-3">
                {new Date(schedule.scheduled_date).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                {schedule.customer_name}
              </td>
              <td className="px-4 py-3">
                {schedule.vehicle_year} {schedule.vehicle_make} {schedule.vehicle_model}
              </td>
              <td className="px-4 py-3">
                {schedule.status}
              </td>
              <td className="px-4 py-3">
                {schedule.assigned_technician?.email || "Unassigned"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;