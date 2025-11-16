// src/admin/ApplicationsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { listApplications, updateStatus, getApplication } from "./api/adminApi";
import ApplicationModal from "./ApplicationModal";

/* UI helpers */
const STATUS_COLORS = {
  pending:  "bg-yellow-100 text-amber-900 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};
const STATUS_OPTIONS = ["all", "pending", "approved", "rejected"]; // reviewing removed

const normalize = (a) => ({
  ...a,
  status: (a.status || "pending").toString().toLowerCase(),
});

function StatusPill({ status }) {
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full border capitalize ${
        STATUS_COLORS[status] || "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {status}
    </span>
  );
}

function MetricTile({ value, label, tint = "amber" }) {
  const bgMap = {
    amber: "from-[#fff7e6] to-[#fff3d6]",
    green: "from-[#effdf3] to-[#e9faef]",
    red:   "from-[#fff1f0] to-[#ffe8e6]",
    gray:  "from-[#f9fafb] to-[#f3f4f6]",
  };
  return (
    <div className={`rounded-xl border border-[var(--line-amber)] bg-gradient-to-br ${bgMap[tint]} shadow-sm`}>
      <div className="px-5 py-4">
        <div className="text-2xl font-semibold text-[var(--brown-700)] text-center leading-none">{value}</div>
        <div className="text-xs text-[var(--brown-700)]/70 text-center mt-1">{label}</div>
      </div>
    </div>
  );
}

/* Row: View only */
function Row({ app, onView }) {
  const initials = app.companyName?.[0]?.toUpperCase() ?? "F";
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-gradient-to-br from-[#fffdf5] to-[#fffaf0] px-5 py-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 grid place-items-center rounded-full bg-[var(--orange-600)] text-white font-semibold">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--brown-700)] truncate">{app.companyName}</div>
          <div className="text-sm text-[var(--brown-700)]/70 truncate">{app.email}</div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[var(--line-amber)] text-[var(--brown-700)]/80">
              {app.businessType}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[var(--line-amber)] text-[var(--brown-700)]/80">
              {app.location}
            </span>
          </div>
        </div>

        <StatusPill status={app.status} />

        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="h-8 px-3 rounded-lg border border-[var(--line-amber)] text-sm hover:bg-[var(--cream-50)]"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const reload = async () => {
    setLoading(true);
    const data = await listApplications();              // <-- should return ALL statuses
    setApps((data || []).map(normalize));               // normalize here
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  // banners
  const counts = useMemo(() => {
    const c = { total: apps.length, pending: 0, approved: 0, rejected: 0 };
    for (const a of apps) {
      if (a.status === "pending")  c.pending++;
      if (a.status === "approved") c.approved++;
      if (a.status === "rejected") c.rejected++;
    }
    return c;
  }, [apps]);

  // filtered list
  const list = useMemo(() => {
    return (apps || []).filter((a) => {
      const hay = `${a.companyName} ${a.email} ${a.businessType} ${a.location}`.toLowerCase();
      const matchQ = hay.includes(q.trim().toLowerCase());
      const matchS = status === "all" ? true : a.status === status;
      return matchQ && matchS;
    });
  }, [apps, q, status]);

  // view modal
  const onView = async (id) => {
    const d = await getApplication(id);
    setCurrent(normalize({
      ...d,
      phone: d.phone || "+63 912 345 6789",
      address: d.address || "123 Furniture Street, Manila, Philippines",
      submittedAt: d.submittedAt || "",
      description:
        d.description ||
        "We are a furniture company specializing in modern and contemporary pieces. Our business has been operating for over 5 years with a strong customer base in the local market.",
      // Preserve real documents array (even if empty). Only fall back
      // to mock entries when documents is truly missing/null.
      documents:
        Array.isArray(d.documents)
          ? d.documents
          : [
              { name: "Business Registration" },
              { name: "Tax Identification" },
              { name: "Product Catalog" },
              { name: "References" },
            ],
    }));
    setOpen(true);
  };

  // optimistic + reload so banners and list update immediately
  const optimisticSet = (id, next) => {
    setApps((prev) => prev.map((a) => (a._id === id ? { ...a, status: next } : a)));
  };

  const onApprove = async (id) => {
    optimisticSet(id, "approved");
    setStatus("approved");
    setOpen(false);
    try { await updateStatus(id, "approved"); }
    finally { reload(); }
  };

  const onReject = async (id) => {
    optimisticSet(id, "rejected");
    setStatus("rejected");
    setOpen(false);
    try { await updateStatus(id, "rejected"); }
    finally { reload(); }
  };

  return (
    <>
      {/* Banners */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <MetricTile value={counts.total}    label="Total"    tint="gray"  />
        <MetricTile value={counts.pending}  label="Pending"  tint="amber" />
        <MetricTile value={counts.approved} label="Approved" tint="green" />
        <MetricTile value={counts.rejected} label="Rejected" tint="red"   />
      </div>

      <section className="rounded-xl border border-[var(--line-amber)] bg-white shadow-card">
        {/* Header: search + status */}
        <div className="px-5 py-3 border-b border-[var(--line-amber)]/60 flex items-center justify-between flex-wrap gap-3">
          <div className="font-semibold text-[var(--brown-700)]">Seller Applications</div>

          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search company, email, type, location…"
              className="h-9 w-[260px] md:w-[300px] rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm placeholder:text-[var(--brown-700)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status filter buttons with counts */}
        <div className="px-5 pt-3 pb-1 border-b border-[var(--line-amber)]/40">
          <div className="flex flex-wrap gap-2">
            {[ 
              ["all", `All (${counts.total})`],
              ["pending", `Pending (${counts.pending})`],
              ["approved", `Approved (${counts.approved})`],
              ["rejected", `Rejected (${counts.rejected})`],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className={`rounded-full px-3 py-1 text-xs md:text-sm border ${
                  status === key
                    ? "bg-[var(--orange-600)] border-[var(--orange-600)] text-white"
                    : "border-[var(--line-amber)] hover:bg-[var(--cream-50)] text-[var(--brown-700)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-[var(--brown-700)]/60">Loading…</div>
          ) : list.length ? (
            list.map((a) => <Row key={a._id} app={a} onView={() => onView(a._id)} />)
          ) : (
            <div className="py-12 text-center text-[var(--brown-700)]/60">No applications found.</div>
          )}
        </div>
      </section>

      {/* Modal keeps Approve/Reject */}
      <ApplicationModal
        open={open}
        data={current}
        onClose={() => setOpen(false)}
        onApprove={() => current && onApprove(current._id)}
        onReject={() => current && onReject(current._id)}
      />
    </>
  );
}
