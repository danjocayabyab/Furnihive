// src/pages/seller/Dashboard.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user: authUser, profile, refreshProfile } = useAuth();
  const [storeName, setStoreName] = useState(profile?.store_name || "your store");
  const [stats, setStats] = useState({
    totalSales: 0,
    activeOrders: 0,
    productsListed: 0,
    lowStockItems: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const isVerified = !!profile?.seller_approved;

  // Track initial verification state so we only show welcome when transitioning
  const initialVerifiedRef = useRef(isVerified);

  useEffect(() => {
    if (!authUser?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("stores")
          .select("name")
          .eq("owner_id", authUser.id)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled && data?.name) {
          setStoreName(data.name);
        }
      } catch (e) {
        console.error("Failed to load store for dashboard", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id) return;
    if (!isVerified) {
      setVerifyModalOpen(true);
    }
  }, [authUser?.id, isVerified]);

  // When seller becomes verified (after admin approval), hide verification gate
  // and show a one-time welcome message.
  useEffect(() => {
    if (!initialVerifiedRef.current && isVerified) {
      setVerifyModalOpen(false);
      setShowWelcomeModal(true);
    }
  }, [isVerified]);

  // While verified, periodically refresh profile so that if an admin later
  // rejects the application, seller_approved will update and the gate will
  // become active again without a full page reload.
  useEffect(() => {
    if (!authUser?.id) return;
    if (!isVerified) return;

    const intervalId = setInterval(async () => {
      try {
        await refreshProfile();
      } catch (e) {
        console.warn("Failed to refresh seller profile", e);
      }
    }, 30000); // every 30 seconds

    return () => clearInterval(intervalId);
  }, [authUser?.id, isVerified, refreshProfile]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitVerification = async (details) => {
    if (!authUser?.id) {
      toast.error("You must be logged in to submit verification.");
      return;
    }
    if (!files.length) {
      toast.error("Please attach at least one document before submitting.");
      return;
    }

    try {
      const { data: verification, error: insertErr } = await supabase
        .from("store_verifications")
        .insert({
          seller_id: authUser.id,
          status: "pending",
          notes: details?.notes || null,
          contact_email: details?.email || authUser.email || null,
          contact_phone: details?.phone || null,
          location: details?.location || null,
          files: [],
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      if (!verification?.id) throw new Error("Failed to create verification record.");

      const uploads = files.map(async (file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const path = `${authUser.id}/${verification.id}/${Date.now()}-${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from("store-verifications")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadErr) throw uploadErr;
        return {
          path,
          name: file.name,
          size: file.size,
        };
      });

      const uploadedFiles = await Promise.all(uploads);

      const { error: updateErr } = await supabase
        .from("store_verifications")
        .update({ files: uploadedFiles })
        .eq("id", verification.id);
      if (updateErr) throw updateErr;

      setFiles([]);
      toast.success("Your verification documents have been submitted for review.");
    } catch (e) {
      console.error("Verification submit failed", e);
      toast.error(e?.message || "Failed to submit verification documents.");
    }
  };

  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadingStats(true);

        const { data: products, error } = await supabase
          .from("products")
          .select("id, status, seller_id, stock_qty, inventory_items(quantity_on_hand)")
          .eq("seller_id", authUser.id);

        if (error) throw error;

        const list = products || [];
        const activeProducts = list.filter((p) => p.status !== "archived");
        const productsListed = activeProducts.length;

        const lowStockItems = activeProducts.filter((p) => {
          const qtyFromProduct =
            (p.stock_qty ?? null) != null
              ? p.stock_qty
              : p.inventory_items?.[0]?.quantity_on_hand ?? 0;
          const qty = Number(qtyFromProduct) || 0;
          return qty > 0 && qty <= 2;
        }).length;

        if (!cancelled) {
          setStats({
            totalSales: 0,
            activeOrders: 0,
            productsListed,
            lowStockItems,
          });
        }
      } catch (e) {
        console.error("Failed to load dashboard stats", e);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--brown-700)]">
          Welcome back, {storeName}!
        </h1>
        <p className="text-sm text-gray-600">
          Here’s what’s happening with your store today.
        </p>
      </div>

      {!isVerified && (
        <div className="rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-3">
          <div>
            <div className="font-semibold">Seller verification required</div>
            <p className="mt-1">
              Your seller account is pending verification. Please submit your application so the admin can review and approve it before you can use all seller tools.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setVerifyModalOpen(true)}
                className="inline-flex items-center rounded-lg border border-[var(--line-amber)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--brown-700)] hover:bg-[var(--cream-50)]"
              >
                Open verification form
              </button>
              <button
                type="button"
                onClick={async () => {
                  const latest = await refreshProfile();
                  if (latest?.seller_approved) {
                    toast.success("You are now verified! Welcome.");
                  } else {
                    toast("Still pending admin approval. Please try again later.");
                  }
                }}
                className="inline-flex items-center rounded-lg border border-[var(--line-amber)] bg-[var(--orange-600)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-95"
              >
                Check verification status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Summary Cards (no hover) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Sales"
          value={loadingStats ? "-" : `₱${stats.totalSales.toLocaleString()}`}
          change=""
          
          color="text-green-600"
        />
        <SummaryCard
          title="Active Orders"
          value={loadingStats ? "-" : `${stats.activeOrders}`}
          change=""
          
          color="text-green-600"
        />
        <SummaryCard
          title="Products Listed"
          value={loadingStats ? "-" : `${stats.productsListed}`}
          change=""
          
          color="text-green-600"
        />
        <SummaryCard
          title="Low Stock Items"
          value={loadingStats ? "-" : `${stats.lowStockItems}`}
          change=""
          
          color="text-red-600"
        />
      </div>

      {/* Navigation Cards (with hover) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* ✅ Added navigation for Inventory */}
        <NavButton
          label="Inventory"
          
          onClick={() => {
            if (!isVerified) {
              setVerifyModalOpen(true);
              return;
            }
            navigate("/seller/inventory");
          }}
        />
        <NavButton 
          label="Orders" 
           
          onClick={() => {
            if (!isVerified) {
              setVerifyModalOpen(true);
              return;
            }
            navigate("/seller/orders");
          }} 
        />

        <NavButton 
          label="Promotions" 
          
          onClick={() => {
            if (!isVerified) {
              setVerifyModalOpen(true);
              return;
            }
            navigate("/seller/promotions");
          }} 
        />

        <NavButton
          label="Analytics"
          
          onClick={() => {
            if (!isVerified) {
              setVerifyModalOpen(true);
              return;
            }
            navigate("/seller/analytics");
          }} 
        />

        <NavButton
          label="Engagement"
          
          onClick={() => {
            if (!isVerified) {
              setVerifyModalOpen(true);
              return;
            }
            navigate("/seller/engagement");
          }}
        />
      </div>

      {/* Dashboard Content */}
      <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
        {/* Left Side */}
        <div className="space-y-6">
          {/* Top Products */}
          <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
            <div className="px-5 py-4 border-b border-[var(--line-amber)] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--brown-700)]">
                  Top Products
                </h3>
                <p className="text-xs text-gray-600">
                  Your best selling items this month
                </p>
              </div>
              {/* ✅ Navigates to Analytics */}
              <button
                onClick={() => navigate("/seller/analytics")}
                className="text-xs text-[var(--orange-600)] hover:underline"
              >
                View Full Analytics
              </button>
            </div>

            <ul className="divide-y divide-[var(--line-amber)]/70">
              {[
                {
                  title: "Modern Sectional Sofa",
                  price: "₱45,999",
                  sold: "54 units sold",
                },
                {
                  title: "Solid Wood Dining Set",
                  price: "₱35,500",
                  sold: "32 units sold",
                },
                {
                  title: "Queen Size Bed Frame",
                  price: "₱28,500",
                  sold: "28 units sold",
                },
              ].map((p, i) => (
                <li
                  key={i}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-[var(--brown-700)] text-sm">
                      {p.title}
                    </div>
                    <div className="text-xs text-gray-600">{p.sold}</div>
                  </div>
                  <div className="text-sm font-semibold text-[var(--brown-700)]">
                    {p.price}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Recent Orders */}
          <section className="rounded-2xl border border-[var(--line-amber)] bg-white">
            <div className="px-5 py-4 border-b border-[var(--line-amber)] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--brown-700)]">
                  Recent Orders
                </h3>
                <p className="text-xs text-gray-600">
                  Your latest customer orders
                </p>
              </div>
              {/* ✅ Navigates to Orders */}
              <button
                onClick={() => navigate("/seller/orders")}
                className="text-xs text-[var(--orange-600)] hover:underline"
              >
                View All
              </button>
            </div>

            <ul className="divide-y divide-[var(--line-amber)]/70">
              {[
                {
                  id: "ORD-2025-1244",
                  product: "Modern Sectional Sofa",
                  total: "₱45,999",
                  status: "pending",
                  customer: "Maria Santos",
                },
                {
                  id: "ORD-2025-1243",
                  product: "Solid Wood Dining Set",
                  total: "₱35,500",
                  status: "processing",
                  customer: "Juan dela Cruz",
                },
                {
                  id: "ORD-2025-1242",
                  product: "Queen Size Bed Frame",
                  total: "₱28,500",
                  status: "shipped",
                  customer: "Anna Reyes",
                },
                {
                  id: "ORD-2025-1241",
                  product: "Office Desk & Chair",
                  total: "₱18,500",
                  status: "delivered",
                  customer: "Carlos Mendoza",
                },
              ].map((o) => (
                <li key={o.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--brown-700)] truncate">
                        {o.id}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {o.product} — Customer: {o.customer}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{o.total}</div>
                      <StatusPill status={o.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right Side: Low Stock Alert */}
        <aside className="rounded-2xl border border-[var(--line-amber)] bg-white h-fit">
          <div className="px-5 py-4 border-b border-[var(--line-amber)]">
            <h3 className="font-semibold text-[var(--brown-700)]">
              Low Stock Alert
            </h3>
            <p className="text-xs text-gray-600">
              Products running out of stock
            </p>
          </div>
          <div className="p-4 space-y-3">
            {[
              { name: "Velvet Armchair", stock: 2 },
              { name: "Coffee Table Set", stock: 1 },
              { name: "Bookshelf Unit", stock: 1 },
            ].map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
              >
                <div>{p.name}</div>
                <span className="text-xs">Only {p.stock} left</span>
              </div>
            ))}
            {/* ✅ Navigates to Inventory */}
            <button
              onClick={() => {
                if (!isVerified) {
                  setVerifyModalOpen(true);
                  return;
                }
                navigate("/seller/inventory");
              }}
              className="w-full mt-3 rounded-lg border border-red-300 text-red-700 text-sm py-2 hover:bg-red-100 transition"
            >
              Manage Inventory
            </button>
          </div>
        </aside>
      </div>

      {!isVerified && (
        <VerificationModal
          open={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          files={files}
          onFileChange={handleFileChange}
          onRemoveFile={handleRemoveFile}
          onSubmit={handleSubmitVerification}
          email={authUser?.email || ""}
          storeName={storeName}
        />
      )}

      {showWelcomeModal && (
        <WelcomeModal
          storeName={storeName}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}
    </div>
  );
}

function WelcomeModal({ storeName, onClose }) {
  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-card border border-[var(--line-amber)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--line-amber)] flex items-center justify-between">
            <div className="font-semibold text-[var(--brown-700)]">Welcome, verified seller!</div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-lg border border-[var(--line-amber)] bg-white text-xs hover:bg-[var(--cream-50)]"
            >
              Close
            </button>
          </div>

          <div className="px-5 py-4 text-sm text-[var(--brown-700)]/90 space-y-3">
            <p className="font-medium text-[var(--brown-700)]">
              {storeName || "Your store"} is now verified.
            </p>
            <p>
              You now have full access to all seller tools, including inventory, orders,
              promotions, analytics, and engagement. Use these tools to grow and manage
              your store.
            </p>
          </div>

          <div className="px-5 py-3 border-t border-[var(--line-amber)] flex justify-end gap-2 bg-[var(--cream-50)]/60">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-[var(--line-amber)] bg-[var(--orange-600)] text-white text-xs font-medium hover:opacity-95"
            >
              Start managing my store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Reusable Components ---------- */
function SummaryCard({ title, value, change, icon, color }) {
  return (
    <div className="rounded-2xl border border-[var(--line-amber)] bg-white p-4 flex justify-between items-center">
      <div>
        <div className="text-sm text-gray-600">{title}</div>
        <div className="text-2xl font-bold text-[var(--brown-700)]">{value}</div>
        <div className={`text-xs ${color}`}>{change}</div>
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  );
}

/* Navigation Cards (with hover + white fill) */
function NavButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-xl border border-[var(--line-amber)] bg-white py-3 px-2 text-sm font-medium text-[var(--brown-700)] hover:bg-[var(--amber-50)] transition cursor-pointer shadow-sm"
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* Status pill colors (unchanged) */
function StatusPill({ status }) {
  const colors = {
    pending: "text-orange-700 border-orange-300 bg-orange-100",
    processing: "text-yellow-700 border-yellow-300 bg-yellow-100",
    shipped: "text-blue-700 border-blue-300 bg-blue-100",
    delivered: "text-green-700 border-green-300 bg-green-100",
  };

  return (
    <span
      className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs border ${colors[status]}`}
    >
      {status}
    </span>
  );
}

function VerificationModal({
  open,
  onClose,
  files,
  onFileChange,
  onRemoveFile,
  onSubmit,
  email,
  storeName,
}) {
  if (!open) return null;
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const locationRef = useRef(null);
  const storeNameRef = useRef(null);
  const notesRef = useRef(null);

  const Line = () => <hr className="my-4 border-[var(--line-amber)]/50" />;

  const Label = ({ children }) => (
    <div className="text-[12px] uppercase tracking-wide text-[var(--brown-700)]/70 mb-1">
      {children}
    </div>
  );

  const Field = ({ children }) => (
    <div className="flex items-start gap-2">
      <div>{children}</div>
    </div>
  );

  const DocItem = ({ name }) => (
    <div className="w-full flex items-center justify-between rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-[var(--brown-700)]">
        <span className="truncate max-w-[220px]">{name}</span>
      </div>
      <div className="text-[11px] text-gray-500">
        {(name || "").split(".").pop()?.toUpperCase?.() || "FILE"}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-card border border-[var(--line-amber)]">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 py-3 border-b border-[var(--line-amber)] flex items-center justify-between">
            <div>
              <div className="font-semibold text-[var(--brown-700)]">
                Seller Verification Application
              </div>
              <div className="text-xs text-[var(--brown-700)]/70 mt-0.5">
                Please review your details and upload your business documents. Your
                application will be reviewed by the admin.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-lg border border-[var(--line-amber)] bg-white text-xs hover:bg-[var(--cream-50)]"
            >
              Close
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 text-sm">
            {/* Email + Store */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Field>
                  <input
                    type="email"
                    defaultValue={email || ""}
                    ref={emailRef}
                    className="w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-xs text-[var(--brown-700)] focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
                  />
                </Field>
              </div>
              <div>
                <Label>Store Name</Label>
                <Field>
                  <input
                    type="text"
                    defaultValue={storeName || ""}
                    ref={storeNameRef}
                    className="w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-xs text-[var(--brown-700)] focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Field>
                  <input
                    type="text"
                    ref={phoneRef}
                    className="w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-xs text-[var(--brown-700)] focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
                  />
                </Field>
              </div>
              <div>
                <Label>Location</Label>
                <Field>
                  <input
                    type="text"
                    ref={locationRef}
                    className="w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-xs text-[var(--brown-700)] focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
                  />
                </Field>
              </div>
            </div>

            <Line />

            {/* Application details (static for now) */}
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[var(--brown-700)]">
                Application Details
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full border bg-yellow-100 text-amber-900 border-yellow-200">
                Pending submission
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[var(--brown-700)]/80">
              <div>
                <Label>Notes</Label>
                <textarea
                  ref={notesRef}
                  rows={4}
                  className="w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-xs text-[var(--brown-700)] focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40 resize-none"
                  placeholder="Describe your business, permits, or any details that can help the admin verify your account."
                />
              </div>
              <div>
                <Label>Reminder</Label>
                <p>
                  Make sure the information in your seller profile matches the
                  documents you submit.
                </p>
              </div>
            </div>

            <Line />

            {/* Documents */}
            <div>
              <Label>Verification Documents</Label>
              <p className="text-xs text-[var(--brown-700)]/70 mb-2">
                Select one or more files (PDF, images, etc.) that prove your business
                identity.
              </p>
              <input
                type="file"
                multiple
                onChange={onFileChange}
                className="block w-full text-xs text-[var(--brown-700)] file:mr-3 file:rounded-lg file:border file:border-[var(--line-amber)] file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--brown-700)] hover:file:bg-[var(--cream-50)]"
              />

              {!!files?.length && (
                <div className="mt-3 space-y-2">
                  {files.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2"
                    >
                      <DocItem name={f.name} />
                      <button
                        type="button"
                        onClick={() => onRemoveFile(idx)}
                        className="text-[11px] text-red-600 hover:underline whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Line />

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3 rounded-lg border border-[var(--line-amber)] bg-white hover:bg-[var(--cream-50)] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  onSubmit({
                    email: emailRef.current?.value || "",
                    phone: phoneRef.current?.value || "",
                    location: locationRef.current?.value || "",
                    notes: notesRef.current?.value || "",
                  })
                }
                className="h-9 px-3 rounded-lg border border-[var(--line-amber)] bg-[var(--orange-600)] text-white hover:opacity-95 text-xs font-medium"
              >
                Submit for review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
