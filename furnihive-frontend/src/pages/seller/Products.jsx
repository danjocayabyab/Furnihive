// src/pages/seller/Products.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Status from "../../components/seller/Status.jsx";

/** Mock data – replace with GET /seller/products later */
const MOCK = [
  {
    id: "p-1",
    title: "Modern Sectional Sofa",
    category: "Living Room",
    price: 45999,
    stock: 12,
    views: 234,
    sold: 18,
    featured: true,
    active: true,
    image:
      "https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-2",
    title: "Solid Wood Dining Set",
    category: "Dining Room",
    price: 35500,
    stock: 8,
    views: 189,
    sold: 12,
    featured: true,
    active: true,
    image:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop",
  },
];

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function SellerProducts() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const data = MOCK;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s)
    );
  }, [data, q]);

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((p) => p.active).length;
    const lowStock = data.filter((p) => (p.stock ?? 0) <= 2 && (p.stock ?? 0) > 0).length;
    const featured = data.filter((p) => p.featured).length;
    return { total, active, lowStock, featured };
  }, [data]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">
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
        Product Management
      </h1>
      <p className="text-sm text-gray-600">
        Manage your product catalog
      </p>
    </div>
  </div>
  <button
    onClick={() => setShowAdd(true)}
    className="bg-[var(--orange-600)] hover:brightness-95 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1"
  >
    <span className="text-lg leading-none">＋</span> Add Product
  </button>
</div>



      {/* Metric cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard  label="Total Products" value={stats.total} />
        <MetricCard  label="Active" value={stats.active} />
        <MetricCard  label="Low Stock" value={stats.lowStock} />
        <MetricCard  label="Featured" value={stats.featured} />
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
          <span className="text-[var(--orange-700)]"></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search products..."
          />
        </div>
      </div>

      {/* Catalog */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]">
          <div className="font-semibold text-[var(--brown-700)]">Product Catalog</div>
          <div className="text-sm text-gray-600">Manage your furniture inventory</div>
        </div>

        <ul className="divide-y divide-[var(--line-amber)]/70">
          {filtered.map((p) => {
            const statusInfo =
              (p.stock ?? 0) <= 0
                ? { color: "gray", text: "Out of stock" }
                : (p.stock ?? 0) <= 2
                ? { color: "amber", text: "Low stock" }
                : p.active
                ? { color: "green", text: "Active" }
                : { color: "gray", text: "Inactive" };

            return (
              <li key={p.id} className="px-5 py-4">
                {/* Row layout that aligns image + 4 columns as in your ref screenshot */}
                <div className="flex items-center gap-4">
                  {/* Image */}
                  <img
                    src={p.image}
                    alt={p.title}
                    className="h-24 w-32 object-cover rounded-lg border border-[var(--line-amber)]"
                  />

                  {/* Middle: 5 equal columns (Title/Category + Price + Stock + Views + Sold) */}
                  <div className="flex-1 overflow-hidden">
                    <div className="grid grid-cols-5 gap-4 items-start">
                      {/* Col 1: Title + Category */}
                      <div className="min-w-0">
                        <Link
                          to={`/seller/products/${p.id}`}
                          className="font-semibold text-[var(--brown-700)] hover:underline block truncate"
                          title={p.title}
                        >
                          {p.title}
                        </Link>
                        <div className="text-sm text-[var(--orange-700)]">{p.category}</div>
                      </div>

                      {/* Col 2: Price */}
                      <Stat label="Price" value={peso(p.price)} />

                      {/* Col 3: Stock */}
                      <Stat label="Stock" value={`${p.stock} units`} />

                      {/* Col 4: Views */}
                      <Stat label="Views" value={p.views} />

                      {/* Col 5: Sold */}
                      <Stat label="Sold" value={p.sold} />
                    </div>
                  </div>

                  {/* Right: Status badge */}
                  <div className="hidden sm:block">
                    <Status color={statusInfo.color}>{statusInfo.text}</Status>
                  </div>
                </div>
              </li>
            );
          })}

          {filtered.length === 0 && (
            <li className="px-5 py-8 text-center text-gray-600">
              No products match your search.
            </li>
          )}
        </ul>
      </div>

      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

/* ---------------- UI bits ---------------- */

function MetricCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-xl">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-[var(--brown-700)]">{value}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[var(--orange-700)]">{label}</div>
      <div className="font-semibold text-[var(--brown-700)]">{value}</div>
    </div>
  );
}

/* ---------------- Add Product Modal (UI only; hook to API later) ---------------- */

function AddProductModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--line-amber)] bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line-amber)] bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--brown-700)]">Add New Product</h2>
            <p className="text-sm text-gray-600">
              Fill in the details to add a new product to your catalog
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[var(--line-amber)] px-2 py-1 text-sm hover:bg-[var(--cream-50)]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 px-6 py-5">
          {/* Images (visual only) */}
          <div>
            <div className="font-medium text-[var(--brown-700)] mb-2">Product Images</div>
            <div className="grid grid-cols-4 gap-3">
              <UploadSlot primary />
              <UploadSlot />
              <UploadSlot />
              <UploadSlot />
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Add up to 4 images (Image upload is for demonstration)
            </div>
          </div>

          {/* Form grid */}
          <div className="space-y-4">
            <Input label="Product Name *" placeholder="e.g., Modern Sectional Sofa" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Category" placeholder="Select category" />
              <Select label="Condition" placeholder="Select condition" />
            </div>
            <Textarea label="Description" placeholder="Describe your product..." />
            <div className="grid sm:grid-cols-3 gap-4">
              <Input label="Price (₱) *" type="number" />
              <Input label="Stock Quantity *" type="number" />
              <Input label="SKU (Optional)" defaultValue="SKU-001" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Input label="Length (cm)" type="number" />
              <Input label="Width (cm)" type="number" />
              <Input label="Height (cm)" type="number" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
            >
              Cancel
            </button>
            <button className="rounded-xl bg-[var(--orange-600)] px-4 py-2 text-sm font-semibold text-white hover:brightness-95">
              Add Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- small form atoms (visual only for now) --- */

function UploadSlot({ primary = false }) {
  return (
    <div
      className={`grid h-28 place-items-center rounded-xl border border-[var(--line-amber)] ${
        primary ? "bg-[var(--cream-50)]" : "bg-[var(--amber-50)]/30"
      }`}
    >
      {primary ? (
        <div className="text-center text-sm">
          <div className="text-2xl">⬆️</div>
          <div className="mt-1 text-[var(--orange-700)]">Upload</div>
        </div>
      ) : (
        <div className="text-xs text-gray-500">Image</div>
      )}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-[var(--brown-700)]">{label}</div>
      <input
        {...props}
        className="w-full rounded-xl border border-[var(--line-amber)] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--amber-200)]"
      />
    </label>
  );
}

function Textarea({ label, ...props }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-[var(--brown-700)]">{label}</div>
      <textarea
        rows={4}
        {...props}
        className="w-full rounded-xl border border-[var(--line-amber)] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--amber-200)]"
      />
    </label>
  );
}

function Select({ label, placeholder }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-[var(--brown-700)]">{label}</div>
      <div className="flex items-center rounded-xl border border-[var(--line-amber)] bg-white pl-3 pr-2">
        <input
          disabled
          value={placeholder}
          className="w-full bg-transparent py-2 text-gray-500 outline-none"
        />
        <span className="px-2">▾</span>
      </div>
    </label>
  );
}
