// src/pages/seller/Promotions.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import toast from "react-hot-toast";

export default function SellerPromotions() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPromo, setEditingPromo] = useState(null);

  useEffect(() => {
    if (!authUser?.id) return;

    let cancelled = false;
    const loadPromotions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("promotions")
          .select("*")
          .eq("seller_id", authUser.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) {
          setPromotions(
            (data || []).map((p) => ({
              id: p.id,
              name: p.name,
              type: p.type === "flash_sale" ? "Flash Sale" : p.type === "voucher" ? "Voucher" : "Discount",
              code: p.code,
              discountType: p.discount_type === "fixed" ? "Fixed" : "Percentage",
              discountValue: Number(p.discount_value) || 0,
              minPurchase: p.min_purchase ? Number(p.min_purchase) : null,
              maxDiscount: p.max_discount ? Number(p.max_discount) : null,
              startDate: p.start_date ? new Date(p.start_date).toLocaleDateString() : "",
              endDate: p.end_date ? new Date(p.end_date).toLocaleDateString() : "",
              rawStartDate: p.start_date,
              rawEndDate: p.end_date,
              usage: p.usage_limit
                ? `${p.usage_count || 0}/${p.usage_limit}`
                : null,
              status:
                p.status === "inactive" || p.status === "expired"
                  ? "Inactive"
                  : "Active",
            }))
          );
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load promotions", e);
          toast.error(e?.message || "Failed to load promotions.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPromotions();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  const handleCreatePromotion = async (payload) => {
    if (!authUser?.id) {
      toast.error("You must be logged in as a seller to create promotions.");
      return;
    }

    try {
      const insertPayload = {
        seller_id: authUser.id,
        name: payload.name,
        type: payload.type,
        code: payload.code,
        discount_type: payload.discountType,
        discount_value: payload.discountValue,
        min_purchase: payload.minPurchase,
        max_discount: payload.maxDiscount,
        usage_limit: payload.usageLimit,
        start_date: payload.startDate,
        end_date: payload.endDate,
        status: "active",
      };

      const { data, error } = await supabase
        .from("promotions")
        .insert(insertPayload)
        .select("*")
        .single();

      if (error) throw error;

      setPromotions((prev) => [
        {
          id: data.id,
          name: data.name,
          type: data.type === "flash_sale" ? "Flash Sale" : data.type === "voucher" ? "Voucher" : "Discount",
          code: data.code,
          discountType: data.discount_type === "fixed" ? "Fixed" : "Percentage",
          discountValue: Number(data.discount_value) || 0,
          minPurchase: data.min_purchase ? Number(data.min_purchase) : null,
          maxDiscount: data.max_discount ? Number(data.max_discount) : null,
          startDate: data.start_date ? new Date(data.start_date).toLocaleDateString() : "",
          endDate: data.end_date ? new Date(data.end_date).toLocaleDateString() : "",
          rawStartDate: data.start_date,
          rawEndDate: data.end_date,
          usage: data.usage_limit
            ? `${data.usage_count || 0}/${data.usage_limit}`
            : null,
          status:
            data.status === "inactive" || data.status === "expired"
              ? "Inactive"
              : "Active",
        },
        ...prev,
      ]);

      toast.success("Promotion created.");
      setShowModal(false);
    } catch (e) {
      console.error("Failed to create promotion", e);
      toast.error(e?.message || "Failed to create promotion.");
    }
  };

  const activePromotions = promotions.length;
  const vouchers = promotions.filter((p) => p.type === "Voucher").length;
  const flashSales = promotions.filter((p) => p.type === "Flash Sale").length;
  const discounts = promotions.filter((p) => p.type === "Discount").length;

  const handleUpdatePromotion = async (payload) => {
    if (!authUser?.id) {
      toast.error("You must be logged in as a seller to update promotions.");
      return;
    }

    try {
      const updatePayload = {
        name: payload.name,
        type: payload.type,
        code: payload.code,
        discount_type: payload.discountType,
        discount_value: payload.discountValue,
        min_purchase: payload.minPurchase,
        max_discount: payload.maxDiscount,
        usage_limit: payload.usageLimit,
        start_date: payload.startDate,
        end_date: payload.endDate,
      };

      const { data, error } = await supabase
        .from("promotions")
        .update(updatePayload)
        .eq("id", payload.id)
        .eq("seller_id", authUser.id)
        .select("*")
        .single();

      if (error) throw error;

      setPromotions((prev) =>
        prev.map((p) =>
          p.id === data.id
            ? {
                id: data.id,
                name: data.name,
                type: data.type === "flash_sale" ? "Flash Sale" : data.type === "voucher" ? "Voucher" : "Discount",
                code: data.code,
                discountType: data.discount_type === "fixed" ? "Fixed" : "Percentage",
                discountValue: Number(data.discount_value) || 0,
                minPurchase: data.min_purchase ? Number(data.min_purchase) : null,
                maxDiscount: data.max_discount ? Number(data.max_discount) : null,
                startDate: data.start_date ? new Date(data.start_date).toLocaleDateString() : "",
                endDate: data.end_date ? new Date(data.end_date).toLocaleDateString() : "",
                rawStartDate: data.start_date,
                rawEndDate: data.end_date,
                usage: data.usage_limit
                  ? `${data.usage_count || 0}/${data.usage_limit}`
                  : null,
                status:
                  data.status === "inactive" || data.status === "expired"
                    ? "Inactive"
                    : "Active",
              }
            : p
        )
      );

      toast.success("Promotion updated.");
      setShowModal(false);
      setEditingPromo(null);
    } catch (e) {
      console.error("Failed to update promotion", e);
      toast.error(e?.message || "Failed to update promotion.");
    }
  };

  const handleToggleStatus = async (promo) => {
    if (!authUser?.id) return;

    const newStatus = promo.status === "Active" ? "inactive" : "active";
    try {
      const { data, error } = await supabase
        .from("promotions")
        .update({ status: newStatus })
        .eq("id", promo.id)
        .eq("seller_id", authUser.id)
        .select("*")
        .single();

      if (error) throw error;

      setPromotions((prev) =>
        prev.map((p) =>
          p.id === promo.id
            ? {
                ...p,
                status:
                  data.status === "inactive" || data.status === "expired"
                    ? "Inactive"
                    : "Active",
              }
            : p
        )
      );

      toast.success(
        newStatus === "active" ? "Promotion activated." : "Promotion deactivated."
      );
    } catch (e) {
      console.error("Failed to update promotion status", e);
      toast.error(e?.message || "Failed to update promotion status.");
    }
  };

  const handleDeletePromotion = async (promo) => {
    if (!authUser?.id) return;

    try {
      const { error } = await supabase
        .from("promotions")
        .delete()
        .eq("id", promo.id)
        .eq("seller_id", authUser.id);

      if (error) throw error;

      setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
      toast.success("Promotion deleted.");
    } catch (e) {
      console.error("Failed to delete promotion", e);
      toast.error(e?.message || "Failed to delete promotion.");
    }
  };

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
        <div className="min-w-[720px] grid grid-cols-4 gap-4">
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
          <StatCard
            label="Discounts"
            value={discounts}
            icon="💸"
            accent="text-emerald-600"
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

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-600">
            Loading promotions...
          </div>
        ) : promotions.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-600">
            No promotions yet. Create your first promotion to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] p-4 flex justify-between items-center"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {promo.type === "Voucher" ? "🎁" : promo.type === "Flash Sale" ? "⚡" : "💸"}
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
                      {promo.type === "Voucher" && promo.minPurchase != null && promo.maxDiscount != null && (
                        <>
                          <Detail label="Min. Purchase" value={`₱${promo.minPurchase.toLocaleString()}`} />
                          <Detail label="Max. Discount" value={`₱${promo.maxDiscount.toLocaleString()}`} />
                          <Detail label="Start Date" value={promo.startDate} />
                          <Detail label="End Date" value={promo.endDate} />
                        </>
                      )}
                      {promo.type === "Voucher" && (promo.minPurchase == null || promo.maxDiscount == null) && (
                        <>
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
                      {promo.type === "Discount" && (
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
                      {promo.discountValue}
                      {promo.discountType === "Percentage" ? "%" : "₱"}
                    </span>
                  </div>
                  {promo.usage && (
                    <div className="text-xs text-gray-600 mt-1">{promo.usage} used</div>
                  )}
                  <div className="mt-2 flex items-center justify-end gap-2 text-xs">
                    <button
                      className="rounded-lg border border-[var(--line-amber)] px-2 py-1 hover:bg-[var(--cream-50)]"
                      onClick={() => {
                        setEditingPromo(promo);
                        setShowModal(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg border border-[var(--line-amber)] px-2 py-1 hover:bg-[var(--cream-50)]"
                      onClick={() => handleToggleStatus(promo)}
                    >
                      {promo.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="rounded-lg border border-rose-300 text-rose-700 px-2 py-1 hover:bg-rose-50"
                      onClick={() => handleDeletePromotion(promo)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <CreatePromotionModal
          onClose={() => {
            setShowModal(false);
            setEditingPromo(null);
          }}
          onCreate={editingPromo ? null : handleCreatePromotion}
          onUpdate={editingPromo ? handleUpdatePromotion : null}
          initialPromo={editingPromo}
        />
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

function CreatePromotionModal({ onClose, onCreate, onUpdate, initialPromo }) {
  const [type, setType] = useState(initialPromo?.type || "Voucher");
  const [name, setName] = useState(initialPromo?.name || "");
  const [code, setCode] = useState(initialPromo?.code || "");
  const [discountType, setDiscountType] = useState(
    initialPromo?.discountType === "Fixed" ? "fixed" : "percentage"
  );
  const [discountValue, setDiscountValue] = useState(
    initialPromo ? String(initialPromo.discountValue) : ""
  );
  const [minPurchase, setMinPurchase] = useState(
    initialPromo?.minPurchase != null ? String(initialPromo.minPurchase) : ""
  );
  const [maxDiscount, setMaxDiscount] = useState(
    initialPromo?.maxDiscount != null ? String(initialPromo.maxDiscount) : ""
  );
  const [usageLimit, setUsageLimit] = useState(
    initialPromo?.usage ? initialPromo.usage.split("/")[1] || "" : ""
  );
  const [startDate, setStartDate] = useState(initialPromo?.rawStartDate || "");
  const [endDate, setEndDate] = useState(initialPromo?.rawEndDate || "");

  const handleGenerateCode = () => {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCode(`SAVE${random}`);
  };

  const handleSubmit = () => {
    if (!name.trim() || !code.trim() || !discountValue || !startDate || !endDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload = {
      id: initialPromo?.id,
      name: name.trim(),
      type:
        type === "Voucher" ? "voucher" : type === "Flash Sale" ? "flash_sale" : "discount",
      code: code.trim(),
      discountType,
      discountValue: Number(discountValue),
      minPurchase: minPurchase ? Number(minPurchase) : null,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      startDate,
      endDate,
    };

    if (initialPromo && onUpdate) {
      onUpdate(payload);
    } else if (onCreate) {
      onCreate(payload);
    }
  };

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
          <Input
            label="Promotion Name *"
            placeholder="e.g., New Customer 15% Off"
            value={name}
            onChange={setName}
          />

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                label="Promo Code *"
                placeholder="SAVE15"
                value={code}
                onChange={setCode}
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateCode}
              className="rounded-lg border border-[var(--line-amber)] text-[var(--brown-700)] px-3 py-2 hover:bg-[var(--cream-50)]"
            >
              Generate
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Discount Type</label>
              <select
                className="w-full border border-[var(--line-amber)] rounded-lg px-3 py-2 text-sm bg-[var(--cream-50)] focus:outline-none"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
              </select>
            </div>
            <Input
              label="Discount Value *"
              placeholder="15"
              value={discountValue}
              onChange={setDiscountValue}
            />
          </div>

          {type === "Voucher" && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Min. Purchase (₱)"
                placeholder="5000"
                value={minPurchase}
                onChange={setMinPurchase}
              />
              <Input
                label="Max. Discount (₱)"
                placeholder="2000"
                value={maxDiscount}
                onChange={setMaxDiscount}
              />
            </div>
          )}

          <Input
            label="Usage Limit (Optional)"
            placeholder="100"
            value={usageLimit}
            onChange={setUsageLimit}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              placeholder="yyyy-mm-dd"
              value={startDate}
              onChange={setStartDate}
            />
            <Input
              label="End Date"
              placeholder="yyyy-mm-dd"
              value={endDate}
              onChange={setEndDate}
            />
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
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm font-medium hover:brightness-95"
          >
            Create Promotion
          </button>
        </div>
      </div>
    </div>
  );
}


function Input({ label, placeholder, textarea, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {textarea ? (
        <textarea
          placeholder={placeholder}
          className="w-full border border-[var(--line-amber)] rounded-lg px-3 py-2 text-sm bg-[var(--cream-50)] focus:outline-none"
          rows="2"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        ></textarea>
      ) : (
        <input
          placeholder={placeholder}
          className="w-full border border-[var(--line-amber)] rounded-lg px-3 py-2 text-sm bg-[var(--cream-50)] focus:outline-none"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  );
}
