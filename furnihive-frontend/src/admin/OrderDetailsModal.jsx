// src/admin/OrderDetailsModal.jsx
export default function OrderDetailsModal({ open, onClose, order, peso, pillClass }) {
  if (!open || !order) return null;

  const Row = ({ label, value }) => (
    <div>
      <div className="text-[11px] text-[var(--brown-700)]/60">{label}</div>
      <div className="text-[var(--brown-700)]">{value || "—"}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-card border border-[var(--line-amber)]">
          {/* header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 py-3 border-b border-[var(--line-amber)]">
            <div className="font-semibold text-[var(--brown-700)]">
              {order.item}
            </div>
            <div className="text-xs text-[var(--brown-700)]/60">{order.id}</div>
          </div>

          {/* body */}
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Row label="Order Date" value={order.orderDate} />
              <Row label="Est. Delivery" value={order.eta} />
              <Row label="Customer" value={order.customer} />
              <Row label="Seller" value={order.seller} />
              <Row label="Contact" value={order.phone} />
              <Row label="Payment" value={order.payment} />
            </div>

            <div>
              <div className="text-[11px] text-[var(--brown-700)]/60">Delivery Address</div>
              <div className="text-[var(--brown-700)]">{order.address || "—"}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xl font-semibold text-[var(--brown-700)]">
                {peso(order.amount)}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${pillClass(order.status)}`}>
                {order.status}
              </span>
            </div>

            {order.notes && (
              <div>
                <div className="text-[11px] text-[var(--brown-700)]/60">Notes</div>
                <div className="text-[var(--brown-700)]/90 text-sm">{order.notes}</div>
              </div>
            )}
          </div>

          {/* footer */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur px-5 py-3 border-t border-[var(--line-amber)] flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="h-9 px-3 rounded-lg border border-[var(--line-amber)] bg-white hover:bg-[var(--cream-50)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
