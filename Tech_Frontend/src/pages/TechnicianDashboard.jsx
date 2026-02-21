import { useEffect, useState } from "react";
import AppNav from "../components/AppNav";
import { useAuth } from "../auth/useAuth";
import { acceptSchedule, getDashboardSchedules, techUpdateSchedule } from "../api/schedules";

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

const RoRow = ({ s, right }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
    <div className="min-w-0">
      <div className="text-sm font-semibold text-gray-900">RO #{s.ro_number}</div>
      <div className="text-xs text-gray-600 truncate">{s.title}</div>
      <div className="text-xs text-gray-500 mt-1">
        {s.customer_name} • {s.vehicle_year} {s.vehicle_make} {s.vehicle_model}
      </div>
    </div>
    <div className="shrink-0">{right}</div>
  </div>
);

const InProgressRow = ({ s, onSendApproval, onComplete }) => {
  const [repairs, setRepairs] = useState(s.recommended_repairs ?? "");

  return (
    <div className="px-3 py-3 rounded-lg border hover:bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">RO #{s.ro_number}</div>
          <div className="text-xs text-gray-600 truncate">{s.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            {s.customer_name} • {s.vehicle_year} {s.vehicle_make} {s.vehicle_model}
          </div>
        </div>

        <button
          className="px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700"
          onClick={() => onComplete(s.id)}
          title="Complete without approval"
        >
          Complete
        </button>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Recommended repairs (leave blank to auto-complete when sending to approval)
        </label>
        <textarea
          className="w-full border rounded-lg p-2 text-sm"
          rows={2}
          value={repairs}
          onChange={(e) => setRepairs(e.target.value)}
          placeholder="e.g., Replace brake pads, align wheels..."
        />
      </div>

      <div className="mt-3 flex justify-end">
        <button
          className="px-3 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-gray-800"
          onClick={() => onSendApproval(s.id, repairs)}
        >
          Send to Approval
        </button>
      </div>
    </div>
  );
};

const TechnicianDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState({
    active_all: [],
    in_progress_mine: [],
    approval_mine: [],
    repair_mine: [],
    completed_mine: []
  });
  const [loading, setLoading] = useState(true);

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

  // Handle technician accepting an active schedule, moving it to in_progress
  const handleAccept = async (scheduleId) => {
    try {
      await acceptSchedule(scheduleId);
      await load();
    } catch (err) {
      console.error("Accept failed:", err);
      alert("Could not accept this RO.");
    }
  };

  // Handle send to approval with optional recommended repairs
  const handleSendApproval = async (scheduleId, recommendedRepairs) => {
    try {
      // backend applies rule: if recommended_repairs is empty, status becomes completed
      await techUpdateSchedule(scheduleId, {
        recommended_repairs: recommendedRepairs?.trim() ? recommendedRepairs : null,
        status: "approval",
      });
      await load();
    } catch (err) {
      console.error("Send to approval failed:", err);
      alert("Could not send to approval.");
    }
  };

  // For simplicity, handle both "Move to Repair" and "Complete" from the in_progress card, since the backend rule auto-completes if no recommended repairs.
  const handleMoveToRepair = async (scheduleId) => {
    try {
      await techUpdateSchedule(scheduleId, { status: "repair" });
      await load();
    } catch (err) {
      console.error("Move to repair failed:", err);
      alert("Could not move to repair.");
    }
  };
  // Handle complete directly from the repair card
  const handleComplete = async (scheduleId) => {
    try {
      await techUpdateSchedule(scheduleId, { status: "completed" });
      await load();
    } catch (err) {
      console.error("Complete failed:", err);
      alert("Could not complete this RO.");
    }
  };

  const activeAll = data?.active_all ?? [];
  const inProgressMine = data?.in_progress_mine ?? [];
  const approvalMine = data?.approval_mine ?? [];
  const repairMine = data?.repair_mine ?? [];
  const completedMine = data?.completed_mine ?? [];

  return (
    <>
      <AppNav />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Technician Dashboard</h1>
            <div className="text-sm text-gray-600">All-time RO workflow</div>
          </div>

          <button className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50" onClick={load}>Refresh</button>
        </div>

        {loading ? (
          <div className="bg-white border rounded-xl p-6">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Active (all) */}
            <div className="xl:col-span-2">
              <SectionCard title="Active Repair Orders" subtitle="Everyone can see these • status = active">
                {activeAll.length ? (
                  <div className="space-y-1">
                    {activeAll.map((s) => (
                      <RoRow
                        key={s.id}
                        s={s}
                        right={
                          <button className="px-3 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleAccept(s.id)}>Accept</button>
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 px-2">No active repair orders.</div>
                )}
              </SectionCard>
            </div>

            {/* In Progress (mine) */}
            <SectionCard title="My In Progress" subtitle="Assigned to you • status = in_progress">
              {inProgressMine.length ? (
                <div className="space-y-2">
                  {inProgressMine.map((s) => (
                    <InProgressRow key={s.id} s={s} onSendApproval={handleSendApproval} onComplete={handleComplete} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 px-2">Nothing in progress.</div>
              )}
            </SectionCard>

            {/* Approval (mine) */}
            <SectionCard title="My Approval" subtitle="Assigned to you • status = approval">
              {approvalMine.length ? (
                <div className="space-y-1">
                  {approvalMine.map((s) => (
                    <RoRow
                      key={s.id}
                      s={s}
                      right={
                        <button className="px-3 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-gray-800" onClick={() => handleMoveToRepair(s.id)}>Move to Repair</button>
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 px-2">Nothing waiting for approval.</div>
              )}
            </SectionCard>

            {/* Repair (mine) */}
            <SectionCard title="My Repair" subtitle="Assigned to you • status = repair">
              {repairMine.length ? (
                <div className="space-y-1">
                  {repairMine.map((s) => (
                    <RoRow
                      key={s.id}
                      s={s}
                      right={
                        <button className="px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700" onClick={() => handleComplete(s.id)}>Complete</button>
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 px-2">Nothing in repair.</div>
              )}
            </SectionCard>

            {/* Completed (mine) */}
            <SectionCard title="My Completed" subtitle="Assigned to you • status = completed">
              {completedMine.length ? (
                <div className="space-y-1">
                  {completedMine.map((s) => (
                    <RoRow key={s.id} s={s} right={<span className="text-xs text-gray-500">—</span>} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 px-2">No completed ROs yet.</div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </>
  );
};

export default TechnicianDashboard;