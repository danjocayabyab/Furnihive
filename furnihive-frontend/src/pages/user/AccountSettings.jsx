import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button.jsx";

/* ------------------ Tabs (security removed) ------------------ */
const TABS = [
  { key: "personal", label: "Personal" },
  { key: "addresses", label: "Addresses" },
];

/* ---------------- Mock user ---------------- */
const mockUser = {
  avatar: "",
  firstName: "Maria",
  lastName: "Santos",
  email: "maria.santos@email.com",
  phone: "+63 912 345 6789",
  birthDate: "1990-05-15",
  gender: "Female",
};

export default function AccountSettings() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "personal";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/profile" className="text-sm text-[var(--orange-600)] hover:underline">
          ← Back to Profile
        </Link>
        <h1 className="text-xl font-semibold text-[var(--brown-700)]">Account Settings</h1>
      </div>

      {/* Tab bar */}
      <div className="rounded-full bg-[var(--cream-50)] border border-[var(--line-amber)] p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSp({ tab: t.key })}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              tab === t.key
                ? "bg-white border border-[var(--line-amber)] text-[var(--orange-600)] font-medium"
                : "hover:bg-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === "personal" && <PersonalPanel />}
      {tab === "addresses" && <AddressesPanel />}
    </div>
  );
}

/* =========================================================
   PERSONAL
========================================================= */
function PersonalPanel() {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({ ...mockUser });
  const [preview, setPreview] = useState(mockUser.avatar);

  const onChoosePhoto = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const onSave = async () => {
    setSaving(true);
    // TODO: await api.put('/me', values)
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setIsEditing(false);
  };

  const onCancel = () => {
    setValues({ ...mockUser });
    setPreview(mockUser.avatar);
    setIsEditing(false);
  };

  const Field = ({ label, children, col = false }) => (
    <div className={`${col ? "col-span-2" : ""}`}>
      <label className="block text-xs font-semibold text-[var(--brown-700)] mb-1">{label}</label>
      {children}
    </div>
  );

  const inputCls =
    "w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-sm outline-none disabled:bg-[var(--cream-50)]";

  return (
    <div className="space-y-6">
      {/* Profile picture */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="text-[var(--brown-700)] font-semibold">Profile Picture</div>
          <Button variant="secondary" className="text-sm" onClick={() => setIsEditing(true)} disabled={isEditing}>
            Change Photo
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <img
            src={preview}
            alt="avatar"
            className="h-20 w-20 rounded-full object-cover border border-[var(--line-amber)]"
          />
          <div className="text-sm text-gray-700">
            Upload a new profile picture. JPG, PNG or GIF. Max size 5MB.
            <div className="mt-2">
              <label className="inline-block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!isEditing}
                  onChange={(e) => onChoosePhoto(e.target.files?.[0])}
                />
                <span
                  className={`inline-flex items-center rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm ${
                    !isEditing ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-[var(--cream-50)]"
                  }`}
                >
                  Upload New Photo
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[var(--brown-700)] font-semibold">Personal Information</div>
          {!isEditing ? (
            <Button variant="secondary" className="text-sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" className="text-sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button className="text-sm" onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name">
            <input
              className={inputCls}
              value={values.firstName}
              disabled={!isEditing}
              onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
            />
          </Field>
          <Field label="Last Name">
            <input
              className={inputCls}
              value={values.lastName}
              disabled={!isEditing}
              onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))}
            />
          </Field>
          <Field label="Email Address" col>
            <input
              type="email"
              className={inputCls}
              value={values.email}
              disabled={!isEditing}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
          </Field>
          <Field label="Phone Number" col>
            <input
              className={inputCls}
              value={values.phone}
              disabled={!isEditing}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            />
          </Field>
          <Field label="Birth Date">
            <input
              type="date"
              className={inputCls}
              value={values.birthDate}
              disabled={!isEditing}
              onChange={(e) => setValues((v) => ({ ...v, birthDate: e.target.value }))}
            />
          </Field>
          <Field label="Gender">
            <select
              className={inputCls}
              value={values.gender}
              disabled={!isEditing}
              onChange={(e) => setValues((v) => ({ ...v, gender: e.target.value }))}
            >
              <option>Female</option>
              <option>Male</option>
              <option>Prefer not to say</option>
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ADDRESSES
========================================================= */
function AddressesPanel() {
  const [addresses, setAddresses] = useState([
    {
      id: "addr-1",
      label: "Home Address",
      name: "Maria Santos",
      lines: ["123 Katipunan Ave, Loyola Heights", "Quezon City, Metro Manila 1108"],
      phone: "+63 912 345 6789",
      isDefault: true,
    },
    {
      id: "addr-2",
      label: "Work Address",
      name: "Maria Santos",
      lines: ["456 Ayala Ave, Makati CBD", "Makati, Metro Manila 1226"],
      phone: "+63 912 345 6789",
      isDefault: false,
    },
  ]);

  const [modal, setModal] = useState({ open: false, mode: "add", data: null });

  const openAdd = () =>
    setModal({
      open: true,
      mode: "add",
      data: {
        id: `addr-${Date.now()}`,
        label: "Home Address",
        name: "",
        lines: ["", ""],
        phone: "",
        isDefault: addresses.length === 0,
      },
    });

  const openEdit = (addr) => setModal({ open: true, mode: "edit", data: { ...addr } });
  const closeModal = () => setModal({ open: false, mode: "add", data: null });

  const saveAddress = (data) => {
    setAddresses((prev) => {
      let list = [];
      const exists = prev.some((a) => a.id === data.id);
      if (data.isDefault) {
        list = prev.map((a) => ({ ...a, isDefault: a.id === data.id }));
      } else list = [...prev];
      if (exists) return list.map((a) => (a.id === data.id ? data : a));
      return [...list, data];
    });
    closeModal();
  };

  const deleteAddress = (id) => setAddresses((prev) => prev.filter((a) => a.id !== id));
  const setDefault = (id) => setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[var(--brown-700)] font-semibold">Saved Addresses</h3>
        <Button onClick={openAdd} variant="secondary" className="flex items-center gap-2">
          <span>＋</span> Add New Address
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {addresses.map((a) => (
          <AddressCard
            key={a.id}
            addr={a}
            onEdit={() => openEdit(a)}
            onDelete={() => deleteAddress(a.id)}
            onSetDefault={() => setDefault(a.id)}
          />
        ))}
      </div>

      {modal.open && (
        <AddressModal
          mode={modal.mode}
          initial={modal.data}
          onClose={closeModal}
          onSave={saveAddress}
        />
      )}
    </div>
  );
}

/* =========================================================
   Shared little bits
========================================================= */
function AddressCard({ addr, onEdit, onDelete, onSetDefault }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-5 relative">
      {addr.isDefault && (
        <span className="absolute right-3 top-3 text-[10px] px-2 py-0.5 rounded-full bg-[var(--amber-100)] text-[var(--orange-700)] border border-[var(--line-amber)]">
          Default
        </span>
      )}
      <button
        onClick={onEdit}
        className="absolute right-3 top-9 text-xs text-[var(--orange-600)] hover:underline"
        title="Edit"
      >
        ✎
      </button>

      <div className="font-semibold text-[var(--brown-700)] mb-2">{addr.label}</div>
      <div className="text-sm text-[var(--brown-700)]">{addr.name}</div>
      <div className="text-sm text-gray-700">
        {addr.lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <div className="text-sm text-gray-700">{addr.phone}</div>

      <div className="mt-4 flex items-center gap-3">
        {!addr.isDefault && (
          <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={onSetDefault}>
            Set as Default
          </Button>
        )}
        <button className="flex items-center gap-1 text-sm text-[var(--orange-700)]" onClick={onDelete}>
          🗑 Delete
        </button>
      </div>
    </div>
  );
}

function AddressModal({ mode, initial, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const input = "w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm";

  const save = () => {
    if (!form.name || !form.lines[0] || !form.phone) {
      alert("Please complete name, address line 1 and phone.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white border border-[var(--line-amber)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[var(--brown-700)] font-semibold">
            {mode === "add" ? "Add New Address" : "Edit Address"}
          </h4>
          <button className="text-sm text-gray-600" onClick={onClose}>✕</button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Address Label</label>
            <select
              className={input}
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            >
              <option>Home Address</option>
              <option>Work Address</option>
              <option>Other</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Full Name</label>
            <input className={input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Address Line 1</label>
            <input
              className={input}
              value={form.lines[0]}
              onChange={(e) => setForm((f) => ({ ...f, lines: [e.target.value, f.lines[1] || ""] }))}
              placeholder="Street, barangay"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Address Line 2 (optional)</label>
            <input
              className={input}
              value={form.lines[1]}
              onChange={(e) => setForm((f) => ({ ...f, lines: [f.lines[0], e.target.value] }))}
              placeholder="City, province / postal"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Phone Number</label>
            <input className={input} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="isDefault"
              type="checkbox"
              className="h-4 w-4"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            <label htmlFor="isDefault" className="text-sm text-[var(--brown-700)]">
              Set as default address
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{mode === "add" ? "Add Address" : "Save Changes"}</Button>
        </div>
      </div>
    </div>
  );
}
