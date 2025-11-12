// src/pages/seller/Inventory.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Status from "../../components/seller/Status.jsx";

/** --- Demo data (replace with API later) --- */
const DEMO = [
  {
    id: "p-1",
    title: "Modern Sectional Sofa",
    category: "Living Room",
    price: 45999,
    stock: 12,
    views: 234,
    sold: 18,
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
    active: true,
    image:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-3",
    title: "Queen Size Bed Frame",
    category: "Bedroom",
    price: 28900,
    stock: 5,
    views: 156,
    sold: 9,
    active: true,
    image:
      "https://images.unsplash.com/photo-1519710884004-2f43f6b4d6f6?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-4",
    title: "Velvet Armchair",
    category: "Living Room",
    price: 18500,
    stock: 2,
    views: 98,
    sold: 15,
    active: true,
    image:
      "https://images.unsplash.com/photo-1582582429416-4b1c5fd5f6b3?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-5",
    title: "Office Desk",
    category: "Office",
    price: 15999,
    stock: 0,
    views: 145,
    sold: 20,
    active: false,
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop",
  },
];

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState(DEMO);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [menu, setMenu] = useState(null); // id for 3-dot menu
  const [view, setView] = useState(null); // product object
  const [edit, setEdit] = useState(null); // product object
  const [confirm, setConfirm] = useState(null); // id to delete

  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape") {
        setMenu(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((p) => (p.stock ?? 0) > 0).length;
    const low = items.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 2).length;
    const oos = items.filter((p) => (p.stock ?? 0) === 0).length;
    return { total, active, low, oos };
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((p) => {
      const okQ =
        !s ||
        p.title.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s);
      const okC = category === "All" || p.category === category;
      return okQ && okC;
    });
  }, [items, q, category]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category)))],
    [items]
  );

  const updateItem = (id, changes) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  const removeItem = (id) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
     {/* Header + back */}
<div className="flex items-center gap-3">
  <button
    onClick={() => navigate("/seller")}
    className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
    aria-label="Back"
    title="Back to Dashboard"
  >
    ←
  </button>
  <div>
    <h1 className="text-xl font-semibold text-[var(--brown-700)]">
      Inventory Management
    </h1>
    <p className="text-xs text-gray-600">
      Track stock levels and manage inventory alerts
    </p>
  </div>
</div>

      {/* Metric cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric  label="Total Products" value={stats.total} />
        <Metric  label="Active" value={stats.active} />
        <Metric  label="Low Stock" value={stats.low} />
        <Metric  label="Out of Stock" value={stats.oos} />
      </div>

      {/* Search + filters */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 rounded-full border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2 flex-1">
          
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search products..."
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-xl border border-[var(--line-amber)] bg-white px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            className="rounded-xl border border-[var(--line-amber)] bg-white px-3 py-2 text-sm hover:bg-[var(--cream-50)]"
            title="Filters"
          >
            Filters
          </button>
        </div>
      </div>

      {/* Product list */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white">
        <div className="px-5 py-4 border-b border-[var(--line-amber)]">
          <div className="font-semibold text-[var(--brown-700)]">Product List</div>
          <div className="text-sm text-gray-600">
            Manage your furniture inventory
          </div>
        </div>

        <ul className="divide-y divide-[var(--line-amber)]/70">
          {filtered.map((p) => (
            <li key={p.id} className="px-5 py-3">
              <div className="flex items-center gap-4">
                <img
                  src={p.image}
                  alt={p.title}
                  className="h-16 w-24 object-cover rounded-lg border border-[var(--line-amber)]"
                />
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-y-1 gap-x-4">
                  <div className="col-span-2">
                    <div className="font-medium text-[var(--brown-700)]">
                      {p.title}
                    </div>
                    <div className="text-xs text-gray-600">{p.category}</div>
                  </div>
                  <Info label="Price" value={<b>{peso(p.price)}</b>} />
                  <Info label="Stock" value={`${p.stock} ${p.stock === 1 ? "unit" : "units"}`} />
                  <Info label="Views" value={p.views} />
                  <Info label="Sold" value={p.sold} />
                </div>

                <div className="hidden sm:flex flex-col items-end gap-2">
                  <Status color={p.stock === 0 ? "red" : p.stock <= 2 ? "amber" : "green"}>
                    {p.stock === 0 ? "Out of Stock" : p.stock <= 2 ? "Low Stock" : "Active"}
                  </Status>
                </div>

                {/* 3-dots menu */}
                <div className="relative">
                  <button
                    onClick={() => setMenu(menu === p.id ? null : p.id)}
                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-[var(--cream-50)] border border-[var(--line-amber)]"
                    aria-label="More"
                  >
                    ⋮
                  </button>
                  {menu === p.id && (
                    <Menu onClose={() => setMenu(null)}>
                      <MenuItem onClick={() => { setView(p); setMenu(null); }}>
                        View details
                      </MenuItem>
                      <MenuItem onClick={() => { setEdit(p); setMenu(null); }}>
                        Edit product
                      </MenuItem>
                      <MenuItem danger onClick={() => { setConfirm(p.id); setMenu(null); }}>
                        Delete
                      </MenuItem>
                    </Menu>
                  )}
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-gray-600">
              No products found.
            </li>
          )}
        </ul>
      </div>

      {/* View details modal */}
      {view && (
        <Modal onClose={() => setView(null)} maxWidth="520px">
          <div className="space-y-4">
            <img
              src={view.image}
              alt={view.title}
              className="w-full h-56 object-cover rounded-xl border border-[var(--line-amber)]"
            />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Product Name" value={view.title} />
              <Field label="Category" value={view.category} />
              <Field label="Price" value={peso(view.price)} />
              <Field label="Stock" value={`${view.stock} units`} />
              <Field label="Views" value={view.views} />
              <Field label="Total Sold" value={view.sold} />
              <div className="col-span-2">
                <div className="text-xs text-gray-600 mb-1">Status</div>
                <Status color={view.stock === 0 ? "red" : view.stock <= 2 ? "amber" : "green"}>
                  {view.stock === 0 ? "Out of Stock" : view.stock <= 2 ? "Low Stock" : "Active"}
                </Status>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
                onClick={() => setView(null)}
              >
                Close
              </button>
              <button
                className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95"
                onClick={() => { setEdit(view); setView(null); }}
              >
                Edit Product
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit product modal */}
      {edit && (
        <EditModal
          item={edit}
          onCancel={() => setEdit(null)}
          onSave={(updated) => {
            updateItem(edit.id, updated);
            setEdit(null);
          }}
        />
      )}

      {/* Delete confirm */}
      {confirm && (
        <Confirm
          title="Delete Product?"
          body="This product will be removed from your inventory."
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            removeItem(confirm);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

function Metric({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-xl">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-[var(--brown-700)]">
        {value}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Menu({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute right-0 mt-2 w-40 rounded-xl border border-[var(--line-amber)] bg-white shadow z-30 overflow-hidden"
    >
      {children}
    </div>
  );
}
function MenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--cream-50)] ${
        danger ? "text-red-600" : "text-[var(--brown-700)]"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({ children, onClose, maxWidth = "640px" }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full rounded-2xl border border-[var(--line-amber)] bg-white p-5"
        style={{ maxWidth }}
      >
        <button
          className="absolute right-3 top-3 text-xl leading-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-[var(--brown-700)]">{value}</div>
    </div>
  );
}

function Confirm({ title, body, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} maxWidth="420px">
      <div className="space-y-3 text-center">
        <div className="text-3xl">🗑</div>
        <h2 className="text-lg font-semibold text-[var(--brown-700)]">{title}</h2>
        <p className="text-sm text-gray-600">{body}</p>
        <div className="flex gap-2 mt-2">
          <button
            className="flex-1 rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditModal({ item, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: item.title,
    category: item.category,
    condition: "Brand New",
    description: "",
    price: item.price,
    stock: item.stock,
    sku: "SKU-001",
    length: 0,
    width: 0,
    height: 0,
    image: item.image,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSave({
      title: form.title,
      category: form.category,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      image: form.image,
    });
  };

  return (
    <Modal onClose={onCancel} maxWidth="720px">
      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--brown-700)]">Edit Product</h3>

        {/* Images (demo placeholders) */}
        <div className="grid grid-cols-4 gap-3">
          {[form.image, null, null, null].map((src, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] grid place-items-center overflow-hidden"
            >
              {src ? (
                <img src={src} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-gray-500">Add</span>
              )}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Product Name</label>
            <input
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Condition</label>
            <select
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.condition}
              onChange={(e) => set("condition", e.target.value)}
            >
              <option>Brand New</option>
              <option>Like New</option>
              <option>Used</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Category</label>
            <select
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option>Living Room</option>
              <option>Dining Room</option>
              <option>Bedroom</option>
              <option>Office</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">SKU (Optional)</label>
            <input
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600">Description</label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
            placeholder="Describe your product..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-600">Price (₱)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Stock Quantity *</label>
            <input
              type="number"
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Image URL (demo)</label>
            <input
              className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
              value={form.image}
              onChange={(e) => set("image", e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <DimInput label="Length (cm)" value={form.length} onChange={(v) => set("length", v)} />
          <DimInput label="Width (cm)" value={form.width} onChange={(v) => set("width", v)} />
          <DimInput label="Height (cm)" value={form.height} onChange={(v) => set("height", v)} />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DimInput({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-600">{label}</label>
      <input
        type="number"
        className="w-full rounded-xl border border-[var(--line-amber)] px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
    );
}
