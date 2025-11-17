// src/pages/seller/Dashboard.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../components/contexts/AuthContext.jsx";

function formatOrderId(id) {
  if (!id) return "Order";
  return `ORD-${String(id).slice(0, 8).toUpperCase()}`;
}

function formatOrderDate(dateISO) {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return String(dateISO);
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user: authUser, profile, refreshProfile } = useAuth();
  const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;
  const [storeName, setStoreName] = useState(profile?.store_name || "your store");
  const [stats, setStats] = useState({
    totalSales: 0,
    activeOrders: 0,
    productsListed: 0,
    lowStockItems: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const isVerified = !!profile?.seller_approved;
  const isSuspended = !!profile?.suspended;

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

  // Load recent orders for this seller from order_items
  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from("order_items")
          .select(
            "order_id, title, qty, unit_price, created_at, status, buyer_name, buyer_address, payment_method, image, seller_id"
          )
          .eq("seller_id", authUser.id);

        if (error || !rows) {
          if (!cancelled) setRecentOrders([]);
          return;
        }

        const byOrder = new Map();
        rows.forEach((r) => {
          if (!r?.order_id) return;
          const key = r.order_id;
          if (!byOrder.has(key)) {
            byOrder.set(key, {
              id: key,
              product: r.title || "Product",
              total: 0,
              status: (r.status || "pending").toLowerCase(),
              customer: r.buyer_name || "Customer",
              dateISO: r.created_at || null,
              image: r.image || "",
              qty: Number(r.qty || 0) || 0,
              address: r.buyer_address || "",
              payment: r.payment_method || "",
            });
          }
          const entry = byOrder.get(key);
          const qty = Number(r.qty || 0) || 0;
          const price = Number(r.unit_price || 0) || 0;
          entry.total += qty * price;
          // Use most recent status/date among items
          if (r.created_at && (!entry.dateISO || r.created_at > entry.dateISO)) {
            entry.dateISO = r.created_at;
          }
          if (r.status) {
            entry.status = r.status.toLowerCase();
          }
          // Prefer a non-empty image/payment/address from any row
          if (!entry.image && r.image) entry.image = r.image;
          if (!entry.payment && r.payment_method) entry.payment = r.payment_method;
          if (!entry.address && r.buyer_address) entry.address = r.buyer_address;
        });

        const list = Array.from(byOrder.values())
          .sort((a, b) => {
            const tb = b.dateISO ? new Date(b.dateISO).getTime() : 0;
            const ta = a.dateISO ? new Date(a.dateISO).getTime() : 0;
            return tb - ta;
          })
          .slice(0, 4);

        if (!cancelled) setRecentOrders(list);
      } catch {
        if (!cancelled) setRecentOrders([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  // Load top products based on order_items for this seller
  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from("order_items")
          .select("product_id, title, unit_price, qty, seller_id")
          .eq("seller_id", authUser.id);

        if (error || !rows) {
          if (!cancelled) setTopProducts([]);
          return;
        }

        const byProduct = new Map();
        rows.forEach((r) => {
          if (!r?.product_id) return;
          const key = r.product_id;
          if (!byProduct.has(key)) {
            byProduct.set(key, {
              productId: key,
              title: r.title || "Product",
              unitsSold: 0,
              revenue: 0,
              price: 0,
              category: "",
              stock: null,
              sku: "",
              image: "",
            });
          }
          const entry = byProduct.get(key);
          const qty = Number(r.qty || 0) || 0;
          const price = Number(r.unit_price || 0) || 0;
          entry.unitsSold += qty;
          entry.revenue += qty * price;
          if (!entry.price) entry.price = price;
        });

        const baseList = Array.from(byProduct.values()).filter((p) => p.unitsSold > 0);
        if (!baseList.length) {
          if (!cancelled) setTopProducts([]);
          return;
        }

        // Enrich with product details (category, stock, sku, image)
        const productIds = baseList.map((p) => p.productId);
        const { data: products, error: prodErr } = await supabase
          .from("products")
          .select(
            "id, name, category, base_price, sku, stock_qty, product_images ( url, is_primary, position )"
          )
          .in("id", productIds);

        if (!prodErr && products) {
          products.forEach((p) => {
            const entry = byProduct.get(p.id);
            if (!entry) return;
            entry.title = entry.title || p.name || "Product";
            entry.category = p.category || "";
            entry.price = p.base_price != null ? Number(p.base_price) : entry.price;
            entry.stock = (p.stock_qty ?? null) != null ? p.stock_qty : null;
            entry.sku = p.sku || "";
            const imgs = (p.product_images || []).slice().sort((a, b) => {
              const pa = a.position ?? 0;
              const pb = b.position ?? 0;
              return pa - pb;
            });
            const primary = imgs.find((i) => i.is_primary) || imgs[0] || null;
            entry.image = primary?.url || "";
          });
        }

        const list = Array.from(byProduct.values())
          .filter((p) => p.unitsSold > 0)
          .sort((a, b) => b.unitsSold - a.unitsSold)
          .slice(0, 5);

        if (!cancelled) setTopProducts(list);
      } catch {
        if (!cancelled) setTopProducts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id) return;
    if (isSuspended) {
      toast.error("Your account has been suspended. Please contact support.");
      setVerifyModalOpen(false);
      return;
    }
    if (!isVerified) {
      setVerifyModalOpen(true);
    }
  }, [authUser?.id, isVerified, isSuspended]);

  // When seller becomes verified (after admin approval), hide verification gate
  // and show a one-time welcome message per account, remembered in localStorage.
  useEffect(() => {
    if (!authUser?.id) return;
    if (!isVerified) return;

    const key = `fh_seller_verified_seen_${authUser.id}`;
    const seen = (() => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    })();

    if (!seen) {
      setVerifyModalOpen(false);
      setShowWelcomeModal(true);
      try {
        localStorage.setItem(key, "1");
      } catch {}
    }
  }, [authUser?.id, isVerified]);

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

        const lowStock = activeProducts
          .map((p) => {
            const qtyFromProduct =
              (p.stock_qty ?? null) != null
                ? p.stock_qty
                : p.inventory_items?.[0]?.quantity_on_hand ?? 0;
            const qty = Number(qtyFromProduct) || 0;
            return {
              id: p.id,
              name: p.name || "Product",
              stock: qty,
            };
          })
          .filter((p) => p.stock > 0 && p.stock <= 2);

        const lowStockItems = lowStock.length;

        if (!cancelled) {
          setStats({
            totalSales: 0,
            activeOrders: 0,
            productsListed,
            lowStockItems,
          });
          setLowStockProducts(lowStock);
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

  if (isSuspended) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <div className="font-semibold text-red-900 mb-1">Account suspended</div>
          <p className="mb-2">
            Your seller account has been suspended by an administrator. You cannot access seller
            tools or manage your store while suspended.
          </p>
          <p className="text-xs text-red-900/80 mb-3">
            If you believe this is a mistake or would like to appeal, please contact support.
          </p>
          <button
            type="button"
            onClick={() => navigate("/seller/support")}
            className="rounded-xl bg-[var(--orange-600)] px-4 py-2.5 text-white text-sm font-medium hover:brightness-95"
          >
            Contact support
          </button>
        </div>
      </div>
    );
  }

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
                  try {
                    // Check the latest verification application status
                    let latestStatus = null;
                    if (authUser?.id) {
                      const { data: appRow } = await supabase
                        .from("store_verifications")
                        .select("status")
                        .eq("seller_id", authUser.id)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();
                      latestStatus = appRow?.status?.toString().toLowerCase() || null;
                    }

                    if (latest?.seller_approved) {
                      toast.success("You are now verified! Welcome.");
                    } else if (latestStatus === "rejected") {
                      toast.error(
                        "Your verification application was rejected by the admin. Please review your details and submit a new application."
                      );
                    } else {
                      toast("Still pending admin approval. Please try again later.");
                    }
                  } catch (e) {
                    console.warn("Failed to check verification status", e);
                    if (latest?.seller_approved) {
                      toast.success("You are now verified! Welcome.");
                    } else {
                      toast("Still pending admin approval. Please try again later.");
                    }
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
          label="Customer Reviews"
          
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
                <h3 className="font-semibold text-[var(--brown-700)]">Top Products</h3>
                <p className="text-xs text-gray-600">Your best selling items</p>
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
              {topProducts.length === 0 && (
                <li className="px-5 py-4 text-sm text-gray-500">
                  No sales yet. Once customers start ordering, your best-selling items will appear here.
                </li>
              )}
              {topProducts.map((p) => (
                <li key={p.productId} className="px-5 py-3">
                  <div className="flex items-center gap-4">
                    {/* Left: image + basic info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-16 w-24 rounded-lg border border-[var(--line-amber)] overflow-hidden bg-[var(--cream-50)] flex-shrink-0">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-[var(--brown-700)] text-sm truncate">
                          {p.title}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {p.category || ""}
                        </div>
                        <div className="text-[11px] text-gray-600 mt-1">
                          <span className="font-semibold text-[var(--brown-700)]">Sold </span>
                          {p.unitsSold}
                        </div>
                      </div>
                    </div>

                    {/* Middle: price / stock / sku */}
                    <div className="hidden md:grid grid-cols-3 gap-6 items-center text-sm mr-2">
                      <div>
                        <div className="text-[11px] text-gray-500 uppercase">Price</div>
                        <div className="font-semibold text-[var(--brown-700)]">
                          {peso(p.price || p.revenue)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-500 uppercase">Stock</div>
                        <div className="font-semibold text-[var(--brown-700)]">
                          {p.stock != null ? `${p.stock} ${p.stock === 1 ? "unit" : "units"}` : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-500 uppercase">SKU</div>
                        <div className="font-semibold text-[var(--brown-700)]">{p.sku || "—"}</div>
                      </div>
                    </div>

                    {/* Mobile revenue summary (no actions button) */}
                    <div className="md:hidden text-xs text-gray-500 mr-2">
                      {peso(p.revenue)} total
                    </div>
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
              {recentOrders.length === 0 && (
                <li className="px-5 py-4 text-sm text-gray-500">
                  No recent orders yet.
                </li>
              )}
              {recentOrders.map((o) => (
                <li key={o.id} className="px-5 py-3">
                  <div className="flex items-center gap-4">
                    {/* Left: image + rich order info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-16 w-24 rounded-lg border border-[var(--line-amber)] overflow-hidden bg-[var(--cream-50)] flex-shrink-0">
                        {o.image ? (
                          <img
                            src={o.image}
                            alt={o.product}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-[var(--brown-700)] truncate">
                            {formatOrderId(o.id)}
                          </div>
                          <StatusPill status={o.status} />
                        </div>
                        <div className="text-[11px] text-gray-600">
                          {formatOrderDate(o.dateISO)}
                        </div>
                        <div className="text-sm text-[var(--brown-700)] truncate">
                          {o.product}
                        </div>
                        <div className="text-xs text-gray-600">
                          Qty: {o.qty || 1}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {o.customer} — {o.address}
                        </div>
                      </div>
                    </div>

                    {/* Right: total + payment method */}
                    <div className="text-right text-sm flex-shrink-0">
                      <div className="font-semibold text-[var(--brown-700)]">
                        {peso(o.total)}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        {o.payment || ""}
                      </div>
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
            {lowStockProducts.length === 0 && (
              <div className="rounded-xl border border-[var(--line-amber)] bg-[var(--cream-50)] px-4 py-3 text-sm text-gray-600">
                No low stock items.
              </div>
            )}
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
              >
                <div className="truncate max-w-[180px]">{p.name}</div>
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

      {!isVerified && !isSuspended && (
        <VerificationModal
          open={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          files={files}
          onFileChange={handleFileChange}
          onRemoveFile={handleRemoveFile}
          onSubmit={handleSubmitVerification}
          email={authUser?.email || ""}
          storeName={storeName}
          phone={profile?.phone || authUser?.user_metadata?.phone || ""}
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
  phone,
}) {
  if (!open) return null;
  const emailRef = useRef(null);
  const storeNameRef = useRef(null);
  const [phoneValue, setPhoneValue] = useState("");
  const cityRef = useRef(null);
  const [notesValue, setNotesValue] = useState("");

  // Initialize phone from seller profile/metadata when the modal opens
  useEffect(() => {
    if (!open) return;
    setPhoneValue(phone || "");
  }, [open, phone]);

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
                    value={phoneValue}
                    onChange={(e) => setPhoneValue(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-xs text-[var(--brown-700)] focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
                  />
                </Field>
              </div>
              <div>
                <Label>City</Label>
                <Field>
                  <input
                    type="text"
                    defaultValue=""
                    ref={cityRef}
                    className="w-full rounded-lg border border-[var(--line-amber)] bg-white px-3 py-2 text-xs text-[var(--brown-700)] focus:outline-none focus:ring-2 focus:ring-[var(--amber-400)]/40"
                    placeholder="Enter your city"
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
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
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
                    phone: phoneValue || "",
                    location: cityRef.current?.value || "",
                    notes: notesValue || "",
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
