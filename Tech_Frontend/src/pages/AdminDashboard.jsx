import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNav from "../components/AppNav";
import { getDashboardSchedules } from "../api/schedules";
import { useAuth } from "../auth/useAuth";

const SectionCard = ({ title, subtitle, children }) => (
  <div className="bg-white border rounded-xl shadow-sm flex flex-col min-h-[300px]">
    <div className="p-4 border-b flex items-start justify-between gap-3">
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle ? <div className="text-xs text-gray-500 mt-1">{subtitle}</div> : null}
      </div>
    </div>
    <div className="p-3 flex-1 overflow-y-auto">{children}</div>
  </div>
);

const RoRow = ({ s }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
    <div className="min-w-0">
      <div className="text-sm font-semibold text-gray-900">RO #{s.ro_number}</div>
      <div className="text-xs text-gray-600 truncate">{s.title}</div>
      <div className="text-xs text-gray-500 mt-1">
        {s.customer_name} • {s.vehicle_year} {s.vehicle_make} {s.vehicle_model}
      </div>
    </div>
    <div className="shrink-0 text-xs text-gray-500">{s.status}</div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState({
    active_all: [],
    in_progress_mine: [],
    approval_mine: [],
    repair_mine: [],
    completed_mine: []
  });
  const [loading, setLoading] = useState(true);
  
  // Load all dashboard data in one request.
  const load = async () => {
    setLoading(true);
    try {
      const res = await getDashboardSchedules({ limit: 12 });
      setData(res);
    } catch (err) {
      console.error("Failed to load dashboard schedules:", err);
      setData({
        active_all: [],
        in_progress_mine: [],
        approval_mine: [],
        repair_mine: [],
        completed_mine: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Memoize counts for summary cards
  const counts = useMemo(() => {
    const c = { active: 0, in_progress: 0, approval: 0, repair: 0, completed: 0 };
    if (!data) return c;

    // active_all is global; the rest are mine
    c.active = data.active_all?.length ?? 0;
    c.in_progress = data.in_progress_mine?.length ?? 0;
    c.approval = data.approval_mine?.length ?? 0;
    c.repair = data.repair_mine?.length ?? 0;
    c.completed = data.completed_mine?.length ?? 0;

    return c;
  }, [data]);

  const activeAll = data?.active_all ?? [];
  const inProgressMine = data?.in_progress_mine ?? [];
  const approvalMine = data?.approval_mine ?? [];
  const repairMine = data?.repair_mine ?? [];
  const completedMine = data?.completed_mine ?? [];

  return (
    <>
      <AppNav />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header + Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="text-sm text-gray-600">All-time RO overview (role-aware)</div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700" onClick={() => navigate("/admin/create-schedule")}>Create RO</button>
            <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800" onClick={() => navigate("/jobs")}>Service Catalog</button>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700" onClick={() => navigate("/schedules")}>Manage Repair Orders</button>
            <button className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50" onClick={load}>Refresh</button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="Active" value={counts.active} />
          <SummaryCard label="My In Progress" value={counts.in_progress} />
          <SummaryCard label="My Approval" value={counts.approval} />
          <SummaryCard label="My Repair" value={counts.repair} />
          <SummaryCard label="My Completed" value={counts.completed} />
        </div>

        {/* Sections grid (min scrolling: cards scroll internally) */}
        {loading ? (
          <div className="bg-white border rounded-xl p-6">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Active (All) */}
            <div className="xl:col-span-2">
              <SectionCard
                title="Active Repair Orders"
                subtitle="Visible to everyone • status = active"
              >
                {activeAll.length ? (
                  <div className="space-y-1">
                    {activeAll.map((s) => (
                      <RoRow key={s.id} s={s} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 px-2">No active repair orders.</div>
                )}
              </SectionCard>
            </div>

            <SectionCard title="My In Progress" subtitle={`Assigned to you • status = in_progress`}>
              {inProgressMine.length ? (
                <div className="space-y-1">
                  {inProgressMine.map((s) => (
                    <RoRow key={s.id} s={s} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 px-2">None.</div>
              )}
            </SectionCard>

            <SectionCard title="My Approval" subtitle="Assigned to you • status = approval">
              {approvalMine.length ? (
                <div className="space-y-1">
                  {approvalMine.map((s) => (
                    <RoRow key={s.id} s={s} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 px-2">None.</div>
              )}
            </SectionCard>

            <SectionCard title="My Repair" subtitle="Assigned to you • status = repair">
              {repairMine.length ? (
                <div className="space-y-1">
                  {repairMine.map((s) => (
                    <RoRow key={s.id} s={s} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 px-2">None.</div>
              )}
            </SectionCard>
  
            <SectionCard title="My Completed" subtitle="Assigned to you • status = completed">
              {completedMine.length ? (
                <div className="space-y-1">
                  {completedMine.map((s) => (
                    <RoRow key={s.id} s={s} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 px-2">None.</div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="bg-white border rounded-xl shadow-sm p-4">
    <div className="text-sm text-gray-600">{label}</div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
  </div>
);

export default AdminDashboard;