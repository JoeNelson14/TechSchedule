import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardSchedules } from "../api/schedules";

const Card = ({ title, subtitle, children }) => (
  <div className="bg-white border rounded-xl shadow-sm flex flex-col min-h-[280px]">
    <div className="p-4 border-b">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
        </div>
      </div>
    </div>
    <div className="p-3 flex-1 overflow-y-auto">{children}</div>
  </div>
);

const Row = ({ to, ro, title, right }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
    <Link to={to} className="min-w-0 flex-1">
      <div className="text-sm font-medium text-gray-900">RO #{ro}</div>
      <div className="text-xs text-gray-600 truncate">{title}</div>
    </Link>
    {right}
  </div>
);

// Main dashboard grid component
const RoDashboardGrid = () => {
  const [data, setData] = useState({
      active_all: [],
      in_progress_mine: [],
      approval_mine: [],
      repair_mine: [],
      completed_mine: []
  });

  // Load dashboard data
  const load = async () => {
    const limit = 12 // Limit to 12 items per category for dashboard view
    const response = await getDashboardSchedules({limit});
    setData(response.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Destructure categories with fallbacks to empty arrays
  const activeAll = data.active_all || [];
  const mineInProgress = data.in_progress_mine || [];
  const mineApproval = data.approval_mine || [];
  const mineRepair = data.repair_mine || [];
  const mineCompleted = data.completed_mine || [];

  // Desktop: 2–3 columns, each card scrolls internally to minimize page scrolling
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Active (all users see all) */}
        <div className="xl:col-span-2">
          <Card title="Active Repair Orders" subtitle="All active ROs in the shop (visible to everyone)">
            {activeAll.length ? (
              <div className="space-y-1">
                {activeAll.map((s) => (
                  <Row
                    key={s.id}
                    to={`/repair-order/${s.ro_number}`} // Link to RO details page
                    ro={s.ro_number}
                    title={s.title}
                    right={<Link to={`/schedules?status=active`} className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800">View</Link>}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 px-2">No active repair orders.</p>
            )}
          </Card>
        </div>

        {/* In Progress (mine) */}
        <Card title="My In Progress" subtitle="Assigned to you • status = in_progress">
          {mineInProgress.length ? (
            <div className="space-y-1">
              {mineInProgress.map((s) => (
                <Row
                  key={s.id}
                  to={`/repair-order/${s.ro_number}`} // Link to RO details page
                  ro={s.ro_number}
                  title={s.title}
                  right={<Link to={`/schedules?status=in_progress`} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">Open</Link>}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 px-2">Nothing in progress.</p>
          )}
        </Card>

        {/* Approval (mine) */}
        <Card title="My Approval" subtitle="Assigned to you • status = approval">
          {mineApproval.length ? (
            <div className="space-y-1">
              {mineApproval.map((s) => (
                <Row
                  key={s.id}
                  to={`/repair-order/${s.ro_number}`} // Link to RO details page
                  ro={s.ro_number}
                  title={s.title}
                  right={<Link to={`/schedules?status=approval`} className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800">Open</Link>}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 px-2">Nothing waiting for approval.</p>
          )}
        </Card>

        {/* Repair (mine) */}
        <Card title="My Repair" subtitle="Assigned to you • status = repair">
          {mineRepair.length ? (
            <div className="space-y-1">
              {mineRepair.map((s) => (
                <Row
                  key={s.id}
                  to={`/repair-order/${s.ro_number}`} // Link to RO details page
                  ro={s.ro_number}
                  title={s.title}
                  right={<Link to={`/schedules?status=repair`} className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800">Open</Link>}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 px-2">Nothing in repair.</p>
          )}
        </Card>

        {/* Completed (mine) */}
        <Card title="My Completed" subtitle="Assigned to you • status = completed">
          {mineCompleted.length ? (
            <div className="space-y-1">
              {mineCompleted.map((s) => (
                <Row
                  key={s.id}
                  to={`/repair-order/${s.ro_number}`} // Link to RO details page
                  ro={s.ro_number}
                  title={s.title}
                  right={<Link to={`/schedules?status=completed`} className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800">View</Link>}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 px-2">No completed ROs yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default RoDashboardGrid;