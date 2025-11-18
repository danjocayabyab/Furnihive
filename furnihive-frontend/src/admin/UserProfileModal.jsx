// src/admin/UserProfileModal.jsx
import { useMemo, useRef, useState } from "react";

export default function UserProfileModal({ open, onClose, user, peso }) {
  if (!open || !user) return null;

  const fullId = String(user.id || "");
  const compactId = fullId.replace(/-/g, "").toUpperCase().slice(0, 8);
  const displayId = compactId ? `USR-${compactId}` : "USR-UNKNOWN";
  const isSeller = String(user.role || "").toLowerCase() === "seller";
  const title = isSeller ? "Seller Profile" : "User Profile";

  return (
    <div className="fixed inset-0 z-[60]">
      {/* dimmed background */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* centered floating modal */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white border border-[var(--line-amber)] shadow-md">
          {/* header */}
          <div className="px-6 pt-5 pb-3 border-b border-[var(--line-amber)]">
            <div className="text-base font-semibold text-[var(--brown-700)]">{title}</div>
            <div className="text-sm text-[var(--brown-700)]/70">
              Detailed information about {user.name}
            </div>
          </div>

          {/* profile summary */}
          <div className="px-6 py-4">
            <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4 flex gap-3">
              <Avatar name={user.name} src={user.avatarUrl} />

              <div className="flex-1">
                <div className="font-semibold text-[var(--brown-700)]">{user.name}</div>
                <div className="text-sm text-[var(--brown-700)]/70">{user.email}</div>
                <div className="mt-1 flex gap-2">
                  <Tag color={isSeller ? "purple" : "blue"}>
                    {isSeller ? "seller" : "buyer"}
                  </Tag>
                  <Tag color={String(user.status).toLowerCase() === "active" ? "green" : "red"}>
                    {user.status}
                  </Tag>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <Info label="Joined" value={user.joinDate} />
                  <Info label="Last Active" value={user.lastActive} />
                </div>
              </div>
            </div>
          </div>

          {/* user details section */}
          <div className="px-6 pb-4">
            <div className="rounded-xl border border-[var(--line-amber)] bg-white p-4">
              <div className="font-semibold text-[var(--brown-700)]">Account Information</div>
              <div className="text-xs text-[var(--brown-700)]/70 mb-3">
                Personal and contact details
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Full Name" value={user.name} />
                <Field label="Email" value={user.email} />
                <Field label="Phone" value={user.phone || "Not specified"} />
                <Field label="Location" value={user.location || "Not specified"} />
              </div>

              <hr className="my-3 border-[var(--line-amber)]/60" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <Row
                  label="User ID"
                  value={
                    <span title={fullId || undefined}>{displayId}</span>
                  }
                />
                <Row
                  label="Account Type"
                  value={
                    <Tag color={isSeller ? "purple" : "blue"}>
                      {isSeller ? "seller" : "buyer"}
                    </Tag>
                  }
                />
                <Row
                  label="Account Status"
                  value={
                    <Tag color={String(user.status).toLowerCase() === "active" ? "green" : "red"}>
                      {user.status}
                    </Tag>
                  }
                />
              </div>
            </div>
          </div>

          {/* footer — only close button */}
          <div className="px-6 py-3 border-t border-[var(--line-amber)] flex justify-end">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-[var(--line-amber)] bg-white hover:bg-[var(--cream-50)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Avatar with image fallback to initials --- */
function Avatar({ name = "", src }) {
  const [error, setError] = useState(false);
  const initial = useMemo(
    () => (name.trim()?.[0] || "?").toUpperCase(),
    [name]
  );
  const showImg = src && !error;

  return showImg ? (
    <img
      src={src}
      alt={name}
      className="h-12 w-12 rounded-full object-cover border border-[var(--line-amber)] bg-white"
      onError={() => setError(true)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="h-12 w-12 rounded-full bg-[var(--amber-400)]/25 grid place-items-center text-[var(--orange-600)] font-semibold">
      {initial}
    </div>
  );
}

/* --- small helpers --- */
function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-[var(--brown-700)]/60">{label}</div>
      <div className="text-[var(--brown-700)]">{value}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1 font-medium text-[var(--brown-700)]">{label}</div>
      <div className="text-[var(--brown-700)]/80 break-words">{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--brown-700)]/70">{label}</div>
      <div className="font-medium text-[var(--brown-700)]">{value}</div>
    </div>
  );
}

function Tag({ color, children }) {
  const map = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
  };
  return (
    <span
      className={`text-[11px] px-2 py-[2px] rounded-full border capitalize ${map[color]}`}
    >
      {children}
    </span>
  );
}
