// src/pages/seller/Settings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../components/contexts/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient";
import toast from "react-hot-toast";

/**
 * Seller Settings
 * Tabs:
 * - Overview ✅
 * - Store & Profile Info ✅ (with Verification section)
 */

export default function SellerSettings() {
  const navigate = useNavigate();
  const { user: authUser, profile, refreshProfile, refreshUser } = useAuth();
  const [tab, setTab] = useState("overview"); // Default tab
  const [store, setStore] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    hoursWeekday: ["", ""],
    hoursWeekend: ["", ""],
    logo: "",
  });
  const [storeRecordId, setStoreRecordId] = useState(null);
  const [savingStore, setSavingStore] = useState(false);

  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("stores")
        .select(
          "id, name, description, phone, email, address, weekday_start, weekday_end, weekend_start, weekend_end, logo_url"
        )
        .eq("owner_id", authUser.id)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setStoreRecordId(data.id);
      setStore((prev) => ({
        ...prev,
        name: data.name ?? prev.name,
        description: data.description ?? prev.description,
        phone: data.phone ?? prev.phone,
        email: data.email ?? prev.email,
        address: data.address ?? prev.address,
        hoursWeekday: [data.weekday_start || prev.hoursWeekday[0], data.weekday_end || prev.hoursWeekday[1]],
        hoursWeekend: [data.weekend_start || prev.hoursWeekend[0], data.weekend_end || prev.hoursWeekend[1]],
        logo: data.logo_url || prev.logo,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  const handleSaveStore = async () => {
    if (!authUser?.id) {
      toast.error("You must be logged in to save store information.");
      return;
    }
    try {
      setSavingStore(true);
      const payload = {
        owner_id: authUser.id,
        name: store.name,
        description: store.description,
        phone: store.phone,
        email: store.email,
        address: store.address,
        weekday_start: store.hoursWeekday?.[0] || null,
        weekday_end: store.hoursWeekday?.[1] || null,
        weekend_start: store.hoursWeekend?.[0] || null,
        weekend_end: store.hoursWeekend?.[1] || null,
        logo_url: store.logo || null,
      };

      if (storeRecordId) {
        const { error } = await supabase.from("stores").update(payload).eq("id", storeRecordId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("stores")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (data?.id) setStoreRecordId(data.id);
      }

      toast.success("Store information saved.");
    } catch (e) {
      toast.error(e?.message || "Failed to save store information.");
    } finally {
      setSavingStore(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/seller")}
          className="rounded-lg border border-[var(--line-amber)] bg-white w-9 h-9 grid place-items-center hover:bg-[var(--cream-50)]"
          title="Back to Dashboard"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--brown-700)]">
            Seller Settings
          </h1>
          <p className="text-xs text-gray-600">
            Manage your seller account and preferences
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {[
            ["overview", "Overview"],
            ["store", "Store & Profile Info"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border ${
                tab === key
                  ? "bg-[var(--orange-600)] border-[var(--orange-600)] text-white"
                  : "border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "overview" && <OverviewTab store={store} />}
      {tab === "store" && (
        <StoreInfoTab
          store={store}
          setStore={setStore}
          onSaveStore={handleSaveStore}
          savingStore={savingStore}
        />
      )}
    </div>
  );
}

/* ---------------------- OVERVIEW TAB ---------------------- */

function OverviewTab({ store }) {
  const { user, profile } = useAuth();
  const md = user?.user_metadata || {};
  const fullName = (md.first_name || md.last_name)
    ? `${md.first_name ?? ""} ${md.last_name ?? ""}`.trim()
    : (user?.email ?? "-");
  const email = user?.email ?? "-";
  const mobile = md.phone ?? "-";
  const accountType = (profile?.role || md.role || "buyer") === "seller" ? "Seller" : "Buyer";
  const isVerified = !!profile?.seller_approved;
  return (
    <div className="space-y-5">
      {/* Store Snapshot */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <h3 className="font-semibold text-[var(--brown-700)] mb-1">
          Store Information
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Quick overview of your store details
        </p>

        <div className="flex items-start gap-4">
          <img
            src={store.logo}
            alt="Store logo"
            className="h-16 w-16 rounded-full object-cover border border-[var(--line-amber)]"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--brown-700)]">
              {store.name}
            </div>
            <div className="text-sm text-gray-700">{store.description}</div>

            {isVerified && (
              <div className="mt-2 flex items-center gap-2">
                <Badge color="green">Verified Seller</Badge>
              </div>
            )}
          </div>
        </div>

        <div className="my-4 h-px bg-[var(--line-amber)]/60" />

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <OverviewRow icon="📍" label="Address">
            {store.address}
          </OverviewRow>
          <OverviewRow icon="📞" label="Phone Number">
            {store.phone}
          </OverviewRow>
          <OverviewRow icon="✉️" label="Email Address">
            {store.email}
          </OverviewRow>
          <OverviewRow icon="⏰" label="Business Hours">
            Mon–Fri: {store.hoursWeekday[0]}–{store.hoursWeekday[1]} • Sat–Sun: {store.hoursWeekend[0]}–{store.hoursWeekend[1]}
          </OverviewRow>
        </div>
      </section>

      {/* Owner Snapshot */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <h3 className="font-semibold text-[var(--brown-700)] mb-1">
          Personal Information
        </h3>
        <p className="text-sm text-gray-600 mb-4">Account owner details</p>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <OverviewRow label="Full Name">{fullName}</OverviewRow>
          <OverviewRow label="Email">{email}</OverviewRow>
          <OverviewRow label="Mobile Number">{mobile}</OverviewRow>
          <OverviewRow label="Account Type">{accountType}</OverviewRow>
        </div>
      </section>
    </div>
  );
}

/* ---------------------- STORE TAB (with Verification + Profile) ---------------------- */

function StoreInfoTab({ store, setStore, onSaveStore, savingStore }) {
  const { user: authUser, profile, refreshProfile, refreshUser } = useAuth();

  const handleChange = (field, value) => {
    setStore((prev) => ({ ...prev, [field]: value }));
  };

  // Logo Upload
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setStore((prev) => ({ ...prev, logo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Store Information */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5 space-y-4">
        <h3 className="font-semibold text-[var(--brown-700)]">Store Information</h3>

        <div className="flex items-center gap-4">
          <img
            src={store.logo}
            alt="Store logo"
            className="h-16 w-16 rounded-full object-cover border border-[var(--line-amber)]"
          />
          <label className="rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm hover:bg-[var(--cream-50)] cursor-pointer">
            Upload New Logo
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </label>
        </div>

        <LabeledInput
          label="Store Name"
          value={store.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
        <LabeledTextarea
          label="Store Description"
          value={store.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <LabeledInput
            label="Phone Number"
            value={store.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
          <LabeledInput
            label="Store Email"
            value={store.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>

        <LabeledInput
          label="Store Address"
          value={store.address}
          onChange={(e) => handleChange("address", e.target.value)}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Business Hours (Mon–Fri)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={store.hoursWeekday[0]}
                onChange={(e) =>
                  handleChange("hoursWeekday", [
                    e.target.value,
                    store.hoursWeekday[1],
                  ])
                }
              />
              <Input
                value={store.hoursWeekday[1]}
                onChange={(e) =>
                  handleChange("hoursWeekday", [
                    store.hoursWeekday[0],
                    e.target.value,
                  ])
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Business Hours (Sat–Sun)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={store.hoursWeekend[0]}
                onChange={(e) =>
                  handleChange("hoursWeekend", [
                    e.target.value,
                    store.hoursWeekend[1],
                  ])
                }
              />
              <Input
                value={store.hoursWeekend[1]}
                onChange={(e) =>
                  handleChange("hoursWeekend", [
                    store.hoursWeekend[0],
                    e.target.value,
                  ])
                }
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onSaveStore}
            disabled={savingStore}
            className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingStore ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>

      {/* Personal & Bank Info (Profile) */}
      <ProfileTab
        authUser={authUser}
        profile={profile}
        refreshProfile={refreshProfile}
        refreshUser={refreshUser}
      />
    </div>
  );
}

/* ---------------------- PROFILE TAB ---------------------- */

function ProfileTab({ authUser, profile, refreshProfile, refreshUser }) {
  const [firstName, setFirstName] = useState(profile?.first_name || authUser?.user_metadata?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || authUser?.user_metadata?.last_name || "");
  const [email, setEmail] = useState(authUser?.email || "");
  const [mobile, setMobile] = useState(profile?.phone || authUser?.user_metadata?.phone || "");
  const [saving, setSaving] = useState(false);

  const handleUpdateProfile = async () => {
    if (!authUser?.id) {
      toast.error("You must be logged in to update your profile.");
      return;
    }
    try {
      setSaving(true);
      const cleanPhone = (mobile || "").replace(/\s|-/g, "");
      const phoneOk = /^((\+?63)|0)9\d{9}$/.test(cleanPhone);
      if (mobile && !phoneOk) {
        toast.error("Please enter a valid PH mobile number (e.g., 09171234567 or +639171234567).");
        setSaving(false);
        return;
      }

      const update = {
        first_name: firstName,
        last_name: lastName,
        phone: mobile,
      };
      const { error } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", authUser.id);
      if (error) throw error;

      const fullName = `${firstName || ""} ${lastName || ""}`.trim();
      try {
        await supabase.auth.updateUser({
          data: {
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: fullName || null,
            name: fullName || null,
            phone: mobile || null,
          },
        });
        await refreshUser?.();
      } catch (metaErr) {
        console.warn("Auth metadata update failed (non-fatal):", metaErr);
      }

      await refreshProfile?.();
      toast.success("Profile updated.");
    } catch (e) {
      toast.error(e?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Personal Info */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <h3 className="font-semibold text-[var(--brown-700)] mb-4">
          Personal Information
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <LabeledInput
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <LabeledInput
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <LabeledInput
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <LabeledInput
            label="Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </div>

        <div className="pt-3">
          <button
            onClick={handleUpdateProfile}
            disabled={saving}
            className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Update Profile"}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ---------------------- UI COMPONENTS ---------------------- */

function OverviewRow({ icon, label, children }) {
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
      <div className="text-gray-600 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 font-medium text-[var(--brown-700)]">
        {children}
      </div>
    </div>
  );
}

function Badge({ color = "gray", children }) {
  const colors = {
    green: "text-green-700 bg-green-100 border-green-300",
    purple: "text-purple-700 bg-purple-100 border-purple-300",
    gray: "text-gray-700 bg-gray-100 border-gray-300",
  }[color];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors}`}>
      {children}
    </span>
  );
}

function LabeledInput({ label, type = "text", ...props }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <Input type={type} {...props} />
    </label>
  );
}

function LabeledTextarea({ label, ...props }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <textarea
        className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none bg-white"
        rows={4}
        {...props}
      />
    </label>
  );
}

function Input(props) {
  return (
    <input
      className="w-full rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm outline-none bg-white"
      {...props}
    />
  );
}
