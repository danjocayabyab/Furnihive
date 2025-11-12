// src/pages/seller/Promotions.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SellerPromotions() {
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [promotions, setPromotions] = useState([
    {
      id: 1,
      name: "New Customer 15% Off",
      type: "Voucher",
      code: "NEWCUST15",
      discountType: "Percentage",
      discountValue: 15,
      minPurchase: 5000,
      maxDiscount: 2000,
      startDate: "1/1/2025",
      endDate: "3/31/2025",
      usage: "23/100",
      status: "Active",
    },
    {
      id: 2,
      name: "Flash Sale - Living Room",
      type: "Flash Sale",
      code: "FLASH25",
      discountType: "Percentage",
      discountValue: 25,
      startDate: "1/15/2025",
      endDate: "1/20/2025",
      status: "Active",
    },
  ]);

  const activePromotions = promotions.length;
  const vouchers = promotions.filter((p) => p.type === "Voucher").length;
  const flashSales = promotions.filter((p) => p.type === "Flash Sale").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/seller")}
            className="h-9 w-9 rounded-lg border border-[var(--line-amber)] bg-white grid place-items-center hover:bg-[var(--amber-50)]"
            title="Back to Dashboard"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--brown-700)]">
              Promotions & Discounts
            </h1>
            <p className="text-sm text-gray-600">
              Create and manage promotional campaigns
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[var(--orange-600)] hover:brightness-95 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1"
        >
          <span className="text-lg leading-none">＋</span> Create Promotion
        </button>
      </div>

      {/* KPI Row */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="min-w-[720px] grid grid-cols-3 gap-4">
          <StatCard label="Active Promotions" value={activePromotions} icon="%" />
          <StatCard
            label="Vouchers"
            value={vouchers}
            icon="🎁"
            accent="text-purple-600"
          />
          <StatCard
            label="Flash Sales"
            value={flashSales}
            icon="⚡"
            accent="text-orange-500"
          />
        </div>
      </div>

      {/* Promotions List */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-[var(--brown-700)]">Promotions</h2>
          <p className="text-sm text-gray-600">
            Manage your promotional campaigns
          </p>
        </div>

        <div className="space-y-3">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4 flex justify-between items-center"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {promo.type === "Voucher" ? "🎁" : "⚡"}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--brown-700)]">
                    {promo.name}
                  </h3>
                  <div className="text-xs text-[var(--orange-600)] uppercase font-semibold tracking-wide">
                    {promo.type}
                  </div>
                  <div className="mt-1">
                    <span className="text-[var(--brown-700)] text-xs border border-[var(--line-amber)] bg-[var(--amber-50)] px-2 py-0.5 rounded">
                      {promo.code}
                    </span>
                  </div>

                  {/* Extra Details */}
                  <div className="grid grid-cols-4 gap-6 mt-3 text-sm text-[var(--brown-700)]">
                    {promo.type === "Voucher" && (
                      <>
                        <Detail label="Min. Purchase" value={`₱${promo.minPurchase.toLocaleString()}`} />
                        <Detail label="Max. Discount" value={`₱${promo.maxDiscount.toLocaleString()}`} />
                        <Detail label="Start Date" value={promo.startDate} />
                        <Detail label="End Date" value={promo.endDate} />
                      </>
                    )}
                    {promo.type === "Flash Sale" && (
                      <>
                        <Detail label="Start Date" value={promo.startDate} />
                        <Detail label="End Date" value={promo.endDate} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <StatusBadge status={promo.status} />
                  <span className="font-semibold text-[var(--brown-700)]">
                    {promo.discountValue}%
                  </span>
                </div>
                {promo.usage && (
                  <div className="text-xs text-gray-600 mt-1">{promo.usage} used</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {showModal && (
        <CreatePromotionModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

/* ----------- COMPONENTS ----------- */

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-white h-[80px] p-4 flex justify-between items-center">
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-2xl font-extrabold text-[var(--brown-700)]">
          {value}
        </div>
      </div>
      <div className={`text-2xl ${accent}`}>{icon}</div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs text-[var(--orange-600)] font-semibold">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        status === "Active"
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

/* ----------- CREATE PROMOTION MODAL ----------- */

function CreatePromotionModal({ onClose }) {
  const [type, setType] = useState("Voucher");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="bg-white rounded-2xl border border-[var(--line-amber)] w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--line-amber)]">
          <div>
            <h2 className="font-semibold text-[var(--brown-700)]">
              Create New Promotion
            </h2>
            <p className="text-sm text-gray-600">
              Set up a promotional campaign for your products
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg w-8 h-8 grid place-items-center hover:bg-[var(--cream-50)]"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-sm">
          {/* Promotion Type */}
          <div>
            <label className="block font-medium mb-1">Promotion Type *</label>
            <div className="flex border border-[var(--line-amber)] rounded-lg overflow-hidden">
              {["Voucher", "Flash Sale", "Discount"].map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-200
                    ${
                      type === t
                        ? "bg-[var(--orange-600)] text-white"
                        : "bg-white hover:bg-[var(--amber-50)] text-[var(--brown-700)]"
                    }`}
                >
                  {t === "Voucher" ? "🎁" : t === "Flash Sale" ? "⚡" : "💸"} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <Input label="Promotion Name *" placeholder="e.g., New Customer 15% Off" />

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input label="Promo Code *" placeholder="SAVE15" />
            </div>
            <button className="rounded-lg border border-[var(--line-amber)] text-[var(--brown-700)] px-3 py-2 hover:bg-[var(--cream-50)]">
              Generate
            </button>
          </div>

          <Input
            label="Description (Optional)"
            placeholder="Describe your promotion..."
            textarea
          />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Discount Type" placeholder="Percentage (%)" />
            <Input label="Discount Value *" placeholder="15" />
          </div>

          {type === "Voucher" && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Min. Purchase (₱)" placeholder="5000" />
              <Input label="Max. Discount (₱)" placeholder="2000" />
            </div>
          )}

          <Input label="Usage Limit (Optional)" placeholder="100" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" placeholder="dd/mm/yyyy" />
            <Input label="End Date" placeholder="dd/mm/yyyy" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--line-amber)]">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm hover:bg-[var(--cream-50)]"
          >
            Cancel
          </button>
          <button className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm font-medium hover:brightness-95">
            Create Promotion
          </button>
        </div>
      </div>
    </div>
  );
}


function Input({ label, placeholder, textarea }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {textarea ? (
        <textarea
          placeholder={placeholder}
          className="w-full border border-[var(--line-amber)] rounded-lg px-3 py-2 text-sm bg-[var(--cream-50)] focus:outline-none"
          rows="2"
        ></textarea>
      ) : (
        <input
          placeholder={placeholder}
          className="w-full border border-[var(--line-amber)] rounded-lg px-3 py-2 text-sm bg-[var(--cream-50)] focus:outline-none"
        />
      )}
    </div>
  );
}
