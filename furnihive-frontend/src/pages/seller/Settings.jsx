// src/pages/seller/Settings.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Seller Settings with 5 tabs:
 * - Overview  ✅ (new)
 * - Store Info
 * - Profile
 * - Notifications
 * - Security
 *
 * All inputs are still mocked and ready to be wired to your API later.
 */

export default function SellerSettings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview"); // <-- default to the new Overview tab

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header + back */}
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
            ["overview", "Overview", "🏠"],
            ["store", "Store Info", "🏬"],
            ["profile", "Profile", "👤"],
            ["notifications", "Notifications", "🔔"],
            ["security", "Security", "🔒"],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border ${
                tab === key
                  ? "bg-[var(--orange-600)] border-[var(--orange-600)] text-white"
                  : "border-[var(--line-amber)] hover:bg-[var(--cream-50)]"
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bodies */}
      {tab === "overview" && <OverviewTab />}
      {tab === "store" && <StoreInfoTab />}
      {tab === "profile" && <ProfileTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "security" && <SecurityTab />}
    </div>
  );
}

/* ---------------------- TABS ---------------------- */

function OverviewTab() {
  return (
    <div className="space-y-5">
      {/* Store Information snapshot */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <span>🏬</span>
          <h3 className="font-semibold text-[var(--brown-700)]">
            Store Information
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Quick view of your store details
        </p>

        <div className="flex items-start gap-4">
          <img
            src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=300&auto=format&fit=crop"
            alt="Store logo"
            className="h-16 w-16 rounded-full object-cover border border-[var(--line-amber)]"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--brown-700)]">
              Manila Furniture Co.
            </div>
            <div className="text-sm text-gray-700">
              We offer high-quality, locally-made furniture for every room in
              your home. Family-owned business serving Metro Manila since 2015.
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Badge color="green">Verified Seller</Badge>
              <Badge color="purple">Premium Member</Badge>
            </div>
          </div>
        </div>

        <div className="my-4 h-px bg-[var(--line-amber)]/60" />

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <OverviewRow icon="📍" label="Address">
            123 Furniture St, Quezon City, Metro Manila, 1100
          </OverviewRow>
          <OverviewRow icon="📞" label="Phone Number">
            +63 912 345 6789
          </OverviewRow>
          <OverviewRow icon="✉️" label="Email Address">
            contact@manilafurniture.ph
          </OverviewRow>
          <OverviewRow icon="⏰" label="Business Hours">
            Mon–Fri: 9AM–6PM • Sat–Sun: 10AM–5PM
          </OverviewRow>
        </div>
      </section>

      {/* Owner snapshot */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <span>🧑‍💼</span>
          <h3 className="font-semibold text-[var(--brown-700)]">
            Personal Information
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Account owner details
        </p>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <OverviewRow icon="🧾" label="Full Name">
            Juan Santos
          </OverviewRow>
          <OverviewRow icon="✉️" label="Email">
            juan.santos@email.com
          </OverviewRow>
          <OverviewRow icon="📱" label="Mobile Number">
            +63 912 345 6789
          </OverviewRow>
          <OverviewRow icon="⭐" label="Account Type">
            Premium Seller
          </OverviewRow>
        </div>
      </section>
    </div>
  );
}

function OverviewRow({ icon, label, children }) {
  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
      <div className="text-gray-600 flex items-center gap-2">
        <span className="shrink-0">{icon}</span>
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

/* ---------- Existing tabs below (unchanged content) ---------- */

function StoreInfoTab() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <span>🏬</span>
          <h3 className="font-semibold text-[var(--brown-700)]">Store Information</h3>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=300&auto=format&fit=crop"
              alt="Store logo"
              className="h-16 w-16 rounded-full object-cover border border-[var(--line-amber)]"
            />
            <button className="rounded-lg border border-[var(--line-amber)] px-3 py-2 text-sm hover:bg-[var(--cream-50)]">
              Upload New Logo
            </button>
          </div>

          <LabeledInput label="Store Name" defaultValue="Manila Furniture Co." />
          <LabeledTextarea
            label="Store Description"
            defaultValue="We offer high-quality, locally-made furniture for every room in your home. Family-owned business serving Metro Manila since 2015."
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <LabeledInput label="Phone Number" defaultValue="+63 912 345 6789" />
            <LabeledInput label="Store Email" defaultValue="contact@manilafurniture.ph" />
          </div>

          <LabeledInput
            label="Store Address"
            defaultValue="123 Furniture St, Quezon City, Metro Manila, 1100"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Business Hours (Mon–Fri)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input defaultValue="9:00 AM" />
                <Input defaultValue="6:00 PM" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Business Hours (Sat–Sun)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input defaultValue="10:00 AM" />
                <Input defaultValue="5:00 PM" />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95">
              Save Changes
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileTab() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <span>👤</span>
          <h3 className="font-semibold text-[var(--brown-700)]">Personal Information</h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <LabeledInput label="First Name" defaultValue="Juan" />
          <LabeledInput label="Last Name" defaultValue="Santos" />
          <LabeledInput label="Email Address" defaultValue="juan.santos@email.com" />
          <LabeledInput label="Mobile Number" defaultValue="+63 912 345 6789" />
        </div>

        <div className="pt-3">
          <button className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95">
            Update Profile
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <h3 className="font-semibold text-[var(--brown-700)] mb-4">Bank Account</h3>
        <div className="grid gap-4">
          <LabeledInput label="Bank Name" placeholder="e.g., BDO, BPI, Metrobank" />
          <LabeledInput label="Account Name" placeholder="Account holder name" />
          <LabeledInput label="Account Number" placeholder="Enter account number" />
          <div className="pt-2">
            <button className="rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]">
              Save Bank Details
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function NotificationsTab() {
  return (
    <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <span>🔔</span>
        <h3 className="font-semibold text-[var(--brown-700)]">Notification Preferences</h3>
      </div>

      <div className="space-y-4">
        {[
          ["Email Notifications", "Receive notifications via email"],
          ["Push Notifications", "Receive push notifications on your device"],
          ["Order Updates", "Get notified about new orders and updates"],
          ["Promotions & Tips", "Receive tips to grow your business"],
        ].map(([title, desc], i) => (
          <ToggleRow key={i} title={title} desc={desc} defaultOn={i < 3} />
        ))}
      </div>

      <div className="pt-4">
        <button className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95">
          Save Preferences
        </button>
      </div>
    </section>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <span>🔒</span>
          <h3 className="font-semibold text-[var(--brown-700)]">Change Password</h3>
        </div>
        <div className="grid gap-3">
          <LabeledInput label="Current Password" type="password" />
          <LabeledInput label="New Password" type="password" />
          <LabeledInput label="Confirm New Password" type="password" />
          <div className="pt-2">
            <button className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95">
              Update Password
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <h3 className="font-semibold text-[var(--brown-700)] mb-3">
          Two-Factor Authentication
        </h3>
        <p className="text-sm text-gray-700 mb-3">
          Two-factor authentication is currently disabled
        </p>
        <button className="rounded-lg border border-[var(--line-amber)] px-4 py-2 text-sm hover:bg-[var(--cream-50)]">
          Enable
        </button>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <h3 className="font-semibold text-red-700 mb-3">Danger Zone</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="rounded-lg border border-red-300 text-red-700 px-4 py-2 text-sm hover:bg-red-100">
            Deactivate
          </button>
          <button className="rounded-lg border border-red-300 text-red-700 px-4 py-2 text-sm hover:bg-red-100">
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}

/* ---------------------- UI bits ---------------------- */

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

function ToggleRow({ title, desc, defaultOn }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] px-3 py-2">
      <div>
        <div className="font-medium text-[var(--brown-700)]">{title}</div>
        <div className="text-xs text-gray-600">{desc}</div>
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        className={`h-6 w-11 rounded-full transition-colors ${
          on ? "bg-[var(--orange-600)]" : "bg-gray-300"
        } relative`}
        aria-label={`${title} toggle`}
      >
        <span
          className={`absolute top-0.5 transition-all h-5 w-5 rounded-full bg-white ${
            on ? "right-0.5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
