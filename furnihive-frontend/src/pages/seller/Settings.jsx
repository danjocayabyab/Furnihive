// src/pages/seller/Settings.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Seller Settings
 * Tabs:
 * - Overview ✅
 * - Store Info ✅ (with Verification section)
 * - Profile
 */

export default function SellerSettings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview"); // Default tab

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
            ["store", "Store Info"],
            ["profile", "Profile"],
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
      {tab === "overview" && <OverviewTab />}
      {tab === "store" && <StoreInfoTab />}
      {tab === "profile" && <ProfileTab />}
    </div>
  );
}

/* ---------------------- OVERVIEW TAB ---------------------- */

function OverviewTab() {
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

      {/* Owner Snapshot */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <h3 className="font-semibold text-[var(--brown-700)] mb-1">
          Personal Information
        </h3>
        <p className="text-sm text-gray-600 mb-4">Account owner details</p>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <OverviewRow label="Full Name">Juan Santos</OverviewRow>
          <OverviewRow label="Email">juan.santos@email.com</OverviewRow>
          <OverviewRow label="Mobile Number">+63 912 345 6789</OverviewRow>
          <OverviewRow label="Account Type">Premium Seller</OverviewRow>
        </div>
      </section>
    </div>
  );
}

/* ---------------------- STORE TAB (with Verification) ---------------------- */

function StoreInfoTab() {
  const [store, setStore] = useState({
    name: "Manila Furniture Co.",
    description:
      "We offer high-quality, locally-made furniture for every room in your home. Family-owned business serving Metro Manila since 2015.",
    phone: "+63 912 345 6789",
    email: "contact@manilafurniture.ph",
    address: "123 Furniture St, Quezon City, Metro Manila, 1100",
    hoursWeekday: ["9:00 AM", "6:00 PM"],
    hoursWeekend: ["10:00 AM", "5:00 PM"],
    logo: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=300&auto=format&fit=crop",
  });

  const [files, setFiles] = useState([]);
  const [verified, setVerified] = useState(false);

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

  // Verification files
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitVerification = () => {
    alert(
      "Your verification documents have been sent to the admin for review. You’ll be notified once approved."
    );
    // TODO: connect to Supabase upload + verification table
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
          <button className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95">
            Save Changes
          </button>
        </div>
      </section>

      {/* Verification Section */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <h3 className="font-semibold text-[var(--brown-700)] mb-1">
          Store Verification
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload official business documents for verification. Accepted files:
          <b> PDF, JPG, PNG, DOCX</b>.
        </p>

        {verified ? (
          <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-700 flex items-center gap-2">
            ✅ Your account is verified. Thank you for submitting your documents!
          </div>
        ) : (
          <>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
              className="block w-full border border-[var(--line-amber)] rounded-lg px-3 py-2 text-sm bg-white"
            />

            {files.length > 0 && (
              <div className="mt-3 space-y-1">
                <h4 className="text-sm font-medium text-[var(--brown-700)]">
                  Files to upload:
                </h4>
                <ul className="text-sm list-disc pl-5 text-gray-700 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <span>
                        {f.name}{" "}
                        <span className="text-gray-500 text-xs">
                          ({(f.size / 1024).toFixed(1)} KB)
                        </span>
                      </span>
                      <button
                        onClick={() => handleRemoveFile(i)}
                        className="text-red-500 text-xs ml-2 hover:text-red-700"
                      >
                        ❌
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3">
              <button
                onClick={handleSubmitVerification}
                disabled={files.length === 0}
                className={`rounded-lg px-4 py-2 text-sm text-white ${
                  files.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[var(--orange-600)] hover:brightness-95"
                }`}
              >
                Submit for Verification
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ---------------------- PROFILE TAB ---------------------- */

function ProfileTab() {
  const [profile, setProfile] = useState({
    firstName: "Juan",
    lastName: "Santos",
    email: "juan.santos@email.com",
    mobile: "+63 912 345 6789",
    bankName: "",
    accountName: "",
    accountNumber: "",
  });

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
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
            value={profile.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
          />
          <LabeledInput
            label="Last Name"
            value={profile.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
          />
          <LabeledInput
            label="Email Address"
            value={profile.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
          <LabeledInput
            label="Mobile Number"
            value={profile.mobile}
            onChange={(e) => handleChange("mobile", e.target.value)}
          />
        </div>

        <div className="pt-3">
          <button className="rounded-lg bg-[var(--orange-600)] text-white px-4 py-2 text-sm hover:brightness-95">
            Update Profile
          </button>
        </div>
      </section>

      {/* Bank Info */}
      <section className="rounded-2xl border border-[var(--line-amber)] bg-white p-5">
        <h3 className="font-semibold text-[var(--brown-700)] mb-4">
          Bank Account
        </h3>
        <div className="grid gap-4">
          <LabeledInput
            label="Bank Name"
            value={profile.bankName}
            onChange={(e) => handleChange("bankName", e.target.value)}
          />
          <LabeledInput
            label="Account Name"
            value={profile.accountName}
            onChange={(e) => handleChange("accountName", e.target.value)}
          />
          <LabeledInput
            label="Account Number"
            value={profile.accountNumber}
            onChange={(e) => handleChange("accountNumber", e.target.value)}
          />
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
