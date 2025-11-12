// src/admin/OrderStatusModal.jsx
import { useEffect, useState } from "react";

const OPTIONS = ["processing", "shipped", "delivered", "pending", "cancelled"];

export default function OrderStatusModal({ open, onClose, order, onConfirm }) {
  const [value, setValue] = useState(order?.status || "processing");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (order) {
      setValue(order.status);
      setNote("");
    }
  }, [order]);

  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-card border border-[var(--line-amber)]">
          {/* header */}
          <div className="px-5 py-3 border-b border-[var(--line-amber)]">
            <div className="font-semibold text-[var(--brown-700)]">Update Status</div>
            <div className="text-xs text-[var(--brown-700)]/60">{order.id} — {order.item}</div>
          </div>

          {/* body */}
          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="text-[11px] text-[var(--brown-700)]/60 mb-1">Select new status</div>
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full h-10 rounded-lg border border-[var(--line-amber)] bg-white px-3 text-sm"
              >
                {OPTIONS.map((o) => (
                  <option key={o} value={o} className="capitalize">
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] text-[var(--brown-700)]/60 mb-1">Note (optional)</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add an internal note…"
                className="w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          {/* footer */}
          <div className="px-5 py-3 border-t border-[var(--line-amber)] flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="h-9 px-3 rounded-lg border border-[var(--line-amber)] bg-white hover:bg-[var(--cream-50)]"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(value, note)}
              className="h-9 px-3 rounded-lg border border-[var(--line-amber)] bg-[var(--orange-600)] text-white hover:opacity-95"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
