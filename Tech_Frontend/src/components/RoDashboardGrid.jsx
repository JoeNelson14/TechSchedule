import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { getDashboardSchedules, acceptSchedule } from "../api/schedules";
import AppNav from "./AppNav";
import { useToast } from "./ToastContext";

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

const Row = ({ to, ro, title, right }) => {
  const navigate = useNavigate();

  return (
    <div role="button" tabIndex={0} onClick={() => navigate(to)} onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") navigate(to);
    }}
    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900">RO #{ro}</div>
        <div className="text-xs text-gray-600 truncate">{title}</div>
      </div>
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>{right}</div>
    </div>
  )
}

// Main dashboard grid component
const RoDashboardGrid = () => {
  const { user } = useAuth();
  const toast = useToast();
  

  const [data, setData] = useState({
      active_all: [],
      in_progress_mine: [],
      approval_mine: [],
      repair_mine: [],
      completed_mine: []
  });

  // Track which schedules are currently being accepted to prevent duplicate clicks
  const [ acceptingIds, setAcceptingIds ] = useState(() => new Set()); // Track which schedules are being accepted

  const setAccepting = (scheduleId, isAccepting) => {
    setAcceptingIds((prev) => {
      const next = new Set(prev);
      if (isAccepting) next.add(scheduleId);
      else next.delete(scheduleId);
      return next;
    });
  }

  // Load dashboard data
  const load = async () => {
    const limit = 12 // Limit to 12 items per category for dashboard view
    const response = await getDashboardSchedules({limit});
    setData(response);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = async (scheduleId) => {
    if (acceptingIds.has(scheduleId)) return; // Prevent duplicate clicks
    setAccepting(scheduleId, true);

    try {
      await acceptSchedule(scheduleId);
      toast.success("Repair order accepted.");
      await load(); // Refresh data after accepting
    } catch (error) {
      const status = error?.response?.status;

      if (status === 409) {
        // Another technician accepted it first, show a message and refresh
        toast.error("This repair order was just accepted by another technician.");
        await load();
      } else {
        toast.error(error?.response?.data?.detail || "Failed to accept the repair order.");
      }
    } finally {
      setAccepting(scheduleId, false);
    }
  };

  // Destructure categories with fallbacks to empty arrays
  const activeAll = data.active_all || [];
  const mineInProgress = data.in_progress_mine || [];
  const mineApproval = data.approval_mine || [];
  const mineRepair = data.repair_mine || [];
  const mineCompleted = data.completed_mine || [];

  // Desktop: 2–3 columns, each card scrolls internally to minimize page scrolling
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <AppNav />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
        {/* Active (all users see all) */}
        <div className="xl:col-span-2">
          <Card title="Active Repair Orders" subtitle="All active ROs in the shop">
            {activeAll.length ? (
              <div className="space-y-1">
                {activeAll.map((s) => (
                  <Row
                    key={s.ro_number}
                    to={`/repair-order/${s.ro_number}`} // Link to RO details page
                    ro={s.ro_number}
                    title={s.title}
                    right={
                      user?.role === "technician" ? (
                        <button onClick={() => handleAccept(s.id)} disabled={acceptingIds.has(s.id)} className={`text-xs px-2 py-1 rounded text-white ${acceptingIds.has(s.id) ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                          Accept
                        </button>
                      ) : (
                        <Link to={`/repair-order/${s.ro_number}`} className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800">View</Link>
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 px-2">No active repair orders.</p>
            )}
          </Card>
        </div>

        {/* In Progress (mine) */}
        <Card title="In Progress" subtitle="Assigned to you">
          {mineInProgress.length ? (
            <div className="space-y-1">
              {mineInProgress.map((s) => (
                <Row
                  key={s.ro_number}
                  to={`/repair-order/${s.ro_number}`} // Link to RO details page
                  ro={s.ro_number}
                  title={s.title}
                  right={null} 
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 px-2">Nothing in progress.</p>
          )}
        </Card>

        {/* Approval (mine) */}
        <Card title="Approval" subtitle="Assigned to you">
          {mineApproval.length ? (
            <div className="space-y-1">
              {mineApproval.map((s) => (
                <Row
                  key={s.ro_number}
                  to={`/repair-order/${s.ro_number}`} // Link to RO details page
                  ro={s.ro_number}
                  title={s.title}
                  right={null}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 px-2">Nothing waiting for approval.</p>
          )}
        </Card>

        {/* Repair (mine) */}
        <Card title="Repair" subtitle="Assigned to you">
          {mineRepair.length ? (
            <div className="space-y-1">
              {mineRepair.map((s) => (
                <Row
                  key={s.ro_number}
                  to={`/repair-order/${s.ro_number}`} // Link to RO details page
                  ro={s.ro_number}
                  title={s.title}
                  right={null}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 px-2">Nothing in repair.</p>
          )}
        </Card>

        {/* Completed (mine) */}
        <Card title="Completed" subtitle="Assigned to you">
          {mineCompleted.length ? (
            <div className="space-y-1">
              {mineCompleted.map((s) => (
                <Row
                  key={s.ro_number}
                  to={`/repair-order/${s.ro_number}`} // Link to RO details page
                  ro={s.ro_number}
                  title={s.title}
                  right={null}
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